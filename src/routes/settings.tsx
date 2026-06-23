import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '../components/AuthProvider'
import { User, KeyRound, ShieldCheck, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user: authUser, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'profile' | 'password' | '2fa'>('profile')
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    phone: '',
    emailNotifications: true,
    socialLinks: { facebook: '', zalo: '', tiktok: '', youtube: '' },
    occupation: '',
    currentAddress: '',
    contactVisibility: { phone: false, email: false, social: false },
  })
  const [pwdForm, setPwdForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  })
  const [showOldPwd, setShowOldPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // 2FA Setup states
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [setup2FAData, setSetup2FAData] = useState<{ secret: string; qrCodeUrl: string } | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [showDisableForm, setShowDisableForm] = useState(false)

  const loadSettings = () => {
    setLoading(true)
    fetch('/api/auth/settings')
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(data => {
        const u = data.user
        const sl = u.socialLinks || {}
        const cv = u.contactVisibility || {}
        setProfile({
          displayName: u.displayName || '',
          email: u.email || '',
          phone: u.phone || '',
          emailNotifications: u.emailNotifications,
          socialLinks: {
            facebook: sl.facebook || '',
            zalo: sl.zalo || '',
            tiktok: sl.tiktok || '',
            youtube: sl.youtube || '',
          },
          occupation: u.occupation || '',
          currentAddress: u.currentAddress || '',
          contactVisibility: {
            phone: !!cv.phone,
            email: !!cv.email,
            social: !!cv.social,
          },
        })
        setTwoFactorEnabled(u.twoFactorEnabled)
        setLoading(false)
      })
      .catch(() => {
        navigate({ to: '/login' })
      })
  }

  useEffect(() => {
    if (!authLoading && !authUser) {
      navigate({ to: '/login' })
    } else if (authUser) {
      loadSettings()
    }
  }, [authUser, authLoading])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const d = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: d.message || 'Cập nhật thành công!' })
      } else {
        setMessage({ type: 'error', text: d.error || 'Có lỗi xảy ra' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối server' })
    } finally {
      setUpdating(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwdForm.newPassword !== pwdForm.confirmNewPassword) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' })
      return
    }
    setUpdating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'changePassword',
          oldPassword: pwdForm.oldPassword,
          newPassword: pwdForm.newPassword,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: d.message || 'Đổi mật khẩu thành công!' })
        setPwdForm({ oldPassword: '', newPassword: '', confirmNewPassword: '' })
      } else {
        setMessage({ type: 'error', text: d.error || 'Có lỗi xảy ra' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối server' })
    } finally {
      setUpdating(false)
    }
  }

  const handleSetup2FA = async () => {
    setUpdating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup2FA' }),
      })
      const d = await res.json()
      if (res.ok) {
        setSetup2FAData({ secret: d.secret, qrCodeUrl: d.qrCodeUrl })
      } else {
        setMessage({ type: 'error', text: d.error || 'Lỗi tạo khóa bí mật' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối server' })
    } finally {
      setUpdating(false)
    }
  }

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!setup2FAData || !verificationCode) return
    setUpdating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify2FA',
          secret: setup2FAData.secret,
          code: verificationCode,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: d.message })
        setTwoFactorEnabled(true)
        setSetup2FAData(null)
        setVerificationCode('')
      } else {
        setMessage({ type: 'error', text: d.error || 'Mã xác nhận không đúng' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối' })
    } finally {
      setUpdating(false)
    }
  }

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!disableCode) return
    setUpdating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/auth/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disable2FA',
          code: disableCode,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: d.message })
        setTwoFactorEnabled(false)
        setShowDisableForm(false)
        setDisableCode('')
      } else {
        setMessage({ type: 'error', text: d.error || 'Mã xác nhận không đúng' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối' })
    } finally {
      setUpdating(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-pulse font-sans">
        <div className="h-8 bg-stone-200 rounded w-1/3 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-40 bg-stone-200 rounded-2xl" />
          <div className="md:col-span-3 h-96 bg-stone-200 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-serif text-3xl font-bold text-wood-900 mb-2">Cài đặt tài khoản</h1>
      <p className="text-stone-500 text-sm font-sans mb-8">Cập nhật thông tin liên hệ, đổi mật khẩu và quản lý bảo mật 2 lớp.</p>

      {message && (
        <div className={`mb-6 p-4 rounded-xl border font-sans text-sm ${
          message.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
            : 'bg-crimson-50 border-crimson-200 text-crimson-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 h-fit flex flex-col gap-1">
          <button
            onClick={() => { setActiveTab('profile'); setMessage(null); }}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-gold-50 text-gold-800 font-semibold'
                : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            <User className="w-4 h-4" />
            Hồ sơ cá nhân
          </button>
          
          <button
            onClick={() => { setActiveTab('password'); setMessage(null); }}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'password'
                ? 'bg-gold-50 text-gold-800 font-semibold'
                : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Đổi mật khẩu
          </button>

          <button
            onClick={() => { setActiveTab('2fa'); setMessage(null); }}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === '2fa'
                ? 'bg-gold-50 text-gold-800 font-semibold'
                : 'text-stone-600 hover:bg-stone-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Bảo mật 2 lớp
          </button>
        </div>

        {/* Form Content Area */}
        <div className="md:col-span-3 bg-white rounded-2xl border border-stone-100 shadow-sm p-6 sm:p-8">
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <h2 className="font-serif text-xl font-bold text-wood-900 border-b border-stone-100 pb-3">Hồ sơ cá nhân</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Tên hiển thị *</label>
                  <input
                    required
                    type="text"
                    value={profile.displayName}
                    onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Tên đăng nhập (Username)</label>
                  <input
                    disabled
                    type="text"
                    value={authUser?.username}
                    className="w-full px-3 py-2.5 border border-stone-100 bg-stone-50 text-stone-400 rounded-xl text-sm font-sans cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Địa chỉ Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                      placeholder="email@example.com"
                      className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Số điện thoại</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                      placeholder="09xx xxx xxx"
                      className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Nghề nghiệp</label>
                  <input
                    type="text"
                    value={profile.occupation}
                    onChange={e => setProfile(p => ({ ...p, occupation: e.target.value }))}
                    placeholder="Ví dụ: Kỹ sư phần mềm, Giáo viên..."
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Nơi ở hiện tại</label>
                  <input
                    type="text"
                    value={profile.currentAddress}
                    onChange={e => setProfile(p => ({ ...p, currentAddress: e.target.value }))}
                    placeholder="Ví dụ: Quận 1, TP. Hồ Chí Minh..."
                    className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                  />
                </div>
              </div>

              <div>
                <h3 className="font-serif text-sm font-bold text-wood-850 mb-3 border-b border-stone-100 pb-1">Mạng xã hội</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1 font-sans">Facebook</label>
                    <input
                      type="text"
                      value={profile.socialLinks.facebook}
                      onChange={e => setProfile(p => ({ ...p, socialLinks: { ...p.socialLinks, facebook: e.target.value } }))}
                      placeholder="https://facebook.com/username"
                      className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1 font-sans">Zalo</label>
                    <input
                      type="text"
                      value={profile.socialLinks.zalo}
                      onChange={e => setProfile(p => ({ ...p, socialLinks: { ...p.socialLinks, zalo: e.target.value } }))}
                      placeholder="Số điện thoại hoặc link Zalo"
                      className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1 font-sans">TikTok</label>
                    <input
                      type="text"
                      value={profile.socialLinks.tiktok}
                      onChange={e => setProfile(p => ({ ...p, socialLinks: { ...p.socialLinks, tiktok: e.target.value } }))}
                      placeholder="https://tiktok.com/@username"
                      className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1 font-sans">YouTube</label>
                    <input
                      type="text"
                      value={profile.socialLinks.youtube}
                      onChange={e => setProfile(p => ({ ...p, socialLinks: { ...p.socialLinks, youtube: e.target.value } }))}
                      placeholder="https://youtube.com/@channel"
                      className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-serif text-sm font-bold text-wood-850 mb-3 border-b border-stone-100 pb-1">Quyền riêng tư (Hiển thị trong gia phả)</h3>
                <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="vis_phone"
                      checked={profile.contactVisibility.phone}
                      onChange={e => setProfile(p => ({ ...p, contactVisibility: { ...p.contactVisibility, phone: e.target.checked } }))}
                      className="w-4 h-4 accent-gold-600 cursor-pointer"
                    />
                    <label htmlFor="vis_phone" className="text-xs text-stone-600 font-sans cursor-pointer">
                      Công khai <strong>Số điện thoại</strong> cho các thành viên khác xem trong gia phả.
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="vis_email"
                      checked={profile.contactVisibility.email}
                      onChange={e => setProfile(p => ({ ...p, contactVisibility: { ...p.contactVisibility, email: e.target.checked } }))}
                      className="w-4 h-4 accent-gold-600 cursor-pointer"
                    />
                    <label htmlFor="vis_email" className="text-xs text-stone-600 font-sans cursor-pointer">
                      Công khai <strong>Địa chỉ Email</strong> cho các thành viên khác xem trong gia phả.
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="vis_social"
                      checked={profile.contactVisibility.social}
                      onChange={e => setProfile(p => ({ ...p, contactVisibility: { ...p.contactVisibility, social: e.target.checked } }))}
                      className="w-4 h-4 accent-gold-600 cursor-pointer"
                    />
                    <label htmlFor="vis_social" className="text-xs text-stone-600 font-sans cursor-pointer">
                      Công khai <strong>Mạng xã hội</strong> cho các thành viên khác xem trong gia phả.
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-stone-50/50 p-4 rounded-xl border border-stone-100 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="notif_email"
                  checked={profile.emailNotifications}
                  onChange={e => setProfile(p => ({ ...p, emailNotifications: e.target.checked }))}
                  className="w-4 h-4 accent-gold-600 cursor-pointer"
                />
                <label htmlFor="notif_email" className="text-xs text-stone-600 font-sans cursor-pointer">
                  Đồng ý nhận email thông báo khi có tin tức mới hoặc sự kiện trọng đại của dòng tộc.
                </label>
              </div>

              <button
                type="submit"
                disabled={updating}
                className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors font-sans shadow-sm"
              >
                {updating ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </form>
          )}

          {/* PASSWORD TAB */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-6">
              <h2 className="font-serif text-xl font-bold text-wood-900 border-b border-stone-100 pb-3">Đổi mật khẩu</h2>
              
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Mật khẩu hiện tại *</label>
                <div className="relative max-w-md">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type={showOldPwd ? 'text' : 'password'}
                    value={pwdForm.oldPassword}
                    onChange={e => setPwdForm(p => ({ ...p, oldPassword: e.target.value }))}
                    className="w-full pl-9 pr-10 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                  />
                  <button type="button" onClick={() => setShowOldPwd(!showOldPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showOldPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Mật khẩu mới *</label>
                <div className="relative max-w-md">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type={showNewPwd ? 'text' : 'password'}
                    value={pwdForm.newPassword}
                    onChange={e => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                    className="w-full pl-9 pr-10 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                  />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase font-sans tracking-wider">Xác nhận mật khẩu mới *</label>
                <div className="relative max-w-md">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    required
                    type="password"
                    value={pwdForm.confirmNewPassword}
                    onChange={e => setPwdForm(p => ({ ...p, confirmNewPassword: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updating}
                className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors font-sans shadow-sm"
              >
                {updating ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </form>
          )}

          {/* 2FA TAB */}
          {activeTab === '2fa' && (
            <div className="space-y-6">
              <h2 className="font-serif text-xl font-bold text-wood-900 border-b border-stone-100 pb-3">Xác thực 2 lớp (2FA)</h2>
              
              {!twoFactorEnabled ? (
                <div className="space-y-6">
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-stone-600 font-sans text-sm leading-relaxed">
                    Bảo mật 2 lớp (2FA) tăng cường tính an toàn cho tài khoản dòng họ của bạn bằng cách yêu cầu mã OTP 6 số mỗi khi đăng nhập.
                  </div>

                  {!setup2FAData ? (
                    <button
                      onClick={handleSetup2FA}
                      disabled={updating}
                      className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors font-sans shadow-sm"
                    >
                      Kích hoạt bảo mật 2 lớp
                    </button>
                  ) : (
                    <form onSubmit={handleVerify2FA} className="space-y-6 border border-stone-150 rounded-2xl p-5 bg-white shadow-inner animate-in fade-in duration-200">
                      <h3 className="font-serif font-semibold text-stone-800">Liên kết Authenticator</h3>
                      <p className="text-xs text-stone-500 font-sans leading-relaxed">
                        1. Quét mã QR dưới đây bằng Google Authenticator, Microsoft Authenticator, hoặc Authy.
                      </p>
                      
                      <div className="flex justify-center border border-stone-100 rounded-xl p-3 bg-stone-50 w-fit mx-auto shadow-sm">
                        <img src={setup2FAData.qrCodeUrl} alt="Mã QR Authenticator" className="w-48 h-48" />
                      </div>

                      <div className="text-center">
                        <p className="text-[0.6875rem] text-stone-400 uppercase font-semibold font-sans mb-1">Mã khóa bí mật (nếu không quét được QR)</p>
                        <code className="bg-stone-100 text-stone-800 text-xs px-3 py-1.5 rounded-lg select-all font-mono font-bold tracking-wider">{setup2FAData.secret}</code>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-stone-600 uppercase font-sans tracking-wider">
                          2. Nhập mã OTP 6 số từ ứng dụng để xác nhận kích hoạt
                        </label>
                        <input
                          required
                          type="text"
                          maxLength={6}
                          value={verificationCode}
                          onChange={e => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="VD: 123456"
                          className="w-full max-w-xs px-3 py-2.5 text-center font-mono tracking-widest text-lg border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={updating}
                          className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors font-sans shadow-sm"
                        >
                          Xác nhận kích hoạt
                        </button>
                        <button
                          type="button"
                          onClick={() => setSetup2FAData(null)}
                          className="border border-stone-200 hover:bg-stone-50 text-stone-600 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors font-sans"
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-5 rounded-2xl flex items-start gap-4">
                    <ShieldCheck className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                    <div>
                      <h3 className="font-serif font-bold text-sm">Bảo mật 2 lớp đang hoạt động</h3>
                      <p className="text-xs font-sans text-emerald-700/80 mt-1 leading-relaxed">
                        Tài khoản của bạn đang được bảo vệ bằng mã OTP 6 số. Hãy chắc chắn rằng bạn không xóa ứng dụng Authenticator chứa mã.
                      </p>
                    </div>
                  </div>

                  {!showDisableForm ? (
                    <button
                      onClick={() => setShowDisableForm(true)}
                      className="bg-crimson-600 hover:bg-crimson-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors font-sans shadow-sm"
                    >
                      Tắt bảo mật 2 lớp
                    </button>
                  ) : (
                    <form onSubmit={handleDisable2FA} className="space-y-4 border border-stone-150 rounded-2xl p-5 bg-white shadow-inner animate-in fade-in duration-200">
                      <label className="block text-xs font-semibold text-stone-600 uppercase font-sans tracking-wider">
                        Nhập mã OTP hiện tại để xác nhận tắt 2FA
                      </label>
                      <div className="flex gap-2">
                        <input
                          required
                          type="text"
                          maxLength={6}
                          value={disableCode}
                          onChange={e => setDisableCode(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="VD: 123456"
                          className="w-full max-w-xs px-3 py-2.5 text-center font-mono tracking-widest text-lg border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-gold-300 font-sans"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={updating}
                          className="bg-crimson-600 hover:bg-crimson-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors font-sans shadow-sm"
                        >
                          Xác nhận tắt 2FA
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDisableForm(false)}
                          className="border border-stone-200 hover:bg-stone-50 text-stone-600 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors font-sans"
                        >
                          Hủy
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
