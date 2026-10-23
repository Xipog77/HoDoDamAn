import { createFileRoute } from '@tanstack/react-router'
import { FamilyTree } from '../components/FamilyTree'
import { useState } from 'react'
import { TreePine, Info } from 'lucide-react'

export const Route = createFileRoute('/tree')({
  component: TreePage,
})

function TreePage() {
  const [showInfo, setShowInfo] = useState(false)

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="no-print bg-white border-b border-stone-200 px-4 py-2.5 flex items-center justify-between gap-4 flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gold-100 flex items-center justify-center">
            <TreePine className="w-4 h-4 text-gold-700" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-wood-900 text-base leading-tight">Phả Đồ Tộc Họ Đỗ Đàm An</h1>
            <p className="text-[11px] text-stone-500 font-sans hidden sm:block">9 đời truyền nối • Khởi tổ Đỗ Phúc Mai</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-1.5 rounded-xl border text-xs font-sans flex items-center gap-1 transition-colors ${
              showInfo
                ? 'bg-gold-50 border-gold-300 text-gold-800'
                : 'bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100'
            }`}
            title="Hướng dẫn thao tác phả đồ"
          >
            <Info className="w-4 h-4" />
            <span className="hidden sm:inline">Hướng dẫn</span>
          </button>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="no-print bg-gold-50 border-b border-gold-200/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600 font-sans flex-shrink-0 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gold-500 inline-block" /> Di chuột / Click vào người để xem liên kết và chi tiết
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-wood-700 inline-block" /> Dùng con lăn chuột hoặc chụm ngón tay để phóng to/thu nhỏ
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Bấm nút "In phả đồ" để xuất trang in ấn hoặc lưu PDF
            </span>
          </div>
          <button
            onClick={() => setShowInfo(false)}
            className="text-[11px] text-gold-700 hover:text-gold-900 underline font-medium"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 relative">
        <FamilyTree />
      </div>
    </div>
  )
}
