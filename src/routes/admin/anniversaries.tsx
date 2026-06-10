import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { Calendar, Plus, X, Edit2, Trash2, Link as LinkIcon, User, BookOpen } from 'lucide-react'
import { SearchableSelect } from '@/components/SearchableSelect'
import { lunarToSolar } from '@/lib/lunar-calendar'

export const Route = createFileRoute('/admin/anniversaries')({
  component: AdminAnniversaries,
})

interface Anniversary {
  id: number
  title: string
  type: 'DEATH' | 'COMMEMORATION' | 'OTHER'
  dateType: 'SOLAR' | 'LUNAR'
  day: number
  month: number
  description: string | null
  personId: number | null
  postId: number | null
  isRecurring: boolean
  year: number | null
}

interface Person {
  id: number
  name: string
  generation: number
  branch: string | null
  gender: string
}

interface Post {
  id: number
  title: string
}

function AdminAnniversaries() {
  const [events, setEvents] = useState<Anniversary[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  
  const [form, setForm] = useState({
    title: '',
    type: 'DEATH' as 'DEATH' | 'COMMEMORATION' | 'OTHER',
    dateType: 'LUNAR' as 'SOLAR' | 'LUNAR',
    day: '1',
    month: '1',
    description: '',
    personId: '',
    postId: '',
    isRecurring: true,
    year: new Date().getFullYear().toString(),
  })
  
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/anniversaries').then(r => r.json()),
      fetch('/api/persons').then(r => r.json()),
      fetch('/api/posts').then(r => r.json())
    ])
      .then(([annData, persData, postData]) => {
        setEvents(annData.anniversaries || [])
        setPersons(persData.persons || [])
        setPosts(postData.posts || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const startEdit = (ev: Anniversary) => {
    setEditingId(ev.id)
    setForm({
      title: ev.title,
      type: ev.type,
      dateType: ev.dateType,
      day: ev.day.toString(),
      month: ev.month.toString(),
      description: ev.description || '',
      personId: ev.personId ? ev.personId.toString() : '',
      postId: ev.postId ? ev.postId.toString() : '',
      isRecurring: ev.isRecurring !== false,
      year: ev.year ? ev.year.toString() : new Date().getFullYear().toString(),
    })
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({
      title: '',
      type: 'DEATH',
      dateType: 'LUNAR',
      day: '1',
      month: '1',
      description: '',
      personId: '',
      postId: '',
      isRecurring: true,
      year: new Date().getFullYear().toString(),
    })
    setShowForm(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        id: editingId,
        personId: form.personId ? parseInt(form.personId) : null,
        postId: form.postId ? parseInt(form.postId) : null,
        isRecurring: form.isRecurring,
        year: form.isRecurring ? null : parseInt(form.year),
      }
      
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch('/api/anniversaries', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      
      if (res.ok) {
        cancelEdit()
        load()
      } else {
        const err = await res.json()
        alert(err.error || 'Đã xảy ra lỗi khi lưu')
      }
    } catch (e) {
      console.error(e)
      alert('Lỗi kết nối server')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa sự kiện này không?')) return
    
    try {
      const res = await fetch(`/api/anniversaries/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        load()
      } else {
        const err = await res.json()
        alert(err.error || 'Đã xảy ra lỗi khi xóa')
      }
    } catch (e) {
      console.error(e)
      alert('Lỗi kết nối server')
    }
  }

  // Calculate estimated solar date in real-time
  const estimatedSolarDate = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const calcYear = form.isRecurring ? currentYear : (parseInt(form.year) || currentYear)
    const d = parseInt(form.day)
    const m = parseInt(form.month)

    if (isNaN(d) || isNaN(m) || d < 1 || d > 31 || m < 1 || m > 12) {
      return null
    }

    if (form.dateType === 'SOLAR') {
      const dateObj = new Date(calcYear, m - 1, d)
      if (dateObj.getFullYear() === calcYear && dateObj.getMonth() === m - 1 && dateObj.getDate() === d) {
        return dateObj.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      }
    } else {
      const solarDate = lunarToSolar(d, m, calcYear)
      if (solarDate) {
        return solarDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      }
    }
    return null
  }, [form.day, form.month, form.dateType, form.isRecurring, form.year])

  // Map persons and posts to SearchableSelect format
  const personOptions = useMemo(() => {
    return persons.map(p => ({
      value: p.id,
      label: `${p.name} (Đời ${p.generation}${p.branch ? ` - ${p.branch}` : ''})`
    }))
  }, [persons])

  const postOptions = useMemo(() => {
    return posts.map(p => ({
      value: p.id,
      label: p.title
    }))
  }, [posts])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Sự kiện</h1>
          <p className="text-xs text-stone-500 font-sans mt-0.5">Thêm, sửa hoặc xóa các ngày lễ giỗ, kỷ niệm, sự kiện dòng họ chung</p>
        </div>
        <button
          onClick={() => {
            if (showForm) cancelEdit()
            else setShowForm(true)
          }}
          className="flex items-center gap-2 bg-gold-600 hover:bg-gold-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Hủy bỏ' : 'Thêm sự kiện'}
        </button>
      </div>

      {/* Form Area */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-150 shadow-sm p-6 mb-6">
          <h2 className="font-serif font-bold text-wood-900 text-lg mb-4">
            {editingId ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện mới'}
          </h2>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Tên sự kiện / Ngày giỗ cụ *</label>
                <input
                  required
                  type="text"
                  placeholder="Ví dụ: Giỗ Tổ họ Đỗ Đàm An"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans font-semibold">Loại sự kiện *</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-gold-300 outline-none font-sans"
                >
                  <option value="DEATH">Ngày giỗ (DEATH)</option>
                  <option value="COMMEMORATION">Ngày kỷ niệm (COMMEMORATION)</option>
                  <option value="OTHER">Sự kiện khác (OTHER)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Lịch biểu *</label>
                <select
                  value={form.dateType}
                  onChange={e => setForm(f => ({ ...f, dateType: e.target.value as any }))}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-gold-300 outline-none font-sans"
                >
                  <option value="LUNAR">Âm lịch</option>
                  <option value="SOLAR">Dương lịch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Ngày *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="31"
                  value={form.day}
                  onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Tháng *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="12"
                  value={form.month}
                  onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans"
                />
              </div>

              <div className="md:col-span-3 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Tần suất *</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center gap-1.5 text-xs text-stone-700 font-sans cursor-pointer">
                      <input
                        type="radio"
                        name="frequency"
                        checked={form.isRecurring}
                        onChange={() => setForm(f => ({ ...f, isRecurring: true }))}
                        className="accent-gold-600"
                      />
                      Hàng năm
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-stone-700 font-sans cursor-pointer">
                      <input
                        type="radio"
                        name="frequency"
                        checked={!form.isRecurring}
                        onChange={() => setForm(f => ({ ...f, isRecurring: false }))}
                        className="accent-gold-600"
                      />
                      Chỉ 1 lần
                    </label>
                  </div>
                </div>

                {!form.isRecurring && (
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Năm diễn ra *</label>
                    <input
                      required
                      type="number"
                      min="1900"
                      max="2100"
                      value={form.year}
                      onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Estimated Solar Date Notification Box */}
            {estimatedSolarDate && (
              <div className="bg-gold-50/50 border border-gold-200/80 rounded-xl p-3 flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-gold-750 flex-shrink-0" />
                <div>
                  <span className="text-xs text-gold-700 font-medium block">Ngày dự kiến diễn ra sự kiện (Dương lịch):</span>
                  <span className="text-sm font-serif font-bold text-wood-900">{estimatedSolarDate}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Thành viên (nếu có)</label>
                <SearchableSelect
                  options={personOptions}
                  value={form.personId}
                  onChange={val => setForm(f => ({ ...f, personId: val.toString() }))}
                  placeholder="Chọn hoặc tìm kiếm tên thành viên..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Bài viết (nếu có)</label>
                <SearchableSelect
                  options={postOptions}
                  value={form.postId}
                  onChange={val => setForm(f => ({ ...f, postId: val.toString() }))}
                  placeholder="Chọn hoặc tìm kiếm bài viết đính kèm..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Ghi chú / Mô tả chi tiết</label>
              <textarea
                rows={3}
                placeholder="Mô tả tóm tắt sự kiện..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                {saving ? 'Đang lưu...' : 'Lưu sự kiện'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="border border-stone-200 text-stone-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Area */}
      <div className="bg-white rounded-2xl border border-stone-150 p-6 shadow-sm">
        <h2 className="font-serif text-lg font-bold text-wood-900 border-b border-stone-100 pb-3 mb-4">
          Danh sách sự kiện chung ({events.length} sự kiện)
        </h2>

        {loading ? (
          <div className="py-12 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-stone-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-stone-400 font-sans">
            <Calendar className="w-12 h-12 text-stone-200 mx-auto mb-3" />
            <p>Chưa cấu hình sự kiện chung nào. Vui lòng thêm sự kiện mới ở nút phía trên.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-100 text-stone-500 text-xs font-semibold uppercase font-sans">
                  <th className="pb-3 pl-2">Sự kiện</th>
                  <th className="pb-3">Ngày biểu</th>
                  <th className="pb-3">Loại</th>
                  <th className="pb-3">Liên kết</th>
                  <th className="pb-3 text-right pr-2">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50 font-sans text-sm">
                {events.map(ev => {
                  const linkedPerson = persons.find(p => p.id === ev.personId)
                  const linkedPost = posts.find(p => p.id === ev.postId)
                  
                  return (
                    <tr key={ev.id} className="hover:bg-stone-50/55 transition-colors">
                      <td className="py-4 pl-2">
                        <p className="font-serif font-bold text-wood-900">{ev.title}</p>
                        {ev.description && (
                          <p className="text-stone-500 text-xs mt-1 line-clamp-1 max-w-md">{ev.description}</p>
                        )}
                      </td>
                      <td className="py-4">
                        <span className="font-medium text-stone-700">Ngày {ev.day} tháng {ev.month}</span>
                        <span className="text-xs text-stone-400 block">
                          ({ev.dateType === 'LUNAR' ? 'Âm lịch' : 'Dương lịch'})
                          {ev.isRecurring === false ? ` • Chỉ 1 lần (${ev.year})` : ' • Hàng năm'}
                        </span>
                      </td>
                      <td className="py-4">
                        {ev.type === 'DEATH' ? (
                          <span className="text-xs font-medium text-crimson-600 bg-crimson-100/70 px-2 py-0.5 rounded-full">
                            Ngày giỗ
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                            Kỷ niệm
                          </span>
                        )}
                      </td>
                      <td className="py-4">
                        <div className="flex flex-col gap-1 max-w-[200px]">
                          {linkedPerson && (
                            <span className="text-xs text-gold-600 font-medium inline-flex items-center gap-1 truncate" title={linkedPerson.name}>
                              <User className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{linkedPerson.name}</span>
                            </span>
                          )}
                          {linkedPost && (
                            <span className="text-xs text-blue-600 font-medium inline-flex items-center gap-1 truncate" title={linkedPost.title}>
                              <BookOpen className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate">{linkedPost.title}</span>
                            </span>
                          )}
                          {!linkedPerson && !linkedPost && (
                            <span className="text-xs text-stone-400">Không liên kết</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => startEdit(ev)}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-all"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ev.id)}
                            className="p-1.5 rounded-lg border border-stone-200 text-crimson-600 hover:bg-crimson-50 hover:text-crimson-700 transition-all"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
