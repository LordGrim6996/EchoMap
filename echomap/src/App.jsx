import { useState, useEffect } from 'react'
import NoiseRecorder from './components/NoiseRecorder'
import MapView from './components/MapView'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import { onAuthChange, logout } from './services/authService'

function App() {
  const [view, setView] = useState('record') // 'record' or 'map'
  const [authView, setAuthView] = useState('login') // 'login' or 'signup'
  const [currentUser, setCurrentUser] = useState(undefined) // undefined = loading

  useEffect(() => {
    const unsubscribe = onAuthChange(user => setCurrentUser(user))
    return unsubscribe
  }, [])

  // Still resolving session from localStorage
  if (currentUser === undefined) return null

  // Not logged in — show auth screens
  if (!currentUser) {
    return (
      <ErrorBoundary>
        <ToastProvider>
          {authView === 'login'
            ? <LoginPage onSwitchToSignup={() => setAuthView('signup')} />
            : <SignupPage onSwitchToLogin={() => setAuthView('login')} />
          }
        </ToastProvider>
      </ErrorBoundary>
    )
  }

  // Logged in — show main app
  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-brand-dark via-slate-900 to-black">
          <div className="w-full max-w-lg flex flex-col gap-6">

            {/* Header Section */}
            <header className="flex justify-between items-center bg-brand-surface/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg">
              <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-brand-accent to-brand-primary tracking-tight">
                EchoMap
              </h1>

              <div className="flex items-center gap-3">
                <nav className="flex bg-brand-dark/50 rounded-full p-1 border border-white/5">
                  <button
                    onClick={() => setView('record')}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${view === 'record'
                      ? 'bg-gradient-to-r from-brand-primary to-violet-500 text-white shadow-md shadow-brand-primary/20'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    Record
                  </button>
                  <button
                    onClick={() => setView('map')}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${view === 'map'
                      ? 'bg-gradient-to-r from-brand-accent to-cyan-500 text-white shadow-md shadow-brand-accent/20'
                      : 'text-slate-400 hover:text-white'
                      }`}
                  >
                    Map
                  </button>
                </nav>

                {/* User + Logout */}
                <div className="flex items-center gap-2">
                  <span className="hidden sm:block text-xs text-slate-400 max-w-[80px] truncate" title={currentUser.name}>
                    {currentUser.name}
                  </span>
                  <button
                    id="logout-btn"
                    onClick={logout}
                    title="Sign out"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 bg-brand-dark/60 border border-white/10 hover:border-red-500/40 hover:text-red-400 transition-all duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            </header>

            {/* Main Content Area */}
            <main className="w-full bg-brand-surface/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
              <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-brand-primary/5 to-transparent pointer-events-none" />
              <div className="relative z-10 w-full">
                {view === 'record' && <NoiseRecorder />}
                {view === 'map' && <MapView />}
              </div>
            </main>

          </div>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
