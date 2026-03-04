import { useState } from 'react'
import NoiseRecorder from './components/NoiseRecorder'
import MapView from './components/MapView'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'

function App() {
  const [view, setView] = useState('record') // 'record' or 'map'

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
            </header>

            {/* Main Content Area */}
            <main className="w-full bg-brand-surface/80 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
              {/* subtle glow effect behind */}
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
