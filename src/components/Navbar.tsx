'use client'
import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from './AuthProvider'
import { Menu, X, TreePine, Users, BookOpen, DollarSign, LogIn, LogOut, User, Shield, Calendar, UserCircle, Settings } from 'lucide-react'

export function Navbar() {
  const { user, logout, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [showUser, setShowUser] = useState(false)
  const [fontSizeScale, setFontSizeScale] = useState(100)

  useEffect(() => {
    const saved = localStorage.getItem('familytree-font-scale')
    if (saved) {
      const scale = parseInt(saved, 10)
      setFontSizeScale(scale)
      document.documentElement.style.fontSize = `${scale}%`
    }
  }, [])

  const changeFontSize = (delta: number) => {
    const newScale = Math.min(Math.max(fontSizeScale + delta, 90), 150)
    setFontSizeScale(newScale)
    localStorage.setItem('familytree-font-scale', newScale.toString())
    document.documentElement.style.fontSize = `${newScale}%`
  }

  const navLinks = [
    { to: '/', label: 'Trang chủ', icon: TreePine },
    { to: '/tree', label: 'Gia phả', icon: Users },
    { to: '/posts', label: 'Bài đăng', icon: BookOpen },
    { to: '/anniversaries', label: 'Sự kiện', icon: Calendar },
    { to: '/fund', label: 'Quỹ họ', icon: DollarSign },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-wood-900/95 backdrop-blur-sm border-b border-gold-600/20 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-gold-500 to-gold-700 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <TreePine className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-serif text-lg font-bold text-gold-400 leading-none">Họ Đỗ Đàm An</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-stone-300 hover:text-gold-400 hover:bg-wood-800 transition-all font-medium"
                activeProps={{ className: 'text-gold-400 bg-wood-800' }}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-crimson-400 hover:text-crimson-300 hover:bg-wood-800 transition-all font-medium"
                activeProps={{ className: 'text-crimson-300 bg-wood-800' }}
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          {/* Auth */}
          <div className="flex items-center gap-2">

            {/* Font size adjustments for elderly */}
            <div className="hidden xs:flex items-center gap-1 bg-wood-800/80 border border-wood-700/60 rounded-xl px-2.5 py-1 text-stone-300">
              <span className="text-[0.625rem] font-sans text-stone-400 mr-1 select-none">Cỡ chữ</span>
              <button
                onClick={() => changeFontSize(-10)}
                className="p-1 hover:text-gold-400 hover:bg-wood-700 rounded transition-colors text-xs font-bold w-6 h-6 flex items-center justify-center"
                title="Giảm cỡ chữ"
              >
                A-
              </button>
              <span className="text-xs font-mono font-semibold text-gold-500 w-9 text-center select-none">{fontSizeScale}%</span>
              <button
                onClick={() => changeFontSize(10)}
                className="p-1 hover:text-gold-400 hover:bg-wood-700 rounded transition-colors text-xs font-bold w-6 h-6 flex items-center justify-center"
                title="Tăng cỡ chữ"
              >
                A+
              </button>
            </div>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUser(!showUser)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-stone-300 hover:text-gold-400 hover:bg-wood-800 transition-all"
                >
                  <div className="w-7 h-7 bg-gold-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden sm:block font-medium">{user.displayName}</span>
                </button>
                {showUser && (
                  <div className="absolute right-0 mt-1 w-48 bg-wood-800 border border-wood-700 rounded-xl shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-wood-700">
                      <p className="text-sm font-semibold text-stone-200">{user.displayName}</p>
                      <p className="text-xs text-stone-400">{user.username}</p>
                    </div>
                    {user.personId && (
                      <Link
                        to="/person/$id"
                        params={{ id: String(user.personId) }}
                        onClick={() => setShowUser(false)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-stone-300 hover:text-gold-400 hover:bg-wood-700 transition-colors border-b border-wood-700/50"
                      >
                        <UserCircle className="w-4 h-4" />
                        Hồ sơ của tôi
                      </Link>
                    )}
                    <Link
                      to="/settings"
                      onClick={() => setShowUser(false)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-stone-300 hover:text-gold-400 hover:bg-wood-700 transition-colors border-b border-wood-700/50"
                    >
                      <Settings className="w-4 h-4" />
                      Cài đặt
                    </Link>
                    <button
                      onClick={() => { setShowUser(false); logout() }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-stone-300 hover:text-crimson-400 hover:bg-wood-700 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 bg-gold-600 hover:bg-gold-500 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
              >
                <LogIn className="w-4 h-4" />
                Đăng nhập
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 text-stone-300 hover:text-gold-400 hover:bg-wood-800 rounded-lg transition-colors"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {open && (
          <div className="md:hidden border-t border-wood-700 py-3 space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-sm text-stone-300 hover:text-gold-400 hover:bg-wood-800 rounded-lg transition-colors font-medium"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-3 text-sm text-crimson-400 hover:bg-wood-800 rounded-lg transition-colors font-medium"
              >
                <Shield className="w-4 h-4" />
                Quản trị Admin
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
