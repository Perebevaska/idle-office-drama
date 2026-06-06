import { useGameStore } from '../../store/gameStore'
import { hireCost } from '../../core/employees'

export function HireSection() {
  const candidates = useGameStore((s) => s.candidates)
  const money = useGameStore((s) => s.state.money)
  const hire = useGameStore((s) => s.hire)
  const reroll = useGameStore((s) => s.rerollCandidates)

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Нанять
        </h2>
        <button
          onClick={reroll}
          className="text-[11px] text-slate-500 hover:text-slate-300"
        >
          ↻ другие кандидаты
        </button>
      </div>

      {candidates.length === 0 ? (
        <p className="rounded-xl border border-slate-700/40 bg-slate-800/20 px-4 py-4 text-center text-xs text-slate-500">
          Кандидаты закончились. Обнови список.
        </p>
      ) : (
        <div className="space-y-2">
          {candidates.map((c) => {
            const cost = hireCost(c)
            const afford = money >= cost
            return (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/40 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm text-slate-100">
                    {c.name}
                    <span className="ml-2 text-xs text-slate-400">
                      {c.role}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.traits.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-300"
                      >
                        {t}
                      </span>
                    ))}
                    <span className="rounded bg-slate-700/30 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {c.salary}₽/тик
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => hire(c.id)}
                  disabled={!afford}
                  className={`ml-3 shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    afford
                      ? 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      : 'cursor-not-allowed border border-slate-700/60 text-slate-600'
                  }`}
                >
                  нанять
                  <br />
                  {cost.toLocaleString('ru-RU')}₽
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
