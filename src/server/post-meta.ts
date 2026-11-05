import { createServerFn } from '@tanstack/react-start'

const SITE_URL = process.env.SITE_URL || 'https://dodaman.id.vn'

export interface PostMeta {
  title: string
  description: string
  image: string | null
  url: string
}

function toPlainText(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Title/description/cover for link previews (Zalo, Facebook) rendered during SSR. */
export const getPostMeta = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }): Promise<PostMeta | null> => {
    const postId = parseInt(id)
    if (isNaN(postId)) return null

    const { eq } = await import('drizzle-orm')
    const { db } = await import('~/db/client')
    const { posts } = await import('~/db/schema')
    const post = await db.query.posts.findFirst({ where: eq(posts.id, postId) })
    if (!post) return null

    const description = (post.excerpt || toPlainText(post.content)).slice(0, 200)
    const image = post.coverImage
      ? new URL(post.coverImage, SITE_URL).href
      : null
    return { title: post.title, description, image, url: `${SITE_URL}/posts/${post.id}` }
  })
