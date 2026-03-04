import { useState, useCallback, createContext, useContext } from 'react';

// Toast context for global toast notifications
const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};

let toastId = 0;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
        return id;
    }, []);

    const success = useCallback((msg) => addToast(msg, 'success'), [addToast]);
    const error = useCallback((msg) => addToast(msg, 'error', 6000), [addToast]);
    const warning = useCallback((msg) => addToast(msg, 'warning', 5000), [addToast]);
    const info = useCallback((msg) => addToast(msg, 'info'), [addToast]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </ToastContext.Provider>
    );
};

// Toast icons by type
const TOAST_CONFIG = {
    success: {
        icon: '✓',
        bg: 'bg-emerald-900/90',
        border: 'border-emerald-500/40',
        iconBg: 'bg-emerald-500',
        text: 'text-emerald-100',
    },
    error: {
        icon: '✕',
        bg: 'bg-red-900/90',
        border: 'border-red-500/40',
        iconBg: 'bg-red-500',
        text: 'text-red-100',
    },
    warning: {
        icon: '!',
        bg: 'bg-amber-900/90',
        border: 'border-amber-500/40',
        iconBg: 'bg-amber-500',
        text: 'text-amber-100',
    },
    info: {
        icon: 'i',
        bg: 'bg-blue-900/90',
        border: 'border-blue-500/40',
        iconBg: 'bg-blue-500',
        text: 'text-blue-100',
    },
};

const ToastContainer = ({ toasts, onDismiss }) => {
    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-2 pointer-events-none w-full max-w-sm px-4">
            {toasts.map(toast => {
                const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
                return (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl ${config.bg} ${config.border} border backdrop-blur-md shadow-xl animate-slide-up`}
                    >
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full ${config.iconBg} text-white text-xs font-bold flex items-center justify-center`}>
                            {config.icon}
                        </span>
                        <span className={`text-sm font-medium ${config.text} flex-1`}>
                            {toast.message}
                        </span>
                        <button
                            onClick={() => onDismiss(toast.id)}
                            className="text-white/50 hover:text-white/80 transition text-lg leading-none flex-shrink-0"
                        >
                            ×
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
