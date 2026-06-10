import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { DollarSign, Plus, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

export const Route = createFileRoute('/admin/fund')({
  component: AdminFund,
})

function AdminFund() {
  const [records, setRecords] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ type: 'IN', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const load = () => {
    fetch('/api/fund')
      .then(r => r.json())
      .then(d => { setRecords(d.records || []); setTotal(d.total || 0) })
  }

  useEffect(load, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseInt(form.amount) }),
      })
      if (res.ok) {
        setShowAdd(false)
        setForm({ type: 'IN', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Quỹ họ</h1>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-gold-600 hover:bg-gold-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" />
          Thêm giao dịch
        </button>
      </div>

      <div className="bg-gradient-to-r from-wood-800 to-wood-700 rounded-2xl p-6 mb-6 text-white">
        <p className="text-stone-400 text-sm font-sans mb-1">Số dư hiện tại</p>
        <p className={`font-serif text-3xl font-bold ${total >= 0 ? 'text-gold-300' : 'text-crimson-300'}`}>{fmt(total)}</p>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-semibold text-wood-900">Thêm giao dịch</h2>
            <button onClick={() => setShowAdd(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Loại</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans">
                <option value="IN">Thu</option>
                <option value="OUT">Chi</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Số tiền (VND)</label>
              <input required type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Mô tả *</label>
              <input required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="VD: Tiền đóng góp họp họ 2025"
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Ngày</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving}
                className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="divide-y divide-stone-50">
          {records.map((r: any) => (
            <div key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50 transition-colors">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${r.type === 'IN' ? 'bg-emerald-100' : 'bg-crimson-100'}`}>
                {r.type === 'IN' ? <ArrowUpCircle className="w-5 h-5 text-emerald-600" /> : <ArrowDownCircle className="w-5 h-5 text-crimson-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-wood-800 font-serif">{r.description}</p>
                <p className="text-xs text-stone-400 font-sans">{r.date}</p>
              </div>
              <span className={`font-semibold text-sm flex-shrink-0 font-sans ${r.type === 'IN' ? 'text-emerald-700' : 'text-crimson-700'}`}>
                {r.type === 'IN' ? '+' : '-'}{fmt(r.amount)}
              </span>
            </div>
          ))}
          {records.length === 0 && (
            <div className="text-center py-16 text-stone-400 font-sans">
              <DollarSign className="w-10 h-10 mx-auto mb-3 text-stone-200" />
              <p>Chưa có giao dịch nào</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
