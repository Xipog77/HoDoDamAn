import { useState, useEffect } from 'react'
import { Bell, X, CheckCircle, Share, Sparkles } from 'lucide-react'

declare global {
  interface Window {
    PWA?: {
      isSupported: () => boolean
      registerServiceWorker: () => Promise<ServiceWorkerRegistration | null>
      getSubscriptionStatus: () => Promise<{
        supported: boolean
        permission: NotificationPermission | 'unsupported'
        isSubscribed: boolean
        subscription: PushSubscription | null
      }>
      requestPushPermission: () => Promise<PushSubscription>
      unsubscribePush: () => Promise<boolean>
    }
  }
}

export function PushPromptBanner() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isIosNotStandalone, setIsIosNotStandalone] = useState(false)

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    // Check if dismissed in this session
    if (sessionStorage.getItem('pwa_push_dismissed')) return

    // Detect iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true

    if (isIos && !isStandalone) {
      setIsIosNotStandalone(true)
    }

    const checkStatus = async () => {
      // Small timeout to allow pwa-init.js to initialize
      await new Promise(r => setTimeout(r, 1200))
      if (!window.PWA || !window.PWA.isSupported()) return

      const status = await window.PWA.getSubscriptionStatus()
      if (status.supported && !status.isSubscribed && status.permission === 'default') {
        setShow(true)
      }
    }

    checkStatus()

    const handleSubscribed = () => {
      setShow(false)
    }
    window.addEventListener('pwa:push-subscribed', handleSubscribed)
    return () => window.removeEventListener('pwa:push-subscribed', handleSubscribed)
  }, [])

  if (!show) return null

  const handleSubscribe = async () => {
    setLoading(true)
    setErrorMessage(null)

    try {
      if (!window.PWA) {
        throw new Error('Hệ thống thông báo chưa sẵn sàng. Vui lòng thử lại.')
      }

      await window.PWA.requestPushPermission()
      setSuccess(true)
      setTimeout(() => {
        setShow(false)
      }, 3500)
    } catch (err: any) {
      console.warn('[PWA] Push subscription prompt error:', err)
      if (isIosNotStandalone) {
        setErrorMessage(
          'Trên iPhone/iPad: Vui lòng mở Safari, bấm nút Chia sẻ (⎋) rồi chọn "Thêm vào MH chính" để nhận thông báo đẩy.'
        )
      } else {
        setErrorMessage(err.message || 'Không thể bật thông báo. Vui lòng kiểm tra cài đặt trình duyệt.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_push_dismissed', 'true')
    setShow(false)
  }

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-wood-900/95 backdrop-blur-md border border-gold-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl text-stone-200">
        <div className="flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-400/30 flex items-center justify-center flex-shrink-0 text-gold-400">
            {success ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <Bell className="w-5 h-5 animate-pulse text-gold-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-serif font-bold text-gold-400 text-sm sm:text-base">
                {success ? 'Đã bật thông báo đẩy!' : 'Nhận thông báo ngày giỗ & sự kiện'}
              </span>
              <Sparkles className="w-3.5 h-3.5 text-gold-300 flex-shrink-0" />
            </div>

            <p className="text-xs text-stone-300 font-sans leading-relaxed">
              {success
                ? 'Thiết bị của bạn đã được kết nối thành công. Bạn sẽ nhận được thông báo ngày giỗ và thông tin dòng họ kịp thời.'
                : 'Bật thông báo để không bỏ lỡ các ngày giỗ tổ tiên và hoạt động quan trọng của Chi tộc Họ Đỗ Đàm An.'}
            </p>

            {isIosNotStandalone && !success && (
              <div className="mt-2 p-2 bg-wood-800/80 rounded-lg border border-gold-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                <Share className="w-3.5 h-3.5 flex-shrink-0" />
                <span>iPhone/iPad: Bấm <strong>Chia sẻ (⎋)</strong> &rarr; <strong>Thêm vào MH chính</strong> để bật thông báo.</span>
              </div>
            )}

            {errorMessage && (
              <p className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-lg p-2 mt-2">
                {errorMessage}
              </p>
            )}

            {!success && (
              <div className="flex items-center gap-2 mt-3.5">
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-wood-950 text-xs font-bold font-sans px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Đang kích hoạt...' : 'Bật thông báo ngay'}
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-stone-400 hover:text-stone-200 text-xs font-sans px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Để sau
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="text-stone-400 hover:text-stone-200 p-1 rounded-lg hover:bg-wood-800 transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
