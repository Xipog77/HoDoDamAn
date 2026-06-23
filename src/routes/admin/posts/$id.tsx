import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { BookOpen, Star, ArrowLeft, ImageIcon } from 'lucide-react'

export const Route = createFileRoute('/admin/posts/$id')({
  component: AdminEditPost,
})

function AdminEditPost() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [isFeatured, setIsFeatured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Viết nội dung bài đăng tại đây...' }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: '',
  })

  // Load post details
  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Không tìm thấy bài viết')
        return res.json()
      })
      .then(d => {
        const post = d.post
        setTitle(post.title || '')
        setExcerpt(post.excerpt || '')
        setCoverImage(post.coverImage || '')
        setIsFeatured(post.isFeatured || false)
        editor?.commands.setContent(post.content || '')
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        alert('Lỗi tải bài viết')
        navigate({ to: '/admin/posts' })
      })
  }, [id, editor])

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

      const res = await fetch(`/api/posts/${id}`, {
        method: 'POST', // The endpoint uses POST for updates
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        alert('Cập nhật bài viết thành công!')
        navigate({ to: '/admin/posts' })
      } else {
        alert('Có lỗi xảy ra khi cập nhật bài viết')
      }
    } catch (e) {
      alert('Có lỗi xảy ra khi lưu bài viết')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse font-sans">
        <div className="h-8 bg-stone-200 rounded w-1/4 mb-6" />
        <div className="bg-white rounded-2xl p-8 space-y-6">
          <div className="h-10 bg-stone-200 rounded w-1/2" />
          <div className="h-32 bg-stone-200 rounded" />
          <div className="h-56 bg-stone-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate({ to: '/admin/posts' })}
        className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-wood-800 mb-6 transition-colors font-sans"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại danh sách
      </button>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
          <BookOpen className="w-6 h-6 text-gold-600" />
          <h1 className="font-serif text-2xl font-bold text-wood-900">Chỉnh sửa bài viết</h1>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Tiêu đề *</label>
            <input 
              required 
              value={title} 
              onChange={e => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề bài đăng..."
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 focus:border-gold-400 outline-none font-sans" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Tóm tắt ngắn</label>
            <textarea 
              value={excerpt} 
              onChange={e => setExcerpt(e.target.value)} 
              rows={3} 
              placeholder="Tóm tắt ngắn hiển thị ở trang danh sách..."
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 focus:border-gold-400 outline-none resize-none font-sans" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Ảnh bìa (URL)</label>
            <input 
              value={coverImage} 
              onChange={e => setCoverImage(e.target.value)} 
              placeholder="Nhập liên kết hình ảnh..."
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 focus:border-gold-400 outline-none font-sans" 
            />
          </div>
          
          {coverImage && (
            <div className="border border-stone-100 rounded-2xl overflow-hidden aspect-video max-w-md bg-stone-50 shadow-sm">
              <img src={coverImage} alt="Ảnh bìa xem trước" className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Nội dung bài đăng</label>
            <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-gold-300 transition-all">
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
                    className="text-xs px-2.5 py-1 bg-white border border-stone-200 rounded hover:bg-gold-50 hover:border-gold-300 transition-colors font-mono font-bold">
                    {btn.label}
                  </button>
                ))}
                <button type="button" onClick={insertImage} title="Chèn ảnh"
                  className="text-xs px-2.5 py-1 bg-white border border-stone-200 rounded hover:bg-gold-50 hover:border-gold-300 transition-colors flex items-center gap-1 font-sans">
                  <ImageIcon className="w-3.5 h-3.5 text-stone-600" /> Ảnh
                </button>
              </div>
              <EditorContent editor={editor} className="min-h-72 px-4 py-3 text-sm font-sans prose prose-sm max-w-none focus:outline-none [&_img]:rounded-xl [&_img]:shadow-md [&_img]:my-4" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="featured" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-4 h-4 accent-gold-600" />
            <label htmlFor="featured" className="text-sm text-stone-600 font-sans flex items-center gap-1.5 cursor-pointer">
              <Star className="w-4 h-4 text-gold-500 fill-gold-500" /> Đánh dấu bài đăng nổi bật
            </label>
          </div>

          <div className="flex gap-4 pt-4 border-t border-stone-100">
            <button type="submit" disabled={saving}
              className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors font-sans shadow-sm">
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            <button type="button" onClick={() => navigate({ to: '/admin/posts' })}
              className="border border-stone-200 text-stone-600 px-6 py-3 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors font-sans">
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
