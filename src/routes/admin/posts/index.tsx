import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, BookOpen, Star, Edit3, Trash2, Eye, Search, FileText } from 'lucide-react'

export const Route = createFileRoute('/admin/posts/')({
  component: AdminPosts,
})

interface Post {
  id: number
  title: string
  content: string
  excerpt: string | null
  isFeatured: boolean | null
  coverImage: string | null
  authorName: string
  createdAt: string
}

function AdminPosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/posts')
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const handleDelete = async (postId: number) => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
      if (res.ok) {
        load()
      } else {
        alert('Có lỗi xảy ra khi xóa bài viết')
      }
    } catch (e) {
      console.error(e)
      alert('Lỗi kết nối server')
    }
  }

  const handleToggleFeatured = async (postId: number, current: boolean | null) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !current }),
      })
      if (res.ok) {
        load()
      }
    } catch (e) {
      console.error(e)
    }
  }

  const filteredPosts = useMemo(() => {
    return posts.filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.excerpt || '').toLowerCase().includes(search.toLowerCase())
    )
  }, [posts, search])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-gold-600" />
          <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Bài đăng</h1>
        </div>
        <Link
          to="/admin/posts/new"
          className="flex items-center justify-center gap-2 bg-gold-600 hover:bg-gold-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors font-sans"
        >
          <Plus className="w-4 h-4" />
          Viết bài mới
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-6">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Tìm kiếm bài viết..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 font-sans"
          />
        </div>

        {loading ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-stone-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-stone-200 rounded-2xl text-stone-400 font-sans">
            <FileText className="w-12 h-12 mx-auto mb-3 text-stone-300" />
            <p>Không tìm thấy bài viết nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-stone-500 font-semibold text-xs uppercase tracking-wider bg-stone-50/50">
                  <th className="px-4 py-3.5">Bài viết</th>
                  <th className="px-4 py-3.5">Người viết</th>
                  <th className="px-4 py-3.5">Ngày đăng</th>
                  <th className="px-4 py-3.5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredPosts.map(p => (
                  <tr key={p.id} className="hover:bg-stone-50/30 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {p.coverImage ? (
                          <img src={p.coverImage} alt={p.title} className="w-12 h-8 object-cover rounded-lg shadow-sm flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-8 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 flex-shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {p.isFeatured && <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-500 flex-shrink-0" />}
                            <p className="font-serif font-bold text-wood-900 truncate leading-snug">{p.title}</p>
                          </div>
                          <p className="text-xs text-stone-400 truncate max-w-md">{p.excerpt || 'Không có tóm tắt'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-stone-600 whitespace-nowrap">{p.authorName}</td>
                    <td className="px-4 py-4 text-stone-500 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        {/* Toggle featured */}
                        <button
                          onClick={() => handleToggleFeatured(p.id, p.isFeatured)}
                          className={`p-2 rounded-xl transition-all ${p.isFeatured ? 'text-gold-500 hover:bg-gold-50' : 'text-stone-400 hover:text-gold-500 hover:bg-stone-50'}`}
                          title={p.isFeatured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}
                        >
                          <Star className={`w-4 h-4 ${p.isFeatured ? 'fill-gold-500' : ''}`} />
                        </button>
                        {/* View public */}
                        <a
                          href={`/posts/${p.id}`}
                          className="p-2 text-stone-400 hover:text-gold-600 hover:bg-stone-50 rounded-xl transition-all"
                          title="Xem trước bài viết công khai"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        {/* Edit */}
                        <Link
                          to="/admin/posts/$id"
                          params={{ id: p.id.toString() }}
                          className="p-2 text-stone-400 hover:text-gold-600 hover:bg-stone-50 rounded-xl transition-all"
                          title="Chỉnh sửa bài viết"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 text-stone-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-xl transition-all"
                          title="Xóa bài viết"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
