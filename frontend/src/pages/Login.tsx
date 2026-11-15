import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useSession } from '../lib/session'
import { ErrorNote, Label } from '../components/ui/kit'
import { Lock } from '../components/ui/icons'

export default function Login() {
  const { user, signIn } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (user) return <Navigate to="/home" replace />

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(null)
    try { await signIn(email, password); navigate('/home', { replace: true }) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in'); setBusy(false) }
  }

  return <div className="mx-auto grid min-h-[68vh] w-full max-w-[980px] place-items-center px-5 py-10">
    <div className="grid w-full overflow-hidden rounded-xl border border-line bg-card shadow-sm md:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden min-h-[510px] overflow-hidden bg-forest p-9 text-on-forest md:flex md:flex-col md:justify-between">
        <span aria-hidden className="absolute -right-16 -top-12 h-64 w-64 rounded-full border border-on-forest/15" />
        <span aria-hidden className="absolute -bottom-28 -left-16 h-72 w-72 rounded-full border border-on-forest/15" />
        <div className="relative">
          <div className="grid h-12 w-12 place-items-center rounded-lg border border-on-forest/20 bg-on-forest/10"><Lock size={20} strokeWidth={1.5} /></div>
          <Label className="mt-8 block !text-on-forest/70">A clearer path forward</Label>
          <h2 className="mt-3 max-w-sm font-serif text-[2.6rem] leading-[1.05]">Your money story, kept in your hands.</h2>
          <p className="mt-4 max-w-sm leading-relaxed text-on-forest/75">Track your savings, plan for retirement, and pick up where you left off.</p>
        </div>
        <p className="relative text-sm text-on-forest/70">Private account · Encrypted financial tracker</p>
      </aside>
      <form onSubmit={submit} className="p-7 sm:p-10 md:p-12">
        <Label>Welcome back</Label>
        <h1 className="mt-2 text-3xl text-ink">Sign in</h1>
        <p className="mt-2 text-soft">Continue to your SixtyFy account.</p>
        <div className="mt-7 space-y-4">
          <div><label htmlFor="login-email" className="label">Email address</label><input id="login-email" type="email" autoComplete="email" required className="field mt-1.5" value={email} onChange={e => setEmail(e.target.value)} /></div>
          <div><label htmlFor="login-password" className="label">Password</label><input id="login-password" type="password" autoComplete="current-password" required className="field mt-1.5" value={password} onChange={e => setPassword(e.target.value)} /></div>
        </div>
        {error && <div className="mt-4"><ErrorNote message={error} /></div>}
        <button className="btn mt-6 w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in securely'}</button>
        <p className="mt-5 text-center text-sm text-soft">New to SixtyFy? <Link className="link" to="/start">Create your account</Link></p>
        <div className="mt-7 flex items-start gap-2 border-t border-line pt-4 text-[13px] leading-relaxed text-soft"><Lock size={15} className="mt-0.5 shrink-0" /> Your session uses a protected, HttpOnly cookie. Financial tracker details are encrypted before they are stored.</div>
      </form>
    </div>
  </div>
}
