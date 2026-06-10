import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Bell, Plus, X } from 'lucide-react'

export const Route = createFileRoute('/admin/notifications')({
  component: AdminNotifications,
})

function AdminNotifications() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setItems(d.notifications || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowAdd(false)
        setForm({ title: '', content: '' })
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (id: number, isActive: boolean) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Thông báo</h1>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-gold-600 hover:bg-gold-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Thêm thông báo
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-semibold text-wood-900">Thông báo mới</h2>
            <button onClick={() => setShowAdd(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Tiêu đề *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Nội dung *</label>
              <textarea required value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none resize-none font-sans" />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                {saving ? 'Đang lưu...' : 'Đăng'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="border border-stone-200 text-stone-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item: any) => (
          <div key={item.id} className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${item.isActive ? 'border-stone-100' : 'border-stone-100 opacity-60'}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${item.isActive ? 'bg-gold-100' : 'bg-stone-100'}`}>
              <Bell className={`w-4 h-4 ${item.isActive ? 'text-gold-600' : 'text-stone-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-wood-800 font-serif">{item.title}</p>
              <p className="text-sm text-stone-500 font-sans mt-1 line-clamp-2">{item.content}</p>
              <p className="text-xs text-stone-400 font-sans mt-1">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</p>
            </div>
            <button
              onClick={() => toggle(item.id, item.isActive)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0 ${item.isActive ? 'bg-stone-100 text-stone-600 hover:bg-crimson-100 hover:text-crimson-700' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
            >
              {item.isActive ? 'Ẩn' : 'Hiện'}
            </button>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-center py-16 text-stone-400 font-sans">
            <Bell className="w-10 h-10 mx-auto mb-3 text-stone-200" />
            <p>Chưa có thông báo nào</p>
          </div>
        )}
      </div>
    </div>
  )
}
