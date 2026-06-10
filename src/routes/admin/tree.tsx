import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { Network, Search, X, Plus, User } from 'lucide-react'
import { SearchableSelect } from '@/components/SearchableSelect'

export const Route = createFileRoute('/admin/tree')({
  component: AdminTree,
})

interface Person {
  id: number
  name: string
  generation: number | null
  branch: string | null
  fatherId: number | null
  motherId: number | null
  gender: string
}

function AdminTree() {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  
  const [form, setForm] = useState({
    fatherId: '' as string | number,
    generation: '',
    branch: '',
  })

  // For managing children/spouses locally
  const [spouses, setSpouses] = useState<Person[]>([])
  const [children, setChildren] = useState<Person[]>([])

  const load = async () => {
    try {
      const res = await fetch('/api/persons')
      const data = await res.json()
      setPersons(data.persons || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const selectedPerson = useMemo(() => persons.find(p => p.id === selectedId), [persons, selectedId])

  // Branches list
  const allBranches = useMemo(() => {
    const branches = new Set(persons.map(p => p.branch).filter(Boolean))
    return Array.from(branches) as string[]
  }, [persons])

  // Load detailed relations when selected
  useEffect(() => {
    if (selectedId && selectedPerson) {
      setForm({
        fatherId: selectedPerson.fatherId || '',
        generation: selectedPerson.generation?.toString() || '1',
        branch: selectedPerson.branch || '',
      })
      
      // Fetch full details (spouses, children)
      fetch(`/api/persons/${selectedId}`)
        .then(r => r.json())
        .then(data => {
          setSpouses(data.spouses || [])
          setChildren(data.children || [])
        })
    }
  }, [selectedId, selectedPerson])

  const saveBaseRelations = async () => {
    if (!selectedId) return
    const payload = {
      fatherId: form.fatherId ? parseInt(form.fatherId.toString()) : null,
      generation: form.generation ? parseInt(form.generation) : 1,
      branch: form.branch || null,
    }
    await fetch(`/api/persons/${selectedId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    alert('Đã lưu cấu trúc nhánh/đời thành công!')
    load()
  }

  const addSpouse = async (spouseId: number) => {
    if (!selectedPerson) return
    const isHusband = selectedPerson.gender === 'MALE'
    const husbandId = isHusband ? selectedPerson.id : spouseId
    const wifeId = isHusband ? spouseId : selectedPerson.id

    const res = await fetch('/api/persons/marriages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ husbandId, wifeId })
    })
    if (res.ok) {
      const spouse = persons.find(p => p.id === spouseId)
      if (spouse) setSpouses(prev => [...prev, spouse])
    }
  }

  const removeSpouse = async (spouseId: number) => {
    if (!selectedPerson) return
    const isHusband = selectedPerson.gender === 'MALE'
    const husbandId = isHusband ? selectedPerson.id : spouseId
    const wifeId = isHusband ? spouseId : selectedPerson.id

    const res = await fetch('/api/persons/marriages', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ husbandId, wifeId })
    })
    if (res.ok) {
      setSpouses(prev => prev.filter(s => s.id !== spouseId))
    }
  }

  const addChild = async (childId: number) => {
    if (!selectedPerson) return
    const isFather = selectedPerson.gender === 'MALE'
    const payload = isFather ? { fatherId: selectedPerson.id } : { motherId: selectedPerson.id }
    
    const res = await fetch(`/api/persons/${childId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (res.ok) {
      const child = persons.find(p => p.id === childId)
      if (child) setChildren(prev => [...prev, child])
      load()
    }
  }

  const removeChild = async (childId: number) => {
    if (!selectedPerson) return
    const isFather = selectedPerson.gender === 'MALE'
    const payload = isFather ? { fatherId: null } : { motherId: null }
    
    const res = await fetch(`/api/persons/${childId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (res.ok) {
      setChildren(prev => prev.filter(c => c.id !== childId))
      load()
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Network className="w-6 h-6 text-gold-600" />
        <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Cấu trúc Gia phả</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Select Person */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-stone-100 shadow-sm p-4 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
          <h2 className="font-serif font-semibold text-wood-900 mb-4">Danh sách Thành viên</h2>
          
          <div className="relative mb-4">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm..." 
              className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
              onChange={(e) => {
                const term = e.target.value.toLowerCase()
                document.querySelectorAll('.person-item').forEach(el => {
                  const txt = (el as HTMLElement).innerText.toLowerCase()
                  ;(el as HTMLElement).style.display = txt.includes(term) ? 'flex' : 'none'
                })
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-2">
            {persons.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`person-item w-full flex flex-col text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedId === p.id ? 'bg-gold-50 border border-gold-200' : 'hover:bg-stone-50 border border-transparent'
                }`}
              >
                <span className={`font-serif font-bold text-sm leading-snug truncate ${selectedId === p.id ? 'text-gold-800' : 'text-wood-900'}`}>{p.name}</span>
                <span className="text-xs text-stone-400 font-sans">Đời {p.generation} • {p.branch || 'Chưa xếp nhánh'}</span>
              </button>
            ))}
            {loading && <p className="text-sm text-stone-400 text-center py-4">Đang tải...</p>}
          </div>
        </div>

        {/* Right Column: Editor */}
        <div className="lg:col-span-2">
          {!selectedPerson ? (
            <div className="bg-stone-50 rounded-2xl border border-stone-100 border-dashed h-64 flex items-center justify-center">
              <p className="text-stone-400 font-sans">Vui lòng chọn một thành viên từ danh sách để thiết lập quan hệ</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Base Info */}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                <h2 className="font-serif font-bold text-xl text-wood-900 mb-1">{selectedPerson.name}</h2>
                <p className="text-sm text-stone-500 font-sans mb-6">Cập nhật gốc rễ và nhánh của thành viên này.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Father Autocomplete */}
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Người Cha</label>
                    <SearchableSelect 
                      options={persons.filter(p => p.gender === 'MALE' && p.id !== selectedId).map(p => ({ value: p.id, label: `${p.name} (Đời ${p.generation})` }))}
                      value={form.fatherId}
                      onChange={(val) => {
                        setForm(f => ({ ...f, fatherId: val }))
                        // Auto calc generation
                        const father = persons.find(p => p.id === val)
                        if (father && father.generation) {
                          setForm(f => ({ ...f, fatherId: val, generation: (father.generation! + 1).toString() }))
                        }
                      }}
                      placeholder="Chọn hoặc tìm tên Cha..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Đời (Thế hệ)</label>
                    <input type="number" value={form.generation} onChange={e => setForm(f => ({ ...f, generation: e.target.value }))}
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-stone-600 mb-2 font-sans">Chi / Cành</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {allBranches.map(b => (
                        <button key={b} onClick={() => setForm(f => ({ ...f, branch: b }))}
                          className={`px-3 py-1 text-xs rounded-full border transition-colors font-sans ${form.branch === b ? 'bg-gold-100 border-gold-300 text-gold-700 font-medium' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}>
                          {b}
                        </button>
                      ))}
                    </div>
                    <input type="text" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} placeholder="Nhập tên chi/cành mới..."
                      className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button onClick={saveBaseRelations} className="bg-gold-600 hover:bg-gold-500 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors font-sans">
                    Lưu gốc rễ
                  </button>
                </div>
              </div>

              {/* Spouses */}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                <h3 className="font-serif font-semibold text-wood-900 mb-4">Vợ / Chồng</h3>
                
                {spouses.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {spouses.map(s => (
                      <div key={s.id} className="flex items-center justify-between bg-stone-50 px-3 py-2 rounded-lg border border-stone-100">
                        <span className="font-serif font-bold text-sm text-wood-900 leading-snug">{s.name} <span className="text-xs font-normal text-stone-400 font-sans">(Đời {s.generation})</span></span>
                        <button onClick={() => removeSpouse(s.id)} className="text-stone-400 hover:text-crimson-600 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <SearchableSelect 
                      options={persons.filter(p => p.gender !== selectedPerson.gender && !spouses.find(s => s.id === p.id)).map(p => ({ value: p.id, label: `${p.name} (Đời ${p.generation})` }))}
                      value=""
                      onChange={val => {
                        if (val) addSpouse(val as number)
                      }}
                      placeholder="Thêm vợ/chồng..."
                    />
                  </div>
                </div>
              </div>

              {/* Children */}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-8">
                <h3 className="font-serif font-semibold text-wood-900 mb-4">Con cái</h3>
                
                {children.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {children.map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-stone-50 px-3 py-2 rounded-lg border border-stone-100">
                        <span className="font-serif font-bold text-sm text-wood-900 leading-snug">{c.name} <span className="text-xs font-normal text-stone-400 font-sans">(Đời {c.generation})</span></span>
                        <button onClick={() => removeChild(c.id)} className="text-stone-400 hover:text-crimson-600 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <SearchableSelect 
                      options={persons.filter(p => p.id !== selectedId && !children.find(c => c.id === p.id)).map(p => ({ value: p.id, label: `${p.name} (Đời ${p.generation})` }))}
                      value=""
                      onChange={val => {
                        if (val) addChild(val as number)
                      }}
                      placeholder="Chọn hồ sơ để thêm làm con..."
                    />
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
