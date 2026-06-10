import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle, DollarSign, TrendingUp, User } from 'lucide-react'
import { useAuth } from '../components/AuthProvider'

export const Route = createFileRoute('/fund')({
  component: FundPage,
})

interface FundRecord {
  id: number
  type: 'IN' | 'OUT'
  amount: number
  description: string
  date: string
  createdAt: string
}

function FundPage() {
  const { loading: authLoading, isMember } = useAuth()
  const [records, setRecords] = useState<FundRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/fund')
      .then(r => r.json())
      .then(d => {
        setRecords(d.records || [])
        setTotal(d.total || 0)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalIn = records.filter(r => r.type === 'IN').reduce((s, r) => s + r.amount, 0)
  const totalOut = records.filter(r => r.type === 'OUT').reduce((s, r) => s + r.amount, 0)

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)

  if (authLoading || (loading && records.length === 0)) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-1/3" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="h-24 bg-stone-200 rounded-2xl" />
            <div className="h-24 bg-stone-200 rounded-2xl" />
            <div className="h-24 bg-stone-200 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!isMember) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-stone-100 p-8 shadow-md">
          <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gold-600" />
          </div>
          <h2 className="font-serif text-xl font-bold text-wood-900 mb-2">Yêu cầu đăng nhập</h2>
          <p className="text-stone-500 text-sm font-sans mb-6 leading-relaxed">
            Thông tin Quỹ họ Đỗ Đàm An chỉ dành cho thành viên đã đăng nhập và được ban quản trị phê duyệt.
          </p>
          <Link
            to="/login"
            search={{ redirect: typeof window !== 'undefined' ? window.location.pathname : '' }}
            className="block w-full bg-gold-600 hover:bg-gold-500 text-white text-sm font-medium py-3 rounded-xl transition-colors mb-3"
          >
            Đăng nhập ngay
          </Link>
          <p className="text-xs text-stone-400 font-sans">
            Chưa có tài khoản? Đăng ký hoặc liên hệ ban quản trị để được duyệt.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-wood-900">Quỹ họ</h1>
        <p className="text-stone-500 text-sm font-sans mt-1">Minh bạch thu chi — xây dựng niềm tin</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm text-stone-500 font-sans">Tổng thu</span>
          </div>
          <p className="font-serif text-xl font-bold text-emerald-700">{fmt(totalIn)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-crimson-100 rounded-xl flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-crimson-600" />
            </div>
            <span className="text-sm text-stone-500 font-sans">Tổng chi</span>
          </div>
          <p className="font-serif text-xl font-bold text-crimson-700">{fmt(totalOut)}</p>
        </div>
        <div className={`rounded-2xl shadow-sm border p-5 ${total >= 0 ? 'bg-gold-50 border-gold-200' : 'bg-crimson-50 border-crimson-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${total >= 0 ? 'bg-gold-100' : 'bg-crimson-100'}`}>
              <TrendingUp className={`w-5 h-5 ${total >= 0 ? 'text-gold-700' : 'text-crimson-600'}`} />
            </div>
            <span className="text-sm text-stone-500 font-sans">Hiện còn</span>
          </div>
          <p className={`font-serif text-xl font-bold ${total >= 0 ? 'text-gold-700' : 'text-crimson-700'}`}>{fmt(total)}</p>
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="font-serif font-semibold text-wood-900">Lịch sử giao dịch</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-stone-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {records.map(r => (
              <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${r.type === 'IN' ? 'bg-emerald-100' : 'bg-crimson-100'}`}>
                  {r.type === 'IN'
                    ? <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
                    : <ArrowDownCircle className="w-5 h-5 text-crimson-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-wood-800 font-serif">{r.description}</p>
                  <p className="text-xs text-stone-400 font-sans">{r.date}</p>
                </div>
                <span className={`font-semibold text-sm font-sans flex-shrink-0 ${r.type === 'IN' ? 'text-emerald-700' : 'text-crimson-700'}`}>
                  {r.type === 'IN' ? '+' : '-'}{fmt(r.amount)}
                </span>
              </div>
            ))}
            {records.length === 0 && (
              <div className="text-center py-16 text-stone-400 font-sans">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-stone-200" />
                <p>Chưa có giao dịch nào</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
