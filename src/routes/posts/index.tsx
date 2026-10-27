import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, useMemo, useRef } from 'react'
import { BookOpen, Search, Calendar, User, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'

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

const POSTS_PER_PAGE = 9

export function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'FEATURED' | 'HISTORY' | 'NEWS'>('ALL')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Filter posts
  const filtered = useMemo(() => {
    let result = posts

    // Category filter
    if (selectedCategory === 'FEATURED') {
      result = result.filter(p => p.isFeatured)
    } else if (selectedCategory === 'HISTORY') {
      result = result.filter(p => {
        const text = (p.title + ' ' + (p.excerpt || '')).toLowerCase()
        return text.includes('lịch sử') || text.includes('từ đường') || text.includes('nguồn cội') || text.includes('tổ') || text.includes('phả')
      })
    } else if (selectedCategory === 'NEWS') {
      result = result.filter(p => {
        const text = (p.title + ' ' + (p.excerpt || '')).toLowerCase()
        return text.includes('lễ') || text.includes('tang') || text.includes('hội') || text.includes('thông báo') || text.includes('mừng thọ') || text.includes('khuyến học')
      })
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [posts, selectedCategory, search])

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, search])

  // Auto-scroll smoothly to top of page when changing page
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  const handlePageChange = (newPage: number) => {
    if (newPage !== currentPage) {
      setCurrentPage(newPage)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Pagination slice
  const totalPages = Math.ceil(filtered.length / POSTS_PER_PAGE) || 1
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * POSTS_PER_PAGE
    return filtered.slice(start, start + POSTS_PER_PAGE)
  }, [filtered, currentPage])

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Title & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-serif text-3xl font-bold text-wood-900">Bài viết</h1>
            <span className="bg-gold-100 text-gold-800 text-xs font-semibold px-2.5 py-0.5 rounded-full font-sans">
              {posts.length} bài
            </span>
          </div>
          <p className="text-stone-500 text-sm font-sans">
            Tư liệu lịch sử, nguồn cội, các sinh hoạt và thông tin chi tộc Họ Đỗ Đàm An
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm bài đăng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold-300 focus:border-gold-400 outline-none font-sans shadow-sm"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-stone-200/80 pb-4">
        <button
          onClick={() => setSelectedCategory('ALL')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors font-sans ${selectedCategory === 'ALL'
            ? 'bg-wood-800 text-gold-300 shadow-sm'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
            }`}
        >
          Tất cả ({posts.length})
        </button>
        <button
          onClick={() => setSelectedCategory('FEATURED')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors font-sans ${selectedCategory === 'FEATURED'
            ? 'bg-gold-600 text-white shadow-sm'
            : 'bg-gold-50 text-gold-700 hover:bg-gold-100'
            }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Bài viết nổi bật
        </button>
        <button
          onClick={() => setSelectedCategory('HISTORY')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors font-sans ${selectedCategory === 'HISTORY'
            ? 'bg-wood-800 text-gold-300 shadow-sm'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
            }`}
        >
          Giới thiệu
        </button>
        <button
          onClick={() => setSelectedCategory('NEWS')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors font-sans ${selectedCategory === 'NEWS'
            ? 'bg-wood-800 text-gold-300 shadow-sm'
            : 'bg-stone-100 text-stone-600 hover:bg-stone-200/70'
            }`}
        >
          Sự kiện
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse border border-stone-100 shadow-sm">
              <div className="h-40 bg-stone-200 rounded-xl mb-4" />
              <div className="h-5 bg-stone-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-stone-200 rounded w-full mb-2" />
              <div className="h-4 bg-stone-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPosts.map(post => (
              <Link key={post.id} to="/posts/$id" params={{ id: post.id.toString() }} className="flex flex-col h-full group">
                <article className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-stone-100 hover:border-gold-300/70 overflow-hidden transition-all duration-200 flex flex-col flex-1">
                  {post.coverImage ? (
                    <div className="relative h-48 w-full overflow-hidden bg-stone-100 flex-shrink-0">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {post.isFeatured && (
                        <span className="absolute top-3 right-3 bg-gold-600/90 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
                          Nổi bật
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="h-28 bg-gradient-to-br from-wood-800 to-wood-950 p-4 flex items-end relative overflow-hidden flex-shrink-0">
                      <BookOpen className="w-16 h-16 text-wood-700/40 absolute right-2 -bottom-2" />
                      {post.isFeatured && (
                        <span className="bg-gold-600 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
                          Nổi bật
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h2 className="font-serif text-lg font-bold text-wood-900 group-hover:text-gold-700 transition-colors line-clamp-2 leading-snug mb-2">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="text-stone-600 text-xs sm:text-sm font-sans line-clamp-3 mb-4 leading-relaxed">
                          {post.excerpt}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs text-stone-400 font-sans mt-auto">
                      <span className="flex items-center gap-1.5 truncate max-w-[140px]">
                        <User className="w-3.5 h-3.5 flex-shrink-0 text-stone-400" />
                        <span className="truncate">{post.authorName}</span>
                      </span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-stone-400 font-sans bg-white rounded-2xl border border-stone-100">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-stone-300" />
              <p className="text-base text-wood-800 font-serif font-medium">Không tìm thấy bài viết nào</p>
              <p className="text-xs text-stone-400 mt-1">
                {search ? `Không có kết quả nào với từ khóa "${search}"` : 'Chưa có bài viết trong danh mục này'}
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-10 pt-6 border-t border-stone-200">
              <span className="text-xs text-stone-500 font-sans">
                Hiển thị {(currentPage - 1) * POSTS_PER_PAGE + 1} - {Math.min(currentPage * POSTS_PER_PAGE, filtered.length)} trên tổng số {filtered.length} bài viết
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-white text-stone-600 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1]
                    const showEllipsis = prev && p - prev > 1
                    return (
                      <div key={p} className="flex items-center">
                        {showEllipsis && <span className="px-2 text-stone-400 text-xs">...</span>}
                        <button
                          onClick={() => handlePageChange(p)}
                          className={`w-9 h-9 rounded-xl text-xs font-semibold font-sans transition-all shadow-sm cursor-pointer ${currentPage === p
                            ? 'bg-gold-600 text-white'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50'
                            }`}
                        >
                          {p}
                        </button>
                      </div>
                    )
                  })}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-white text-stone-600 transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                  title="Trang tiếp"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
