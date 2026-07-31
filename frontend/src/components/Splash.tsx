import { useEffect, useState } from 'react'

const KEY = 'splash-shown'

export default function Splash() {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(KEY))

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => dismiss(), 2600)
    return () => clearTimeout(t)
  }, [visible])

  const dismiss = () => {
    sessionStorage.setItem(KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden anim-fade-in"
      style={{ background: '#0A1B33', gap: 34 }}
    >
      <div
        className="absolute rounded-full"
        style={{
          top: -140, left: -120, width: 420, height: 420,
          background: 'radial-gradient(circle,rgba(0,117,255,.30),transparent 68%)',
          animation: 'floatY 7s ease-in-out infinite',
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          bottom: -160, right: -100, width: 460, height: 460,
          background: 'radial-gradient(circle,rgba(133,58,245,.22),transparent 68%)',
          animation: 'floatY 9s ease-in-out infinite',
        }}
      />
      <div className="relative grid place-items-center" style={{ width: 220, height: 220 }}>
        <div
          className="absolute rounded-full"
          style={{ width: 200, height: 200, border: '1px solid rgba(0,117,255,.45)', animation: 'ringOut 2.8s cubic-bezier(.22,1,.36,1) infinite' }}
        />
        <div
          className="absolute rounded-full"
          style={{ width: 200, height: 200, border: '1px solid rgba(0,117,255,.45)', animation: 'ringOut 2.8s cubic-bezier(.22,1,.36,1) .9s infinite' }}
        />
        <div
          className="absolute rounded-full"
          style={{ width: 52, height: 52, background: '#0075FF', animation: 'convL 1.1s cubic-bezier(.22,1,.36,1) both' }}
        />
        <div
          className="absolute rounded-full"
          style={{ width: 52, height: 52, background: '#2FC6F6', mixBlendMode: 'screen', animation: 'convR 1.1s cubic-bezier(.22,1,.36,1) both' }}
        />
      </div>
      <div className="flex flex-col items-center" style={{ gap: 12 }}>
        <div style={{ color: '#fff', fontSize: 34, fontWeight: 600, letterSpacing: '-.8px', animation: 'fadeUp .7s cubic-bezier(.22,1,.36,1) .8s both' }}>
          Один на один
        </div>
        <div style={{ color: '#8FA6C4', fontSize: 16, animation: 'fadeUp .7s cubic-bezier(.22,1,.36,1) 1s both' }}>
          Встречи, которые не хочется отменять
        </div>
      </div>
      <div
        onClick={dismiss}
        className="absolute cursor-pointer transition-colors"
        style={{ bottom: 34, fontSize: 13, color: '#5D7692', transitionDuration: '.2s', animation: 'fadeIn 1s 1.5s both' }}
        onMouseEnter={e => { e.currentTarget.style.color = '#A9C0DA' }}
        onMouseLeave={e => { e.currentTarget.style.color = '#5D7692' }}
      >
        Пропустить
      </div>
    </div>
  )
}
