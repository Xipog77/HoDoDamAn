import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { MessageSquare, Check, Trash2, HardDrive, AlertTriangle } from 'lucide-react'

export const Route = createFileRoute('/admin/feedback')({
  component: AdminFeedback,
})

function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [diskInfo, setDiskInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      // Load feedbacks
      const fbRes = await fetch('/api/admin/feedback')
      const fbData = await fbRes.json()
      setFeedbacks(fbData.feedbacks || [])

      // Load disk info
      const diskRes = await fetch('/api/admin/status')
      const diskData = await diskRes.json()
      setDiskInfo(diskData.diskInfo || null)
    } catch (e) {
      console.error('Error loading admin feedback data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleResolve = async (id: number) => {
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESOLVE', feedbackId: id }),
      })
      if (res.ok) {
        loadData()
      } else {
        alert('Không thể cập nhật trạng thái góp ý')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) return
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE', feedbackId: id }),
      })
      if (res.ok) {
        loadData()
      } else {
        alert('Không thể xóa phản hồi')
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-wood-900">Ý kiến đóng góp & Báo lỗi</h1>
        <p className="text-stone-500 text-xs font-sans mt-0.5">
          Xem các ý kiến đóng góp, báo lỗi từ thành viên và giám sát dung lượng máy chủ.
        </p>
      </div>

      {/* Disk Space Status */}
      {diskInfo && (
        <div className={`p-5 rounded-2xl border font-sans text-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
          diskInfo.isCritical
            ? 'bg-crimson-50 border-crimson-200 text-crimson-800'
            : diskInfo.isLow
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-white border-stone-100 shadow-sm text-stone-700'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              diskInfo.isCritical
                ? 'bg-crimson-100'
                : diskInfo.isLow
                ? 'bg-amber-100'
                : 'bg-gold-50'
            }`}>
              {diskInfo.isCritical || diskInfo.isLow ? (
                <AlertTriangle className={`w-5 h-5 ${diskInfo.isCritical ? 'text-crimson-600 animate-bounce' : 'text-amber-600'}`} />
              ) : (
                <HardDrive className="w-5 h-5 text-gold-600" />
              )}
            </div>
            <div>
              <p className="font-semibold flex items-center gap-1.5">
                Giám sát dung lượng ổ cứng
                {diskInfo.isCritical && <span className="bg-crimson-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Khóa tải lên</span>}
                {diskInfo.isLow && !diskInfo.isCritical && <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Dung lượng thấp</span>}
              </p>
              <p className="text-xs mt-1 text-stone-500">
                Đã dùng {diskInfo.usedGb} GB / {diskInfo.totalGb} GB ({diskInfo.capacityPercent}%). Còn trống {diskInfo.availableGb} GB.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-full md:w-32 bg-stone-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  diskInfo.isCritical ? 'bg-crimson-600' : diskInfo.isLow ? 'bg-amber-500' : 'bg-gold-600'
                }`}
                style={{ width: `${diskInfo.capacityPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-xl border border-stone-100 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && feedbacks.map((fb: any) => (
          <div 
            key={fb.id} 
            className={`bg-white rounded-xl border p-5 flex items-start gap-4 transition-all ${
              fb.isResolved ? 'border-stone-100 opacity-60' : 'border-stone-200/80 shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              fb.isResolved ? 'bg-stone-100' : 'bg-gold-50'
            }`}>
              <MessageSquare className={`w-4 h-4 ${fb.isResolved ? 'text-stone-400' : 'text-gold-600'}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-stone-800 text-sm font-sans">{fb.authorName}</span>
                <span className="text-xs text-stone-400 font-sans">•</span>
                <span className="text-xs text-stone-400 font-sans">
                  {new Date(fb.createdAt).toLocaleString('vi-VN')}
                </span>
                {fb.isResolved ? (
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full font-sans">
                    Đã giải quyết
                  </span>
                ) : (
                  <span className="bg-gold-50 text-gold-700 text-[10px] font-semibold px-2 py-0.5 rounded-full font-sans animate-pulse">
                    Mới gửi
                  </span>
                )}
              </div>
              <p className="text-sm text-stone-600 font-sans mt-2 whitespace-pre-line leading-relaxed">
                {fb.content}
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {!fb.isResolved && (
                <button
                  onClick={() => handleResolve(fb.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium transition-colors"
                  title="Đánh dấu đã giải quyết"
                >
                  <Check className="w-3.5 h-3.5" />
                  Duyệt xong
                </button>
              )}
              <button
                onClick={() => handleDelete(fb.id)}
                className="p-1.5 text-stone-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-lg transition-all"
                title="Xóa ý kiến"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {!loading && feedbacks.length === 0 && (
          <div className="text-center py-16 text-stone-400 font-sans bg-white rounded-2xl border border-stone-100">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-stone-200" />
            <p>Chưa nhận được phản hồi hay báo lỗi nào từ thành viên</p>
          </div>
        )}
      </div>
    </div>
  )
}
