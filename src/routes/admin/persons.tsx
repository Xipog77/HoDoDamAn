import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { TreePine, Plus, X, Edit2, Trash2, Search, User, ImageIcon, FileText, Upload, Link2, Trash } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import ImageExtension from '@tiptap/extension-image'

export const Route = createFileRoute('/admin/persons')({
  component: AdminPersons,
})

interface Person {
  id: number
  name: string
  gender: string
  birthYear: number | null
  deathYear: number | null
  generation: number | null
  branch: string | null
  isDeceased: boolean | null
  biography: string | null
  fullBiography: string | null
  dob: string | null
  dod: string | null
  avatarUrl: string | null
}

interface MediaItem {
  id: number
  filename: string
  url: string
  caption: string | null
  createdAt: string
}

function AdminPersons() {
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [gender, setGender] = useState('MALE')
  const [dob, setDob] = useState('')
  const [dod, setDod] = useState('')
  const [biography, setBiography] = useState('')
  const [isDeceased, setIsDeceased] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [socialLinks, setSocialLinks] = useState({ facebook: '', zalo: '', tiktok: '', youtube: '' })
  const [occupation, setOccupation] = useState('')
  const [currentAddress, setCurrentAddress] = useState('')
  const [contactVisibility, setContactVisibility] = useState({ phone: false, email: false, social: false })
  const [saving, setSaving] = useState(false)

  // Media List State
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [showMediaForm, setShowMediaForm] = useState(false)
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaCaption, setMediaCaption] = useState('')
  const [uploadingMedia, setUploadingMedia] = useState(false)

  // TipTap editor for Cuộc đời (fullBiography)
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Viết chi tiết cuộc đời, tiểu sử, công trạng tại đây...' }),
      ImageExtension.configure({ inline: false, allowBase64: true }),
    ],
    content: '',
  })

  const load = () => {
    fetch('/api/persons')
      .then(r => r.json())
      .then(d => setPersons(d.persons || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  // Load media of selected person
  const loadMedia = useCallback((personId: number) => {
    fetch(`/api/media?personId=${personId}&t=${Date.now()}`)
      .then(r => r.json())
      .then(d => setMediaList(d.media || []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (selectedId) {
      loadMedia(selectedId)
    } else {
      setMediaList([])
    }
  }, [selectedId, loadMedia])

  // Select a person to edit
  const selectPerson = async (id: number) => {
    setSelectedId(id)
    setShowAddForm(false)
    const res = await fetch(`/api/persons/${id}`)
    if (res.ok) {
      const { person } = await res.json()
      setName(person.name)
      setGender(person.gender)
      setDob(person.dob || '')
      setDod(person.dod || '')
      setBiography(person.biography || '')
      setAvatarUrl(person.avatarUrl || '')
      setIsDeceased(person.isDeceased || false)
      setPhone(person.phone || '')
      setEmail(person.email || '')
      const sl = person.socialLinks || {}
      setSocialLinks({
        facebook: sl.facebook || '',
        zalo: sl.zalo || '',
        tiktok: sl.tiktok || '',
        youtube: sl.youtube || '',
      })
      setOccupation(person.occupation || '')
      setCurrentAddress(person.currentAddress || '')
      const cv = person.contactVisibility || {}
      setContactVisibility({
        phone: !!cv.phone,
        email: !!cv.email,
        social: !!cv.social,
      })
      editor?.commands.setContent(person.fullBiography || '')
    }
  }

  // Open add new form
  const openNewForm = () => {
    setSelectedId(null)
    setShowAddForm(true)
    setName('')
    setGender('MALE')
    setDob('')
    setDod('')
    setBiography('')
    setAvatarUrl('')
    setIsDeceased(false)
    setPhone('')
    setEmail('')
    setSocialLinks({ facebook: '', zalo: '', tiktok: '', youtube: '' })
    setOccupation('')
    setCurrentAddress('')
    setContactVisibility({ phone: false, email: false, social: false })
    editor?.commands.clearContent()
  }

  const handleDelete = async (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xóa hồ sơ này? Các liên kết quan hệ trong gia phả sẽ bị lỗi.')) {
      const res = await fetch(`/api/persons/${id}`, { method: 'DELETE' })
      if (res.ok) {
        if (selectedId === id) setSelectedId(null)
        load()
      }
    }
  }

  const insertEditorImage = () => {
    const url = prompt('Nhập URL hình ảnh (Imgur, Google Drive hoặc link trực tiếp):')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await fetch('/api/media', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setAvatarUrl(data.media.url)
      }
    } catch (e) {
      alert('Lỗi tải ảnh lên')
    }
  }

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedId || !mediaUrl.trim()) return
    setUploadingMedia(true)
    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mediaUrl, filename: 'embed', personId: selectedId, caption: mediaCaption || null }),
      })
      if (res.ok) {
        loadMedia(selectedId)
        setMediaUrl('')
        setMediaCaption('')
        setShowMediaForm(false)
      }
    } catch (e) {
      alert('Lỗi thêm hình ảnh')
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleDeleteMedia = async (mediaId: number) => {
    if (!confirm('Xóa ảnh này khỏi album?')) return
    try {
      const res = await fetch(`/api/media/${mediaId}`, { method: 'DELETE' })
      if (res.ok) {
        if (selectedId) {
          loadMedia(selectedId)
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        alert('Không thể xóa ảnh: ' + (errData.error || res.statusText || res.status))
      }
    } catch (e) {
      alert('Lỗi kết nối khi xóa ảnh')
    }
  }

  const handleEditMediaCaption = async (mediaId: number, currentCaption: string) => {
    const newCaption = prompt("Nhập chú thích mới cho ảnh:", currentCaption)
    if (newCaption === null) return // User cancelled
    
    try {
      const res = await fetch(`/api/media/${mediaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: newCaption.trim() || null }),
      })
      if (res.ok) {
        if (selectedId) {
          loadMedia(selectedId)
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        alert('Không thể cập nhật chú thích: ' + (errData.error || res.statusText || res.status))
      }
    } catch (e) {
      alert('Lỗi kết nối khi cập nhật chú thích')
    }
  }

  const handleMediaFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedId) return
    
    const caption = prompt("Nhập chú thích cho ảnh tải lên (nếu có):")
    if (caption === null) return // User cancelled
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('personId', selectedId.toString())
    if (caption.trim()) {
      formData.append('caption', caption.trim())
    }
    
    try {
      const res = await fetch('/api/media', { method: 'POST', body: formData })
      if (res.ok) {
        loadMedia(selectedId)
      }
    } catch (e) {
      alert('Lỗi tải ảnh lên')
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const birthYear = dob ? new Date(dob).getFullYear() : null
    const deathYear = dod ? new Date(dod).getFullYear() : null
    
    const payload = {
      name,
      gender,
      birthYear,
      deathYear,
      biography: biography || null,
      fullBiography: editor?.getHTML() || null,
      dob: dob || null,
      dod: dod || null,
      isDeceased,
      avatarUrl: avatarUrl || null,
      phone: phone || null,
      email: email || null,
      socialLinks: socialLinks,
      occupation: occupation || null,
      currentAddress: currentAddress || null,
      contactVisibility: contactVisibility,
    }

    const url = selectedId ? `/api/persons/${selectedId}` : '/api/persons'
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setShowAddForm(false)
        if (!selectedId) {
          const data = await res.json()
          setSelectedId(data.person.id)
        }
        load()
        alert('Đã lưu thông tin hồ sơ thành công!')
      }
    } catch (e) {
      alert('Lỗi lưu hồ sơ')
    } finally {
      setSaving(false)
    }
  }

  const filteredPersons = useMemo(() => {
    return persons.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  }, [persons, search])

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <TreePine className="w-6 h-6 text-gold-600" />
        <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Hồ sơ dòng họ</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột 1: Danh sách hồ sơ */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-stone-100 shadow-sm p-4 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="font-serif font-semibold text-wood-900">Danh sách Hồ sơ</h2>
            <button
              onClick={openNewForm}
              className="flex items-center gap-1.5 bg-gold-600 hover:bg-gold-500 text-white text-xs px-3 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm mới
            </button>
          </div>

          <div className="relative mb-4 flex-shrink-0">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Tìm kiếm hồ sơ..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredPersons.map(p => (
              <div
                key={p.id}
                onClick={() => selectPerson(p.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
                  selectedId === p.id ? 'bg-gold-50/50 border-gold-200' : 'hover:bg-stone-50/50 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {p.avatarUrl ? (
                    <img src={p.avatarUrl} alt={p.name} className="w-9 h-9 rounded-full object-cover border border-stone-200" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200">
                      <User className="w-4 h-4 text-stone-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`font-serif font-bold text-sm leading-snug truncate ${selectedId === p.id ? 'text-gold-800' : 'text-wood-900'}`}>{p.name}</p>
                    <p className="text-[0.6875rem] text-stone-400 font-sans mt-0.5">
                      #{p.id} • Đời {p.generation || '?'} • {p.gender === 'MALE' ? 'Nam' : 'Nữ'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                  className="p-1 text-stone-300 hover:text-crimson-600 rounded hover:bg-stone-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {loading && <p className="text-center text-xs text-stone-400 py-4 font-sans">Đang tải...</p>}
            {filteredPersons.length === 0 && !loading && (
              <p className="text-center text-xs text-stone-400 py-8 font-sans">Không tìm thấy hồ sơ nào</p>
            )}
          </div>
        </div>

        {/* Cột 2 & 3: Chi tiết Form chỉnh sửa */}
        <div className="lg:col-span-2 overflow-y-auto h-[calc(100vh-140px)] pr-2">
          {(!selectedId && !showAddForm) ? (
            <div className="bg-stone-50 rounded-2xl border border-stone-100 border-dashed h-64 flex flex-col items-center justify-center text-stone-400 font-sans">
              <TreePine className="w-10 h-10 mb-2 text-stone-300" />
              <p>Chọn một hồ sơ từ danh sách hoặc click "Thêm mới" để cập nhật thông tin</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Form thông tin cơ bản */}
              <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
                  <h2 className="font-serif font-bold text-lg text-wood-900">
                    {selectedId ? `Hồ sơ: ${name}` : 'Tạo hồ sơ mới'}
                  </h2>
                  {showAddForm && (
                    <button onClick={() => setShowAddForm(false)} className="text-stone-400 hover:text-stone-600">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Avatar Upload */}
                    <div className="md:col-span-1 flex flex-col items-center justify-center border border-dashed border-stone-200 rounded-xl p-4 bg-stone-50/50">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar preview" className="w-24 h-24 rounded-full object-cover border border-stone-200 shadow-sm mb-3" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-stone-100 flex items-center justify-center border border-stone-200 mb-3">
                          <User className="w-10 h-10 text-stone-400" />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 bg-white hover:bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors font-sans">
                          <Upload className="w-3.5 h-3.5 text-stone-500" /> Tải ảnh
                          <input type="file" onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                        </label>
                        {avatarUrl && (
                          <button type="button" onClick={() => setAvatarUrl('')} className="border border-stone-200 text-crimson-600 px-2 py-1.5 rounded-lg text-xs hover:bg-crimson-50 transition-colors">
                            Xóa
                          </button>
                        )}
                      </div>
                      <input type="text" placeholder="Hoặc dán URL ảnh đại diện..." value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)}
                        className="w-full mt-3 px-2 py-1 border border-stone-200 rounded-lg text-[0.6875rem] outline-none focus:ring-1 focus:ring-gold-300 font-sans" />
                    </div>

                    {/* Basic Fields */}
                    <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Họ và tên *</label>
                        <input required value={name} onChange={e => setName(e.target.value)}
                          className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Giới tính</label>
                        <select value={gender} onChange={e => setGender(e.target.value)}
                          className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans bg-white">
                          <option value="MALE">Nam</option>
                          <option value="FEMALE">Nữ</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Ngày sinh (Dương lịch)</label>
                        <input type="date" value={dob} onChange={e => setDob(e.target.value)}
                          className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Ngày mất (Nếu đã khuất)</label>
                        <input type="date" value={dod} onChange={e => setDod(e.target.value)}
                          className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Tiểu sử tóm tắt (Hiển thị trên Cây gia phả)</label>
                    <textarea value={biography} onChange={e => setBiography(e.target.value)} rows={2} placeholder="Nội dung ngắn gọn..."
                      className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none resize-none font-sans" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Cuộc đời (Viết chi tiết bằng định dạng văn bản)</label>
                    <div className="border border-stone-200 rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-stone-50 border-b border-stone-200 px-3 py-2 flex gap-2 flex-wrap">
                        {[
                          { label: 'B', action: () => editor?.chain().focus().toggleBold().run(), title: 'In đậm' },
                          { label: 'I', action: () => editor?.chain().focus().toggleItalic().run(), title: 'In nghiêng' },
                          { label: 'H2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), title: 'Tiêu đề lớn' },
                          { label: 'H3', action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), title: 'Tiêu đề nhỏ' },
                          { label: '• List', action: () => editor?.chain().focus().toggleBulletList().run(), title: 'Danh sách dấu' },
                          { label: '1. List', action: () => editor?.chain().focus().toggleOrderedList().run(), title: 'Danh sách số' },
                          { label: '— HR', action: () => editor?.chain().focus().setHorizontalRule().run(), title: 'Dòng kẻ ngang' },
                          { label: '" Quote', action: () => editor?.chain().focus().toggleBlockquote().run(), title: 'Trích dẫn' },
                        ].map(btn => (
                          <button key={btn.title} type="button" onClick={btn.action} title={btn.title}
                            className="text-xs px-2 py-1 bg-white border border-stone-200 rounded hover:bg-gold-50 hover:border-gold-300 transition-colors font-mono font-bold">
                            {btn.label}
                          </button>
                        ))}
                        <button type="button" onClick={insertEditorImage} title="Chèn ảnh"
                          className="text-xs px-2 py-1 bg-white border border-stone-200 rounded hover:bg-gold-50 hover:border-gold-300 transition-colors flex items-center gap-1 font-sans">
                          <ImageIcon className="w-3 h-3" /> Chèn ảnh
                        </button>
                      </div>
                      <EditorContent editor={editor} className="min-h-56 px-4 py-3 text-sm font-sans prose prose-sm max-w-none focus:outline-none [&_img]:rounded-xl [&_img]:shadow-md [&_img]:my-4" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Số điện thoại</label>
                      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="09xx xxx xxx"
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Địa chỉ Email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com"
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Nghề nghiệp</label>
                      <input value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="VD: Kỹ sư, Giáo viên..."
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Nơi ở hiện tại</label>
                      <input value={currentAddress} onChange={e => setCurrentAddress(e.target.value)} placeholder="VD: Hà Nội..."
                        className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-stone-600 mb-2 uppercase font-sans tracking-wider">Mạng xã hội</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[0.6875rem] text-stone-500 mb-1 font-sans">Facebook</label>
                        <input value={socialLinks.facebook} onChange={e => setSocialLinks(sl => ({ ...sl, facebook: e.target.value }))} placeholder="Link Facebook"
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gold-300 font-sans" />
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] text-stone-500 mb-1 font-sans">Zalo</label>
                        <input value={socialLinks.zalo} onChange={e => setSocialLinks(sl => ({ ...sl, zalo: e.target.value }))} placeholder="Link Zalo / SĐT"
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gold-300 font-sans" />
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] text-stone-500 mb-1 font-sans">TikTok</label>
                        <input value={socialLinks.tiktok} onChange={e => setSocialLinks(sl => ({ ...sl, tiktok: e.target.value }))} placeholder="Link TikTok"
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gold-300 font-sans" />
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] text-stone-500 mb-1 font-sans">YouTube</label>
                        <input value={socialLinks.youtube} onChange={e => setSocialLinks(sl => ({ ...sl, youtube: e.target.value }))} placeholder="Link YouTube"
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gold-300 font-sans" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-stone-600 mb-2 uppercase font-sans tracking-wider">Cài đặt công khai thông tin liên hệ</h3>
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 grid grid-cols-3 gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-stone-600 font-sans cursor-pointer">
                        <input type="checkbox" checked={contactVisibility.phone} onChange={e => setContactVisibility(cv => ({ ...cv, phone: e.target.checked }))} className="accent-gold-600" />
                        SĐT
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-stone-600 font-sans cursor-pointer">
                        <input type="checkbox" checked={contactVisibility.email} onChange={e => setContactVisibility(cv => ({ ...cv, email: e.target.checked }))} className="accent-gold-600" />
                        Email
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-stone-600 font-sans cursor-pointer">
                        <input type="checkbox" checked={contactVisibility.social} onChange={e => setContactVisibility(cv => ({ ...cv, social: e.target.checked }))} className="accent-gold-600" />
                        Mạng xã hội
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isDeceased" checked={isDeceased} onChange={e => setIsDeceased(e.target.checked)} className="w-4 h-4 accent-gold-600" />
                    <label htmlFor="isDeceased" className="text-sm text-stone-600 font-sans">Đã mất (Khuất)</label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="submit" disabled={saving}
                      className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors font-sans">
                      {saving ? 'Đang lưu...' : selectedId ? 'Cập nhật hồ sơ' : 'Tạo hồ sơ'}
                    </button>
                    {showAddForm && (
                      <button type="button" onClick={() => setShowAddForm(false)}
                        className="border border-stone-200 text-stone-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors font-sans">
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Album ảnh cá nhân (Chỉ hiển thị khi đang sửa hồ sơ) */}
              {selectedId && (
                <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-8">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-stone-100">
                    <h3 className="font-serif font-bold text-wood-900 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-gold-600" />
                      Album hình ảnh lưu trữ ({mediaList.length})
                    </h3>
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs px-2.5 py-1.5 rounded-lg font-medium cursor-pointer transition-colors font-sans border border-stone-200">
                        <Upload className="w-3.5 h-3.5" /> Tải lên ảnh
                        <input type="file" onChange={handleMediaFileUpload} accept="image/*" className="hidden" />
                      </label>
                      <button
                        onClick={() => setShowMediaForm(!showMediaForm)}
                        className="flex items-center gap-1 bg-gold-50 hover:bg-gold-100 text-gold-700 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors border border-gold-200 font-sans"
                      >
                        <Link2 className="w-3.5 h-3.5" /> Nhúng Link
                      </button>
                    </div>
                  </div>

                  {showMediaForm && (
                    <form onSubmit={handleAddMedia} className="bg-stone-50 border border-stone-200 rounded-xl p-4 mb-4 space-y-3">
                      <div>
                        <label className="block text-[0.6875rem] font-medium text-stone-600 mb-1 font-sans">URL hình ảnh (Imgur, Google Drive...)</label>
                        <input required value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="https://..."
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gold-300 font-sans" />
                      </div>
                      <div>
                        <label className="block text-[0.6875rem] font-medium text-stone-600 mb-1 font-sans">Chú thích ảnh</label>
                        <input value={mediaCaption} onChange={e => setMediaCaption(e.target.value)} placeholder="VD: Ảnh cụ chụp tại lễ thượng thọ năm..."
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gold-300 font-sans" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="submit" disabled={uploadingMedia} className="bg-gold-600 hover:bg-gold-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">
                          {uploadingMedia ? 'Đang lưu...' : 'Lưu ảnh'}
                        </button>
                        <button type="button" onClick={() => setShowMediaForm(false)} className="border border-stone-200 text-stone-600 text-xs px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                          Hủy
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {mediaList.map(media => (
                      <div key={media.id} className="relative group rounded-xl overflow-hidden border border-stone-150 aspect-video bg-stone-50">
                        <img src={media.url} alt={media.caption || ''} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                          <div className="flex gap-1.5 self-end">
                            <button
                              type="button"
                              onClick={() => handleEditMediaCaption(media.id, media.caption || '')}
                              className="p-1.5 bg-white/95 hover:bg-white text-gold-600 rounded-lg shadow-sm hover:scale-105 transition-transform"
                              title="Sửa chú thích"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMedia(media.id)}
                              className="p-1.5 bg-white/95 hover:bg-white text-crimson-600 rounded-lg shadow-sm hover:scale-105 transition-transform"
                              title="Xóa ảnh"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {media.caption && (
                            <p className="text-[0.6875rem] text-white font-sans line-clamp-2 bg-black/20 p-1 rounded leading-normal">
                              {media.caption}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {mediaList.length === 0 && (
                      <div className="col-span-full py-8 text-center text-xs text-stone-400 font-sans border border-stone-100 border-dashed rounded-xl">
                        Album trống. Hãy tải lên hoặc nhúng hình ảnh đầu tiên của thành viên này!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
