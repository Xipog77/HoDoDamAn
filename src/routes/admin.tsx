import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useAuth } from '../components/AuthProvider'
import { Shield, Users, TreePine, BookOpen, DollarSign, Bell, UserCircle, Calendar } from 'lucide-react'

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
})

function AdminLayout() {
  const { user, isAdmin } = useAuth()

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Shield className="w-16 h-16 text-stone-200 mx-auto mb-4" />
        <h1 className="font-serif text-2xl font-bold text-wood-900 mb-2">Không có quyền truy cập</h1>
        <p className="text-stone-500 font-sans mb-6">Bạn cần có quyền Admin để truy cập trang này.</p>
        <Link to="/" className="bg-gold-600 text-white px-6 py-3 rounded-xl hover:bg-gold-500 transition-colors font-medium">
          Về trang chủ
        </Link>
      </div>
    )
  }

  const adminLinks = [
    { to: '/admin/users', label: 'Quản lý thành viên', icon: Users },
    { to: '/admin/persons', label: 'Quản lý hồ sơ', icon: UserCircle },
    { to: '/admin/tree', label: 'Quản lý gia phả', icon: TreePine },
    { to: '/admin/posts', label: 'Quản lý bài viết', icon: BookOpen },
    { to: '/admin/fund', label: 'Quản lý quỹ họ', icon: DollarSign },
    { to: '/admin/anniversaries', label: 'Quản lý sự kiện', icon: Calendar },
    { to: '/admin/notifications', label: 'Thông báo', icon: Bell },
  ]

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-64 bg-wood-900 text-white flex-shrink-0 hidden md:block">
        <div className="p-6 border-b border-wood-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gold-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <p className="font-serif font-bold text-gold-300">Admin Panel</p>
              <p className="text-xs text-stone-400 font-sans">{user?.displayName}</p>
            </div>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {adminLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-300 hover:text-white hover:bg-wood-700 transition-colors font-sans"
              activeProps={{ className: 'bg-wood-700 text-gold-300 font-medium' }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden bg-wood-900 w-full fixed bottom-0 left-0 z-40 border-t border-wood-700 flex">
        {adminLinks.slice(0, 5).map(({ to, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex-1 flex flex-col items-center py-3 text-stone-400 hover:text-gold-300 transition-colors"
            activeProps={{ className: 'text-gold-300' }}
          >
            <Icon className="w-5 h-5" />
          </Link>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 overflow-auto bg-stone-50 p-6">
        <Outlet />
      </main>
    </div>
  )
}
