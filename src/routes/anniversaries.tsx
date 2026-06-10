import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Calendar as CalendarIcon, Search, ChevronLeft, ChevronRight, User, BookOpen, AlertCircle } from 'lucide-react'
import { solarToLunar } from '../lib/lunar-calendar'

export const Route = createFileRoute('/anniversaries')({
  component: AnniversariesPage,
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
  dod: string | null
  dodLunar: string | null
  generation: number
  biography: string | null
  isDeceased: boolean | null
}

interface CompiledEvent {
  key: string
  title: string
  type: 'DEATH' | 'COMMEMORATION' | 'OTHER'
  dateType: 'SOLAR' | 'LUNAR'
  day: number
  month: number
  description: string | null
  personId: number | null
  postId: number | null
  personName?: string
  daysUntil: number
  isRecurring?: boolean
  year?: number | null
}

function AnniversariesPage() {
  const [customEvents, setCustomEvents] = useState<Anniversary[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  // Calendar State
  const todayDate = new Date()
  const [currentYear, setCurrentYear] = useState(todayDate.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(todayDate.getMonth() + 1) // 1-12
  const [selectedDay, setSelectedDay] = useState<number | null>(todayDate.getDate())
  
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')
  const [activeView, setActiveView] = useState<'GRID' | 'LIST'>('GRID')

  useEffect(() => {
    Promise.all([
      fetch('/api/anniversaries').then(r => r.json()),
      fetch('/api/persons').then(r => r.json())
    ])
      .then(([annData, persData]) => {
        setCustomEvents(annData.anniversaries || [])
        setPersons(persData.persons || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-200 rounded w-1/3" />
          <div className="h-12 bg-stone-200 rounded-xl w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-stone-200 rounded-2xl" />
            <div className="h-32 bg-stone-200 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  // Parse Lunar Date labels helper
  const parseLunarDate = (lunarStr: string): { day: number; month: number } | null => {
    const match = lunarStr.match(/(\d+)\/(\d+)/) || lunarStr.match(/ngày\s+(\d+)\s+tháng\s+(\d+)/i)
    if (match) {
      return {
        day: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
      }
    }
    return null
  }

  // Calculate days until helper (approximating lunar month/day as solar day/month for simple countdown)
  const calculateDaysUntil = (month: number, day: number): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const currentYear = today.getFullYear()
    
    let target = new Date(currentYear, month - 1, day)
    if (target < today) {
      target = new Date(currentYear + 1, month - 1, day)
    }
    
    const diff = target.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // Compile all events
  const compiledEvents: CompiledEvent[] = []

  // Add custom events
  for (const ann of customEvents) {
    compiledEvents.push({
      key: `custom-${ann.id}`,
      title: ann.title,
      type: ann.type,
      dateType: ann.dateType,
      day: ann.day,
      month: ann.month,
      description: ann.description,
      personId: ann.personId,
      postId: ann.postId,
      daysUntil: calculateDaysUntil(ann.month, ann.day),
      isRecurring: ann.isRecurring !== false,
      year: ann.year,
    })
  }

  // Add deceased members' death anniversaries
  const deceased = persons.filter(p => p.isDeceased)
  for (const p of deceased) {
    if (!p.dod && !p.dodLunar) continue

    let day = 1
    let month = 1
    let dateType: 'SOLAR' | 'LUNAR' = 'SOLAR'

    if (p.dodLunar) {
      dateType = 'LUNAR'
      const parsed = parseLunarDate(p.dodLunar)
      if (parsed) {
        day = parsed.day
        month = parsed.month
      } else if (p.dod) {
        const parts = p.dod.split('-')
        if (parts.length >= 3) {
          day = parseInt(parts[2], 10)
          month = parseInt(parts[1], 10)
        }
      }
    } else if (p.dod) {
      const parts = p.dod.split('-')
      if (parts.length >= 3) {
        day = parseInt(parts[2], 10)
        month = parseInt(parts[1], 10)
      }
    }

    compiledEvents.push({
      key: `person-${p.id}`,
      title: `Ngày giỗ cụ ${p.name}`,
      type: 'DEATH',
      dateType,
      day,
      month,
      description: p.biography || `Ngày giỗ của cụ ${p.name} thuộc đời thứ ${p.generation} dòng họ Đỗ Đàm An.`,
      personId: p.id,
      postId: null, // Deceased profiles aren't linked directly to posts in this context
      personName: p.name,
      daysUntil: calculateDaysUntil(month, day),
    })
  }

  // MONTH NAVIGATION LOGIC
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear(prev => prev - 1)
    } else {
      setCurrentMonth(prev => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear(prev => prev + 1)
    } else {
      setCurrentMonth(prev => prev + 1)
    }
  }

  // CALENDAR GRID COMPUTATION (Vietnamese style: starts on Monday)
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate()
  }

  const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth)
  const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth === 1 ? 12 : currentMonth - 1)
  
  // Day of week index of 1st day of month (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay()
  // Padding count from Monday (0 to 6 days)
  const paddingDaysCount = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const gridCells: Array<{
    dayNumber: number
    isCurrentMonth: boolean
    month: number
    year: number
    lunarDay: number
    lunarMonth: number
  }> = []

  // Add padding days from previous month
  const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1
  const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
  for (let i = paddingDaysCount - 1; i >= 0; i--) {
    const dNum = daysInPrevMonth - i
    const lunar = solarToLunar(dNum, prevMonthNum, prevMonthYear)
    gridCells.push({
      dayNumber: dNum,
      isCurrentMonth: false,
      month: prevMonthNum,
      year: prevMonthYear,
      lunarDay: lunar.day,
      lunarMonth: lunar.month,
    })
  }

  // Add current month days
  for (let dNum = 1; dNum <= daysInCurrentMonth; dNum++) {
    const lunar = solarToLunar(dNum, currentMonth, currentYear)
    gridCells.push({
      dayNumber: dNum,
      isCurrentMonth: true,
      month: currentMonth,
      year: currentYear,
      lunarDay: lunar.day,
      lunarMonth: lunar.month,
    })
  }

  // Add trailing days from next month to fill grid (multiple of 7)
  const nextMonthNum = currentMonth === 12 ? 1 : currentMonth + 1
  const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear
  const totalCells = Math.ceil(gridCells.length / 7) * 7
  const nextMonthDaysCount = totalCells - gridCells.length
  for (let dNum = 1; dNum <= nextMonthDaysCount; dNum++) {
    const lunar = solarToLunar(dNum, nextMonthNum, nextMonthYear)
    gridCells.push({
      dayNumber: dNum,
      isCurrentMonth: false,
      month: nextMonthNum,
      year: nextMonthYear,
      lunarDay: lunar.day,
      lunarMonth: lunar.month,
    })
  }

  // Helper to match events for a grid cell
  const getCellEvents = (cell: typeof gridCells[0]) => {
    return compiledEvents.filter(ev => {
      // If it is a one-time event, only show it in its designated year
      if (ev.isRecurring === false && ev.year !== cell.year) {
        return false
      }

      // Apply filters first
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const inTitle = ev.title.toLowerCase().includes(q)
        const inDesc = ev.description?.toLowerCase().includes(q) || false
        if (!inTitle && !inDesc) return false
      }
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'DEATH' && ev.type !== 'DEATH') return false
        if (typeFilter === 'COMMEMORATION' && ev.type !== 'COMMEMORATION' && ev.type !== 'OTHER') return false
      }

      // Match calendar dates
      if (ev.dateType === 'SOLAR') {
        return ev.month === cell.month && ev.day === cell.dayNumber
      } else {
        // LUNAR
        return ev.month === cell.lunarMonth && ev.day === cell.lunarDay
      }
    })
  }

  // List View filtering
  const filteredEventsForList = compiledEvents.filter(ev => {
    if (ev.month !== currentMonth) return false
    
    // If it is a one-time event, only show it in its designated year
    if (ev.isRecurring === false && ev.year !== currentYear) {
      return false
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const inTitle = ev.title.toLowerCase().includes(q)
      const inDesc = ev.description?.toLowerCase().includes(q) || false
      if (!inTitle && !inDesc) return false
    }
    
    if (typeFilter !== 'ALL') {
      if (typeFilter === 'DEATH' && ev.type !== 'DEATH') return false
      if (typeFilter === 'COMMEMORATION' && ev.type !== 'COMMEMORATION' && ev.type !== 'OTHER') return false
    }
    
    return true
  }).sort((a, b) => a.day - b.day)

  // Get events of the selected day
  const selectedCell = gridCells.find(c => c.isCurrentMonth && c.dayNumber === selectedDay)
  const selectedDayEvents = selectedCell ? getCellEvents(selectedCell) : []

  // Year choices for selector
  const years = Array.from({ length: 21 }, (_, i) => todayDate.getFullYear() - 10 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Page Title & Navigation Banner */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-wood-900 flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-gold-600" />
            Sự Kiện & Ngày Giỗ
          </h1>
          <p className="text-stone-500 text-sm font-sans mt-1">
            Giao diện lịch tháng thông minh hiển thị song song ngày Dương lịch (trên) và ngày Âm lịch (dưới).
          </p>
        </div>

        {/* View Switcher & Filters */}
        <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => setActiveView('GRID')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'GRID'
                ? 'bg-wood-800 text-white shadow'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Lịch tháng
          </button>
          <button
            onClick={() => setActiveView('LIST')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'LIST'
                ? 'bg-wood-800 text-white shadow'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Danh sách sự kiện
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left column: Sidebar controls & search */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Quick Search */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-150 p-4">
            <h3 className="font-serif font-bold text-wood-900 text-sm border-b border-stone-100 pb-2 mb-3">
              Tìm kiếm nhanh
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-stone-400" />
              <input
                type="text"
                placeholder="Tìm ngày giỗ, sự kiện..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 pl-9 pr-3 text-xs font-sans focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500"
              />
            </div>
          </div>

          {/* Type Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-150 p-4">
            <h3 className="font-serif font-bold text-wood-900 text-sm border-b border-stone-100 pb-2 mb-3">
              Lọc sự kiện
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-sans transition-colors ${
                  typeFilter === 'ALL'
                    ? 'bg-wood-50 text-wood-900 font-semibold'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                Tất cả sự kiện
              </button>
              <button
                onClick={() => setTypeFilter('DEATH')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-sans transition-colors flex items-center justify-between ${
                  typeFilter === 'DEATH'
                    ? 'bg-crimson-50 text-crimson-800 font-semibold'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span>Ngày giỗ</span>
                <span className="w-2 h-2 rounded-full bg-crimson-500" />
              </button>
              <button
                onClick={() => setTypeFilter('COMMEMORATION')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-sans transition-colors flex items-center justify-between ${
                  typeFilter === 'COMMEMORATION'
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <span>Kỷ niệm / Hội họ</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-150 p-4 text-xs space-y-2 text-stone-600 font-sans">
            <h3 className="font-serif font-bold text-wood-900 border-b border-stone-100 pb-2 mb-3 text-sm">
              Chú giải bản đồ lịch
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-white border-2 border-gold-400 shadow-[0_0_6px_rgba(217,119,6,0.35)] block" />
              <span>Ngày có sự kiện dòng họ (phát sáng)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-crimson-500 block" />
              <span>Ký hiệu Ngày Giỗ cụ</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
              <span>Ký hiệu Lễ Kỷ niệm / Hội họp</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 block" />
              <span>Sự kiện khác</span>
            </div>
          </div>
        </div>

        {/* Right column: Main Calendar Grid or List */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Calendar Controller Bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-150 p-4 flex flex-wrap items-center justify-between gap-4">
            
            {/* Prev/Next Month buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-600 transition-colors"
                title="Tháng trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Dropdown Selectors */}
              <div className="flex items-center gap-2">
                <select
                  value={currentMonth}
                  onChange={e => setCurrentMonth(parseInt(e.target.value))}
                  className="bg-stone-50 border border-stone-200 rounded-xl py-1.5 px-3 text-sm font-bold text-wood-900 outline-none focus:border-gold-500"
                >
                  {months.map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>

                <select
                  value={currentYear}
                  onChange={e => setCurrentYear(parseInt(e.target.value))}
                  className="bg-stone-50 border border-stone-200 rounded-xl py-1.5 px-3 text-sm font-bold text-wood-900 outline-none focus:border-gold-500"
                >
                  {years.map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-600 transition-colors"
                title="Tháng sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm font-serif font-bold text-wood-800">
              Thời gian: Tháng {currentMonth} năm {currentYear}
            </div>
          </div>

          {activeView === 'GRID' ? (
            <>
              {/* 7-column Calendar Grid */}
              <div className="bg-white rounded-2xl shadow-sm border border-stone-150 p-6 overflow-hidden">
                
                {/* Weekdays header */}
                <div className="grid grid-cols-7 border-b border-stone-100 pb-3 mb-2 text-center text-xs font-bold font-sans text-stone-500 uppercase tracking-wider">
                  <div>T2</div>
                  <div>T3</div>
                  <div>T4</div>
                  <div>T5</div>
                  <div>T6</div>
                  <div className="text-gold-700">T7</div>
                  <div className="text-crimson-600">CN</div>
                </div>

                {/* Grid cells */}
                <div className="grid grid-cols-7 gap-2">
                  {gridCells.map((cell, index) => {
                    const cellEvents = getCellEvents(cell)
                    const hasEvents = cellEvents.length > 0
                    const isSelected = cell.isCurrentMonth && cell.dayNumber === selectedDay

                    // Cell colors and glow style
                    let cellClass = "min-h-[76px] p-2 rounded-xl border flex flex-col justify-between transition-all relative cursor-pointer "
                    if (!cell.isCurrentMonth) {
                      cellClass += "bg-stone-50/50 border-stone-100 opacity-30 text-stone-400 "
                    } else if (isSelected) {
                      cellClass += "bg-wood-900 border-wood-950 text-white shadow-md "
                    } else if (hasEvents) {
                      // Glowing cell for events
                      cellClass += "bg-amber-50/60 border-gold-400 shadow-[0_0_10px_rgba(217,119,6,0.3)] hover:bg-amber-100/70 text-wood-900 "
                    } else {
                      cellClass += "bg-white border-stone-100 hover:border-stone-300 hover:bg-stone-50 text-stone-800 "
                    }

                    return (
                      <div
                        key={`${cell.year}-${cell.month}-${cell.dayNumber}-${index}`}
                        onClick={() => {
                          if (cell.isCurrentMonth) {
                            setSelectedDay(cell.dayNumber)
                          }
                        }}
                        className={cellClass}
                      >
                        {/* Day indicator details */}
                        <div className="flex justify-between items-start">
                          {/* Event marker dots */}
                          <div className="flex gap-0.5 mt-0.5">
                            {cellEvents.slice(0, 3).map((ev, i) => {
                              let dotColor = "bg-blue-500"
                              if (ev.type === 'DEATH') dotColor = "bg-crimson-500 animate-pulse"
                              else if (ev.type === 'COMMEMORATION') dotColor = "bg-emerald-500"
                              return (
                                <span key={i} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              )
                            })}
                          </div>
                          
                          {/* Solar date (top right) */}
                          <span className={`text-sm font-bold font-sans ${isSelected ? 'text-white' : 'text-stone-800'}`}>
                            {cell.dayNumber}
                          </span>
                        </div>

                        {/* Lunar date (bottom) */}
                        <div className="text-right">
                          <span className={`text-[9px] font-sans block ${
                            isSelected ? 'text-gold-300 font-semibold' : 'text-stone-400'
                          }`}>
                            {cell.lunarDay === 1 ? `${cell.lunarDay}/${cell.lunarMonth}` : cell.lunarDay}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Selected Day Event Listing Panel */}
              <div className="bg-white rounded-2xl shadow-sm border border-stone-150 p-6">
                <h3 className="font-serif text-lg font-bold text-wood-900 border-b border-stone-100 pb-3 mb-4 flex items-center justify-between">
                  <span>
                    Chi tiết ngày {selectedDay} tháng {currentMonth} (Dương lịch)
                    {selectedCell && (
                      <span className="text-xs font-sans font-normal text-stone-500 ml-2 bg-stone-100 py-1 px-2.5 rounded-full">
                        Âm lịch: Ngày {selectedCell.lunarDay} tháng {selectedCell.lunarMonth}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-sans text-stone-400">
                    {selectedDayEvents.length} sự kiện
                  </span>
                </h3>

                {selectedDayEvents.length === 0 ? (
                  <div className="text-center py-10">
                    <AlertCircle className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                    <p className="text-stone-400 font-sans text-xs">Không có ngày giỗ hay sự kiện nào trong ngày này.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedDayEvents.map(ev => (
                      <div key={ev.key} className="p-4 rounded-xl border border-stone-100 bg-stone-50/40 hover:bg-stone-50 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h4 className="font-serif font-bold text-wood-900 text-base">{ev.title}</h4>
                            {ev.type === 'DEATH' ? (
                              <span className="text-[10px] font-medium text-crimson-600 bg-crimson-100/60 px-2 py-0.5 rounded-full">
                                Ngày giỗ
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                                Kỷ niệm
                              </span>
                            )}
                          </div>

                          {ev.description && (
                            <p className="text-stone-600 text-sm font-sans leading-relaxed mb-3">{ev.description}</p>
                          )}

                          <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 font-sans">
                            <span>Sự kiện: {ev.dateType === 'LUNAR' ? 'Lịch Âm' : 'Lịch Dương'} ({ev.day}/{ev.month})</span>
                            {ev.personId && (
                              <Link
                                to="/person/$id"
                                params={{ id: ev.personId.toString() }}
                                className="inline-flex items-center gap-0.5 text-gold-600 hover:text-gold-500 font-medium"
                              >
                                <User className="w-3 h-3" />
                                Xem hồ sơ thành viên
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Article link attachment */}
                        {ev.postId && (
                          <div className="flex-shrink-0 flex items-center">
                            <Link
                              to="/news/$id"
                              params={{ id: ev.postId.toString() }}
                              className="inline-flex items-center gap-1.5 bg-gold-600 hover:bg-gold-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all hover:-translate-y-0.5"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Xem bài viết chi tiết
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* List View */
            <div className="bg-white rounded-2xl shadow-sm border border-stone-150 p-6">
              <h2 className="font-serif text-xl font-bold text-wood-900 border-b border-stone-100 pb-3 mb-6">
                Danh sách sự kiện Tháng {currentMonth}
              </h2>

              {filteredEventsForList.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500 font-sans text-sm">Không có sự kiện nào trong tháng này.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredEventsForList.map(ev => (
                    <div key={ev.key} className="flex gap-4 p-4 rounded-xl border border-stone-100 hover:border-gold-200 transition-all">
                      <div className="w-14 h-14 rounded-xl bg-wood-900 text-white flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                        <span className="text-lg font-bold leading-none">{ev.day}</span>
                        <span className="text-[8px] font-medium text-gold-400 mt-1 uppercase">
                          {ev.dateType === 'LUNAR' ? 'ÂM LỊCH' : 'DƯƠNG'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-serif font-bold text-wood-900 text-base">{ev.title}</h3>
                          {ev.type === 'DEATH' ? (
                            <span className="text-[10px] font-medium text-crimson-600 bg-crimson-100/60 px-2 py-0.5 rounded-full">
                              Ngày giỗ
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                              Kỷ niệm
                            </span>
                          )}
                        </div>

                        {ev.description && (
                          <p className="text-stone-600 text-sm font-sans leading-relaxed mb-2">{ev.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs font-sans text-stone-400">
                          <span>Ngày {ev.day} tháng {ev.month} ({ev.dateType === 'LUNAR' ? 'Âm lịch' : 'Dương lịch'})</span>
                          {ev.personId && (
                            <Link 
                              to="/person/$id" 
                              params={{ id: ev.personId.toString() }}
                              className="inline-flex items-center gap-0.5 text-gold-600 hover:text-gold-500 font-medium"
                            >
                              <User className="w-3.5 h-3.5" />
                              Xem hồ sơ thành viên
                            </Link>
                          )}
                          {ev.postId && (
                            <Link 
                              to="/news/$id" 
                              params={{ id: ev.postId.toString() }}
                              className="inline-flex items-center gap-0.5 text-gold-600 hover:text-gold-500 font-medium font-semibold"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Xem bài viết liên quan
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
