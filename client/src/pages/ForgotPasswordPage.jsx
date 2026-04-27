import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

export function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao processar solicitação.')
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Leads CRM</h1>
          <p className="mt-1 text-sm text-zinc-400">Redefinição de senha</p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-lg">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 size={40} className="text-green-400" />
              <p className="text-sm text-zinc-300">
                Se o e-mail estiver cadastrado, você receberá as instruções de redefinição em breve.
              </p>
              <Link
                to="/login"
                className="mt-2 flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
              >
                <ArrowLeft size={14} /> Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-zinc-400">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-300">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                  placeholder="seu@email.com"
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
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
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
