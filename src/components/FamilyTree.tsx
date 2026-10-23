'use client'
import { useCallback, useEffect, useState, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  Handle,
  Position,
  MarkerType,
  ReactFlowProvider,
  useViewport,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { User, ExternalLink, X, Search, Filter, Printer, Maximize2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'

interface PersonData {
  id: number
  name: string
  gender: string
  birthYear: number | null
  deathYear: number | null
  avatarUrl: string | null
  generation: number
  branch: string | null
  biography: string | null
  isDeceased: boolean | null
  spouses: Array<{ id: number; name: string; avatarUrl: string | null }>
  children: Array<{ id: number; name: string; avatarUrl: string | null; gender: string }>
}

function PersonNode({ data, id }: { data: PersonData & { selected: boolean; onSelect: (id: string) => void }; id: string }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative transition-all duration-300 w-64"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gold-500 !w-3 !h-3 !border-2 !border-white" />

      <div
        className={`rounded-2xl border-2 bg-parchment shadow-md transition-all duration-200 cursor-pointer
          ${data.selected ? 'border-gold-600 shadow-gold-500/50 shadow-xl scale-105' : hovered ? 'border-gold-500 shadow-gold-400/40 shadow-lg' : 'border-wood-600/40 hover:border-gold-400/60'}
          ${data.isDeceased ? 'opacity-85' : ''} p-3.5`}
        style={hovered || data.selected ? { filter: 'drop-shadow(0 0 10px rgba(202,160,68,0.5))' } : {}}
        onClick={() => data.onSelect(id)}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt={data.name} className="w-14 h-14 rounded-full object-cover border-2 border-gold-400 shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-wood-600 to-wood-800 flex items-center justify-center border-2 border-gold-400 shadow-sm">
                <User className="w-7 h-7 text-gold-200" />
              </div>
            )}
            {data.isDeceased && (
              <div
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-stone-500 rounded-full border-2 border-white text-white text-[0.625rem] flex items-center justify-center shadow-sm"
                title="Đã quy tiên"
              >
                🕯️
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-serif font-bold text-wood-950 text-sm leading-tight break-words">{data.name}</p>
            <p className="text-[0.6875rem] text-stone-500 font-sans mt-1">
              {data.birthYear || '?'}{data.deathYear ? ` – ${data.deathYear}` : ''}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="font-semibold text-wood-800 text-[0.6875rem] bg-wood-100/80 px-2 py-0.5 rounded-md font-sans">
                Đời {data.generation}
              </span>
              {data.branch && (
                <span className="text-[0.625rem] bg-gold-100 text-gold-800 px-1.5 py-0.5 rounded-md font-sans font-medium">
                  {data.branch}
                </span>
              )}
              {data.children && data.children.length > 0 && (
                <span className="text-[0.625rem] bg-stone-200/70 text-stone-600 px-1.5 py-0.5 rounded-md font-sans">
                  {data.children.length} con
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gold-500 !w-3 !h-3 !border-2 !border-white" />
    </div>
  )
}

function GenerationLabelNode() {
  return (
    <div className="relative flex items-center h-[90px] pointer-events-none">
      <div className="absolute left-0 top-1/2 w-[10000px] h-0 border-t border-dashed border-wood-400/20 -z-10" />
    </div>
  )
}

const nodeTypes = { personNode: PersonNode, generationLabel: GenerationLabelNode }

function layoutWithDagre(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 })

  nodes.forEach(n => g.setNode(n.id, { width: 256, height: 96 }))
  edges.forEach(e => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - 128, y: pos.y - 48 } }
  })
}

export function FamilyTree({ branch = '' }: { branch?: string }) {
  return (
    <ReactFlowProvider>
      <FamilyTreeContent initialBranch={branch} />
    </ReactFlowProvider>
  )
}

