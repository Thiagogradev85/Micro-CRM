import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, Loader2, Eye, EyeOff, CheckCircle2, ArrowLeft } from 'lucide-react'

export function ResetPasswordPage() {
  const [searchParams]          = useSearchParams()
  const navigate                = useNavigate()
  const token                   = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) return setError('As senhas não coincidem.')
    if (password.length < 6)  return setError('A senha deve ter pelo menos 6 caracteres.')

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao redefinir senha.')
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
        <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
          <p className="text-sm text-red-400 mb-4">Link de redefinição inválido ou expirado.</p>
          <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
            Solicitar novo link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Leads CRM</h1>
          <p className="mt-1 text-sm text-zinc-400">Criar nova senha</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 size={40} className="text-green-400" />
              <p className="text-sm text-zinc-300">
                Senha atualizada com sucesso! Redirecionando para o login…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Nova senha</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoFocus
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-10 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">Confirmar nova senha</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                {loading ? 'Salvando...' : 'Definir nova senha'}
              </button>

              <div className="text-center">
                <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
                  <ArrowLeft size={13} /> Voltar ao login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
