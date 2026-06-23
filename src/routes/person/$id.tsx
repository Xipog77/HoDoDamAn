import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState, useCallback } from 'react'
import { User, Calendar, Heart, MessageSquare, Edit3, Send, MapPin, BookOpen, Image as ImageIcon, X, Plus, ExternalLink, Trash2, Phone, Mail, Briefcase, Home, Globe } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { profileCovers } from '@/lib/background-images'


export const Route = createFileRoute('/person/$id')({
  component: PersonPage,
})

interface PersonDetail {
  person: {
    id: number; name: string; gender: string; birthYear: number | null; deathYear: number | null;
    dob: string | null; dod: string | null; dodLunar: string | null; biography: string | null;
    fullBiography: string | null;
    achievements: string | null;
    avatarUrl: string | null; birthplace: string | null;
    residence: string | null; burialPlace: string | null;
    generation: number; branch: string | null; isDeceased: boolean | null;
    phone: string | null; email: string | null;
    socialLinks: { facebook?: string; zalo?: string; tiktok?: string; youtube?: string } | null;
    occupation: string | null; currentAddress: string | null;
    contactVisibility: { phone?: boolean; email?: boolean; social?: boolean } | null;
  }
  father: { id: number; name: string; avatarUrl: string | null } | null
  mother: { id: number; name: string; avatarUrl: string | null } | null
  spouses: Array<{ id: number; name: string; avatarUrl: string | null }>
  children: Array<{ id: number; name: string; avatarUrl: string | null; gender: string }>
  memories: Array<{ id: number; authorName: string; content: string; createdAt: string }>
}

interface MediaItem {
  id: number; filename: string; url: string; mimeType: string | null;
  source: string; caption: string | null; createdAt: string;
}

