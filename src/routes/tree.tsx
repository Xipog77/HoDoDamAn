import { createFileRoute } from '@tanstack/react-router'
import { FamilyTree } from '../components/FamilyTree'
import { useState } from 'react'
import { TreePine, Filter, Search, Info } from 'lucide-react'

export const Route = createFileRoute('/tree')({
  component: TreePage,
})

function TreePage() {
  const [branch, setBranch] = useState('')
  const [showInfo, setShowInfo] = useState(true)

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <TreePine className="w-5 h-5 text-gold-600" />
          <h1 className="font-serif font-bold text-wood-900 text-lg">Gia phả</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Lọc theo chi..."
              value={branch}
              onChange={e => setBranch(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:ring-2 focus:ring-gold-300 focus:border-gold-400 outline-none w-28 xs:w-40 sm:w-44 font-sans"
            />
          </div>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg transition-colors ${showInfo ? 'bg-gold-100 text-gold-700' : 'text-stone-500 hover:bg-stone-100'}`}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info panel */}
      {showInfo && (
        <div className="bg-gold-50 border-b border-gold-100 px-4 py-2 flex items-center gap-4 text-xs text-stone-600 font-sans flex-shrink-0">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gold-500 inline-block" /> Hover vào node để xem đường kết nối</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-wood-600 inline-block" /> Click vào thẻ để xem thông tin chi tiết</span>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 relative">
        <FamilyTree branch={branch} />
      </div>
    </div>
  )
}
