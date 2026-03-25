import { useState } from 'react'
import { login } from '../services/authService'

export default function LoginPage({ onSwitchToSignup }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-brand-dark via-slate-900 to-black">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-brand-accent to-brand-primary tracking-tight">
            EchoMap
          </h1>
          <p className="text-slate-400 text-sm mt-1">Noise Pollution Mapper</p>
        </div>

        {/* Card */}
        <div className="bg-brand-surface/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-brand-primary/5 to-transparent pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-slate-400 text-sm mb-6">Sign in to your account to continue.</p>

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

              {/* Error banner */}
              {error && (
                <div className="bg-red-500/15 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-email" className="text-sm font-medium text-slate-300">Email</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="bg-brand-dark/60 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-primary/60 focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-slate-300">Password</label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-brand-dark/60 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-primary/60 focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-primary to-violet-500 shadow-md shadow-brand-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* Switch to Signup */}
            <p className="text-center text-sm text-slate-400 mt-6">
              Don't have an account?{' '}
              <button
                id="switch-to-signup"
                onClick={onSwitchToSignup}
                className="text-brand-accent font-semibold hover:underline transition-all"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
