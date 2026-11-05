import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.map': 'application/json',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.avif': 'image/avif',
}

/**
 * Stream a file to the response instead of buffering it, so large uploads
 * (videos, scans) don't block the event loop or spike memory.
 */
function sendFile(req, res, filePath, size, headers) {
  res.writeHead(200, {
    ...headers,
    'Content-Length': size,
    'X-Content-Type-Options': 'nosniff',
  })
  if (req.method === 'HEAD') {
    res.end()
    return
  }
  pipeline(createReadStream(filePath), res).catch((err) => {
    console.error('Static file error:', err.message)
    res.destroy()
  })
}

// Import the fetch handler from the vite build output
const { default: app } = await import('./dist/server/server.js')

const CLIENT_DIR = join(__dirname, 'dist', 'client')
const PORT = parseInt(process.env.PORT || '3000', 10)

/**
 * Try to serve a static file from dist/client/.
 * Returns true if file was served, false otherwise.
 */
function tryServeStatic(req, res) {
  const isHead = req.method === 'HEAD'
  if (req.method !== 'GET' && !isHead) {
    return false
  }

  const url = new URL(req.url, `http://localhost:${PORT}`)
  let filePath = join(CLIENT_DIR, url.pathname)

  // Security: prevent directory traversal
  if (!filePath.startsWith(CLIENT_DIR)) {
    return false
  }

  // If it's a directory, try index.html
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html')
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return false
  }

  const ext = extname(filePath).toLowerCase()
  let contentType = MIME_TYPES[ext] || 'application/octet-stream'
  if (url.pathname === '/manifest.json') {
    contentType = 'application/manifest+json; charset=utf-8'
  }

  try {
    const headers = { 'Content-Type': contentType }

    if (url.pathname.includes('/assets/')) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    } else if (url.pathname === '/sw.js') {
      headers['Service-Worker-Allowed'] = '/'
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    } else if (url.pathname === '/manifest.json') {
      headers['Cache-Control'] = 'public, max-age=3600'
    }

    sendFile(req, res, filePath, statSync(filePath).size, headers)
    return true
  } catch {
    return false
  }
}

const UPLOADS_DIR = join(__dirname, 'uploads')

const server = createServer(async (req, res) => {
  // 1. Try serving static files from dist/client/
  if ((req.method === 'GET' || req.method === 'HEAD') && tryServeStatic(req, res)) {
    return
  }

  // 1b. Try serving uploaded files from /uploads/
  if ((req.method === 'GET' || req.method === 'HEAD') && req.url.startsWith('/uploads/')) {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const filePath = join(UPLOADS_DIR, url.pathname.replace('/uploads/', ''))
    if (filePath.startsWith(UPLOADS_DIR) && existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = extname(filePath).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      sendFile(req, res, filePath, statSync(filePath).size, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        // User uploads never need to run script; sandbox neutralises any HTML/SVG that slipped in
        'Content-Security-Policy': 'sandbox',
      })
      return
    }
  }

  // 2. Forward everything else to the TanStack Start fetch handler
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`)

    // Collect request body for non-GET requests
    let body = undefined
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      body = Buffer.concat(chunks)
    }

    // Build a standard Request object
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => headers.append(key, v))
        } else {
          headers.set(key, value)
        }
      }
    }

    const request = new Request(url.href, {
      method: req.method,
      headers,
      body,
      duplex: 'half',
    })

    const response = await app.fetch(request)

    // Write status & headers
    const responseHeaders = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    res.writeHead(response.status, responseHeaders)

    // Stream the response body
    if (response.body) {
      const reader = response.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }
    res.end()
  } catch (err) {
    console.error('Request error:', err)
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
    }
    res.end('Internal Server Error')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FamilyTree server running at http://localhost:${PORT}`)
})