function PersonPage() {
  const { id } = Route.useParams()
  const { user, isAdmin, loading: authLoading, isMember } = useAuth()
  const [data, setData] = useState<PersonDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [memoryName, setMemoryName] = useState('')
  const [memoryText, setMemoryText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'achievements' | 'gallery' | 'memory'>('info')

  const [isEditingBio, setIsEditingBio] = useState(false)
  const [savingBio, setSavingBio] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Mô tả chi tiết cuộc đời, sự nghiệp, câu chuyện về người này...' }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: '',
  })

  useEffect(() => {
    if (data?.person && editor && !isEditingBio) {
      editor.commands.setContent(data.person.fullBiography || '')
    }
  }, [data?.person, editor, isEditingBio])

  const saveBiography = async () => {
    if (!editor) return
    setSavingBio(true)
    try {
      const res = await fetch(`/api/persons/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullBiography: editor.getHTML() }),
      })
      if (res.ok) {
        setIsEditingBio(false)
        loadData()
      } else {
        const err = await res.json()
        alert(err.error || 'Lỗi khi lưu cuộc đời')
      }
    } catch (e) {
      console.error(e)
      alert('Không thể kết nối đến máy chủ')
    } finally {
      setSavingBio(false)
    }
  }

  useEffect(() => {
    if (user?.displayName) {
      setMemoryName(user.displayName)
    }
  }, [user])

  // Media
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // Upload / Embed
  const [showMediaForm, setShowMediaForm] = useState(false)
  const [mediaMode, setMediaMode] = useState<'upload' | 'embed'>('upload')
  const [embedUrl, setEmbedUrl] = useState('')
  const [embedCaption, setEmbedCaption] = useState('')

  const loadData = useCallback(() => {
    fetch(`/api/persons/${id}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const loadMedia = useCallback(() => {
    fetch(`/api/media?personId=${id}`)
      .then(r => r.json())
      .then(d => setMediaList(d.media || []))
      .catch(console.error)
  }, [id])

  useEffect(() => { loadData(); loadMedia() }, [loadData, loadMedia])

  const submitMemory = async () => {
    if (!memoryName.trim() || !memoryText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorName: memoryName, content: memoryText }),
      })
      if (res.ok) {
        const { memory } = await res.json()
        setData(prev => prev ? { ...prev, memories: [memory, ...prev.memories] } : prev)
        setMemoryText('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('personId', id)
    const res = await fetch('/api/media', { method: 'POST', body: formData })
    if (res.ok) { loadMedia(); setShowMediaForm(false) }
  }

  const handleEmbed = async () => {
    if (!embedUrl.trim()) return
    const res = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: embedUrl, filename: 'embed', personId: id, caption: embedCaption || null }),
    })
    if (res.ok) { loadMedia(); setEmbedUrl(''); setEmbedCaption(''); setShowMediaForm(false) }
  }

  const deleteMedia = async (mediaId: number) => {
    if (!confirm('Xóa media này?')) return
    await fetch(`/api/media/${mediaId}`, { method: 'DELETE' })
    loadMedia()
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-stone-200 rounded-2xl" />
          <div className="h-32 bg-stone-200 rounded-2xl" />
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
            Hồ sơ chi tiết dòng họ Đỗ Đàm An chỉ dành cho thành viên đã đăng nhập và được ban quản trị phê duyệt.
          </p>
          <Link
            to="/login"
            search={{ redirect: typeof window !== 'undefined' ? window.location.pathname : '' }}
            className="block w-full bg-gold-600 hover:bg-gold-500 text-white text-sm font-medium py-3 rounded-xl transition-colors mb-3"
          >
            Đăng nhập ngay
          </Link>
          <p className="text-xs text-stone-400 font-sans">
            Chưa có tài khoản? Đăng ký hoặc liên hệ ban quản trị để được duyệt.
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-stone-500 font-sans">Không tìm thấy hồ sơ</p>
      </div>
    )
  }

  const { person, father, mother, spouses, children, memories } = data
  const hasBiography = !!(person.fullBiography || isAdmin || (user && user.personId === person.id))

  const isVideo = (url: string, mime: string | null) => {
    if (mime?.startsWith('video/')) return true
    return /youtube\.com|youtu\.be|vimeo\.com|drive\.google\.com.*video/i.test(url)
  }

  const getEmbedUrl = (url: string) => {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
    // Google Drive
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`
    return url
  }

  const tabs = [
    { key: 'info', label: 'Thông tin', icon: User },
    ...(person.achievements ? [{ key: 'achievements', label: 'Công trạng', icon: BookOpen }] : []),
    { key: 'gallery', label: `Hình ảnh (${mediaList.length})`, icon: ImageIcon },
    { key: 'memory', label: `Ký ức (${memories.length})`, icon: MessageSquare },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Profile Header — Full Width */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden mb-6">
        <div 
          className="h-32 sm:h-40 bg-cover bg-center bg-no-repeat bg-fixed relative"
          style={{
            backgroundImage: `url("${profileCovers[person.id % profileCovers.length] || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200'}")`
          }}
        >
          <div className="absolute inset-0 bg-wood-950/50" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-30" />
        </div>
        <div className="px-6 lg:px-10 pb-6">
          <div className="flex flex-col lg:flex-row gap-6 -mt-16 relative z-10">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {person.avatarUrl ? (
                <img src={person.avatarUrl} alt={person.name} className="w-28 h-28 rounded-2xl object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-wood-500 to-wood-700 border-4 border-white shadow-lg flex items-center justify-center">
                  <User className="w-14 h-14 text-gold-200" />
                </div>
              )}
            </div>

            {/* Name & badges */}
            <div className="flex-1 lg:mt-18 lg:pt-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-wood-900">{person.name}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-stone-500 font-sans">
                    {person.birthYear && (
                      <span className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1 rounded-lg">
                        <Calendar className="w-3.5 h-3.5" />
                        {person.birthYear}{person.deathYear ? ` – ${person.deathYear}` : ''}
                      </span>
                    )}
                    {person.generation && <span className="bg-gold-100 text-gold-800 text-xs px-3 py-1 rounded-full font-semibold">Đời thứ {person.generation}</span>}
                    {person.branch && <span className="bg-wood-100 text-wood-700 text-xs px-3 py-1 rounded-full font-medium">Chi {person.branch}</span>}
                    {person.isDeceased && <span className="bg-stone-100 text-stone-600 text-xs px-2.5 py-1 rounded-full">Đã mất</span>}
                  </div>
                  {person.dodLunar && (
                    <p className="text-sm text-crimson-600 mt-2 font-sans font-medium">🕯️ Ngày giỗ (âm lịch): {person.dodLunar}</p>
                  )}
                  {person.biography && (
                    <p className="text-stone-600 text-sm font-sans italic mt-3 bg-stone-50 px-4 py-2 rounded-xl border-l-4 border-gold-500 max-w-2xl">{person.biography}</p>
                  )}
                </div>
                <Link to="/tree" className="text-sm text-gold-600 hover:text-gold-500 flex items-center gap-1 font-medium bg-gold-50 px-3 py-2 rounded-xl hover:bg-gold-100 transition-colors">
                  ← Gia phả
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === key ? 'bg-white shadow text-wood-800' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* TAB: Thông tin */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Biography — spans 2 cols */}
          {hasBiography && (
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
                <h2 className="font-serif font-bold text-lg text-wood-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-gold-600" /> Cuộc đời
                </h2>
                {(isAdmin || (user && user.personId === person.id)) && !isEditingBio && (
                  <button
                    onClick={() => setIsEditingBio(true)}
                    className="text-xs bg-gold-50 text-gold-700 hover:bg-gold-100 border border-gold-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium transition-colors font-sans"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa cuộc đời
                  </button>
                )}
              </div>

              {isEditingBio ? (
                <div className="space-y-4">
                  <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                    <div className="bg-stone-100 px-3 py-1.5 border-b border-stone-200 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleBold().run()}
                        className={`px-2 py-1 text-xs rounded font-medium ${editor?.isActive('bold') ? 'bg-white shadow text-wood-800' : 'text-stone-500 hover:bg-white/50'}`}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleItalic().run()}
                        className={`px-2 py-1 text-xs rounded font-medium italic ${editor?.isActive('italic') ? 'bg-white shadow text-wood-800' : 'text-stone-500 hover:bg-white/50'}`}
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                        className={`px-2 py-1 text-xs rounded font-medium ${editor?.isActive('heading', { level: 3 }) ? 'bg-white shadow text-wood-800' : 'text-stone-500 hover:bg-white/50'}`}
                      >
                        H3
                      </button>
                      <button
                        type="button"
                        onClick={() => editor?.chain().focus().toggleBulletList().run()}
                        className={`px-2 py-1 text-xs rounded font-medium ${editor?.isActive('bulletList') ? 'bg-white shadow text-wood-800' : 'text-stone-500 hover:bg-white/50'}`}
                      >
                        Danh sách
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt('Nhập URL hình ảnh:')
                          if (url) {
                            editor?.chain().focus().setImage({ src: url }).run()
                          }
                        }}
                        className="px-2 py-1 text-xs rounded font-medium text-stone-500 hover:bg-white/50 flex items-center gap-0.5"
                      >
                        <ImageIcon className="w-3 h-3" /> Ảnh
                      </button>
                    </div>
                    <div className="p-3 bg-white min-h-[300px]">
                      <EditorContent editor={editor} className="prose prose-stone max-w-none min-h-[300px] outline-none" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setIsEditingBio(false)
                        editor?.commands.setContent(person.fullBiography || '')
                      }}
                      className="px-4 py-2 border border-stone-200 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors font-sans"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={saveBiography}
                      disabled={savingBio}
                      className="px-4 py-2 bg-gold-600 text-white rounded-xl text-sm font-medium hover:bg-gold-500 disabled:opacity-50 transition-colors font-sans"
                    >
                      {savingBio ? 'Đang lưu...' : 'Lưu lại'}
                    </button>
                  </div>
                </div>
              ) : (
                person.fullBiography ? (
                  <div
                    className="prose prose-stone prose-lg max-w-none font-sans text-stone-700 leading-relaxed
                      prose-headings:font-serif prose-headings:text-wood-900
                      prose-a:text-gold-600 prose-a:no-underline hover:prose-a:underline
                      prose-img:rounded-xl prose-img:shadow-md prose-img:mx-auto prose-img:block"
                    dangerouslySetInnerHTML={{ __html: person.fullBiography }}
                  />
                ) : (
                  <div className="text-center py-8 text-stone-400 font-sans">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 text-stone-200" />
                    <p className="text-sm">Chưa có thông tin chi tiết cuộc đời.</p>
                    <button
                      onClick={() => setIsEditingBio(true)}
                      className="mt-2 text-xs text-gold-600 hover:text-gold-500 font-semibold underline"
                    >
                      Thêm ngay
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {/* Right column containing both Basic Info and Family */}
          <div className={hasBiography ? "lg:col-span-1 space-y-6" : "lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6"}>
            {/* Personal info */}
            <div className={`bg-white rounded-2xl shadow-sm border border-stone-100 p-6 ${!hasBiography ? "lg:col-span-1" : ""}`}>
              <h2 className="font-serif font-bold text-lg text-wood-900 mb-4">Thông tin cơ bản</h2>
              <div className="space-y-3 text-sm font-sans">
                {person.birthplace && <InfoRow icon={MapPin} label="Nơi sinh" value={person.birthplace} />}
                {person.residence && <InfoRow icon={MapPin} label="Nơi sống" value={person.residence} />}
                {person.burialPlace && <InfoRow icon={MapPin} label="Nơi an táng" value={person.burialPlace} />}
                {person.dob && <InfoRow icon={Calendar} label="Ngày sinh" value={person.dob} />}
                {person.dod && <InfoRow icon={Calendar} label="Ngày mất" value={person.dod} />}
                {person.dodLunar && <InfoRow icon={Calendar} label="Ngày mất (âm)" value={person.dodLunar} />}
                {person.occupation && <InfoRow icon={Briefcase} label="Nghề nghiệp" value={person.occupation} />}
                {person.currentAddress && <InfoRow icon={Home} label="Nơi ở hiện tại" value={person.currentAddress} />}

                {/* SĐT */}
                {(isAdmin || (user && user.personId === person.id) || (person.contactVisibility?.phone && person.phone)) ? (
                  person.phone && <InfoRow icon={Phone} label="Số điện thoại" value={person.phone} />
                ) : (
                  person.phone && <InfoRow icon={Phone} label="Số điện thoại" value="🔒 Ẩn (Riêng tư)" />
                )}

                {/* Email */}
                {(isAdmin || (user && user.personId === person.id) || (person.contactVisibility?.email && person.email)) ? (
                  person.email && <InfoRow icon={Mail} label="Email" value={person.email} />
                ) : (
                  person.email && <InfoRow icon={Mail} label="Email" value="🔒 Ẩn (Riêng tư)" />
                )}

                {/* Mạng xã hội */}
                {person.socialLinks && (Object.values(person.socialLinks).some(Boolean)) && (
                  <div className="flex items-start gap-3">
                    <Globe className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-stone-400 text-xs">Mạng xã hội</span>
                      {(isAdmin || (user && user.personId === person.id) || person.contactVisibility?.social) ? (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {person.socialLinks.facebook && (
                            <a href={person.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-xs bg-stone-50 border border-stone-200 text-gold-700 hover:text-gold-600 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-sans">
                              Facebook <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {person.socialLinks.zalo && (
                            <span className="text-xs bg-stone-50 border border-stone-200 text-stone-700 px-2 py-1 rounded-lg font-sans">
                              Zalo: {person.socialLinks.zalo}
                            </span>
                          )}
                          {person.socialLinks.tiktok && (
                            <a href={person.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="text-xs bg-stone-50 border border-stone-200 text-gold-700 hover:text-gold-600 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-sans">
                              TikTok <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          {person.socialLinks.youtube && (
                            <a href={person.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="text-xs bg-stone-50 border border-stone-200 text-gold-700 hover:text-gold-600 px-2 py-1 rounded-lg transition-colors flex items-center gap-1 font-sans">
                              YouTube <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-stone-700 font-medium mt-0.5">🔒 Ẩn (Riêng tư)</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Family */}
            <div className={`bg-white rounded-2xl shadow-sm border border-stone-100 p-6 ${!hasBiography ? "lg:col-span-2" : ""}`}>
              <h2 className="font-serif font-bold text-lg text-wood-900 mb-4">Gia đình</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {father && (
                  <div>
                    <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-1 font-sans">Cha</p>
                    <PersonLink person={father} />
                  </div>
                )}
                {mother && (
                  <div>
                    <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-1 font-sans">Mẹ</p>
                    <PersonLink person={mother} />
                  </div>
                )}
                {spouses.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-1 font-sans">Vợ / Chồng</p>
                    <div className="space-y-1">
                      {spouses.map(s => <PersonLink key={s.id} person={s} />)}
                    </div>
                  </div>
                )}
                {children.length > 0 && (
                  <div className="sm:col-span-2">
                    <p className="text-xs text-stone-400 font-semibold uppercase tracking-wide mb-1 font-sans">Con cái ({children.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {children.map(c => <PersonLink key={c.id} person={c} compact />)}
                    </div>
                  </div>
                )}
                {!father && !mother && spouses.length === 0 && children.length === 0 && (
                  <p className="text-xs text-stone-400 italic font-sans sm:col-span-2">Chưa cập nhật thông tin gia đình</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Công trạng */}
      {activeTab === 'achievements' && person.achievements && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
          <h2 className="font-serif font-bold text-xl text-wood-900 mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-gold-600" /> Công trạng & Sự nghiệp
          </h2>
          <div
            className="prose prose-stone max-w-none font-sans text-stone-700 leading-relaxed prose-img:rounded-xl prose-img:shadow-md"
            dangerouslySetInnerHTML={{ __html: person.achievements }}
          />
        </div>
      )}

      {/* TAB: Gallery */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          {/* Admin: Add media */}
          {isAdmin && (
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif font-semibold text-wood-900">Thêm Hình ảnh / Video</h2>
                <button onClick={() => setShowMediaForm(!showMediaForm)} className="flex items-center gap-1.5 bg-gold-600 hover:bg-gold-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" />
                  Thêm media
                </button>
              </div>

              {showMediaForm && (
                <div className="border border-stone-200 rounded-xl p-4 space-y-4">
                  <div className="flex gap-2">
                    <button onClick={() => setMediaMode('upload')} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${mediaMode === 'upload' ? 'bg-gold-100 text-gold-700 border border-gold-300' : 'bg-stone-50 text-stone-600 border border-stone-200'}`}>
                      Tải ảnh lên
                    </button>
                    <button onClick={() => setMediaMode('embed')} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${mediaMode === 'embed' ? 'bg-gold-100 text-gold-700 border border-gold-300' : 'bg-stone-50 text-stone-600 border border-stone-200'}`}>
                      Nhúng link ngoài
                    </button>
                  </div>

                  {mediaMode === 'upload' ? (
                    <div>
                      <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="text-sm font-sans" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="URL ảnh/video (Imgur, Google Drive, YouTube...)"
                        value={embedUrl}
                        onChange={e => setEmbedUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                      />
                      <input
                        type="text"
                        placeholder="Chú thích (không bắt buộc)"
                        value={embedCaption}
                        onChange={e => setEmbedCaption(e.target.value)}
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                      />
                      <button onClick={handleEmbed} className="bg-gold-600 hover:bg-gold-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                        Nhúng
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Gallery Grid */}
          {mediaList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {mediaList.map(m => (
                <div key={m.id} className="group relative bg-white rounded-xl border border-stone-100 shadow-sm overflow-hidden">
                  {isVideo(m.url, m.mimeType) ? (
                    m.source === 'EXTERNAL' ? (
                      <iframe src={getEmbedUrl(m.url)} className="w-full aspect-video" allowFullScreen />
                    ) : (
                      <video src={m.url} controls className="w-full aspect-video object-cover" />
                    )
                  ) : (
                    <img
                      src={m.url}
                      alt={m.caption || m.filename}
                      className="w-full aspect-square object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setLightboxUrl(m.url)}
                    />
                  )}
                  {m.caption && (
                    <div className="px-3 py-2">
                      <p className="text-xs text-stone-600 font-sans truncate">{m.caption}</p>
                    </div>
                  )}
                  {isAdmin && (
                    <button onClick={() => deleteMedia(m.id)}
                      className="absolute top-2 right-2 bg-white/90 text-crimson-600 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-crimson-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {m.source === 'EXTERNAL' && !isVideo(m.url, m.mimeType) && (
                    <a href={m.url} target="_blank" rel="noreferrer"
                      className="absolute top-2 left-2 bg-white/90 text-stone-500 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:text-gold-600">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-stone-400 font-sans bg-white rounded-2xl border border-stone-100">
              <ImageIcon className="w-12 h-12 mx-auto mb-3 text-stone-200" />
              <p>Chưa có hình ảnh / video nào</p>
              {isAdmin && <p className="text-xs mt-1">Nhấn "Thêm media" để bắt đầu</p>}
            </div>
          )}
        </div>
      )}

      {/* TAB: Ký ức */}
      {activeTab === 'memory' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h2 className="font-serif font-semibold text-wood-900 mb-4 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-gold-600" /> Để lại lời tri ân
            </h2>
            <div className="space-y-3">
              <input type="text" placeholder="Tên của bạn" value={memoryName} onChange={e => setMemoryName(e.target.value)}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans" />
              <textarea placeholder="Chia sẻ kỷ niệm, lời tri ân, hoặc câu chuyện về người này..." value={memoryText} onChange={e => setMemoryText(e.target.value)} rows={4}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none resize-none font-sans" />
              <button onClick={submitMemory} disabled={submitting || !memoryName.trim() || !memoryText.trim()}
                className="flex items-center gap-2 bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                <Send className="w-4 h-4" />{submitting ? 'Đang gửi...' : 'Gửi lời tri ân'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {memories.map(m => (
              <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-gold-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gold-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-wood-800 text-sm font-serif">{m.authorName}</p>
                    <p className="text-xs text-stone-400 font-sans">{new Date(m.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  </div>
                </div>
                <p className="text-stone-600 text-sm font-sans leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {memories.length === 0 && (
              <div className="text-center py-12 text-stone-400 font-sans">
                <Heart className="w-10 h-10 mx-auto mb-3 text-stone-200" />
                <p>Hãy là người đầu tiên để lại lời tri ân</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70 z-10">
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-stone-400 text-xs">{label}</span>
        <p className="text-stone-700 font-medium">{value}</p>
      </div>
    </div>
  )
}

function PersonLink({ person, compact = false }: { person: { id: number; name: string; avatarUrl: string | null }; compact?: boolean }) {
  return (
    <Link to="/person/$id" params={{ id: person.id.toString() }} className={`flex items-center gap-2 hover:bg-gold-50 rounded-lg transition-colors ${compact ? 'px-2 py-1 border border-stone-200 hover:border-gold-200' : 'p-2'}`}>
      {person.avatarUrl ? (
        <img src={person.avatarUrl} alt={person.name} className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover border border-gold-200`} />
      ) : (
        <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-wood-200 flex items-center justify-center`}>
          <User className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-wood-600`} />
        </div>
      )}
      <span className={`${compact ? 'text-xs' : 'text-sm'} text-wood-800 font-medium font-serif`}>{person.name}</span>
    </Link>
  )
}
