import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  Bell, Plus, X, Trash2, Send, Mail, Home, Smartphone, Clock, FileText, CheckCircle2, AlertTriangle,
  Users, Globe, Eye, EyeOff, Pencil, Ban, Search, Loader2,
} from 'lucide-react'

export const Route = createFileRoute('/admin/notifications')({
  component: NotificationCenter,
})

interface Stats {
  recipients: number
  email: { sent: number; failed: number; skipped: number }
  push: { sent: number; failed: number }
}

interface Notification {
  id: number
  title: string
  content: string
  url: string | null
  isActive: boolean | null
  kind: 'MANUAL' | 'ACCOUNT' | 'TEST' | string
  audience: 'ALL' | 'USERS' | string
  recipientUserIds: number[] | null
  sendEmail: boolean
  sendPush: boolean
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | string
  scheduledAt: string | null
  sentAt: string | null
  stats: Stats | null
  createdAt: string
}

interface UserOption {
  id: number
  displayName: string
  username: string
  email: string | null
  status: string
}

interface Delivery {
  id: number
  userId: number | null
  userName: string | null
  channel: 'EMAIL' | 'PUSH' | string
  target: string | null
  status: 'SENT' | 'FAILED' | 'SKIPPED' | string
  error: string | null
  createdAt: string
}

const STATUS: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  DRAFT: { label: 'Nháp', cls: 'bg-stone-100 text-stone-600 border-stone-200', icon: FileText },
  SCHEDULED: { label: 'Hẹn giờ', cls: 'bg-sky-50 text-sky-700 border-sky-200', icon: Clock },
  SENDING: { label: 'Đang gửi', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Loader2 },
  SENT: { label: 'Đã gửi', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  FAILED: { label: 'Lỗi', cls: 'bg-crimson-50 text-crimson-700 border-crimson-200', icon: AlertTriangle },
}

const KIND: Record<string, string> = { MANUAL: 'Thông báo', ACCOUNT: 'Email tài khoản', TEST: 'Thử push' }

const FILTERS = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'SCHEDULED', label: 'Hẹn giờ' },
  { key: 'DRAFT', label: 'Nháp' },
  { key: 'SENT', label: 'Đã gửi' },
  { key: 'FAILED', label: 'Lỗi' },
  { key: 'SYSTEM', label: 'Hệ thống' },
]

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '')

/** Date → value for <input type="datetime-local"> in the viewer's local time. */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const EMPTY_FORM = {
  title: '',
  content: '',
  url: '',
  audience: 'ALL' as 'ALL' | 'USERS',
  recipientUserIds: [] as number[],
  showOnHomepage: true,
  sendEmail: false,
  sendPush: true,
  mode: 'now' as 'now' | 'schedule' | 'draft',
  scheduledAt: '',
}
type FormState = typeof EMPTY_FORM

