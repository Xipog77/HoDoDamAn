import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Calendar, User, ArrowLeft, Send, Trash2, Reply, MessageSquare } from 'lucide-react'
import { useAuth } from '../../components/AuthProvider'

export const Route = createFileRoute('/posts/$id')({
  component: PostDetail,
})

interface Post {
  id: number
  title: string
  content: string
  excerpt: string | null
  coverImage: string | null
  authorName: string
  isFeatured: boolean | null
  createdAt: string
}

function PostDetail() {
  const { id } = Route.useParams()
  const { user, isMember } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Comments states
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyToId, setReplyToId] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState('')

  const loadPost = () => {
    fetch(`/api/posts/${id}`)
      .then(r => r.json())
      .then(d => setPost(d.post || null))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const loadComments = () => {
    fetch(`/api/comments?postId=${id}`)
      .then(r => r.json())
      .then(d => setComments(d.comments || []))
      .catch(console.error)
  }

  useEffect(() => {
    loadPost()
    loadComments()
  }, [id])

  const handleAddComment = async (e: React.FormEvent, parentId: number | null = null) => {
    e.preventDefault()
    const content = parentId ? replyContent : newComment
    if (!content.trim() || submitting) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: parseInt(id),
          content: content.trim(),
          parentId
        })
      })
      if (res.ok) {
        if (parentId) {
          setReplyContent('')
          setReplyToId(null)
        } else {
          setNewComment('')
        }
        loadComments()
      } else {
        alert('Lỗi khi gửi bình luận')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return
    try {
      const res = await fetch(`/api/comments/${commentId}`, { method: 'DELETE' })
      if (res.ok) {
        loadComments()
      } else {
        alert('Không có quyền xóa bình luận này.')
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Recursive component for single comment and its replies
  const CommentItem = ({ comment, depth = 0 }: { comment: any; depth: number }) => {
    const isAuthor = user && user.id === comment.userId
    const isAdmin = user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role)
    const canDelete = isAuthor || isAdmin

    return (
      <div className={`group space-y-3 ${depth > 0 ? 'ml-6 sm:ml-10 border-l border-stone-100 pl-4 py-1' : 'border-b border-stone-50 pb-5'}`}>
        <div className="flex items-start gap-3">
          {/* Avatar placeholder or initials */}
          <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0 font-sans text-xs font-bold text-wood-700 overflow-hidden">
            {comment.avatarUrl ? (
              <img src={comment.avatarUrl} alt={comment.authorName} className="w-full h-full object-cover" />
            ) : (
              comment.authorName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-serif font-bold text-sm text-wood-900">{comment.authorName}</span>
              {comment.authorRole === 'SUPER_ADMIN' && <span className="bg-crimson-50 text-crimson-600 text-[0.625rem] px-1.5 py-0.5 rounded font-sans font-semibold">Tộc trưởng</span>}
              {comment.authorRole === 'ADMIN' && comment.authorRole !== 'SUPER_ADMIN' && <span className="bg-gold-50 text-gold-700 text-[0.625rem] px-1.5 py-0.5 rounded font-sans font-semibold">Quản trị</span>}
              <span className="text-[0.6875rem] text-stone-400 font-sans">{new Date(comment.createdAt).toLocaleDateString('vi-VN')}</span>
            </div>
            <p className="text-sm text-stone-600 font-sans mt-1 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
            
            {/* Action buttons */}
            {isMember && (
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => {
                    setReplyToId(replyToId === comment.id ? null : comment.id)
                    setReplyContent('')
                  }}
                  className="flex items-center gap-1 text-[0.6875rem] text-stone-400 hover:text-gold-600 font-sans transition-colors"
                >
                  <Reply className="w-3 h-3" /> Phản hồi
                </button>
                {canDelete && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="flex items-center gap-1 text-[0.6875rem] text-stone-400 hover:text-crimson-600 font-sans transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Xóa
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reply Form */}
        {replyToId === comment.id && (
          <form onSubmit={(e) => handleAddComment(e, comment.id)} className="ml-11 flex gap-2">
            <input
              required
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              placeholder={`Trả lời ${comment.authorName}...`}
              className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-gold-300 font-sans bg-stone-50"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-gold-600 hover:bg-gold-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors font-sans"
            >
              <Send className="w-3 h-3" /> Gửi
            </button>
          </form>
        )}

        {/* Nested Replies */}
        {comment.replies && comment.replies.map((reply: any) => (
          <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse">
        <div className="h-10 bg-stone-200 rounded w-3/4 mb-4" />
        <div className="h-72 bg-stone-200 rounded-2xl mb-6" />
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-stone-200 rounded" />)}
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-stone-500 font-sans text-lg">Không tìm thấy bài đăng</p>
        <Link to="/posts" className="mt-4 inline-block text-gold-600 hover:text-gold-500 font-medium">← Quay lại danh sách bài đăng</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <Link to="/posts" className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-wood-800 mb-6 transition-colors font-sans">
          <ArrowLeft className="w-4 h-4" />
          Quay lại bài đăng
        </Link>

        <article className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          {/* Cover Image */}
          {post.coverImage && (
            <img src={post.coverImage} alt={post.title} className="w-full h-64 sm:h-80 lg:h-96 object-cover" />
          )}

          <div className="p-6 sm:p-8 lg:p-10">
            {post.isFeatured && (
              <span className="inline-block bg-gold-100 text-gold-700 text-xs px-3 py-1 rounded-full font-semibold mb-4">⭐ Nổi bật</span>
            )}

            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-wood-900 leading-tight mb-5">{post.title}</h1>

            <div className="flex items-center justify-between flex-wrap gap-3 text-sm text-stone-500 font-sans mb-8 pb-6 border-b border-stone-100">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <div className="w-7 h-7 bg-wood-100 rounded-full flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-wood-600" />
                  </div>
                  {post.authorName}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.createdAt).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>

            {post.excerpt && (
              <p className="text-lg text-stone-600 font-sans leading-relaxed italic border-l-4 border-gold-400 pl-5 mb-8 bg-gold-50/50 py-3 pr-4 rounded-r-xl">{post.excerpt}</p>
            )}

            <div
              className="prose prose-stone prose-lg max-w-none font-sans text-stone-700 leading-relaxed
                prose-headings:font-serif prose-headings:text-wood-900
                prose-a:text-gold-600 prose-a:no-underline hover:prose-a:underline
                prose-img:rounded-2xl prose-img:shadow-lg prose-img:border prose-img:border-stone-100 prose-img:mx-auto prose-img:block
                prose-blockquote:border-gold-400 prose-blockquote:bg-stone-50 prose-blockquote:rounded-r-xl prose-blockquote:py-1 prose-blockquote:not-italic
                prose-hr:border-stone-200"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>
        </article>
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-4">
          <MessageSquare className="w-5 h-5 text-gold-600" />
          <h2 className="font-serif text-lg font-bold text-wood-900">Bình luận & Phản hồi</h2>
        </div>

        {/* New Comment Input */}
        {isMember ? (
          <form onSubmit={(e) => handleAddComment(e, null)} className="space-y-3">
            <textarea
              required
              rows={3}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Chia sẻ ý kiến của bạn về bài viết này..."
              className="w-full px-4 py-3 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 focus:border-gold-400 font-sans resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors font-sans flex items-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Đang gửi...' : 'Gửi bình luận'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 text-center text-sm text-stone-500 font-sans">
            Vui lòng{' '}
            <Link to="/login" className="text-gold-600 hover:underline font-semibold">
              đăng nhập
            </Link>{' '}
            để thảo luận và gửi bình luận.
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-6 pt-2">
          {comments.map(c => (
            <CommentItem key={c.id} comment={c} depth={0} />
          ))}
          {comments.length === 0 && (
            <div className="text-center py-10 text-stone-400 font-sans">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-stone-200" />
              <p className="text-sm">Chưa có bình luận nào. Hãy là người đầu tiên thảo luận!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
