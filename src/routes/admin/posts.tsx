import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Plus, X, BookOpen, Star, Edit2, Trash2, Eye, ImageIcon, Search, FileText } from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/posts')({
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
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  // Form states
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [saving, setSaving] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Viết nội dung bài đăng tại đây...' }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: '',
  })

  const load = useCallback(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(d => setPosts(d.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const selectPost = async (postId: number) => {
    setSelectedId(postId)
    setShowForm(false)
    const res = await fetch(`/api/posts/${postId}`)
    if (res.ok) {
      const { post } = await res.json()
      setTitle(post.title)
      setExcerpt(post.excerpt || '')
      setCoverImage(post.coverImage || '')
      setIsFeatured(post.isFeatured || false)
      editor?.commands.setContent(post.content || '')
    }
  }

  const openNewForm = () => {
    setSelectedId(null)
    setShowForm(true)
    setTitle('')
    setExcerpt('')
    setCoverImage('')
    setIsFeatured(false)
    editor?.commands.clearContent()
  }

  const resetForm = () => {
    setSelectedId(null)
    setShowForm(false)
    setTitle('')
    setExcerpt('')
    setCoverImage('')
    setIsFeatured(false)
    editor?.commands.clearContent()
  }

  const handleDelete = async (postId: number) => {
    if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
    if (res.ok) {
      if (selectedId === postId) resetForm()
      load()
    }
  }

  const insertImage = () => {
    const url = prompt('Nhập URL hình ảnh (Imgur, Google Drive, hoặc link trực tiếp):')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title,
        excerpt: excerpt || null,
        content: editor?.getHTML() || '',
        isFeatured,
        coverImage: coverImage || null,
      }

      const url = selectedId ? `/api/posts/${selectedId}` : '/api/posts'
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        if (!selectedId) {
          const data = await res.json()
          setSelectedId(data.post.id)
        }
        setShowForm(false)
        load()
        alert('Đã lưu bài viết thành công!')
      }
    } catch (e) {
      alert('Có lỗi xảy ra khi lưu bài viết')
    } finally {
      setSaving(false)
    }
  }

  const filteredPosts = useMemo(() => {
    return posts.filter(p =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.excerpt || '').toLowerCase().includes(search.toLowerCase())
    )
  }, [posts, search])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="w-6 h-6 text-gold-600" />
        <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Bài đăng</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột 1: Danh sách bài đăng */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-stone-100 shadow-sm p-4 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="font-serif font-semibold text-wood-900">Danh sách Bài viết</h2>
            <button
              onClick={openNewForm}
              className="flex items-center gap-1.5 bg-gold-600 hover:bg-gold-500 text-white text-xs px-3 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Viết bài
            </button>
          </div>

          <div className="relative mb-4 flex-shrink-0">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm bài viết..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredPosts.map(p => (
              <div
                key={p.id}
                onClick={() => selectPost(p.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
                  selectedId === p.id ? 'bg-gold-50/50 border-gold-200' : 'hover:bg-stone-50/50 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {p.isFeatured && <Star className="w-3 h-3 text-gold-500 fill-gold-500 flex-shrink-0" />}
                      <p className={`font-serif font-bold text-sm leading-snug truncate ${selectedId === p.id ? 'text-gold-800' : 'text-wood-900'}`}>{p.title}</p>
                    </div>
                    <p className="text-[0.6875rem] text-stone-400 font-sans">
                      {p.authorName} • {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <Link
                    to="/posts/$id"
                    params={{ id: p.id.toString() }}
                    onClick={e => e.stopPropagation()}
                    className="p-1 text-stone-300 hover:text-gold-600 rounded hover:bg-stone-100 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                    className="p-1 text-stone-300 hover:text-crimson-600 rounded hover:bg-stone-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {loading && <p className="text-center text-xs text-stone-400 py-4 font-sans">Đang tải...</p>}
            {filteredPosts.length === 0 && !loading && (
              <p className="text-center text-xs text-stone-400 py-8 font-sans">Chưa có bài viết nào</p>
            )}
          </div>
        </div>

        {/* Cột 2 & 3: Chi tiết Form chỉnh sửa */}
        <div className="lg:col-span-2 overflow-y-auto h-[calc(100vh-140px)] pr-2">
          {(!selectedId && !showForm) ? (
            <div className="bg-stone-50 rounded-2xl border border-stone-100 border-dashed h-64 flex flex-col items-center justify-center text-stone-400 font-sans">
              <BookOpen className="w-10 h-10 mb-2 text-stone-300" />
              <p>Chọn một bài viết từ danh sách hoặc click "Viết bài" để soạn thảo nội dung</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <h2 className="font-serif font-bold text-lg text-wood-900">
                  {selectedId ? 'Chỉnh sửa bài viết' : 'Bài viết mới'}
                </h2>
                <button onClick={resetForm} className="text-stone-400 hover:text-stone-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Tiêu đề *</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Tóm tắt ngắn</label>
                  <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows={2} placeholder="Tóm tắt ngắn hiển thị ở trang danh sách..."
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none resize-none font-sans" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Ảnh bìa (URL)</label>
                  <input value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="Nhập liên kết hình ảnh..."
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans" />
                </div>
                
                {coverImage && (
                  <div className="border border-stone-100 rounded-xl overflow-hidden aspect-video max-w-sm bg-stone-50">
                    <img src={coverImage} alt="Ảnh bìa xem trước" className="w-full h-full object-cover" />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Nội dung bài đăng</label>
                  <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-stone-50 border-b border-stone-200 px-3 py-2 flex gap-2 flex-wrap">
                      {[
                        { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), title: 'Bold' },
                        { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), title: 'Italic' },
                        { label: 'H2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), title: 'Heading 2' },
                        { label: 'H3', action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), title: 'Heading 3' },
                        { label: '• List', action: () => editor?.chain().focus().toggleBulletList().run(), title: 'Bullet List' },
                        { label: '1. List', action: () => editor?.chain().focus().toggleOrderedList().run(), title: 'Ordered List' },
                        { label: '— HR', action: () => editor?.chain().focus().setHorizontalRule().run(), title: 'Horizontal Rule' },
                        { label: '" Quote', action: () => editor?.chain().focus().toggleBlockquote().run(), title: 'Blockquote' },
                      ].map(btn => (
                        <button key={btn.title} type="button" onClick={btn.action} title={btn.title}
                          className="text-xs px-2 py-1 bg-white border border-stone-200 rounded hover:bg-gold-50 hover:border-gold-300 transition-colors font-mono font-bold">
                          {btn.label}
                        </button>
                      ))}
                      <button type="button" onClick={insertImage} title="Chèn ảnh"
                        className="text-xs px-2 py-1 bg-white border border-stone-200 rounded hover:bg-gold-50 hover:border-gold-300 transition-colors flex items-center gap-1 font-sans">
                        <ImageIcon className="w-3 h-3" /> Ảnh
                      </button>
                    </div>
                    <EditorContent editor={editor} className="min-h-56 px-4 py-3 text-sm font-sans prose prose-sm max-w-none focus:outline-none [&_img]:rounded-xl [&_img]:shadow-md [&_img]:my-4" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="featured" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-4 h-4 accent-gold-600" />
                  <label htmlFor="featured" className="text-sm text-stone-600 font-sans flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-gold-500 fill-gold-500" /> Đánh dấu nổi bật
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving}
                    className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors font-sans">
                    {saving ? 'Đang lưu...' : selectedId ? 'Cập nhật' : 'Đăng bài'}
                  </button>
                  <button type="button" onClick={resetForm}
                    className="border border-stone-200 text-stone-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors font-sans">
                    Hủy
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
