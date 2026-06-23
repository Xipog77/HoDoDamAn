import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { Calendar, Plus, X, Trash2, Search, User, BookOpen } from 'lucide-react'
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
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [search, setSearch] = useState('')
  
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

  const selectEvent = (ev: Anniversary) => {
    setSelectedId(ev.id)
    setShowAddForm(false)
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
  }

  const openNewForm = () => {
    setSelectedId(null)
    setShowAddForm(true)
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
  }

  const cancelEdit = () => {
    setSelectedId(null)
    setShowAddForm(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        id: selectedId,
        personId: form.personId ? parseInt(form.personId) : null,
        postId: form.postId ? parseInt(form.postId) : null,
        isRecurring: form.isRecurring,
        year: form.isRecurring ? null : parseInt(form.year),
      }
      
      const method = selectedId ? 'PATCH' : 'POST'
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
        if (selectedId === id) setSelectedId(null)
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

  const filteredEvents = useMemo(() => {
    return events.filter(ev =>
      ev.title.toLowerCase().includes(search.toLowerCase()) ||
      (ev.description || '').toLowerCase().includes(search.toLowerCase())
    )
  }, [events, search])

  const typeLabel = (type: string) => {
    switch (type) {
      case 'DEATH': return 'Ngày giỗ'
      case 'COMMEMORATION': return 'Kỷ niệm'
      default: return 'Khác'
    }
  }

  const typeColor = (type: string) => {
    switch (type) {
      case 'DEATH': return 'text-crimson-600 bg-crimson-50'
      case 'COMMEMORATION': return 'text-emerald-600 bg-emerald-50'
      default: return 'text-stone-600 bg-stone-50'
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-6 h-6 text-gold-600" />
        <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Sự kiện</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Event List */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-stone-100 shadow-sm p-4 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="font-serif font-semibold text-wood-900">Danh sách Sự kiện</h2>
            <button
              onClick={openNewForm}
              className="flex items-center gap-1.5 bg-gold-600 hover:bg-gold-500 text-white text-xs px-3 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm mới
            </button>
          </div>

          <div className="relative mb-4 flex-shrink-0">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm sự kiện..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredEvents.map(ev => {
              const linkedPerson = persons.find(p => p.id === ev.personId)
              return (
                <div
                  key={ev.id}
                  onClick={() => selectEvent(ev)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
                    selectedId === ev.id ? 'bg-gold-50/50 border-gold-200' : 'hover:bg-stone-50/50 border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full ${typeColor(ev.type)}`}>
                        {typeLabel(ev.type)}
                      </span>
                    </div>
                    <p className={`font-serif font-bold text-sm leading-snug truncate ${selectedId === ev.id ? 'text-gold-800' : 'text-wood-900'}`}>
                      {ev.title}
                    </p>
                    <p className="text-[0.6875rem] text-stone-400 font-sans mt-0.5">
                      Ngày {ev.day}/{ev.month} ({ev.dateType === 'LUNAR' ? 'ÂL' : 'DL'})
                      {linkedPerson ? ` • ${linkedPerson.name}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDelete(ev.id) }}
                    className="p-1 text-stone-300 hover:text-crimson-600 rounded hover:bg-stone-100 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
            {loading && <p className="text-center text-xs text-stone-400 py-4 font-sans">Đang tải...</p>}
            {filteredEvents.length === 0 && !loading && (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-stone-200 mx-auto mb-2" />
                <p className="text-xs text-stone-400 font-sans">Không tìm thấy sự kiện nào</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="lg:col-span-2 overflow-y-auto h-[calc(100vh-140px)] pr-2">
          {(!selectedId && !showAddForm) ? (
            <div className="bg-stone-50 rounded-2xl border border-stone-100 border-dashed h-64 flex flex-col items-center justify-center text-stone-400 font-sans">
              <Calendar className="w-10 h-10 mb-2 text-stone-300" />
              <p>Chọn một sự kiện từ danh sách hoặc click "Thêm mới" để cập nhật</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
                <h2 className="font-serif font-bold text-lg text-wood-900">
                  {selectedId ? `Chỉnh sửa: ${form.title || 'Sự kiện'}` : 'Tạo sự kiện mới'}
                </h2>
                {showAddForm && (
                  <button onClick={cancelEdit} className="text-stone-400 hover:text-stone-600">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

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

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    {saving ? 'Đang lưu...' : selectedId ? 'Cập nhật sự kiện' : 'Tạo sự kiện'}
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
        </div>
      </div>
    </div>
  )
}
