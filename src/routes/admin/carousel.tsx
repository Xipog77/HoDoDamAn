import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Plus, X, Image as ImageIcon, Trash2, ArrowUpDown, Edit2, Eye, EyeOff, ChevronUp, ChevronDown, Check } from 'lucide-react'

export const Route = createFileRoute('/admin/carousel')({
  component: AdminCarouselPage,
})

function AdminCarouselPage() {
  const [slides, setSlides] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    imageUrl: '',
    title: '',
    description: '',
    order: '0',
  })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/carousel?all=1')
      .then(r => r.json())
      .then(d => setSlides(d.slides || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const resetForm = () => {
    setForm({ imageUrl: '', title: '', description: '', order: '0' })
    setEditingId(null)
    setShowAdd(false)
  }

  const startEdit = (slide: any) => {
    setEditingId(slide.id)
    setForm({
      imageUrl: slide.imageUrl,
      title: slide.title || '',
      description: slide.description || '',
      order: slide.order?.toString() || '0',
    })
    setShowAdd(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.imageUrl) return
    setSaving(true)
    try {
      if (editingId) {
        // Update existing
        const res = await fetch('/api/carousel', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            imageUrl: form.imageUrl,
            title: form.title || null,
            description: form.description || null,
            order: parseInt(form.order) || 0,
          })
        })
        if (res.ok) {
          resetForm()
          load()
        } else {
          alert('Lỗi khi cập nhật slide')
        }
      } else {
        // Create new
        const res = await fetch('/api/carousel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: form.imageUrl,
            title: form.title || null,
            description: form.description || null,
            order: parseInt(form.order) || 0,
          })
        })
        if (res.ok) {
          resetForm()
          load()
        } else {
          alert('Lỗi khi thêm slide')
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa slide ảnh này?')) return
    try {
      const res = await fetch(`/api/carousel/${id}`, { method: 'DELETE' })
      if (res.ok) {
        load()
      } else {
        alert('Lỗi khi xóa slide')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const toggleActive = async (slide: any) => {
    try {
      const res = await fetch('/api/carousel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slide.id, isActive: !slide.isActive })
      })
      if (res.ok) load()
    } catch (e) {
      console.error(e)
    }
  }

  const moveOrder = async (slide: any, direction: 'up' | 'down') => {
    const newOrder = direction === 'up' ? Math.max(0, slide.order - 1) : slide.order + 1
    try {
      const res = await fetch('/api/carousel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: slide.id, order: newOrder })
      })
      if (res.ok) load()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Banner trình chiếu (Carousel)</h1>
          <p className="text-stone-500 text-xs font-sans mt-0.5">Thêm, sửa, bật/tắt ảnh trình chiếu chạy tự động ở cuối trang chủ</p>
        </div>
        <button
          onClick={() => {
            if (showAdd) resetForm()
            else setShowAdd(true)
          }}
          className="flex items-center justify-center gap-2 bg-gold-600 hover:bg-gold-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors font-sans"
        >
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? 'Hủy bỏ' : 'Thêm Slide ảnh'}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <h2 className="font-serif font-semibold text-wood-900">
              {editingId ? 'Chỉnh sửa slide' : 'Thêm slide trình chiếu mới'}
            </h2>
            <button type="button" onClick={resetForm} className="text-stone-400 hover:text-stone-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Đường dẫn hình ảnh (URL) *</label>
              <input
                required
                type="text"
                value={form.imageUrl}
                onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Thứ tự hiển thị</label>
              <div className="relative">
                <ArrowUpDown className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Tiêu đề (Tùy chọn)</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Nhập tiêu đề hiển thị đè lên ảnh..."
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Mô tả ngắn (Tùy chọn)</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Nhập mô tả ngắn hiển thị đè..."
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans"
              />
            </div>
          </div>

          {form.imageUrl && (
            <div className="border border-stone-150 rounded-2xl overflow-hidden aspect-[21/9] bg-stone-50 max-w-xl shadow-inner">
              <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors font-sans shadow-sm flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Đang lưu...' : editingId ? 'Cập nhật Slide' : 'Lưu Slide'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="border border-stone-200 hover:bg-stone-50 text-stone-600 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors font-sans"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Slides list */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
          <h2 className="font-serif font-semibold text-wood-900">Danh sách Slide ({slides.length})</h2>
        </div>
        {loading ? (
          <div className="p-12 space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-28 bg-stone-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : slides.length === 0 ? (
          <div className="text-center py-16 text-stone-400 font-sans">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-stone-200" />
            <p className="text-sm">Chưa có banner slide ảnh nào được tạo</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {slides.map(s => (
              <div key={s.id} className={`p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-center transition-colors ${!s.isActive ? 'opacity-50 bg-stone-50/30' : 'hover:bg-stone-50/20'}`}>
                <div className="w-full sm:w-48 aspect-[16/9] rounded-xl overflow-hidden bg-stone-100 flex-shrink-0 shadow-sm relative">
                  <img src={s.imageUrl} alt={s.title || 'Slide'} className="w-full h-full object-cover" />
                  {!s.isActive && (
                    <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                      <span className="text-xs text-white bg-stone-800/80 px-2 py-1 rounded-lg font-sans font-medium">Đã ẩn</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 flex-wrap">
                    <span className="bg-stone-100 text-stone-600 text-xs px-2 py-0.5 rounded-full font-mono font-bold">#{s.order}</span>
                    {s.isActive ? (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Đang hiển thị</span>
                    ) : (
                      <span className="text-xs font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">Đã ẩn</span>
                    )}
                  </div>
                  <h3 className="font-serif font-bold text-wood-950 truncate">{s.title || '(Không có tiêu đề)'}</h3>
                  <p className="text-xs text-stone-500 font-sans mt-0.5 truncate">{s.description || '(Không có mô tả)'}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveOrder(s, 'up')}
                      className="p-1 text-stone-400 hover:text-gold-600 hover:bg-gold-50 rounded transition-all"
                      title="Di chuyển lên"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveOrder(s, 'down')}
                      className="p-1 text-stone-400 hover:text-gold-600 hover:bg-gold-50 rounded transition-all"
                      title="Di chuyển xuống"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Toggle active */}
                  <button
                    onClick={() => toggleActive(s)}
                    className={`p-2 rounded-xl transition-all ${s.isActive ? 'text-stone-400 hover:text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                    title={s.isActive ? 'Ẩn slide' : 'Hiện slide'}
                  >
                    {s.isActive ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                  {/* Edit */}
                  <button
                    onClick={() => startEdit(s)}
                    className="p-2 text-stone-400 hover:text-gold-600 hover:bg-gold-50 rounded-xl transition-all"
                    title="Chỉnh sửa slide"
                  >
                    <Edit2 className="w-4.5 h-4.5" />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 text-stone-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-xl transition-all"
                    title="Xóa slide"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
