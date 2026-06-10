import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Calendar, User, ArrowLeft, Share2 } from 'lucide-react'

export const Route = createFileRoute('/posts/$id')({
  component: PostDetail,
})

interface Post {
  id: number
  title: string
  content: string
  excerpt: string | null
  coverImage: string | null
  authorName: string
  isFeatured: boolean | null
  createdAt: string
}

function PostDetail() {
  const { id } = Route.useParams()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then(r => r.json())
      .then(d => setPost(d.post || null))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-10 bg-stone-200 rounded w-3/4 mb-4" />
        <div className="h-72 bg-stone-200 rounded-2xl mb-6" />
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-stone-200 rounded" />)}
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-stone-500 font-sans text-lg">Không tìm thấy bài đăng</p>
        <Link to="/posts" className="mt-4 inline-block text-gold-600 hover:text-gold-500 font-medium">← Quay lại danh sách bài đăng</Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/posts" className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-wood-800 mb-6 transition-colors font-sans">
        <ArrowLeft className="w-4 h-4" />
        Quay lại bài đăng
      </Link>

      <article className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        {/* Cover Image */}
        {post.coverImage && (
          <img src={post.coverImage} alt={post.title} className="w-full h-64 sm:h-80 lg:h-96 object-cover" />
        )}

        <div className="p-6 sm:p-8 lg:p-10">
          {post.isFeatured && (
            <span className="inline-block bg-gold-100 text-gold-700 text-xs px-3 py-1 rounded-full font-semibold mb-4">⭐ Nổi bật</span>
          )}

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-wood-900 leading-tight mb-5">{post.title}</h1>

          <div className="flex items-center justify-between flex-wrap gap-3 text-sm text-stone-500 font-sans mb-8 pb-6 border-b border-stone-100">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <div className="w-7 h-7 bg-wood-100 rounded-full flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-wood-600" />
                </div>
                {post.authorName}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {new Date(post.createdAt).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {post.excerpt && (
            <p className="text-lg text-stone-600 font-sans leading-relaxed italic border-l-4 border-gold-400 pl-5 mb-8 bg-gold-50/50 py-3 pr-4 rounded-r-xl">{post.excerpt}</p>
          )}

          <div
            className="prose prose-stone prose-lg max-w-none font-sans text-stone-700 leading-relaxed
              prose-headings:font-serif prose-headings:text-wood-900
              prose-a:text-gold-600 prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-2xl prose-img:shadow-lg prose-img:border prose-img:border-stone-100 prose-img:mx-auto prose-img:block
              prose-blockquote:border-gold-400 prose-blockquote:bg-stone-50 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:not-italic
              prose-hr:border-stone-200"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </div>
      </article>
    </div>
  )
}
