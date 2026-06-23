import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import { LogIn, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [code, setCode] = useState('')
  const [show2FA, setShow2FA] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const result = await login(username, password, show2FA ? code : undefined)
      if (result.error) {
        setError(result.error)
      } else if (result.requires2FA) {
        setShow2FA(true)
      } else {
        navigate({ to: '/' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-parchment to-stone-100">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-wood-800 to-wood-700 px-8 py-8 text-center text-white">
            <div className="w-14 h-14 bg-gold-500/20 border-2 border-gold-400/30 rounded-full flex items-center justify-center mx-auto mb-4">
              {show2FA ? (
                <ShieldCheck className="w-7 h-7 text-gold-300" />
              ) : (
                <LogIn className="w-7 h-7 text-gold-300" />
              )}
            </div>
            <h1 className="font-serif text-2xl font-bold text-white mb-1">
              {show2FA ? 'Xác thực 2FA' : 'Đăng nhập'}
            </h1>
            <p className="text-stone-300 text-sm font-sans">
              {show2FA ? 'Vui lòng nhập mã xác thực OTP từ ứng dụng của bạn' : 'Chào mừng trở lại, hỡi con cháu!'}
            </p>
          </div>

          <div className="px-8 py-8">
            {error && (
              <div className="bg-crimson-50 border border-crimson-200 text-crimson-700 rounded-xl px-4 py-3 text-sm mb-4 font-sans animate-in fade-in duration-200">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm mb-4 font-sans animate-in fade-in duration-200">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!show2FA ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5 font-sans">Tên đăng nhập</label>
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Nhập tên đăng nhập"
                      required
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 focus:border-gold-400 outline-none font-sans bg-stone-50 focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1.5 font-sans">Mật khẩu</label>
                    <div className="relative">
                      <input
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                        required
                        className="w-full px-4 py-3 pr-11 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-gold-300 focus:border-gold-400 outline-none font-sans bg-stone-50 focus:bg-white transition-colors"
                      />
                      <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                        {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="animate-in slide-in-from-bottom-2 duration-200">
                  <label className="block text-sm font-medium text-stone-700 mb-1.5 font-sans">Mã xác thực 2FA (6 chữ số)</label>
                  <input
                    type="text"
                    maxLength={6}
                    pattern="[0-9]*"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Nhập mã 6 số OTP"
                    required
                    className="w-full px-4 py-3 text-center tracking-widest font-mono text-lg border border-stone-200 rounded-xl focus:ring-2 focus:ring-gold-300 focus:border-gold-400 outline-none bg-stone-50 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShow2FA(false)
                      setCode('')
                      setError('')
                    }}
                    className="mt-3 flex items-center justify-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 mx-auto font-sans font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Quay lại màn hình đăng nhập
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold-600 hover:bg-gold-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-all shadow-md hover:shadow-gold-400/30 font-sans"
              >
                {loading ? 'Đang xử lý...' : (show2FA ? 'Xác nhận mã OTP' : 'Đăng nhập')}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-sm text-stone-400 mt-4 font-sans">
          <Link to="/" className="hover:text-gold-600 transition-colors">← Về trang chủ</Link>
        </p>
      </div>
    </div>
  )
}
