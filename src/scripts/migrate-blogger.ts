import 'dotenv/config'
import { db } from '../../db/client'
import { posts, users } from '../../db/schema'
import { eq } from 'drizzle-orm'

function getHighResImage(thumbUrl?: string, content?: string): string | null {
  if (thumbUrl) {
    if (thumbUrl.includes('img.youtube.com')) {
      return thumbUrl.replace('/default.jpg', '/hqdefault.jpg')
    }
    return thumbUrl
      .replace(/\/s[0-9]+(-c)?\//i, '/s1600/')
      .replace(/\/w[0-9]+-h[0-9]+[^/]*\//i, '/s1600/')
  }

  if (content) {
    const match = content.match(/<img[^>]+src=["']([^"']+)["']/i)
    if (match) return match[1]
  }

  return null
}

function extractExcerpt(html?: string): string | null {
  if (!html) return null
  const text = html
    .replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '')
    .replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return null
  if (text.length <= 250) return text
  const cut = text.substring(0, 250)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 150 ? cut.substring(0, lastSpace) : cut) + '...'
}

function cleanContent(html?: string): string {
  if (!html) return ''
  return html
    .replace(/<a\s+name=['"]more['"]\s*><\/a>/gi, '')
    .trim()
}

async function run() {
  console.log('=== BẮT ĐẦU CÀO VÀ MIGRATE BÀI VIẾT TỪ BLOGGER ===')
  console.log('Nguồn: https://dochitocdaman.blogspot.com')

  try {
    // 1. Get admin user ID for authorship
    const adminUser = await db.query.users.findFirst({
      where: eq(users.role, 'SUPER_ADMIN')
    })
    const authorId = adminUser?.id || 1

    // 2. Fetch Blogger posts feed
    console.log('Đang tải danh sách bài viết từ Blogger JSON Feed...')
    const feedRes = await fetch('https://dochitocdaman.blogspot.com/feeds/posts/default?alt=json&max-results=500')
    if (!feedRes.ok) throw new Error(`Lỗi tải feed bài viết: ${feedRes.status}`)
    const feedData = await feedRes.json()
    const blogEntries: any[] = feedData.feed.entry || []
    console.log(`Tìm thấy ${blogEntries.length} bài đăng trên Blogger.`)

    // 3. Fetch Blogger pages feed (để lấy các trang quan trọng như Phả ký)
    console.log('Đang tải danh sách trang tĩnh từ Blogger...')
    const pagesRes = await fetch('https://dochitocdaman.blogspot.com/feeds/pages/default?alt=json')
    let pageEntries: any[] = []
    if (pagesRes.ok) {
      const pagesData = await pagesRes.json()
      pageEntries = pagesData.feed.entry || []
      console.log(`Tìm thấy ${pageEntries.length} trang tĩnh trên Blogger.`)
    }

    // 4. Lấy danh sách bài viết hiện có trong Database để tránh trùng lặp
    const existingPosts = await db.query.posts.findMany()
    const existingTitles = new Set(existingPosts.map(p => p.title.trim().toLowerCase()))
    console.log(`Cơ sở dữ liệu hiện có ${existingPosts.length} bài viết.`)

    const queue: Array<{
      title: string
      content: string
      excerpt: string | null
      coverImage: string | null
      createdAt: Date
      updatedAt: Date
      isFeatured: boolean
    }> = []

    // 5. Thêm trang Phả ký nếu chưa có
    const phaky = pageEntries.find(p => p.title?.$t?.includes('Phả ký'))
    if (phaky) {
      const title = 'Phả ký'
      if (!existingTitles.has(title.toLowerCase())) {
        queue.push({
          title,
          content: cleanContent(phaky.content?.$t),
          excerpt: extractExcerpt(phaky.content?.$t),
          coverImage: getHighResImage(phaky.media$thumbnail?.url, phaky.content?.$t),
          createdAt: new Date(phaky.published?.$t || '2011-01-09T00:00:00.000Z'),
          updatedAt: new Date(phaky.updated?.$t || '2011-01-09T00:00:00.000Z'),
          isFeatured: true
        })
      }
    }

    // 6. Xử lý các bài viết theo thứ tự thời gian (từ cũ đến mới)
    const sortedEntries = [...blogEntries].reverse()

    for (const e of sortedEntries) {
      const title = (e.title?.$t || '').trim()
      if (!title) continue

      // Kiểm tra trùng lặp
      if (existingTitles.has(title.toLowerCase())) {
        console.log(`  [Bỏ qua - đã tồn tại]: "${title}"`)
        continue
      }

      // Xử lý alias (ví dụ bài tang lễ cụ Phương)
      if (title.toLowerCase().includes('tang lễ cụ') && title.toLowerCase().includes('đỗ ngọc phương')) {
        const hasTangLe = [...existingTitles].some(t => t.includes('đỗ ngọc phương') && t.includes('tang'))
        if (hasTangLe) {
          console.log(`  [Bỏ qua - đã tồn tại nội dung tang lễ]: "${title}"`)
          continue
        }
      }

      const content = cleanContent(e.content?.$t)
      const coverImage = getHighResImage(e.media$thumbnail?.url, e.content?.$t)
      const excerpt = extractExcerpt(e.content?.$t)
      const createdAt = new Date(e.published?.$t || new Date())
      const updatedAt = new Date(e.updated?.$t || createdAt)

      queue.push({
        title,
        content,
        excerpt,
        coverImage,
        createdAt,
        updatedAt,
        isFeatured: false
      })
    }

    console.log(`\nChuẩn bị thêm ${queue.length} bài viết mới vào hệ thống...`)

    let insertedCount = 0
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i]
      await db.insert(posts).values({
        title: item.title,
        content: item.content,
        excerpt: item.excerpt,
        coverImage: item.coverImage,
        authorId,
        isFeatured: item.isFeatured,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      })
      insertedCount++
      console.log(`  ✓ [${insertedCount}/${queue.length}] Đã thêm: "${item.title}" (${item.createdAt.toLocaleDateString('vi-VN')})`)
    }

    console.log(`\n🎉 HOÀN THÀNH MIGRATE! Đã import thành công ${insertedCount} bài viết từ Blogger.`)
    process.exit(0)
  } catch (error) {
    console.error('Lỗi trong quá trình migrate bài viết:', error)
    process.exit(1)
  }
}

run()
