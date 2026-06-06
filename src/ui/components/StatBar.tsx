interface StatBarProps {
  label: string
  value: number // 0–100
  /** инвертировать цвет (для stress: высокий = плохо) */
  invert?: boolean
}

function colorFor(value: number, invert: boolean): string {
  const good = invert ? value < 40 : value > 60
  const bad = invert ? value > 70 : value < 30
  if (good) return 'bg-emerald-500'
  if (bad) return 'bg-rose-500'
  return 'bg-amber-400'
}

export function StatBar({ label, value, invert = false }: StatBarProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 shrink-0 text-slate-400">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700/60">
        <div
          className={`h-full ${colorFor(value, invert)} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-7 shrink-0 text-right tabular-nums text-slate-300">
        {Math.round(value)}
      </span>
    </div>
  )
}
