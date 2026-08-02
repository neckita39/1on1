import { ReactNode } from 'react'

// Общий макет входа: тёмная левая панель + белая правая с формой.
// На телефоне панель превращается в тёмную шапку, а форма — в белый лист,
// который «выезжает» из-под неё и занимает остаток экрана.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] flex flex-col md:grid anim-fade-in md:grid-cols-[minmax(400px,44%)_1fr]"
      style={{ animationDuration: '.4s', background: '#0A1B33' }}
    >
      <div
        className="relative overflow-hidden flex flex-col justify-between gap-8 md:gap-0 px-6 pb-8 md:p-[52px]"
        style={{ background: '#0A1B33', paddingTop: 'calc(28px + env(safe-area-inset-top, 0px))' }}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            top: -120, right: -140, width: 420, height: 420,
            background: 'radial-gradient(circle,rgba(0,117,255,.30),transparent 70%)',
            animation: 'floatY 8s ease-in-out infinite',
          }}
        />
        <div className="relative flex items-center anim-slide-right" style={{ gap: 11 }}>
          <div className="flex items-center">
            <div className="rounded-full" style={{ width: 16, height: 16, background: '#0075FF' }} />
            <div className="rounded-full" style={{ width: 16, height: 16, background: '#2FC6F6', marginLeft: -6 }} />
          </div>
          <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, letterSpacing: '-.2px' }}>Один на один</div>
        </div>
        <div className="relative flex flex-col gap-3 md:gap-5" style={{ maxWidth: 440 }}>
          <div
            className="text-[27px] md:text-[40px]"
            style={{
              color: '#fff', lineHeight: 1.15, fontWeight: 600, letterSpacing: '-1.2px',
              textWrap: 'pretty', animation: 'fadeUp .7s cubic-bezier(.22,1,.36,1) .15s both',
            }}
          >
            Помните всё, что важно вашей команде
          </div>
          <div
            className="text-[14px] md:text-[16px] max-md:hidden"
            style={{
              color: '#8FA6C4', lineHeight: 1.6, textWrap: 'pretty',
              animation: 'fadeUp .7s cubic-bezier(.22,1,.36,1) .3s both',
            }}
          >
            Повестка, заметки и договорённости по каждому сотруднику — в одном месте.
            Регулярные встречи подтягиваются из календаря Битрикс24.
          </div>
        </div>
        <div className="relative flex max-md:hidden" style={{ gap: 36, animation: 'fadeUp .7s cubic-bezier(.22,1,.36,1) .45s both' }}>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 600 }}>1-1</div>
            <div style={{ color: '#5D7692', fontSize: 13 }}>раз в неделю</div>
          </div>
          <div className="flex flex-col" style={{ gap: 4 }}>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 600 }}>0</div>
            <div style={{ color: '#5D7692', fontSize: 13 }}>забытых договорённостей</div>
          </div>
        </div>
      </div>
      <div
        className="flex-1 flex items-start md:items-center justify-center bg-white px-5 pt-8 md:p-[52px] max-md:rounded-t-[24px]"
        style={{ paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="w-full flex flex-col" style={{ maxWidth: 370, gap: 20 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