function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.DRAFT
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${s.cls}`}>
      <Icon className={`w-3 h-3 ${status === 'SENDING' ? 'animate-spin' : ''}`} />
      {s.label}
    </span>
  )
}

function NotificationCenter() {
  const [items, setItems] = useState<Notification[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<{ id: number | null; form: FormState } | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const [subscribersCount, setSubscribersCount] = useState<number | null>(null)
  const [testingPush, setTestingPush] = useState(false)

  const userName = useMemo(() => new Map(users.map(u => [u.id, u.displayName])), [users])

  const load = () => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setItems(d.notifications || []))
      .catch(console.error)
      .finally(() => setLoading(false))
    fetch('/api/notifications/test-push')
      .then(r => r.json())
      .then(d => d.subscribersCount !== undefined && setSubscribersCount(d.subscribersCount))
      .catch(console.error)
  }

  useEffect(() => {
    load()
    fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.users || [])).catch(console.error)
    // Keep scheduled → sent transitions visible without a manual refresh
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: items.length, SYSTEM: 0 }
    for (const n of items) {
      c[n.status] = (c[n.status] || 0) + 1
      if (n.kind !== 'MANUAL') c.SYSTEM++
    }
    return c
  }, [items])

  const visible = items.filter(n => {
    if (filter === 'SYSTEM' ? n.kind === 'MANUAL' : filter !== 'ALL' && n.status !== filter) return false
    if (!query) return true
    const q = query.toLowerCase()
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  })

  const flash = (ok: boolean, text: string) => {
    setToast({ ok, text })
    setTimeout(() => setToast(null), 6000)
  }

  const patch = async (body: object, okText: string) => {
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) flash(true, okText)
    else flash(false, d.error || 'Có lỗi xảy ra')
    load()
    return res.ok
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa thông báo này và toàn bộ nhật ký gửi?')) return
    const res = await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      flash(true, 'Đã xóa thông báo')
      if (detailId === id) setDetailId(null)
    } else flash(false, 'Lỗi khi xóa thông báo')
    load()
  }

  const handleTestPush = async () => {
    setTestingPush(true)
    try {
      const res = await fetch('/api/notifications/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Họ Đỗ Đàm An (Thử nghiệm)',
          body: 'Thông báo đẩy PWA hoạt động trên thiết bị của bạn! 🎉',
        }),
      })
      const d = await res.json()
      if (d.success) flash(true, `Đã gửi thử tới ${d.totalSent} thiết bị (${d.successCount} thành công, ${d.failureCount} lỗi).`)
      else flash(false, d.error || 'Lỗi gửi thông báo thử.')
      load()
    } catch {
      flash(false, 'Lỗi kết nối máy chủ.')
    } finally {
      setTestingPush(false)
    }
  }

  const openEdit = (n: Notification) => {
    setEditing({
      id: n.id,
      form: {
        title: n.title,
        content: n.content,
        url: n.url || '',
        audience: n.audience === 'USERS' ? 'USERS' : 'ALL',
        recipientUserIds: n.recipientUserIds || [],
        showOnHomepage: !!n.isActive,
        sendEmail: n.sendEmail,
        sendPush: n.sendPush,
        mode: n.status === 'SCHEDULED' ? 'schedule' : 'draft',
        scheduledAt: n.scheduledAt ? toLocalInput(new Date(n.scheduledAt)) : '',
      },
    })
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-wood-900">Trung tâm thông báo</h1>
          <p className="text-stone-500 text-xs font-sans mt-0.5">
            Quản lý mọi thông báo: nội dung, người nhận, kênh gửi, lịch gửi và kết quả từng lần gửi
          </p>
        </div>
        <button
          onClick={() => setEditing({ id: null, form: { ...EMPTY_FORM } })}
          className="flex items-center justify-center gap-2 bg-gold-600 hover:bg-gold-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Tạo thông báo
        </button>
      </div>

      {toast && (
        <div className={`p-3.5 rounded-xl mb-4 flex items-center gap-3 font-sans text-sm border ${toast.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-crimson-50 border-crimson-200 text-crimson-700'}`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{toast.text}</span>
          <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 font-sans">
        {[
          { label: 'Đã gửi', value: counts.SENT || 0, cls: 'text-emerald-700' },
          { label: 'Đang hẹn giờ', value: counts.SCHEDULED || 0, cls: 'text-sky-700' },
          { label: 'Nháp', value: counts.DRAFT || 0, cls: 'text-stone-700' },
          { label: 'Gửi lỗi', value: counts.FAILED || 0, cls: 'text-crimson-700' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-stone-100 p-3">
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-stone-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Push status */}
      <div className="bg-gradient-to-r from-wood-900 to-wood-950 border border-gold-500/30 rounded-2xl p-4 mb-5 text-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-400/30 flex items-center justify-center text-gold-400 flex-shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <p className="text-xs text-stone-300">
            <span className="block font-serif font-bold text-gold-400 text-sm">Thông báo đẩy (PWA)</span>
            <strong className="text-gold-300">{subscribersCount ?? '...'}</strong> thiết bị đang bật nhận thông báo đẩy
          </p>
        </div>
        <button
          onClick={handleTestPush}
          disabled={testingPush}
          className="self-start sm:self-auto bg-gold-600/90 hover:bg-gold-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-gold-400/30 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          {testingPush ? 'Đang gửi...' : 'Gửi thử tới mọi thiết bị'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-1 px-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap text-xs font-medium px-3 py-2 rounded-lg border transition-colors font-sans ${filter === f.key ? 'bg-wood-900 text-gold-300 border-wood-900' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
            >
              {f.label} <span className="opacity-60">({counts[f.key] || 0})</span>
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung..."
            className="w-full pl-9 pr-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans bg-white"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading && [1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-xl border border-stone-100 animate-pulse" />)}
        {!loading && visible.map(n => {
          const editable = ['DRAFT', 'SCHEDULED', 'FAILED'].includes(n.status) && n.kind === 'MANUAL'
          const audienceText = n.audience === 'USERS'
            ? (n.recipientUserIds || []).map(id => userName.get(id) || `#${id}`).slice(0, 3).join(', ') +
              ((n.recipientUserIds?.length || 0) > 3 ? ` +${n.recipientUserIds!.length - 3}` : '')
            : 'Tất cả thành viên'
          return (
            <div key={n.id} className="bg-white rounded-xl border border-stone-100 p-4 font-sans">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <StatusBadge status={n.status} />
                    {n.kind !== 'MANUAL' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 font-semibold">
                        {KIND[n.kind] || n.kind}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setDetailId(n.id)} className="text-left font-medium text-wood-800 font-serif hover:text-gold-700 break-words">
                    {n.title}
                  </button>
                  <p className="text-sm text-stone-500 mt-0.5 line-clamp-2 break-words">{n.content}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-stone-500">
                    <span className="flex items-center gap-1">
                      {n.audience === 'USERS' ? <Users className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                      {audienceText}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {n.isActive && n.audience === 'ALL' && <span title="Trang chủ"><Home className="w-3.5 h-3.5 text-gold-600" /></span>}
                      {n.sendEmail && <span title="Email"><Mail className="w-3.5 h-3.5 text-gold-600" /></span>}
                      {n.sendPush && <span title="Thông báo đẩy"><Smartphone className="w-3.5 h-3.5 text-gold-600" /></span>}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {n.status === 'SCHEDULED' ? `Gửi lúc ${fmt(n.scheduledAt)}` : n.sentAt ? `Gửi ${fmt(n.sentAt)}` : `Tạo ${fmt(n.createdAt)}`}
                    </span>
                    {n.stats && (n.sendEmail || n.sendPush) && (
                      <span>
                        {n.sendEmail && `Email ${n.stats.email.sent}/${n.stats.email.sent + n.stats.email.failed + n.stats.email.skipped}`}
                        {n.sendEmail && n.sendPush && ' · '}
                        {n.sendPush && `Push ${n.stats.push.sent}/${n.stats.push.sent + n.stats.push.failed}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-stone-100">
                <ActionBtn onClick={() => setDetailId(n.id)} icon={Eye}>Chi tiết</ActionBtn>
                {editable && <ActionBtn onClick={() => openEdit(n)} icon={Pencil}>Sửa</ActionBtn>}
                {editable && (
                  <ActionBtn
                    onClick={() => confirm('Gửi thông báo này ngay bây giờ?') && patch({ id: n.id, action: 'send' }, 'Đã gửi thông báo')}
                    icon={Send}
                    tone="gold"
                  >
                    {n.status === 'FAILED' ? 'Gửi lại' : 'Gửi ngay'}
                  </ActionBtn>
                )}
                {n.status === 'SCHEDULED' && (
                  <ActionBtn onClick={() => patch({ id: n.id, action: 'cancel' }, 'Đã huỷ hẹn giờ, chuyển về nháp')} icon={Ban}>Huỷ hẹn</ActionBtn>
                )}
                {n.kind === 'MANUAL' && n.audience === 'ALL' && (
                  <ActionBtn
                    onClick={() => patch({ id: n.id, action: 'toggle' }, n.isActive ? 'Đã ẩn khỏi trang chủ' : 'Đã hiện trên trang chủ')}
                    icon={n.isActive ? EyeOff : Home}
                  >
                    {n.isActive ? 'Ẩn trang chủ' : 'Hiện trang chủ'}
                  </ActionBtn>
                )}
                <ActionBtn onClick={() => handleDelete(n.id)} icon={Trash2} tone="danger">Xóa</ActionBtn>
              </div>
            </div>
          )
        })}
        {!loading && visible.length === 0 && (
          <div className="text-center py-16 text-stone-400 font-sans">
            <Bell className="w-10 h-10 mx-auto mb-3 text-stone-200" />
            <p>Không có thông báo nào</p>
          </div>
        )}
      </div>

      {editing && (
        <NotificationForm
          id={editing.id}
          initial={editing.form}
          users={users}
          onClose={() => setEditing(null)}
          onSaved={text => {
            setEditing(null)
            flash(true, text)
            load()
          }}
        />
      )}

      {detailId !== null && <NotificationDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

function ActionBtn({ onClick, icon: Icon, children, tone }: { onClick: () => void; icon: typeof Clock; children: React.ReactNode; tone?: 'gold' | 'danger' }) {
  const cls = tone === 'gold'
    ? 'bg-gold-600 text-white hover:bg-gold-500 border-gold-600'
    : tone === 'danger'
      ? 'text-crimson-600 hover:bg-crimson-50 border-stone-200'
      : 'text-stone-600 hover:bg-stone-50 border-stone-200'
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {children}
    </button>
  )
}

/** Full-screen sheet on phones, centred dialog on larger screens; respects the iPhone notch/home bar. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex sm:items-center justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-full sm:max-h-[90vh] safe-pt sm:pt-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <h2 className="font-serif font-semibold text-wood-900 text-lg">{title}</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-stone-400 hover:text-stone-600" aria-label="Đóng"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 safe-pb flex-1">{children}</div>
      </div>
    </div>
  )
}

function NotificationForm({ id, initial, users, onClose, onSaved }: {
  id: number | null
  initial: FormState
  users: UserOption[]
  onClose: () => void
  onSaved: (text: string) => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }))

  const pickable = users
    .filter(u => u.status === 'ACTIVE' || form.recipientUserIds.includes(u.id))
    .filter(u => !userQuery || `${u.displayName} ${u.username} ${u.email || ''}`.toLowerCase().includes(userQuery.toLowerCase()))

  const toggleUser = (uid: number) =>
    set('recipientUserIds', form.recipientUserIds.includes(uid) ? form.recipientUserIds.filter(x => x !== uid) : [...form.recipientUserIds, uid])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.mode === 'schedule' && !form.scheduledAt) return setError('Chọn thời gian hẹn gửi')
    setSaving(true)
    try {
      const body = {
        ...form,
        id,
        action: id ? 'update' : undefined,
        url: form.url.trim() || null,
        scheduledAt: form.mode === 'schedule' ? new Date(form.scheduledAt).toISOString() : null,
      }
      const res = await fetch('/api/notifications', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) return setError(d.error || 'Có lỗi xảy ra')
      const n: Notification | undefined = d.notification
      if (form.mode === 'schedule') onSaved(`Đã hẹn gửi lúc ${fmt(n?.scheduledAt ?? null)}`)
      else if (form.mode === 'draft') onSaved('Đã lưu nháp')
      else if (n?.stats && (form.sendEmail || form.sendPush)) {
        onSaved(`Đã gửi: email ${n.stats.email.sent} thành công, push ${n.stats.push.sent} thiết bị. Xem chi tiết để biết người nhận.`)
      } else onSaved('Đã đăng thông báo')
    } catch {
      setError('Lỗi kết nối máy chủ')
    } finally {
      setSaving(false)
    }
  }

  const label = 'block text-xs font-semibold text-stone-600 mb-1.5'
  const input = 'w-full px-3 py-2.5 border border-stone-200 rounded-xl text-base sm:text-sm focus:ring-2 focus:ring-gold-300 outline-none'

  return (
    <Sheet title={id ? 'Sửa thông báo' : 'Tạo thông báo'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-5 font-sans">
        <div>
          <label className={label}>Tiêu đề *</label>
          <input required maxLength={300} value={form.title} onChange={e => set('title', e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Nội dung *</label>
          <textarea required rows={4} value={form.content} onChange={e => set('content', e.target.value)} className={`${input} resize-y`} />
        </div>
        <div>
          <label className={label}>Liên kết khi bấm vào thông báo (tuỳ chọn)</label>
          <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="/anniversaries" className={input} />
          <p className="text-[11px] text-stone-400 mt-1">Đường dẫn trong trang, bắt đầu bằng “/”. Để trống sẽ mở trang chủ.</p>
        </div>

        {/* Audience */}
        <fieldset>
          <legend className={label}>Gửi đến</legend>
          <div className="grid grid-cols-2 gap-2">
            {([['ALL', 'Tất cả thành viên', Globe], ['USERS', 'Chọn người nhận', Users]] as const).map(([v, text, Icon]) => (
              <label key={v} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm ${form.audience === v ? 'border-gold-400 bg-gold-50 text-wood-900' : 'border-stone-200 text-stone-600'}`}>
                <input type="radio" name="audience" checked={form.audience === v} onChange={() => set('audience', v)} className="accent-gold-600" />
                <Icon className="w-4 h-4" /> {text}
              </label>
            ))}
          </div>
          {form.audience === 'USERS' && (
            <div className="mt-2 border border-stone-200 rounded-xl">
              <div className="p-2 border-b border-stone-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-stone-400 flex-shrink-0" />
                <input value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder="Tìm thành viên..." className="flex-1 text-base sm:text-sm outline-none min-w-0" />
                <span className="text-xs text-gold-700 font-semibold whitespace-nowrap">Đã chọn {form.recipientUserIds.length}</span>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-stone-50">
                {pickable.map(u => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-stone-50">
                    <input type="checkbox" checked={form.recipientUserIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="w-4 h-4 accent-gold-600" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-wood-800 truncate">{u.displayName}</span>
                      <span className="block text-[11px] text-stone-400 truncate">@{u.username}{u.email ? ` · ${u.email}` : ' · chưa có email'}</span>
                    </span>
                  </label>
                ))}
                {pickable.length === 0 && <p className="text-xs text-stone-400 text-center py-4">Không tìm thấy thành viên</p>}
              </div>
            </div>
          )}
        </fieldset>

        {/* Channels */}
        <fieldset>
          <legend className={label}>Kênh gửi</legend>
          <div className="space-y-2">
            {[
              { k: 'showOnHomepage' as const, icon: Home, text: 'Hiển thị trên trang chủ', hint: form.audience === 'USERS' ? 'Không áp dụng khi gửi riêng (trang chủ là công khai)' : 'Mọi người truy cập đều thấy', disabled: form.audience === 'USERS' },
              { k: 'sendEmail' as const, icon: Mail, text: 'Gửi email', hint: 'Bỏ qua người chưa có email hoặc đã tắt nhận email', disabled: false },
              { k: 'sendPush' as const, icon: Smartphone, text: 'Thông báo đẩy (PWA)', hint: form.audience === 'USERS' ? 'Tới các thiết bị người nhận đã đăng nhập và bật thông báo' : 'Tới mọi thiết bị đã bật thông báo', disabled: false },
            ].map(c => (
              <label key={c.k} className={`flex items-start gap-3 p-3 rounded-xl border ${c.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${form[c.k] && !c.disabled ? 'border-gold-300 bg-gold-50/50' : 'border-stone-200'}`}>
                <input type="checkbox" disabled={c.disabled} checked={form[c.k] && !c.disabled} onChange={e => set(c.k, e.target.checked)} className="w-4 h-4 mt-0.5 accent-gold-600" />
                <span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-wood-800"><c.icon className="w-4 h-4 text-gold-600" />{c.text}</span>
                  <span className="block text-[11px] text-stone-500 mt-0.5">{c.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Timing */}
        <fieldset>
          <legend className={label}>Thời điểm gửi</legend>
          <div className="grid grid-cols-3 gap-2">
            {([['now', 'Gửi ngay', Send], ['schedule', 'Hẹn giờ', Clock], ['draft', 'Lưu nháp', FileText]] as const).map(([v, text, Icon]) => (
              <label key={v} className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 p-3 rounded-xl border cursor-pointer text-sm text-center ${form.mode === v ? 'border-gold-400 bg-gold-50 text-wood-900' : 'border-stone-200 text-stone-600'}`}>
                <input type="radio" name="mode" checked={form.mode === v} onChange={() => set('mode', v)} className="sr-only" />
                <Icon className="w-4 h-4" /> {text}
              </label>
            ))}
          </div>
          {form.mode === 'schedule' && (
            <input
              type="datetime-local"
              value={form.scheduledAt}
              min={toLocalInput(new Date())}
              onChange={e => set('scheduledAt', e.target.value)}
              className={`${input} mt-2`}
            />
          )}
        </fieldset>

        {error && <div className="text-sm text-crimson-700 bg-crimson-50 border border-crimson-100 rounded-xl p-3">{error}</div>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 border border-stone-200 text-stone-600 py-3 rounded-xl text-sm font-medium hover:bg-stone-50">Hủy</button>
          <button type="submit" disabled={saving} className="flex-[2] bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {form.mode === 'now' ? 'Gửi ngay' : form.mode === 'schedule' ? 'Lưu & hẹn giờ' : 'Lưu nháp'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

function NotificationDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const [data, setData] = useState<{ notification: Notification; recipients: UserOption[]; deliveries: Delivery[]; createdByName: string | null } | null>(null)
  const [channel, setChannel] = useState<'ALL' | 'EMAIL' | 'PUSH'>('ALL')

  useEffect(() => {
    fetch(`/api/notifications/${id}`).then(r => r.json()).then(setData).catch(console.error)
  }, [id])

  const n = data?.notification
  const rows = (data?.deliveries || []).filter(d => channel === 'ALL' || d.channel === channel)
  const deliveryCls: Record<string, string> = { SENT: 'text-emerald-700 bg-emerald-50', FAILED: 'text-crimson-700 bg-crimson-50', SKIPPED: 'text-stone-500 bg-stone-100' }
  const deliveryLabel: Record<string, string> = { SENT: 'Đã gửi', FAILED: 'Lỗi', SKIPPED: 'Bỏ qua' }

  return (
    <Sheet title="Chi tiết thông báo" onClose={onClose}>
      {!n ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gold-600" /></div>
      ) : (
        <div className="space-y-5 font-sans text-sm">
          <div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <StatusBadge status={n.status} />
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-semibold">{KIND[n.kind] || n.kind}</span>
            </div>
            <h3 className="font-serif text-lg font-semibold text-wood-900 break-words">{n.title}</h3>
            <p className="text-stone-600 mt-1 whitespace-pre-wrap break-words">{n.content}</p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 rounded-xl p-4">
            <div><dt className="text-[11px] text-stone-400 uppercase">Gửi đến</dt><dd className="text-wood-800">{n.audience === 'USERS' ? `${data!.recipients.length} người được chọn` : 'Tất cả thành viên'}</dd></div>
            <div>
              <dt className="text-[11px] text-stone-400 uppercase">Kênh</dt>
              <dd className="text-wood-800">{[n.isActive && n.audience === 'ALL' && 'Trang chủ', n.sendEmail && 'Email', n.sendPush && 'Push'].filter(Boolean).join(', ') || '—'}</dd>
            </div>
            <div><dt className="text-[11px] text-stone-400 uppercase">Tạo lúc</dt><dd className="text-wood-800">{fmt(n.createdAt)}{data!.createdByName ? ` · ${data!.createdByName}` : ''}</dd></div>
            <div>
              <dt className="text-[11px] text-stone-400 uppercase">{n.status === 'SCHEDULED' ? 'Hẹn gửi lúc' : 'Gửi lúc'}</dt>
              <dd className="text-wood-800">{fmt(n.status === 'SCHEDULED' ? n.scheduledAt : n.sentAt) || '—'}</dd>
            </div>
            {n.url && <div className="sm:col-span-2"><dt className="text-[11px] text-stone-400 uppercase">Liên kết</dt><dd className="text-wood-800 break-all">{n.url}</dd></div>}
          </dl>

          {n.audience === 'USERS' && data!.recipients.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-stone-600 mb-2">Người nhận được chọn</h4>
              <div className="flex flex-wrap gap-1.5">
                {data!.recipients.map(r => (
                  <span key={r.id} className="text-xs bg-gold-50 border border-gold-200 text-wood-800 px-2 py-1 rounded-lg">{r.displayName}</span>
                ))}
              </div>
            </div>
          )}

          {n.stats && (
            <div className="grid grid-cols-2 gap-3">
              {n.sendEmail && (
                <div className="border border-stone-100 rounded-xl p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-600"><Mail className="w-3.5 h-3.5" /> Email</p>
                  <p className="text-xs text-stone-500 mt-1">{n.stats.email.sent} đã gửi · {n.stats.email.failed} lỗi · {n.stats.email.skipped} bỏ qua</p>
                </div>
              )}
              {n.sendPush && (
                <div className="border border-stone-100 rounded-xl p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-600"><Smartphone className="w-3.5 h-3.5" /> Push</p>
                  <p className="text-xs text-stone-500 mt-1">{n.stats.push.sent} thiết bị nhận · {n.stats.push.failed} lỗi</p>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2 gap-2">
              <h4 className="text-xs font-semibold text-stone-600">Nhật ký gửi ({data!.deliveries.length})</h4>
              <div className="flex gap-1">
                {(['ALL', 'EMAIL', 'PUSH'] as const).map(c => (
                  <button key={c} onClick={() => setChannel(c)} className={`text-[11px] px-2 py-1 rounded-md border ${channel === c ? 'bg-wood-900 text-gold-300 border-wood-900' : 'border-stone-200 text-stone-500'}`}>
                    {c === 'ALL' ? 'Tất cả' : c === 'EMAIL' ? 'Email' : 'Push'}
                  </button>
                ))}
              </div>
            </div>
            {rows.length === 0 ? (
              <p className="text-xs text-stone-400 text-center py-6 bg-stone-50 rounded-xl">
                {n.status === 'SENT' || n.status === 'FAILED' ? 'Không có lượt gửi email/push nào' : 'Chưa gửi'}
              </p>
            ) : (
              <ul className="divide-y divide-stone-100 border border-stone-100 rounded-xl">
                {rows.map(d => (
                  <li key={d.id} className="flex items-start gap-3 px-3 py-2.5">
                    {d.channel === 'EMAIL' ? <Mail className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" /> : <Smartphone className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-wood-800 truncate">{d.userName || (d.channel === 'PUSH' ? 'Khách (chưa đăng nhập)' : '—')}</p>
                      <p className="text-[11px] text-stone-400 truncate">{d.target}</p>
                      {d.error && <p className="text-[11px] text-crimson-600 break-words">{d.error}</p>}
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${deliveryCls[d.status] || ''}`}>{deliveryLabel[d.status] || d.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
