import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react'

const ToastContext = createContext<(message: string) => void>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback((msg: string) => {
    setMessage(msg)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2600)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <div
          className="fixed z-[80] anim-fade-up"
          style={{
            bottom: 26,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0A1B33',
            color: '#fff',
            fontSize: 14,
            padding: '13px 20px',
            borderRadius: 12,
            boxShadow: '0 12px 34px rgba(10,27,51,.28)',
            animationDuration: '.3s',
          }}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}
