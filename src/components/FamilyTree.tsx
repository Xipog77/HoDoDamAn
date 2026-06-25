'use client'
import { useCallback, useEffect, useState, useMemo } from 'react'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { User, ExternalLink, X } from 'lucide-react'
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
      className="relative transition-all duration-300 w-60"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" position={Position.Top} className="!bg-gold-500 !w-3 !h-3 !border-2 !border-white" />

      <div
        className={`rounded-xl border-2 bg-parchment shadow-lg transition-all duration-200 cursor-pointer
          ${data.selected ? 'border-gold-600 shadow-gold-500/50 shadow-xl scale-105' : hovered ? 'border-gold-500 shadow-gold-400/40 shadow-xl' : 'border-wood-600/40'}
          ${data.isDeceased ? 'opacity-80' : ''} p-3`}
        style={hovered || data.selected ? { filter: 'drop-shadow(0 0 8px rgba(202,160,68,0.6))' } : {}}
        onClick={() => data.onSelect(id)}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            {data.avatarUrl ? (
              <img src={data.avatarUrl} alt={data.name} className="w-14 h-14 rounded-full object-cover border-2 border-gold-400 shadow-sm" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-wood-500 to-wood-700 flex items-center justify-center border-2 border-gold-400 shadow-sm">
                <User className="w-7 h-7 text-gold-200" />
              </div>
            )}
            {data.isDeceased && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-stone-400 rounded-full border border-white text-white text-[0.625rem] flex items-center justify-center font-bold">🕯️</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-serif font-bold text-wood-900 text-sm leading-tight break-words">{data.name}</p>
            <p className="text-[0.6875rem] text-stone-500 font-sans mt-1">
              {data.birthYear || '?'}{data.deathYear ? ` – ${data.deathYear}` : ''}
              <span className="mx-1.5 text-stone-300">•</span>
              <span className="font-semibold text-wood-700">Đời {data.generation}</span>
            </p>
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
      {/* Dashed line background extending to the right */}
      <div className="absolute left-0 top-1/2 w-[10000px] h-0 border-t border-dashed border-wood-400/20 -z-10" />
    </div>
  )
}

const nodeTypes = { personNode: PersonNode, generationLabel: GenerationLabelNode }

function layoutWithDagre(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 })

  nodes.forEach(n => g.setNode(n.id, { width: 240, height: 90 }))
  edges.forEach(e => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - 120, y: pos.y - 45 } }
  })
}

export function FamilyTree({ branch = '' }: { branch?: string }) {
  return (
    <ReactFlowProvider>
      <FamilyTreeContent branch={branch} />
    </ReactFlowProvider>
  )
}

function FamilyTreeContent({ branch }: { branch: string }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loading, setLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [rawData, setRawData] = useState<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] })
  const [generationLevels, setGenerationLevels] = useState<Array<{ generation: number; y: number }>>([])
  const [extent, setExtent] = useState<[[number, number], [number, number]]>([
    [-10000, -10000],
    [10000, 10000],
  ])

  const { y: viewportY, zoom } = useViewport()

  const handleSelectNode = useCallback((id: string) => {
    setSelectedNodeId(prev => prev === id ? null : id)
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = branch ? `/api/persons/tree?branch=${encodeURIComponent(branch)}` : '/api/persons/tree'
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setRawData({ nodes: data.nodes || [], edges: data.edges || [] })
        setLoading(false)
        setSelectedNodeId(null)
      })
      .catch(() => setLoading(false))
  }, [branch])

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
      maxX = Math.max(maxX, n.position.x + 240)
      minY = Math.min(minY, n.position.y)
      maxY = Math.max(maxY, n.position.y + 90)
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
        strokeWidth: e.source === selectedNodeId || e.target === selectedNodeId ? 3 : 1.5 
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
  }, [selectedNodeId, rawData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-500 font-sans">Đang tải cây gia phả...</p>
        </div>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-stone-500 font-sans">Chưa có dữ liệu gia phả</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full relative overflow-hidden flex">
      {/* Generation Labels Fixed Left Panel */}
      <div className="absolute left-4 top-0 bottom-0 w-28 pointer-events-none z-10 overflow-hidden">
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
          minZoom={0.55}
          maxZoom={1.5}
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
            nodeColor={n => n.data.isDeceased ? '#9ca3af' : '#8B4513'}
            maskColor="rgba(139,69,19,0.05)"
            className="!bg-parchment !border-wood-300"
          />
        </ReactFlow>
      </div>

      {/* Sidebar Details */}
      {selectedPersonData && (
        <div className="w-80 bg-white border-l border-stone-200 shadow-xl overflow-y-auto h-full flex flex-col z-10 transition-transform animate-in slide-in-from-right-8 duration-300 shrink-0">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h3 className="font-serif font-bold text-wood-900 text-lg">Thông tin chi tiết</h3>
            <button onClick={() => setSelectedNodeId(null)} className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-5 flex-1">
            <div className="flex items-center gap-4 mb-6">
              {selectedPersonData.avatarUrl ? (
                <img src={selectedPersonData.avatarUrl} alt={selectedPersonData.name} className="w-16 h-16 rounded-full object-cover border-2 border-gold-300 shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-wood-500 to-wood-700 flex items-center justify-center border-2 border-gold-300 shadow-sm">
                  <User className="w-8 h-8 text-gold-200" />
                </div>
              )}
              <div>
                <h4 className="font-serif font-bold text-wood-900 text-lg leading-tight break-words">{selectedPersonData.name}</h4>
                <p className="text-sm text-stone-500 font-sans mt-1">
                  {selectedPersonData.birthYear || '?'}{selectedPersonData.deathYear ? ` – ${selectedPersonData.deathYear}` : ''}
                </p>
                {selectedPersonData.branch && <span className="inline-block mt-1 bg-wood-100 text-wood-700 text-[0.625rem] px-2 py-0.5 rounded-full font-medium">Chi {selectedPersonData.branch}</span>}
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
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 font-sans">Vợ / Chồng</p>
                <div className="flex flex-col gap-2">
                  {selectedPersonData.spouses.map(s => (
                    <Link key={s.id} to="/person/$id" params={{ id: s.id.toString() }} className="flex items-center gap-3 bg-crimson-50/50 border border-crimson-100 rounded-xl p-2 hover:bg-crimson-50 transition-colors group">
                      {s.avatarUrl ? (
                        <img src={s.avatarUrl} alt={s.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-crimson-300 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <span className="text-sm text-wood-800 font-medium font-serif flex-1">{s.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-crimson-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
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
                    <Link key={c.id} to="/person/$id" params={{ id: c.id.toString() }} className="flex items-center gap-3 bg-wood-50/50 border border-wood-100 rounded-xl p-2 hover:bg-wood-50 transition-colors group">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.gender === 'FEMALE' ? 'bg-crimson-300' : 'bg-wood-400'}`}>
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <span className="text-sm text-wood-800 font-medium font-serif flex-1">{c.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-wood-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
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
  )
}