function FamilyTreeContent({ initialBranch }: { initialBranch: string }) {
  const [selectedBranch, setSelectedBranch] = useState(initialBranch)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [rawData, setRawData] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] })
  const [generationLevels, setGenerationLevels] = useState<Array<{ generation: number; y: number }>>([])
  const [extent, setExtent] = useState<[[number, number], [number, number]]>([
    [-10000, -10000],
    [10000, 10000],
  ])

  // Search states
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const { y: viewportY, zoom } = useViewport()
  const { setCenter, fitView } = useReactFlow()

  const handleSelectNode = useCallback((id: string) => {
    setSelectedNodeId(prev => prev === id ? null : id)
  }, [])

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as unknown as HTMLElement)) {
        setShowSearchDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = selectedBranch ? `/api/persons/tree?branch=${encodeURIComponent(selectedBranch)}` : '/api/persons/tree'
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setRawData({ nodes: data.nodes || [], edges: data.edges || [] })
        setLoading(false)
        setSelectedNodeId(null)
      })
      .catch(() => setLoading(false))
  }, [selectedBranch])

  // Extract unique branches
  const availableBranches = useMemo(() => {
    const branches = new Set<string>()
    rawData.nodes.forEach(n => {
      const p = n.data as unknown as PersonData
      if (p.branch) branches.add(p.branch)
    })
    return Array.from(branches)
  }, [rawData.nodes])

  // Search matches
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return []
    const term = searchTerm.toLowerCase().trim()
    return rawData.nodes
      .filter(n => {
        const p = n.data as unknown as PersonData
        return p && p.name && p.name.toLowerCase().includes(term)
      })
      .slice(0, 8)
  }, [rawData.nodes, searchTerm])

  const focusPersonNode = (nodeId: string) => {
    const target = nodes.find(n => n.id === nodeId)
    if (target) {
      setCenter(target.position.x + 128, target.position.y + 48, { zoom: 1.15, duration: 800 })
      setSelectedNodeId(target.id)
      setSearchTerm('')
      setShowSearchDropdown(false)
    }
  }

  useEffect(() => {
    if (rawData.nodes.length === 0) return

    const laid = layoutWithDagre(rawData.nodes, rawData.edges)
    
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    const genYs = new Map<number, number>()

    const withSelected = laid.map(n => {
      minX = Math.min(minX, n.position.x)
      maxX = Math.max(maxX, n.position.x + 256)
      minY = Math.min(minY, n.position.y)
      maxY = Math.max(maxY, n.position.y + 96)
      const gen = (n.data as unknown as PersonData).generation
      if (gen !== undefined && !genYs.has(gen)) {
        genYs.set(gen, n.position.y)
      }
      return {
        ...n,
        data: { ...n.data, selected: n.id === selectedNodeId, onSelect: handleSelectNode },
      }
    })

    const generationNodes: Node[] = Array.from(genYs.entries()).map(([gen, y]) => ({
      id: `gen-label-${gen}`,
      type: 'generationLabel',
      position: { x: minX === Infinity ? 0 : minX - 220, y },
      data: { generation: gen },
      draggable: false,
      selectable: false,
    }))

    setNodes([...generationNodes, ...withSelected])
    setEdges(rawData.edges.map(e => ({
      ...e,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#8B4513', width: 16, height: 16 },
      style: { 
        stroke: e.source === selectedNodeId || e.target === selectedNodeId ? '#CA9A3A' : '#8B4513', 
        strokeWidth: e.source === selectedNodeId || e.target === selectedNodeId ? 3.5 : 1.5 
      },
      animated: e.source === selectedNodeId || e.target === selectedNodeId
    })))

    const levels = Array.from(genYs.entries()).map(([gen, y]) => ({ generation: gen, y }))
    setGenerationLevels(levels)

    if (minX !== Infinity) {
      const absoluteMinX = minX - 220
      const paddingX = 600
      const paddingYTop = 100
      const paddingYBottom = 200
      setExtent([
        [absoluteMinX - paddingX, minY - paddingYTop],
        [maxX + paddingX, maxY + paddingYBottom]
      ])
    }
  }, [selectedNodeId, handleSelectNode, setNodes, setEdges, rawData])

  const selectedPersonData = useMemo(() => {
    if (!selectedNodeId) return null
    const node = rawData.nodes.find(n => n.id === selectedNodeId)
    return node ? (node.data as unknown as PersonData) : null
  }, [selectedNodeId, rawData.nodes])

  const handlePrint = () => {
    fitView({ padding: 0.1, duration: 400 })
    setTimeout(() => {
      window.print()
    }, 500)
  }

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col">
      {/* Floating Toolbar */}
      <div className="no-print absolute top-3 left-3 right-3 sm:left-auto sm:right-4 z-20 flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-stone-200/80">
        {/* Quick Search */}
        <div ref={searchRef} className="relative flex-1 sm:w-60">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm người trên cây..."
            value={searchTerm}
            onFocus={() => setShowSearchDropdown(true)}
            onChange={e => {
              setSearchTerm(e.target.value)
              setShowSearchDropdown(true)
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold-300 focus:bg-white outline-none font-sans transition-all"
          />

          {/* Search suggestions dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-stone-200 rounded-xl shadow-2xl py-1.5 max-h-64 overflow-y-auto z-30 font-sans divide-y divide-stone-50">
              {searchResults.map(n => {
                const p = n.data as unknown as PersonData
                return (
                  <button
                    key={n.id}
                    onClick={() => focusPersonNode(n.id)}
                    className="w-full text-left px-3 py-2 hover:bg-gold-50 flex items-center gap-2.5 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-full bg-wood-100 flex items-center justify-center text-wood-700 text-xs font-serif font-bold flex-shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-wood-900 group-hover:text-gold-700 truncate font-serif">{p.name}</p>
                      <p className="text-[10px] text-stone-400">
                        Đời {p.generation} {p.branch ? `• ${p.branch}` : ''} {p.birthYear ? `• ${p.birthYear}` : ''}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Branch Filter Dropdown */}
        <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1 text-xs text-stone-600 font-sans">
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-gold-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          ) : (
            <Filter className="w-3.5 h-3.5 text-stone-400" />
          )}
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="bg-transparent outline-none cursor-pointer pr-1 text-xs font-medium text-wood-800"
          >
            <option value="">Tất cả các chi ({rawData.nodes.length} người)</option>
            {availableBranches.map(b => (
              <option key={b} value={b}>Chi {b}</option>
            ))}
          </select>
        </div>

        {/* Fit view button */}
        <button
          onClick={() => fitView({ padding: 0.2, duration: 600 })}
          className="p-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl text-stone-600 hover:text-wood-800 transition-colors shadow-sm"
          title="Xem toàn cảnh phả đồ"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-600 hover:bg-gold-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all hover:scale-105 font-sans"
          title="In phả đồ hoặc lưu PDF khổ lớn"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">In phả đồ</span>
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="w-full flex-1 relative overflow-hidden flex">
        {/* Generation Labels Fixed Left Panel */}
        <div className="no-print absolute left-4 top-0 bottom-0 w-28 pointer-events-none z-10 overflow-hidden">
          {generationLevels.map(lvl => {
            const top = lvl.y * zoom + viewportY
            return (
              <div
                key={lvl.generation}
                className="absolute left-0 transition-transform duration-75"
                style={{
                  transform: `translateY(${top}px) translateY(-50%)`,
                }}
              >
                <div className="text-wood-800 font-serif font-bold text-xs whitespace-nowrap bg-parchment/95 px-3 py-1.5 rounded-lg border border-wood-400/40 shadow-md">
                  Đời thứ {lvl.generation}
                </div>
              </div>
            )
          })}
        </div>

        {/* Tree Canvas */}
        <div className="flex-1 relative h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.4}
            maxZoom={1.6}
            nodesDraggable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={true}
            translateExtent={extent}
            className="bg-parchment/30"
            onPaneClick={() => setSelectedNodeId(null)}
          >
            <Background color="#8B4513" gap={32} size={1} style={{ opacity: 0.08 }} />
            <Controls className="!bg-wood-800 !border-wood-600" />
            <MiniMap
              nodeColor={n => (n.data as any)?.isDeceased ? '#9ca3af' : '#8B4513'}
              maskColor="rgba(139,69,19,0.05)"
              className="!bg-parchment !border-wood-300"
            />
          </ReactFlow>
        </div>

        {/* Sidebar Details Drawer */}
        {selectedPersonData && (
          <div className="no-print w-80 bg-white border-l border-stone-200 shadow-xl overflow-y-auto h-full flex flex-col z-20 transition-transform animate-in slide-in-from-right-8 duration-300 shrink-0">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-serif font-bold text-wood-900 text-lg">Hồ Sơ Thành Viên</h3>
              <button onClick={() => setSelectedNodeId(null)} className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 flex-1">
              <div className="flex items-center gap-4 mb-6">
                {selectedPersonData.avatarUrl ? (
                  <img src={selectedPersonData.avatarUrl} alt={selectedPersonData.name} className="w-16 h-16 rounded-full object-cover border-2 border-gold-300 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-wood-600 to-wood-800 flex items-center justify-center border-2 border-gold-300 shadow-sm">
                    <User className="w-8 h-8 text-gold-200" />
                  </div>
                )}
                <div>
                  <h4 className="font-serif font-bold text-wood-900 text-lg leading-tight break-words">{selectedPersonData.name}</h4>
                  <p className="text-sm text-stone-500 font-sans mt-1">
                    {selectedPersonData.birthYear || '?'}{selectedPersonData.deathYear ? ` – ${selectedPersonData.deathYear}` : ''}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-xs bg-wood-100 text-wood-800 px-2 py-0.5 rounded-full font-medium font-sans">
                      Đời {selectedPersonData.generation}
                    </span>
                    {selectedPersonData.branch && (
                      <span className="text-xs bg-gold-100 text-gold-800 px-2 py-0.5 rounded-full font-medium font-sans">
                        Chi {selectedPersonData.branch}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedPersonData.biography && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 font-sans">Tiểu sử</p>
                  <p className="text-sm text-stone-600 font-sans leading-relaxed">{selectedPersonData.biography}</p>
                </div>
              )}

              {selectedPersonData.spouses.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 font-sans">Vợ / Chồng ({selectedPersonData.spouses.length})</p>
                  <div className="flex flex-col gap-2">
                    {selectedPersonData.spouses.map(s => (
                      <Link key={s.id} to="/person/$id" params={{ id: s.id.toString() }} className="flex items-center gap-3 bg-crimson-50/50 border border-crimson-100 rounded-xl p-2.5 hover:bg-crimson-50 transition-colors group">
                        {s.avatarUrl ? (
                          <img src={s.avatarUrl} alt={s.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-crimson-300 flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <span className="text-sm text-wood-900 font-medium font-serif flex-1">{s.name}</span>
                        <ExternalLink className="w-4 h-4 text-crimson-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {selectedPersonData.children.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 font-sans">Con cái ({selectedPersonData.children.length})</p>
                  <div className="flex flex-col gap-2">
                    {selectedPersonData.children.map(c => (
                      <Link key={c.id} to="/person/$id" params={{ id: c.id.toString() }} className="flex items-center gap-3 bg-wood-50/50 border border-wood-100 rounded-xl p-2.5 hover:bg-wood-50 transition-colors group">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt={c.name} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${c.gender === 'FEMALE' ? 'bg-crimson-300' : 'bg-wood-500'}`}>
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <span className="text-sm text-wood-900 font-medium font-serif flex-1">{c.name}</span>
                        <ExternalLink className="w-4 h-4 text-wood-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-stone-100 bg-stone-50 mt-auto sticky bottom-0">
              <Link
                to="/person/$id"
                params={{ id: selectedPersonData.id.toString() }}
                className="flex items-center justify-center gap-2 w-full bg-gold-600 hover:bg-gold-500 text-white text-sm rounded-xl py-2.5 transition-colors font-medium shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Truy cập Hồ sơ đầy đủ
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
