import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
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
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  try {
    const data = readFileSync(filePath)
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': data.length,
      // Cache immutable assets (hashed filenames) for 1 year
      ...(url.pathname.includes('/assets/') ? { 'Cache-Control': 'public, max-age=31536000, immutable' } : {}),
    })
    res.end(data)
    return true
  } catch {
    return false
  }
}

const UPLOADS_DIR = join(__dirname, 'uploads')

const server = createServer(async (req, res) => {
  // 1. Try serving static files from dist/client/
  if (req.method === 'GET' && tryServeStatic(req, res)) {
    return
  }

  // 1b. Try serving uploaded files from /uploads/
  if (req.method === 'GET' && req.url.startsWith('/uploads/')) {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const filePath = join(UPLOADS_DIR, url.pathname.replace('/uploads/', ''))
    if (filePath.startsWith(UPLOADS_DIR) && existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = extname(filePath).toLowerCase()
      const contentType = MIME_TYPES[ext] || 'application/octet-stream'
      const data = readFileSync(filePath)
      res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': data.length, 'Cache-Control': 'public, max-age=86400' })
      res.end(data)
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
