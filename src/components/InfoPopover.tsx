import { useState, type ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Info popover: hover on desktop, click/tap anywhere. */
export function InfoPopover({ label, children }: { label: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setOpen((v) => !v);
          }}
          className="nb-border inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-xs font-black"
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="nb-border nb-shadow-lg w-72 rounded-xl bg-card p-4 text-sm text-foreground"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function DodoInfo() {
  return (
    <InfoPopover label="ⓘ">
      <div className="mb-2 font-black">🦤 Kto je Dodo?</div>
      <p className="mb-2">Dodo pozná tajné slovo, ale chce, aby ho ostatní považovali za Impostera.</p>
      <p className="mb-2">Má byť dosť podozrivý, aby ho odhlasovali – ale nie tak očividne, aby zistili, že je Dodo.</p>
      <p className="mb-1 font-bold">🏆 Vyhráva, ak ho odhlasujú ako Impostera.</p>
      <p className="text-xs text-muted-foreground">👥 Dá sa zapnúť od 4 hráčov.</p>
    </InfoPopover>
  );
}

export function ScoringHelp({ dodo }: { dodo: boolean }) {
  return (
    <InfoPopover label="ⓘ Ako prideľovať body?">
      <div className="space-y-2">
        <div><b>👥 Klasickí hráči</b><br />+1, ak odhalia a odhlasujú Impostera.</div>
        <div><b>🕵️ Imposter</b><br />+1, ak nie je odhalený.</div>
        {dodo && <div><b>🦤 Dodo</b><br />+1, ak ho odhlasujú v domnení, že je Imposter.</div>}
        <div className="nb-border rounded-md bg-muted p-2 text-xs">
          <div className="mb-1 font-black uppercase">Cieľ každej roly</div>
          <div>👥 Hráči → nájsť Impostera</div>
          <div>🕵️ Imposter → nebyť odhalený</div>
          {dodo && <div>🦤 Dodo → nechať sa odhlasovať</div>}
        </div>
        <p className="text-xs text-muted-foreground">Body stále prideľuješ manuálne.</p>
      </div>
    </InfoPopover>
  );
}

export function DodoToggle({
  checked,
  onChange,
  playerCount,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  playerCount?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <label className={`flex flex-1 items-center gap-3 font-bold ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
          <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="h-5 w-5 accent-[var(--ink)]"
          />
          <span>🦤 Dodo</span>
        </label>
        <DodoInfo />
      </div>
      {playerCount !== undefined && playerCount < 4 && (
        <p className="mt-2 text-xs text-muted-foreground">
          🔒 Dodo sa dá zapnúť od 4 hráčov (teraz {playerCount}).
        </p>
      )}
    </div>
  );
}
