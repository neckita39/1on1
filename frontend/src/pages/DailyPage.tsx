import { useCallback, useState } from 'react'
import { Employee } from '../api/client'
import { useShell } from '../layout/AppShell'
import { Avatar, Button, Card } from '../ui'

function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

type Phase = 'idle' | 'running' | 'done'

function PersonRow({ employee, spoke, index }: { employee: Employee; spoke: boolean; index?: number }) {
  return (
    <div
      className="flex items-center"
      style={{ gap: 10, padding: '10px 12px', borderRadius: 12, opacity: spoke ? .6 : 1 }}
    >
      {index !== undefined && (
        <span className="tabular-nums" style={{ fontSize: 12, color: '#A5AEB8', width: 18, textAlign: 'right' }}>{index}.</span>
      )}
      {spoke ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1BCE7B" strokeWidth="2.5" className="flex-none">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <span className="rounded-full flex-none" style={{ width: 16, height: 16, border: '2px solid #D5DDE5' }} />
      )}
      <Avatar name={employee.name} id={employee.id} url={employee.avatarUrl} size={26} />
      <span style={{ fontSize: 14 }}>{employee.name}</span>
      {employee.position && <span style={{ fontSize: 12, color: '#A5AEB8' }}>· {employee.position}</span>}
    </div>
  )
}

export default function DailyPage() {
  const { employees } = useShell()
  const [order, setOrder] = useState<Employee[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')

  const handleStart = useCallback(() => {
    setOrder(shuffle(employees))
    setCurrentIndex(0)
    setPhase('running')
  }, [employees])

  const handleNext = () => {
    if (currentIndex + 1 >= order.length) {
      setPhase('done')
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const current = phase === 'running' ? order[currentIndex] : null
  const spoke = phase === 'running' ? order.slice(0, currentIndex) : phase === 'done' ? order : []
  const waiting = phase === 'running' ? order.slice(currentIndex + 1) : []

  return (
    <div className="flex flex-col" style={{ gap: 20, maxWidth: 720 }}>
      <div className="flex flex-col anim-fade-up" style={{ gap: 6 }}>
        <div className="eyebrow">Стендап</div>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-.8px' }}>Дейли</div>
      </div>

      {phase === 'idle' && (
        <Card className="anim-fade-up flex flex-col items-center" style={{ padding: 48, gap: 16, animationDelay: '.07s' }}>
          <div style={{ fontSize: 14, color: '#828B95' }}>
            {employees.length === 0
              ? 'Сначала добавьте сотрудников'
              : `${employees.length} человек — порядок перемешаем случайно`}
          </div>
          {employees.length > 0 && (
            <Button size="lg" sheen onClick={handleStart}>Начать дейли</Button>
          )}
        </Card>
      )}

      {phase === 'running' && current && (
        <>
          <Card className="anim-pop-in flex flex-col items-center" style={{ padding: '40px 32px', gap: 14 }}>
            <div className="eyebrow">Сейчас говорит</div>
            <Avatar name={current.name} id={current.id} url={current.avatarUrl} size={64} />
            <div className="flex flex-col items-center" style={{ gap: 2 }}>
              <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.7px' }}>{current.name}</div>
              {current.position && <div style={{ fontSize: 14, color: '#828B95' }}>{current.position}</div>}
            </div>
            <div className="tabular-nums" style={{ fontSize: 13, color: '#A5AEB8' }}>
              {currentIndex + 1} / {order.length}
            </div>
            <Button onClick={handleNext}>
              {currentIndex + 1 >= order.length ? 'Завершить' : 'Следующий'}
            </Button>
          </Card>

          {spoke.length > 0 && (
            <Card style={{ padding: '14px 8px' }}>
              <div className="eyebrow" style={{ padding: '0 12px', marginBottom: 4 }}>Уже говорили</div>
              {spoke.map(emp => <PersonRow key={emp.id} employee={emp} spoke />)}
            </Card>
          )}

          {waiting.length > 0 && (
            <Card style={{ padding: '14px 8px' }}>
              <div className="eyebrow" style={{ padding: '0 12px', marginBottom: 4 }}>Ждут очереди</div>
              {waiting.map(emp => <PersonRow key={emp.id} employee={emp} spoke={false} />)}
            </Card>
          )}
        </>
      )}

      {phase === 'done' && (
        <>
          <Card className="anim-pop-in flex flex-col items-center" style={{ padding: 40, gap: 14 }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#1BCE7B" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-.5px' }}>Дейли завершено</div>
            <Button variant="secondary" onClick={handleStart}>Провести ещё раз</Button>
          </Card>
          <Card style={{ padding: '14px 8px' }}>
            <div className="eyebrow" style={{ padding: '0 12px', marginBottom: 4 }}>Порядок выступлений</div>
            {spoke.map((emp, i) => <PersonRow key={emp.id} employee={emp} spoke index={i + 1} />)}
          </Card>
        </>
      )}
    </div>
  )
}
