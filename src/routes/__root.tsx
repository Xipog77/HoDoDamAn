import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'
import { AuthProvider } from '../components/AuthProvider'
import { Navbar } from '../components/Navbar'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Tộc Phả Họ Đỗ Đàm An' },
      { name: 'description', content: 'Hệ thống quản lý tộc phả Họ Đỗ Đàm An - kết nối các thế hệ' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body className="bg-parchment min-h-screen">
        <AuthProvider>
          <Navbar />
          <main>
            {children}
          </main>
          <Footer />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  )
}

function Footer() {
  return (
    <footer className="bg-wood-900 text-stone-400 py-10 mt-16 border-t border-wood-700">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="font-serif text-gold-500 text-xl mb-2">Họ Đỗ Đàm An</div>
        <p className="text-sm font-sans mb-4">Kết nối các thế hệ, lưu giữ ký ức, tôn vinh nguồn cội.</p>
        <p className="text-xs text-stone-500">© {new Date().getFullYear()} Tộc Phả Họ Đỗ Đàm An. Mọi quyền được bảo lưu.</p>
      </div>
    </footer>
  )
}
