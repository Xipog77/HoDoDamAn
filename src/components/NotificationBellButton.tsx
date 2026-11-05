import { useState, useEffect, useRef } from 'react'
import { Bell, BellRing, BellOff, Loader2 } from 'lucide-react'

export function NotificationBellButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [, setPermission] = useState<string>('default')
  const [supported, setSupported] = useState(true)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const checkStatus = async () => {
    if (typeof window === 'undefined' || !window.PWA) return
    const status = await window.PWA.getSubscriptionStatus()
    setSupported(status.supported)
    setPermission(status.permission)
    setIsSubscribed(status.isSubscribed)
  }

  useEffect(() => {
    checkStatus()

    const onSubscribed = () => {
      setIsSubscribed(true)
      setPermission('granted')
      setStatusMsg('Đã bật thông báo thành công!')
    }

    const onUnsubscribed = () => {
      setIsSubscribed(false)
      setStatusMsg('Đã tắt thông báo trên thiết bị này.')
    }

    window.addEventListener('pwa:push-subscribed', onSubscribed)
    window.addEventListener('pwa:push-unsubscribed', onUnsubscribed)

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      window.removeEventListener('pwa:push-subscribed', onSubscribed)
      window.removeEventListener('pwa:push-unsubscribed', onUnsubscribed)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleToggle = async () => {
    if (!window.PWA) return
    setLoading(true)
    setStatusMsg(null)

    try {
      if (isSubscribed) {
        await window.PWA.unsubscribePush()
        setIsSubscribed(false)
      } else {
        await window.PWA.requestPushPermission()
        setIsSubscribed(true)
        setPermission('granted')
      }
    } catch (err: any) {
      setStatusMsg(err.message || 'Lỗi xử lý thông báo')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          checkStatus()
        }}
        className="relative p-2 rounded-xl bg-wood-800/80 border border-wood-700/60 hover:bg-wood-700 text-stone-300 hover:text-gold-400 transition-colors flex items-center justify-center cursor-pointer"
        title="Thông báo đẩy (PWA Push)"
        aria-label="Cài đặt thông báo đẩy"
      >
        {isSubscribed ? (
          <BellRing className="w-4 h-4 text-gold-400" />
        ) : (
          <Bell className="w-4 h-4" />
        )}

        {/* Small badge dot */}
        <span
          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
            isSubscribed ? 'bg-emerald-500' : 'bg-stone-500'
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-wood-900 border border-gold-500/30 rounded-2xl shadow-2xl p-4 z-50 text-stone-200 animate-in fade-in duration-200 font-sans">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-wood-700/60">
            <span className="font-serif font-bold text-sm text-gold-400 flex items-center gap-1.5">
              <Bell className="w-4 h-4" />
              Thông báo đẩy (PWA)
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                isSubscribed
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-stone-800 text-stone-400 border border-stone-700'
              }`}
            >
              {isSubscribed ? 'Đang bật' : 'Chưa bật'}
            </span>
          </div>

          <p className="text-xs text-stone-300 leading-relaxed mb-3">
            {isSubscribed
              ? 'Thiết bị này đang nhận thông báo ngày giỗ và tin tức quan trọng từ Tộc phả Họ Đỗ Đàm An.'
              : 'Bật thông báo đẩy để nhận lời nhắc các ngày giỗ tổ tiên và hoạt động dòng tộc ngay trên màn hình thiết bị.'}
          </p>

          {statusMsg && (
            <div className="mb-3 p-2 rounded-lg bg-wood-800/90 text-[11px] text-gold-300 border border-gold-500/20">
              {statusMsg}
            </div>
          )}

          <button
            onClick={handleToggle}
            disabled={loading}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
              isSubscribed
                ? 'bg-wood-800 hover:bg-wood-700 text-stone-300 border border-wood-600'
                : 'bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-wood-950 shadow-md'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : isSubscribed ? (
              <>
                <BellOff className="w-3.5 h-3.5 text-stone-400" />
                <span>Tắt thông báo trên máy này</span>
              </>
            ) : (
              <>
                <BellRing className="w-3.5 h-3.5" />
                <span>Bật thông báo trên máy này</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
