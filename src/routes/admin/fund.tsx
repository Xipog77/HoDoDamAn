import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { DollarSign, Plus, X, ArrowUpCircle, ArrowDownCircle, Trash2, Search, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { SearchableSelect } from '@/components/SearchableSelect'

export const Route = createFileRoute('/admin/fund')({
  component: AdminFund,
})

function AdminFund() {
  const [records, setRecords] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    type: 'IN',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    personId: '' as string | number
  })
  const [saving, setSaving] = useState(false)

  // Search & Pagination states
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 10, totalRecords: 0, totalPages: 1 })
  const [persons, setPersons] = useState<any[]>([])

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  const load = () => {
    fetch(`/api/fund?page=${page}&q=${encodeURIComponent(debouncedSearch)}`)
      .then(r => r.json())
      .then(d => {
        setRecords(d.records || [])
        setTotal(d.total || 0)
        if (d.pagination) {
          setPagination(d.pagination)
        }
      })
      .catch(console.error)
  }

  // Load records on page or search change
  useEffect(load, [page, debouncedSearch])

  // Load persons list once for select dropdown
  useEffect(() => {
    fetch('/api/persons')
      .then(r => r.json())
      .then(d => setPersons(d.persons || []))
      .catch(console.error)
  }, [])

  const personOptions = useMemo(() => {
    return persons.map((p: any) => ({
      value: p.id,
      label: `${p.name} (Đời ${p.generation}${p.branch ? ` - ${p.branch}` : ''})`
    }))
  }, [persons])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          amount: parseInt(form.amount),
          description: form.description,
          date: form.date,
          personId: form.personId ? parseInt(form.personId.toString()) : null
        }),
      })
      if (res.ok) {
        setShowAdd(false)
        setForm({
          type: 'IN',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          personId: ''
        })
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa (hoàn tác) giao dịch này không?')) return
    try {
      const res = await fetch(`/api/fund/${id}`, { method: 'DELETE' })
      if (res.ok) {
        load()
      } else {
        alert('Không thể xóa giao dịch này.')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫'

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Quỹ họ</h1>
          <p className="text-stone-500 text-xs font-sans mt-0.5">Theo dõi, tìm kiếm và hoàn tác lịch sử thu chi quỹ gia tộc</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center justify-center gap-2 bg-gold-600 hover:bg-gold-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Thêm giao dịch
        </button>
      </div>

      <div className="bg-gradient-to-r from-wood-800 to-wood-700 rounded-2xl p-6 mb-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-stone-300 text-xs font-sans mb-1 uppercase tracking-wider">Số dư hiện tại của quỹ</p>
          <p className={`font-serif text-3xl font-bold ${total >= 0 ? 'text-gold-300' : 'text-crimson-300'}`}>{fmt(total)}</p>
        </div>
        
        {/* Search Input bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mô tả..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white/10 border border-white/10 hover:border-white/20 focus:border-white/30 rounded-xl text-sm text-white placeholder-white/40 focus:ring-2 focus:ring-gold-300 outline-none font-sans transition-all"
          />
        </div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-semibold text-wood-900">Thêm giao dịch mới</h2>
            <button onClick={() => setShowAdd(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Loại giao dịch *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans">
                <option value="IN">Thu (Nhập quỹ)</option>
                <option value="OUT">Chi (Xuất quỹ)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Số tiền (VND) *</label>
              <input required type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="VD: 500000"
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans" />
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Người liên quan (Gắn thẻ thành viên)</label>
              <SearchableSelect
                options={personOptions}
                value={form.personId}
                onChange={val => setForm(f => ({ ...f, personId: val }))}
                placeholder="Tìm kiếm và chọn thành viên dòng họ..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Mô tả giao dịch *</label>
              <input required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="VD: Đỗ Đàm An đóng góp xây nhà thờ họ"
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Ngày thực hiện *</label>
              <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving}
                className="w-full bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors font-sans">
                {saving ? 'Đang lưu...' : 'Lưu giao dịch'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions list table */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
        <div className="divide-y divide-stone-50">
          {records.map((r: any) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50/50 transition-colors">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${r.type === 'IN' ? 'bg-emerald-100' : 'bg-crimson-100'}`}>
                {r.type === 'IN' ? <ArrowUpCircle className="w-5 h-5 text-emerald-600" /> : <ArrowDownCircle className="w-5 h-5 text-crimson-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className="text-sm font-semibold text-wood-800 font-serif">{r.description}</p>
                  {r.personName && (
                    <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 text-[0.6875rem] px-2 py-0.5 rounded-full font-sans">
                      <User className="w-2.5 h-2.5" />
                      {r.personName}
                    </span>
                  )}
                </div>
                <p className="text-[0.6875rem] text-stone-400 font-sans mt-0.5">{r.date}</p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <span className={`font-semibold text-sm font-sans ${r.type === 'IN' ? 'text-emerald-700' : 'text-crimson-700'}`}>
                  {r.type === 'IN' ? '+' : '-'}{fmt(r.amount)}
                </span>
                <button
                  onClick={() => handleDelete(r.id)}
                  title="Xóa/Hoàn tác giao dịch"
                  className="p-2 text-stone-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {records.length === 0 && (
            <div className="text-center py-16 text-stone-400 font-sans">
              <DollarSign className="w-10 h-10 mx-auto mb-3 text-stone-200" />
              <p className="text-sm">Không tìm thấy giao dịch nào</p>
            </div>
          )}
        </div>

        {/* Pagination Section */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-stone-50/50">
            <span className="text-xs text-stone-500 font-sans">
              Hiển thị trang {pagination.page} / {pagination.totalPages} ({pagination.totalRecords} bản ghi)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-stone-600" />
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-stone-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
