import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState, useMemo } from 'react'
import { Users, CheckCircle, XCircle, Clock, Link2, Plus, X, Search, Shield } from 'lucide-react'
import { SearchableSelect } from '@/components/SearchableSelect'

export const Route = createFileRoute('/admin/users')({
  component: AdminUsers,
})

interface AdminUser {
  id: number
  username: string
  displayName: string
  role: string
  status: string
  personId: number | null
  createdAt: string
}

interface Person {
  id: number
  name: string
  generation: number | null
  branch: string | null
}

function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<number | null>(null)
  
  // Create user form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('MEMBER')
  const [personId, setPersonId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () => {
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/persons').then(r => r.json())
    ])
      .then(([usersData, personsData]) => {
        setUsers(usersData.users || [])
        setPersons(personsData.persons || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const updateUser = async (userId: number, updates: Record<string, unknown>) => {
    setUpdating(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      })
      if (res.ok) load()
    } finally {
      setUpdating(null)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreating(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          username,
          displayName,
          password,
          role,
          personId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Có lỗi xảy ra')
      } else {
        setShowAddForm(false)
        setUsername('')
        setDisplayName('')
        setPassword('')
        setRole('MEMBER')
        setPersonId(null)
        load()
      }
    } catch (e) {
      setError('Lỗi kết nối server')
    } finally {
      setCreating(false)
    }
  }

  const pending = users.filter(u => u.status === 'PENDING')
  const active = users.filter(u => u.status !== 'PENDING')

  // Searchable select options
  const personOptions = useMemo(() => {
    return persons.map(p => ({
      value: p.id,
      label: `${p.name} (Đời ${p.generation || '?'}${p.branch ? ` - ${p.branch}` : ''})`
    }))
  }, [persons])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-gold-600" />
          <h1 className="font-serif text-2xl font-bold text-wood-900">Quản lý Thành viên</h1>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setError('') }}
          className="flex items-center gap-2 bg-gold-600 hover:bg-gold-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tạo tài khoản
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 mb-8 max-w-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif font-semibold text-wood-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-gold-600" />
              Tạo tài khoản thành viên mới
            </h2>
            <button onClick={() => setShowAddForm(false)} className="text-stone-400 hover:text-stone-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {error && (
            <div className="bg-crimson-50 border border-crimson-100 text-crimson-700 text-xs px-4 py-2.5 rounded-xl mb-4 font-sans">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Tên đăng nhập *</label>
                <input required value={username} onChange={e => setUsername(e.target.value)} placeholder="VD: nguyenvanb"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Tên hiển thị *</label>
                <input required value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="VD: Nguyễn Văn B"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Mật khẩu *</label>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Vai trò</label>
                <select value={role} onChange={e => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-gold-300 font-sans bg-white">
                  <option value="MEMBER">Thành viên (Member)</option>
                  <option value="ADMIN">Quản trị viên (Admin)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-stone-600 mb-1 font-sans">Liên kết với Hồ sơ gia phả</label>
                <SearchableSelect
                  options={personOptions}
                  value={personId || ''}
                  onChange={val => setPersonId(val ? Number(val) : null)}
                  placeholder="Tìm kiếm và chọn hồ sơ trong dòng họ..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={creating}
                className="bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors font-sans">
                {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)}
                className="border border-stone-200 text-stone-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors font-sans">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="font-serif font-semibold text-crimson-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Yêu cầu chờ duyệt đăng ký ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(u => (
              <div key={u.id} className="bg-white rounded-xl border border-crimson-100 p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-bold text-sm text-wood-900 leading-snug">{u.displayName}</p>
                  <p className="text-sm text-stone-500 font-sans">@{u.username} • {new Date(u.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateUser(u.id, { status: 'ACTIVE' })}
                    disabled={updating === u.id}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Duyệt
                  </button>
                  <button
                    onClick={() => updateUser(u.id, { status: 'SUSPENDED' })}
                    disabled={updating === u.id}
                    className="flex items-center gap-1.5 bg-crimson-600 hover:bg-crimson-500 text-white text-sm px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-serif font-semibold text-wood-700 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Danh sách tài khoản ({active.length})
        </h2>
        <div className="bg-white rounded-xl border border-stone-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm font-sans">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-4 py-3 text-stone-600 font-medium">Thành viên</th>
                <th className="text-left px-4 py-3 text-stone-600 font-medium">Vai trò</th>
                <th className="text-left px-4 py-3 text-stone-600 font-medium">Trạng thái</th>
                <th className="text-left px-4 py-3 text-stone-600 font-medium w-80">Liên kết Hồ sơ gia phả</th>
                <th className="px-4 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {active.map(u => (
                <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-serif font-bold text-sm text-wood-900 leading-snug">{u.displayName}</p>
                    <p className="text-xs text-stone-400">@{u.username}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={e => updateUser(u.id, { role: e.target.value })}
                      disabled={updating === u.id}
                      className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-gold-300 outline-none bg-white"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                      u.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      'bg-crimson-100 text-crimson-700'
                    }`}>
                      {u.status === 'ACTIVE' ? 'Hoạt động' : u.status === 'PENDING' ? 'Chờ duyệt' : 'Khóa'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-64">
                        <SearchableSelect
                          options={personOptions}
                          value={u.personId || ''}
                          onChange={val => {
                            const pId = val ? Number(val) : null
                            if (pId !== u.personId) updateUser(u.id, { personId: pId })
                          }}
                          placeholder="Chưa liên kết hồ sơ..."
                        />
                      </div>
                      <Link2 className="w-3.5 h-3.5 text-stone-400" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => updateUser(u.id, { status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}
                      disabled={updating === u.id}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 font-medium ${
                        u.status === 'ACTIVE' ? 'bg-crimson-50 text-crimson-700 hover:bg-crimson-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? 'Khóa' : 'Kích hoạt'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {active.length === 0 && !loading && (
            <p className="text-center py-8 text-stone-400 text-sm font-sans">Chưa có thành viên</p>
          )}
        </div>
      </div>
    </div>
  )
}
