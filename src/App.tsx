import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { companyMood, TICK_MS } from './core/engine'
import { EmployeeCard } from './ui/components/EmployeeCard'
import { EventCard } from './ui/components/EventCard'

function Header() {
  const state = useGameStore((s) => s.state)
  const mood = companyMood(state.employees)
  return (
    <header className="sticky top-0 z-10 border-b border-slate-700/60 bg-[#0f1115]/90 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-100">
            🏢 Idle Office Drama
          </h1>
          <p className="text-[11px] text-slate-500">тик #{state.tick}</p>
        </div>
        <div className="flex gap-3 text-right text-xs">
          <div>
            <div className="font-semibold text-emerald-400 tabular-nums">
              {state.money.toLocaleString('ru-RU')}₽
            </div>
            <div className="text-slate-500">касса</div>
          </div>
          <div>
            <div className="font-semibold text-amber-300 tabular-nums">
              {mood}
            </div>
            <div className="text-slate-500">настрой</div>
          </div>
          <div>
            <div className="font-semibold text-slate-200 tabular-nums">
              {state.employees.length}
            </div>
            <div className="text-slate-500">штат</div>
          </div>
        </div>
      </div>
    </header>
  )
}

function OfflineBanner() {
  const summary = useGameStore((s) => s.offlineSummary)
  const dismiss = useGameStore((s) => s.dismissOffline)
  if (!summary) return null
  const mins = Math.round((summary.elapsedTicks * TICK_MS) / 60000)
  return (
    <div
      onClick={dismiss}
      className="mx-auto mb-3 max-w-md cursor-pointer rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-3 text-sm text-violet-200"
    >
      Пока тебя не было (~{mins} мин) прошло {summary.elapsedTicks} тиков.
      {summary.newEventCount > 0
        ? ` Накопилось ${summary.newEventCount} новых ситуаций ↓`
        : ' Тихо. Подозрительно тихо.'}
      <span className="ml-1 text-violet-400">(скрыть)</span>
    </div>
  )
}

function PendingEvents() {
  const pending = useGameStore((s) => s.state.pending)
  const resolve = useGameStore((s) => s.resolve)
  if (pending.length === 0) {
    return (
      <p className="rounded-xl border border-slate-700/40 bg-slate-800/20 px-4 py-6 text-center text-sm text-slate-500">
        Сейчас всё спокойно. Сотрудники работают (или делают вид).
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {pending.map((ev) => (
        <EventCard key={ev.id} event={ev} onResolve={resolve} />
      ))}
    </div>
  )
}

function Feed() {
  const feed = useGameStore((s) => s.state.feed)
  if (feed.length === 0) return null
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Что было раньше
      </h2>
      <div className="space-y-2">
        {feed.map((ev) => {
          const choice = ev.choices.find((c) => c.outcome === ev.chosenOutcome)
          return (
            <div
              key={ev.id}
              className="rounded-lg border border-slate-700/40 bg-slate-800/20 px-3 py-2 text-xs"
            >
              <p className="text-slate-300">{ev.text}</p>
              {choice && (
                <p className="mt-1 text-slate-500">
                  → ты выбрал:{' '}
                  <span className="text-slate-400">{choice.label}</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Employees() {
  const employees = useGameStore((s) => s.state.employees)
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Команда
      </h2>
      <div className="space-y-2">
        {employees.map((e) => (
          <EmployeeCard key={e.id} emp={e} />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const tick = useGameStore((s) => s.tick)
  const reset = useGameStore((s) => s.reset)

  useEffect(() => {
    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [tick])

  return (
    <div className="min-h-full pb-12">
      <Header />
      <main className="mx-auto max-w-md px-4 pt-4">
        <OfflineBanner />
        <PendingEvents />
        <Employees />
        <Feed />
        <button
          onClick={() => {
            if (confirm('Сбросить весь прогресс?')) reset()
          }}
          className="mt-8 w-full rounded-lg border border-slate-700/60 px-3 py-2 text-xs text-slate-500 hover:text-rose-400"
        >
          Сбросить прогресс
        </button>
      </main>
    </div>
  )
}
