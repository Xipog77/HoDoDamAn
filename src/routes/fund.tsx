import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle, DollarSign, TrendingUp, User, Search, ChevronLeft, ChevronRight, QrCode, Copy, Check, X, Building2 } from 'lucide-react'
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
  personId: number | null
  personName: string | null
  createdAt: string
}

function FundPage() {
  const { loading: authLoading, isMember } = useAuth()
  const [records, setRecords] = useState<FundRecord[]>([])
  const [total, setTotal] = useState(0)
  const [totalIn, setTotalIn] = useState(0)
  const [totalOut, setTotalOut] = useState(0)
  const [loading, setLoading] = useState(true)

  // QR Modal & Copy states
  const [showQrModal, setShowQrModal] = useState(false)
  const [copied, setCopied] = useState(false)

  // Search & Pagination states
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 1 })

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(handler)
  }, [search])

  const loadData = () => {
    setLoading(true)
    fetch(`/api/fund?page=${page}&q=${encodeURIComponent(debouncedSearch)}`)
      .then(r => r.json())
      .then(d => {
        setRecords(d.records || [])
        setTotal(d.total || 0)
        setTotalIn(d.totalIn || 0)
        setTotalOut(d.totalOut || 0)
        if (d.pagination) {
          setPagination(d.pagination)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isMember) {
      loadData()
    }
  }, [page, debouncedSearch, isMember])

  const handleCopyAccNumber = () => {
    navigator.clipboard.writeText('8000215040771')
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)

  if (authLoading || (loading && records.length === 0)) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
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
            className="block w-full bg-gold-600 hover:bg-gold-500 text-white text-sm font-medium py-3 rounded-xl transition-colors mb-3"
          >
            Đăng nhập ngay
          </Link>
          <p className="text-xs text-stone-400 font-sans">
            Liên hệ ban quản trị dòng họ để được cấp tài khoản thành viên.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-wood-900">Quỹ Dòng Họ</h1>
          <p className="text-stone-500 text-sm font-sans mt-1">Minh bạch thu chi — đoàn kết xây dựng từ đường và việc dòng tộc</p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm kiếm giao dịch..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans shadow-sm transition-all"
          />
        </div>
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
          <p className="font-serif text-2xl font-bold text-emerald-700">{fmt(totalIn)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-crimson-100 rounded-xl flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-crimson-600" />
            </div>
            <span className="text-sm text-stone-500 font-sans">Tổng chi</span>
          </div>
          <p className="font-serif text-2xl font-bold text-crimson-700">{fmt(totalOut)}</p>
        </div>
        <div className={`rounded-2xl shadow-sm border p-5 ${total >= 0 ? 'bg-gold-50/60 border-gold-200' : 'bg-crimson-50 border-crimson-200'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${total >= 0 ? 'bg-gold-100' : 'bg-crimson-100'}`}>
              <TrendingUp className={`w-5 h-5 ${total >= 0 ? 'text-gold-700' : 'text-crimson-600'}`} />
            </div>
            <span className="text-sm text-stone-500 font-sans">Hiện còn tồn quỹ</span>
          </div>
          <p className={`font-serif text-2xl font-bold ${total >= 0 ? 'text-gold-700' : 'text-crimson-700'}`}>{fmt(total)}</p>
        </div>
      </div>

      {/* Donation & VietQR Card */}
      <div className="bg-gradient-to-br from-wood-900 to-wood-950 text-white rounded-2xl shadow-lg border border-gold-600/30 p-6 sm:p-8 mb-8 overflow-hidden relative">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 relative z-10">
          {/* QR thumbnail */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              onClick={() => setShowQrModal(true)}
              className="bg-white p-2.5 rounded-2xl shadow-xl border-2 border-gold-400 cursor-pointer hover:scale-105 transition-transform group relative"
              title="Bấm để xem ảnh phóng to"
            >
              <img
                src="/fund-qr.jpg"
                alt="Mã VietQR Quỹ Họ Đỗ Đàm An"
                className="w-40 h-auto rounded-xl object-contain"
              />
              <div className="absolute inset-0 bg-wood-950/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="bg-gold-600 text-white text-xs px-2.5 py-1 rounded-full font-medium shadow">Phóng to</span>
              </div>
            </div>
            <button
              onClick={() => setShowQrModal(true)}
              className="mt-2.5 text-xs text-gold-300 hover:text-gold-200 flex items-center gap-1 font-medium font-sans"
            >
              <QrCode className="w-3.5 h-3.5" /> Bấm xem mã QR lớn
            </button>
          </div>

          {/* Bank Info */}
          <div className="flex-1 text-center md:text-left space-y-3 font-sans">
            <div className="inline-flex items-center gap-1.5 bg-gold-500/20 text-gold-300 text-xs px-3 py-1 rounded-full border border-gold-400/30 font-medium">
              <Building2 className="w-3.5 h-3.5" /> Thông tin Đóng góp & Công đức Dòng họ
            </div>

            <h3 className="font-serif text-xl sm:text-2xl font-bold text-gold-400">
              Ngân hàng Nông nghiệp & PTNT (Agribank)
            </h3>
            <p className="text-xs text-stone-300">Chi nhánh Tỉnh Quảng Ninh</p>

            <div className="bg-wood-800/80 border border-wood-700/60 rounded-xl p-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-stone-400 text-xs block">Chủ tài khoản:</span>
                  <span className="font-serif font-bold text-white text-base tracking-wide">DO NGOC NAM</span>
                </div>
                <div>
                  <span className="text-stone-400 text-xs block">Số tài khoản:</span>
                  <div className="flex items-center gap-2 mt-0.5 justify-center sm:justify-start">
                    <span className="font-mono font-bold text-gold-300 text-lg">8000215040771</span>
                    <button
                      onClick={handleCopyAccNumber}
                      className="p-1.5 rounded-lg bg-wood-700 hover:bg-wood-600 text-stone-200 hover:text-white transition-colors"
                      title="Sao chép số tài khoản"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-wood-700/60 text-xs text-stone-300">
                <span className="text-gold-400 font-semibold">Cú pháp chuyển khoản gợi ý: </span>
                <span className="bg-wood-900 px-2 py-0.5 rounded font-mono text-stone-200">
                  [Họ Tên] - Dong gop Quy Ho Do
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-400 italic">
              * Mọi khoản đóng góp của con cháu sẽ được ban khánh tiết dòng họ cập nhật minh bạch vào danh sách dưới đây.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction list */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-serif font-semibold text-wood-900 text-lg">Lịch sử thu chi & công đức</h2>
          <span className="text-xs text-stone-400 font-sans">Cập nhật tự động</span>
        </div>
        {loading && records.length === 0 ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-stone-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {records.map(r => (
              <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${r.type === 'IN' ? 'bg-emerald-100' : 'bg-crimson-100'}`}>
                  {r.type === 'IN'
                    ? <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
                    : <ArrowDownCircle className="w-5 h-5 text-crimson-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="text-sm font-medium text-wood-800 font-serif">{r.description}</p>
                    {r.personName && (
                      <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-600 text-[0.625rem] px-2 py-0.5 rounded-full font-sans">
                        <User className="w-2.5 h-2.5" />
                        {r.personName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 font-sans mt-0.5">{r.date}</p>
                </div>
                <span className={`font-semibold text-sm sm:text-base font-sans flex-shrink-0 ${r.type === 'IN' ? 'text-emerald-700' : 'text-crimson-700'}`}>
                  {r.type === 'IN' ? '+' : '-'}{fmt(r.amount)}
                </span>
              </div>
            ))}
            {records.length === 0 && (
              <div className="text-center py-16 text-stone-400 font-sans">
                <DollarSign className="w-12 h-12 mx-auto mb-3 text-stone-200" />
                <p>Chưa có giao dịch nào phù hợp</p>
              </div>
            )}
          </div>
        )}

        {/* Pagination Section */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-stone-100 bg-stone-50/50">
            <span className="text-xs text-stone-500 font-sans">
              Trang {pagination.page} / {pagination.totalPages} ({pagination.totalRecords} giao dịch)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-white disabled:opacity-40 transition-colors"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4 text-stone-600" />
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-white disabled:opacity-40 transition-colors"
                title="Trang tiếp"
              >
                <ChevronRight className="w-4 h-4 text-stone-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal for QR */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-sm w-full relative shadow-2xl flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-serif font-bold text-lg text-wood-900 mb-1">Mã Chuyển Tiền VietQR</h3>
            <p className="text-xs text-stone-500 font-sans mb-4">Quỹ Tộc Họ Đỗ Đàm An</p>

            <img
              src="/fund-qr.jpg"
              alt="Mã QR VietQR Quỹ Họ"
              className="w-full h-auto rounded-2xl border border-stone-100 shadow-md"
            />

            <div className="w-full mt-4 p-3 bg-stone-50 rounded-xl text-center font-sans">
              <p className="text-xs text-stone-500">Số tài khoản Agribank:</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="font-mono font-bold text-gold-700 text-base">8000215040771</span>
                <button
                  onClick={handleCopyAccNumber}
                  className="text-xs bg-gold-600 hover:bg-gold-500 text-white px-2 py-0.5 rounded transition-colors"
                >
                  {copied ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
