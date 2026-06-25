import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { TreePine, Users, Calendar, Bell, BookOpen, ArrowRight, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { homepageBackgrounds } from '@/lib/background-images'

interface HomepageData {
  featuredPosts: Array<{ id: number; title: string; excerpt: string | null; coverImage: string | null; createdAt: string; authorName: string }>
  notifications: Array<{ id: number; title: string; content: string; createdAt: string }>
  upcomingAnniversaries: Array<{ personId: number; name: string; lunarDate: string; daysUntil: number }>
  stats: { totalPersons: number; generations: number }
}

export const Route = createFileRoute('/')({
  component: HomePage,
})

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-stone-200 rounded w-3/4 mb-3" />
      <div className="h-3 bg-stone-200 rounded w-full mb-2" />
      <div className="h-3 bg-stone-200 rounded w-5/6" />
    </div>
  )
}

function HomePage() {
  const [data, setData] = useState<HomepageData | null>(null)
  const [slides, setSlides] = useState<any[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch homepage details
    fetch('/api/homepage/data')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))

    // Fetch carousel slides
    fetch('/api/carousel')
      .then(r => r.json())
      .then(d => setSlides(d.slides || []))
      .catch(console.error)
  }, [])

  // Auto-play slides
  useEffect(() => {
    if (slides.length <= 1) return
    const interval = setInterval(() => {
      setCurrentSlide(curr => (curr + 1) % slides.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [slides])

  const nextSlide = () => {
    setCurrentSlide(curr => (curr + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide(curr => (curr - 1 + slides.length) % slides.length)
  }

  return (
    <div className="min-h-screen">
      
      {/* Unified Hero & History Banner — Transparent over Background Image */}
      <section className="relative text-white py-20 overflow-hidden border-b border-gold-600/30">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
          style={{ 
            backgroundImage: `url("${homepageBackgrounds[0] || 'https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?auto=format&fit=crop&q=80&w=1600'}")`,
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-wood-950/95 via-wood-950/90 to-wood-950/95" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url(/pattern-trondong.svg)', backgroundSize: '200px' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 bg-gold-500/20 border border-gold-400/30 rounded-full px-4 py-1.5">
              <span className="text-gold-300 text-xs font-semibold tracking-wider uppercase font-sans">Lịch sử & Nguồn cội</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-gold-400 drop-shadow-md">
              Lịch sử Dòng tộc Đỗ Đàm An
            </h1>
            <div className="w-20 h-1 bg-gold-600 rounded" />
            
            <div className="flex flex-col gap-5 text-stone-200 font-sans text-base leading-relaxed text-justify">
              <p>
                Khởi nguồn từ vùng đất Thanh Hóa ngàn năm văn hiến, cụ Khởi Tổ dòng họ Đỗ Đàm An đã thực hiện cuộc thiên di lịch sử vào thế kỷ 18. Với ý chí sắt đá, lòng dũng cảm phi thường và tầm nhìn xa trông rộng, cụ cùng hiền mẫu đã vượt qua trăm ngàn gian khó để khai sơn phá thạch, lập ấp và đặt nền móng đầu tiên cho cơ nghiệp của dòng tộc tại vùng đất mới.
              </p>
              <p>
                Trải qua hơn hai trăm năm hưng thịnh và phát triển, qua 9 thế hệ tiếp nối, con cháu dòng họ Đỗ Đàm An luôn giữ vững truyền thống gia phong cao đẹp: lấy <strong>Trung Hiếu làm đầu, Cần Kiệm lập thân</strong>, lấy sự học và tri thức làm kim chỉ nam để vươn lên.
              </p>
              <blockquote className="border-l-4 border-gold-500 pl-4 py-2 my-6 italic text-stone-200 bg-gold-500/10 font-serif rounded-r-lg">
                "Cây có cội mới nảy cành xanh lá, nước có nguồn mới bể rộng sông sâu. Con cháu họ Đỗ Đàm An ngàn đời khắc cốt ghi tâm công ơn tiên tổ, cùng nhau đoàn kết xây dựng quê hương, làm rạng danh dòng tộc."
              </blockquote>
              <p>
                Hệ thống gia phả số này được xây dựng nhằm mục đích thiêng liêng: bảo tồn vẹn nguyên lịch sử dòng họ, ghi nhận công lao của các bậc tiền nhân, đồng thời là cầu nối vững chắc kết nối tình cảm thâm giao của tất cả con cháu nội ngoại trên khắp mọi miền Tổ quốc.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      {data && (
        <section className="bg-white border-b border-stone-100 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              <StatCard icon={Users} label="Thành viên" value={data.stats.totalPersons.toString()} to="/tree" />
              <StatCard icon={TreePine} label="Thế hệ" value={`${data.stats.generations} đời`} to="/tree" />
              <StatCard icon={BookOpen} label="Bài viết" value={data.featuredPosts.length.toString()} to="/posts" />
              <StatCard icon={Calendar} label="Ngày giỗ sắp tới" value={data.upcomingAnniversaries.length.toString()} to="/anniversaries" />
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Featured Posts */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-2xl font-bold text-wood-900">Bài đăng nổi bật</h2>
              <Link to="/posts" className="text-sm text-gold-600 hover:text-gold-500 flex items-center gap-1 font-medium">
                Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="space-y-4">
                {(data?.featuredPosts || []).map(post => (
                  <Link key={post.id} to="/posts/$id" params={{ id: post.id.toString() }} className="block">
                    <article className="bg-white rounded-2xl shadow-sm hover:shadow-md border border-stone-100 hover:border-gold-200 overflow-hidden transition-all group">
                      <div className="flex gap-4 p-5">
                        {post.coverImage && (
                          <img src={post.coverImage} alt={post.title} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-serif font-semibold text-wood-900 mb-1 group-hover:text-gold-700 transition-colors line-clamp-2">{post.title}</h3>
                          {post.excerpt && <p className="text-sm text-stone-500 font-sans line-clamp-2 mb-2">{post.excerpt}</p>}
                          <div className="flex items-center gap-3 text-xs text-stone-400 font-sans">
                            <span>{post.authorName}</span>
                            <span>•</span>
                            <span>{new Date(post.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
                {(!data?.featuredPosts?.length) && (
                  <p className="text-stone-400 text-center py-12 font-sans">Chưa có bài viết nào</p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notifications */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5 text-gold-600" />
                <h3 className="font-serif font-semibold text-wood-900">Thông báo</h3>
              </div>
              {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-12 bg-stone-100 rounded-lg animate-pulse" />)}</div>
              ) : (
                <div className="space-y-3">
                  {(data?.notifications || []).map(n => (
                    <div key={n.id} className="p-3 bg-gold-50 rounded-xl border border-gold-100">
                      <p className="text-sm font-semibold text-wood-800 font-serif">{n.title}</p>
                      <p className="text-xs text-stone-500 mt-1 font-sans line-clamp-2">{n.content}</p>
                    </div>
                  ))}
                  {(!data?.notifications?.length) && (
                    <p className="text-stone-400 text-sm text-center py-4 font-sans">Không có thông báo</p>
                  )}
                </div>
              )}
            </div>

            {/* Upcoming anniversaries */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-crimson-600" />
                  <h3 className="font-serif font-semibold text-wood-900">Ngày giỗ sắp tới</h3>
                </div>
                <Link to="/anniversaries" className="text-xs text-gold-600 hover:text-gold-500 font-medium">
                  Xem lịch
                </Link>
              </div>
              {loading ? (
                <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-12 bg-stone-100 rounded-lg animate-pulse" />)}</div>
              ) : (
                <div className="space-y-3">
                  {(data?.upcomingAnniversaries || []).map(a => (
                    <Link key={a.personId} to="/person/$id" params={{ id: a.personId.toString() }} className="block p-3 bg-crimson-50 rounded-xl border border-crimson-100 hover:border-crimson-200 transition-colors group">
                      <p className="text-sm font-semibold text-wood-800 font-serif group-hover:text-crimson-700">{a.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-stone-500 font-sans">{a.lunarDate}</p>
                        <span className="text-xs font-medium text-crimson-600 bg-crimson-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {a.daysUntil === 0 ? 'Hôm nay' : `${a.daysUntil} ngày`}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {(!data?.upcomingAnniversaries?.length) && (
                    <p className="text-stone-400 text-sm text-center py-4 font-sans">Không có ngày giỗ trong 30 ngày tới</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Carousel — Bottom Section */}
      {slides.length > 0 && (
        <section className="bg-wood-950 border-t border-gold-600/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-2">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-12 h-[1px] bg-gold-600/40" />
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-gold-400 text-center">Hình ảnh gia tộc</h2>
              <div className="w-12 h-[1px] bg-gold-600/40" />
            </div>
          </div>
          <div className="relative w-full h-[360px] sm:h-[480px] md:h-[600px] overflow-hidden">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <img
                  src={slide.imageUrl}
                  alt={slide.title || 'Slide image'}
                  className="w-full h-full object-cover object-center"
                />
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-wood-950/90 via-wood-950/30 to-transparent" />
                
                {/* Slide text details */}
                {(slide.title || slide.description) && (
                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 md:p-14 text-white max-w-4xl">
                    {slide.title && (
                      <h3 className="font-serif text-xl sm:text-2xl md:text-3xl font-bold text-gold-300 drop-shadow-lg mb-2">
                        {slide.title}
                      </h3>
                    )}
                    {slide.description && (
                      <p className="text-stone-200 text-sm sm:text-base font-sans drop-shadow-md line-clamp-2 max-w-2xl">
                        {slide.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Slider controls (arrows) */}
            {slides.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-wood-900/60 hover:bg-wood-850/80 border border-wood-700/50 p-2 rounded-full text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-wood-900/60 hover:bg-wood-850/80 border border-wood-700/50 p-2 rounded-full text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Dots Indicator */}
            {slides.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === currentSlide ? 'bg-gold-500 w-6' : 'bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, to }: { icon: any; label: string; value: string; to?: string }) {
  const content = (
    <div className="flex flex-col items-center gap-1 group">
      <div className="w-10 h-10 bg-gold-100 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
        <Icon className="w-5 h-5 text-gold-700" />
      </div>
      <span className="font-serif text-2xl font-bold text-wood-900">{value}</span>
      <span className="text-xs text-stone-500 font-sans">{label}</span>
    </div>
  )

  if (to) {
    return (
      <Link to={to} className="block group">
        {content}
      </Link>
    )
  }

  return content
}
