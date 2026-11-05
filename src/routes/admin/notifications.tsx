import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Bell, Plus, X, Trash2, Send, Mail, Globe, CalendarClock } from 'lucide-react'

export const Route = createFileRoute('/admin/notifications')({
  component: AdminNotifications,
})

interface UpcomingEvent {
  id: number
  title: string
  type: string
  dateType: string
  day: number
  month: number
  personId: number | null
  description: string | null
  occursOn: string
  daysUntil: number
}

const EMPTY_FORM = { title: '', content: '', url: '/', web: true, push: false, email: false }

function formatDay(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${+d}/${+m}/${y}`
}

/** Draft announcement for an event; the admin edits it before sending. */
function draftFor(e: UpcomingEvent) {
  const isDeath = e.type === 'DEATH'
  const lunar = e.dateType === 'LUNAR' ? ` (tức ngày ${e.day}/${e.month} âm lịch)` : ''
  const content = [
    `Kính báo toàn thể con cháu: ${isDeath ? 'ngày giỗ ' : ''}${e.title} vào ngày ${formatDay(e.occursOn)}${lunar}.`,
    e.description?.trim(),
  ].filter(Boolean).join('\n')
  return {
    title: `${isDeath ? 'Thông báo ngày giỗ' : 'Thông báo sự kiện'}: ${e.title}`,
    content,
    url: e.personId ? `/person/${e.personId}` : '/anniversaries',
  }
}

function AdminNotifications() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [sendResult, setSendResult] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [subscribersCount, setSubscribersCount] = useState<number | null>(null)
  const [testingPush, setTestingPush] = useState(false)
  const [testPushResult, setTestPushResult] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => setItems(d.notifications || []))
      .catch(console.error)
      .finally(() => setLoading(false))

    // Load push subscribers count
    fetch('/api/notifications/test-push')
      .then(r => r.json())
      .then(d => {
        if (d.subscribersCount !== undefined) setSubscribersCount(d.subscribersCount)
      })
      .catch(console.error)
  }

  useEffect(load, [])

  // Upcoming events; ?event=<id> (from the admin alert) opens a draft for that event
  useEffect(() => {
    fetch('/api/anniversaries/upcoming?days=30')
      .then(r => r.json())
      .then(d => {
        const list: UpcomingEvent[] = d.events || []
        setEvents(list)
        const eventId = Number(new URLSearchParams(window.location.search).get('event'))
        const target = list.find(e => e.id === eventId)
        if (target) composeFor(target)
      })
      .catch(console.error)
  }, [])

  const composeFor = (e: UpcomingEvent) => {
    setForm({ ...EMPTY_FORM, ...draftFor(e) })
    setShowAdd(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleTestPush = async () => {
    setTestingPush(true)
    setTestPushResult(null)
    try {
      const res = await fetch('/api/notifications/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Họ Đỗ Đàm An (Thử nghiệm)',
          body: 'Thông báo đẩy PWA hoạt động hoàn hảo trên thiết bị của bạn! 🎉',
          url: '/'
        })
      })
      const d = await res.json()
      if (d.success) {
        setTestPushResult(`Đã gửi thông báo tới ${d.totalSent} thiết bị (${d.successCount} thành công, ${d.failureCount} lỗi).`)
      } else {
        setTestPushResult(d.error || 'Lỗi gửi thông báo thử.')
      }
    } catch (e: any) {
      setTestPushResult('Lỗi kết nối máy chủ.')
    } finally {
      setTestingPush(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.web && !form.push && !form.email) {
      alert('Hãy chọn ít nhất một kênh gửi.')
      return
    }
    setSaving(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          url: form.url,
          channels: { web: form.web, push: form.push, email: form.email },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const parts = []
        if (form.web) parts.push('đăng trên trang chủ')
        if (form.push && data.pushResult) parts.push(`đẩy tới ${data.pushResult.successCount}/${data.pushResult.totalSent} thiết bị`)
        if (form.email) parts.push(`gửi email tới ${data.recipientCount} thành viên`)
        setSendResult(`Đã ${parts.join(', ')}.`)
        setShowAdd(false)
        setForm(EMPTY_FORM)
        load()
      }
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (id: number, isActive: boolean) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive }),
    })
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này vĩnh viễn?')) return
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        load()
      } else {
        alert('Lỗi khi xóa thông báo')
      }
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Thông báo</h1>
          <p className="text-stone-500 text-xs font-sans mt-0.5">Đăng thông báo trên trang chủ, gửi thông báo đẩy hoặc email</p>
        </div>
        <button onClick={() => { if (!showAdd) setForm(EMPTY_FORM); setShowAdd(!showAdd) }}
          className="flex items-center gap-2 bg-gold-600 hover:bg-gold-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAdd ? 'Hủy bỏ' : 'Thêm thông báo'}
        </button>
      </div>

      {sendResult && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl mb-6 flex items-center gap-3 font-sans text-sm animate-in fade-in duration-300">
          <Send className="w-5 h-5 flex-shrink-0" />
          <span>{sendResult}</span>
          <button onClick={() => setSendResult(null)} className="ml-auto text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upcoming events: admins decide whether and how to announce each one */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock className="w-4 h-4 text-gold-600" />
          <h2 className="font-serif font-semibold text-wood-900">Sự kiện sắp tới (30 ngày)</h2>
        </div>
        <p className="text-xs text-stone-500 font-sans mb-4">
          Hệ thống chỉ nhắc quản trị viên (trước 7, 3 và 1 ngày). Bấm "Soạn thông báo" nếu muốn báo cho dòng họ.
        </p>
        {events.length === 0 ? (
          <p className="text-sm text-stone-400 font-sans">Không có sự kiện nào trong 30 ngày tới.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {events.map(e => (
              <li key={e.id} className="py-2.5 flex items-center gap-3">
                <div className={`text-center w-16 flex-shrink-0 rounded-lg py-1 font-sans text-xs font-semibold ${e.daysUntil <= 3 ? 'bg-crimson-50 text-crimson-700' : 'bg-gold-50 text-wood-800'}`}>
                  {e.daysUntil === 0 ? 'Hôm nay' : `${e.daysUntil} ngày`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-wood-800 truncate">{e.type === 'DEATH' ? 'Giỗ ' : ''}{e.title}</p>
                  <p className="text-xs text-stone-500 font-sans">
                    {formatDay(e.occursOn)}{e.dateType === 'LUNAR' ? ` · ${e.day}/${e.month} âm lịch` : ''}
                  </p>
                </div>
                <button onClick={() => composeFor(e)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gold-600 hover:bg-gold-500 text-white font-medium flex-shrink-0">
                  Soạn thông báo
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* PWA Push Notification Status Card */}
      <div className="bg-gradient-to-r from-wood-900 to-wood-950 border border-gold-500/30 rounded-2xl p-5 mb-6 shadow-md text-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gold-500/20 border border-gold-400/30 flex items-center justify-center text-gold-400 flex-shrink-0">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-gold-400 text-base">Hệ thống Thông báo đẩy PWA</span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                Hoạt động
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              Hiện có <strong className="text-gold-300 font-semibold">{subscribersCount !== null ? subscribersCount : '...'}</strong> thiết bị đã bật nhận thông báo đẩy trên điện thoại / máy tính.
            </p>
          </div>
        </div>

        <button
          onClick={handleTestPush}
          disabled={testingPush}
          className="self-start sm:self-auto bg-gold-600/90 hover:bg-gold-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-gold-400/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{testingPush ? 'Đang gửi...' : 'Gửi thử thông báo'}</span>
        </button>
      </div>

      {testPushResult && (
        <div className="bg-gold-50 border border-gold-200 text-wood-900 text-xs font-sans p-3.5 rounded-xl mb-6 flex items-center justify-between animate-in fade-in">
          <span>{testPushResult}</span>
          <button onClick={() => setTestPushResult(null)} className="text-stone-400 hover:text-stone-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showAdd && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-semibold text-wood-900">Thông báo mới</h2>
            <button onClick={() => setShowAdd(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Tiêu đề *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none font-sans" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Nội dung *</label>
              <textarea required value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 outline-none resize-none font-sans" />
            </div>

            {/* Channels: each one is the admin's choice */}
            <fieldset className="space-y-2">
              <legend className="block text-xs font-medium text-stone-600 mb-1 font-sans">Gửi qua</legend>
              {([
                ['web', Globe, 'Hiển thị trên trang chủ', 'Mọi người thấy khi mở trang web.'],
                ['push', Bell, 'Thông báo đẩy', `Hiện ngay trên ${subscribersCount ?? '...'} thiết bị đã bật thông báo.`],
                ['email', Mail, 'Email', 'Gửi tới thành viên đang hoạt động có email và bật nhận thông báo.'],
              ] as const).map(([key, Icon, label, hint]) => (
                <label key={key} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${form[key] ? 'bg-gold-50/50 border-gold-200' : 'bg-stone-50/50 border-stone-100'}`}>
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="w-4 h-4 accent-gold-600 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-medium text-wood-800 font-sans flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-gold-600" />
                      {label}
                    </span>
                    <p className="text-xs text-stone-500 mt-0.5 font-sans">{hint}</p>
                  </div>
                </label>
              ))}
            </fieldset>

            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                {(form.push || form.email) && <Send className="w-3.5 h-3.5" />}
                {saving ? 'Đang gửi...' : form.push || form.email ? 'Gửi thông báo' : 'Đăng'}
              </button>
              <button type="button" onClick={() => setShowAdd(false)}
                className="border border-stone-200 text-stone-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white rounded-xl border border-stone-100 animate-pulse" />)}
          </div>
        )}
        {!loading && items.map((item: any) => (
          <div key={item.id} className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition-opacity ${item.isActive ? 'border-stone-100' : 'border-stone-100 opacity-50'}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${item.isActive ? 'bg-gold-100' : 'bg-stone-100'}`}>
              <Bell className={`w-4 h-4 ${item.isActive ? 'text-gold-600' : 'text-stone-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-wood-800 font-serif">{item.title}</p>
              <p className="text-sm text-stone-500 font-sans mt-1 line-clamp-2">{item.content}</p>
              <p className="text-xs text-stone-400 font-sans mt-1">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => toggle(item.id, item.isActive)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${item.isActive ? 'bg-stone-100 text-stone-600 hover:bg-amber-100 hover:text-amber-700' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
              >
                {item.isActive ? 'Ẩn' : 'Hiện'}
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5 text-stone-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-lg transition-all"
                title="Xóa vĩnh viễn"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-center py-16 text-stone-400 font-sans">
            <Bell className="w-10 h-10 mx-auto mb-3 text-stone-200" />
            <p>Chưa có thông báo nào</p>
          </div>
        )}
      </div>
    </div>
  )
}
