import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { AuthProvider } from '../components/AuthProvider'
import { Navbar } from '../components/Navbar'
import { PushPromptBanner } from '../components/PushPromptBanner'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'Tộc Phả Họ Đỗ Đàm An' },
      { name: 'description', content: 'Hệ thống quản lý tộc phả Họ Đỗ Đàm An - kết nối các thế hệ' },
      { name: 'theme-color', content: '#4a240b' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'Hộ độ Đàm An' },
      { name: 'application-name', content: 'Quản Lý Dòng Họ Đàm An' },
      { name: 'mobile-web-app-capable', content: 'yes' },
    ],
    links: [
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/icon-192x192.png' },
      { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
      { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
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
          <PushPromptBanner />
        </AuthProvider>
        <script src="/pwa-init.js" defer></script>
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
