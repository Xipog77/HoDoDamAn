import { useState, useRef, useEffect } from 'react'
import { X, ChevronDown } from 'lucide-react'

interface Option {
  value: string | number
  label: string
}

interface SearchableSelectProps {
  options: Option[]
  value: string | number
  onChange: (val: string | number) => void
  placeholder?: string
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Chọn một mục...',
  className = '',
}: SearchableSelectProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOpt = options.find(o => String(o.value) === String(value))

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 100) // limit items to 100 for performance

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative font-sans text-sm ${className}`} ref={containerRef}>
      <div
        className="w-full px-3 py-2 border border-stone-200 rounded-xl cursor-text flex items-center justify-between bg-white focus-within:ring-2 focus-within:ring-gold-300 focus-within:border-gold-400 transition-all shadow-sm"
        onClick={() => setOpen(true)}
      >
        <input
          className="flex-grow outline-none bg-transparent min-w-0 placeholder-stone-400 text-stone-800"
          placeholder={selectedOpt ? selectedOpt.label : placeholder}
          value={open ? search : (selectedOpt ? selectedOpt.label : '')}
          onChange={e => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
        />
        <div className="flex items-center gap-1">
          {value !== '' && value !== null && value !== undefined && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
                setSearch('')
              }}
              className="text-stone-400 hover:text-stone-600 p-0.5 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-stone-400 pointer-events-none" />
        </div>
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50 py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-stone-500 italic">Không tìm thấy kết quả</div>
          ) : (
            filtered.map(o => (
              <button
                type="button"
                key={o.value}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                  setSearch('')
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-stone-50 ${
                  String(o.value) === String(value)
                    ? 'bg-gold-50/50 text-gold-800 font-medium'
                    : 'text-stone-700'
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
