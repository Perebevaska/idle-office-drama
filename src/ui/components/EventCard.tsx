import type { GameEvent } from '../../core/types'

interface EventCardProps {
  event: GameEvent
  onResolve: (eventId: string, outcomeKey: string) => void
}

export function EventCard({ event, onResolve }: EventCardProps) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <p className="mb-3 text-sm leading-snug text-slate-100">{event.text}</p>
      <div className="flex flex-col gap-2">
        {event.choices.map((c) => (
          <button
            key={c.outcome}
            onClick={() => onResolve(event.id, c.outcome)}
            className="rounded-lg border border-slate-600/70 bg-slate-700/40 px-3 py-2 text-left text-sm text-slate-100 transition-colors hover:border-amber-400/70 hover:bg-amber-500/10 active:scale-[0.99]"
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}
