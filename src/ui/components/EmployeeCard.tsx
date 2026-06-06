import type { Employee } from '../../core/types'
import { StatBar } from './StatBar'

const DEPT_COLOR: Record<string, string> = {
  'продажи': 'bg-blue-500/20 text-blue-300',
  'разработка': 'bg-violet-500/20 text-violet-300',
  'HR': 'bg-pink-500/20 text-pink-300',
  'маркетинг': 'bg-orange-500/20 text-orange-300',
  'бухгалтерия': 'bg-teal-500/20 text-teal-300',
}

interface EmployeeCardProps {
  emp: Employee
  onFire?: (id: string) => void
}

export function EmployeeCard({ emp, onFire }: EmployeeCardProps) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <span className="font-semibold text-slate-100">{emp.name}</span>
          <span className="ml-2 text-xs text-slate-400">
            {emp.role} · ур.{emp.level}
          </span>
          <span className="ml-2 text-[10px] text-slate-500">
            {emp.salary}₽/тик
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              DEPT_COLOR[emp.department] ?? 'bg-slate-600/40 text-slate-300'
            }`}
          >
            {emp.department}
          </span>
          {onFire && (
            <button
              onClick={() => {
                if (confirm(`Уволить ${emp.name}?`)) onFire(emp.id)
              }}
              title="Уволить"
              className="rounded-md border border-slate-600/60 px-1.5 py-0.5 text-[10px] text-slate-500 transition-colors hover:border-rose-500/60 hover:text-rose-400"
            >
              уволить
            </button>
          )}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {emp.traits.map((t) => (
          <span
            key={t}
            className="rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-300"
          >
            {t}
          </span>
        ))}
      </div>

      <div className="space-y-1">
        <StatBar label="продукт." value={emp.stats.productivity} />
        <StatBar label="настрой" value={emp.stats.mood} />
        <StatBar label="лояльн." value={emp.stats.loyalty} />
        <StatBar label="стресс" value={emp.stats.stress} invert />
      </div>
    </div>
  )
}
