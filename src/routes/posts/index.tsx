import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BookOpen, Search, Calendar, User } from 'lucide-react'

export const Route = createFileRoute('/posts/')({
  component: PostsPage,
})

interface Post {
  id: number
  title: string
  excerpt: string | null
  content: string
  coverImage: string | null
  authorName: string
  isFeatured: boolean | null
  createdAt: string
}

function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.excerpt || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-wood-900">Bài đăng dòng họ</h1>
          <p className="text-stone-500 text-sm font-sans mt-1">Các câu chuyện, thông tin hoạt động và bài viết dòng họ</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm bài đăng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2.5 text-sm border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold-300 focus:border-gold-400 outline-none w-56 font-sans"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse border border-stone-100">
              <div className="h-5 bg-stone-200 rounded w-2/3 mb-3" />
              <div className="h-4 bg-stone-200 rounded w-full mb-2" />
              <div className="h-4 bg-stone-200 rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6">
          {filtered.map(post => (
            <Link key={post.id} to="/posts/$id" params={{ id: post.id.toString() }}>
              <article className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-stone-100 hover:border-gold-200 overflow-hidden transition-all group">
                <div className="sm:flex gap-5 p-5 sm:p-6">
                  {post.coverImage && (
                    <img src={post.coverImage} alt={post.title} className="w-full sm:w-48 h-32 sm:h-32 object-cover rounded-xl flex-shrink-0 mb-4 sm:mb-0" />
                  )}
                  <div className="flex-1">
                    {post.isFeatured && (
                      <span className="inline-block bg-gold-100 text-gold-700 text-xs px-2 py-0.5 rounded-full font-medium mb-2">Nổi bật</span>
                    )}
                    <h2 className="font-serif text-xl font-semibold text-wood-900 mb-2 group-hover:text-gold-700 transition-colors line-clamp-2">{post.title}</h2>
                    {post.excerpt && <p className="text-stone-500 text-sm font-sans line-clamp-2 mb-3">{post.excerpt}</p>}
                    <div className="flex items-center gap-3 text-xs text-stone-400 font-sans">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.authorName}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-20 text-stone-400 font-sans">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-stone-200" />
              <p>Chưa có bài đăng nào{search ? ' phù hợp' : ''}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
