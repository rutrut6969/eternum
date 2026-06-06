export function ResourceBars({ mana, stamina }: { mana: number; stamina: number }) {
  const manaWidth = Math.min(100, Math.max(8, mana / 2));
  const staminaWidth = Math.min(100, Math.max(8, stamina / 2));

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1 flex justify-between text-xs text-zinc-300">
          <span>Mana</span>
          <span>{mana}</span>
        </div>
        <div className="h-3 rounded-full bg-black/40">
          <div className="h-3 rounded-full bg-mana shadow-rune" style={{ width: `${manaWidth}%` }} />
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-xs text-zinc-300">
          <span>Stamina</span>
          <span>{stamina}</span>
        </div>
        <div className="h-3 rounded-full bg-black/40">
          <div className="h-3 rounded-full bg-stamina" style={{ width: `${staminaWidth}%` }} />
        </div>
      </div>
    </div>
  );
}
