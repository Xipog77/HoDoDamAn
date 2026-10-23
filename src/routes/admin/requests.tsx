import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { FileEdit, Check, X, Clock, ExternalLink, User, Calendar, AlertCircle } from 'lucide-react'

export const Route = createFileRoute('/admin/requests')({
  component: AdminRequestsPage,
})

interface EditRequest {
  id: number
  personId: number
  requesterId: number
  changes: Record<string, any>
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy: number | null
  createdAt: string
  personName: string
  personGeneration: number | null
  personBranch: string | null
  requesterName: string
}

const FIELD_LABELS: Record<string, string> = {
  birthYear: 'Năm sinh',
  deathYear: 'Năm mất',
  dob: 'Ngày sinh (Dương lịch)',
  dod: 'Ngày mất (Dương lịch)',
  dobLunar: 'Ngày sinh (Âm lịch)',
  dodLunar: 'Ngày mất (Âm lịch)',
  birthplace: 'Nơi sinh',
  residence: 'Nơi ở',
  burialPlace: 'Nơi an táng / Mộ phần',
  occupation: 'Nghề nghiệp',
  currentAddress: 'Địa chỉ hiện tại',
  biography: 'Tiểu sử tóm tắt',
  fullBiography: 'Sự nghiệp & công đức',
  phone: 'Số điện thoại',
  email: 'Email',
}

function AdminRequestsPage() {
  const [requests, setRequests] = useState<EditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
  const [processingId, setProcessingId] = useState<number | null>(null)

  const loadRequests = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/requests')
      const data = await res.json()
      setRequests(data.requests || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const handleAction = async (requestId: number, action: 'APPROVE' | 'REJECT') => {
    const confirmMsg = action === 'APPROVE'
      ? 'Bạn có chắc chắn muốn DUYỆT yêu cầu này? Dữ liệu sẽ được tự động cập nhật vào hồ sơ thành viên.'
      : 'Bạn có chắc chắn muốn TỪ CHỐI yêu cầu này?'

    if (!confirm(confirmMsg)) return

    setProcessingId(requestId)
    try {
      const res = await fetch('/api/admin/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, requestId }),
      })
      if (res.ok) {
        loadRequests()
      } else {
        const err = await res.json()
        alert(err.error || 'Có lỗi xảy ra')
      }
    } catch (e) {
      console.error(e)
      alert('Không thể kết nối đến máy chủ')
    } finally {
      setProcessingId(null)
    }
  }

  const filteredRequests = requests.filter(r => {
    if (filter === 'ALL') return true
    return r.status === filter
  })

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-wood-900 flex items-center gap-2">
            <FileEdit className="w-6 h-6 text-gold-600" />
            Duyệt Yêu Cầu Chỉnh Sửa Hồ Sơ
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Xem xét và phê duyệt các thông tin đóng góp, đính chính từ con cháu dòng họ
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'PENDING' ? 'bg-white text-wood-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Chờ duyệt ({requests.filter(r => r.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'APPROVED' ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Đã duyệt
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'REJECTED' ? 'bg-white text-crimson-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Từ chối
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'ALL' ? 'bg-white text-wood-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Tất cả
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse border border-stone-200">
              <div className="h-5 bg-stone-200 rounded w-1/3 mb-3" />
              <div className="h-4 bg-stone-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(req => {
            const changes = req.changes || {}
            const note = changes._requesterNote
            const changeEntries = Object.entries(changes).filter(([k]) => !k.startsWith('_'))

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-5 transition-all hover:border-gold-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold-100 text-gold-800 flex items-center justify-center font-serif font-bold text-base flex-shrink-0">
                      {req.personName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to="/person/$id"
                          params={{ id: req.personId.toString() }}
                          className="font-serif font-bold text-wood-900 text-base hover:text-gold-700 transition-colors flex items-center gap-1 group"
                        >
                          {req.personName}
                          <ExternalLink className="w-3.5 h-3.5 text-stone-400 group-hover:text-gold-600" />
                        </Link>
                        {req.personGeneration && (
                          <span className="text-[11px] bg-wood-100 text-wood-800 px-2 py-0.2 rounded-md font-medium">
                            Đời {req.personGeneration}
                          </span>
                        )}
                        {req.personBranch && (
                          <span className="text-[11px] bg-gold-100 text-gold-800 px-2 py-0.2 rounded-md font-medium">
                            Chi {req.personBranch}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Gửi bởi: <span className="font-semibold text-stone-700">{req.requesterName}</span> • {new Date(req.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {req.status === 'PENDING' && (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <Clock className="w-3.5 h-3.5" /> Chờ duyệt
                      </span>
                    )}
                    {req.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <Check className="w-3.5 h-3.5" /> Đã duyệt
                      </span>
                    )}
                    {req.status === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 bg-crimson-100 text-crimson-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <X className="w-3.5 h-3.5" /> Từ chối
                      </span>
                    )}
                  </div>
                </div>

                {/* Changes List */}
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Thông tin đề xuất thay đổi:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {changeEntries.map(([field, value]) => (
                      <div key={field} className="bg-stone-50 border border-stone-200/70 rounded-xl p-2.5">
                        <span className="text-stone-400 block text-[11px] font-medium">
                          {FIELD_LABELS[field] || field}:
                        </span>
                        <span className="font-medium text-wood-950 font-serif text-sm mt-0.5 block break-words">
                          {String(value || '(Để trống)')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {note && (
                    <div className="mt-3 p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                      <span className="font-bold block mb-0.5">Ghi chú từ người gửi:</span>
                      <p className="italic">{note}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {req.status === 'PENDING' && (
                  <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-stone-100">
                    <button
                      disabled={processingId === req.id}
                      onClick={() => handleAction(req.id, 'REJECT')}
                      className="flex items-center gap-1 px-4 py-2 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" /> Từ chối
                    </button>
                    <button
                      disabled={processingId === req.id}
                      onClick={() => handleAction(req.id, 'APPROVE')}
                      className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" /> Duyệt & Cập nhật vào hồ sơ
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {filteredRequests.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200/80 text-stone-400">
              <FileEdit className="w-12 h-12 mx-auto mb-3 text-stone-300" />
              <p className="font-serif text-base font-medium text-wood-900">Không có yêu cầu chỉnh sửa nào</p>
              <p className="text-xs text-stone-400 mt-1">Các đề xuất mới từ thành viên sẽ xuất hiện tại đây</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
