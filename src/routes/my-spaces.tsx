import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getNickname, setNickname } from "@/lib/client-id";
import {
  forgetSpace,
  getSpaceHistory,
  type SpaceHistoryEntry,
} from "@/lib/space-history";

export const Route = createFileRoute("/my-spaces")({
  component: MySpacesPage,
});

type SpaceMeta = {
  playerCount: number;
  onlineCount: number;
};

function MySpacesPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<SpaceHistoryEntry[]>([]);
  const [meta, setMeta] = useState<Record<string, SpaceMeta>>({});
  const [askFor, setAskFor] = useState<SpaceHistoryEntry | null>(null);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    setEntries(getSpaceHistory());
  }, []);

  // Fetch player counts + subscribe to changes for each room.
  useEffect(() => {
    if (entries.length === 0) return;
    let mounted = true;

    async function loadCounts() {
      const results = await Promise.all(
        entries.map(async (e) => {
          const { count } = await supabase
            .from("players")
            .select("*", { count: "exact", head: true })
            .eq("room_id", e.roomId);
          return [e.roomId, count ?? 0] as const;
        }),
      );
      if (!mounted) return;
      setMeta((prev) => {
        const next = { ...prev };
        for (const [rid, c] of results) {
          next[rid] = { ...(next[rid] ?? { onlineCount: 0 }), playerCount: c };
        }
        return next;
      });
    }
    loadCounts();

    const playerChannels = entries.map((e) =>
      supabase
        .channel(`archive-players-${e.roomId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "players", filter: `room_id=eq.${e.roomId}` },
          () => loadCounts(),
        )
        .subscribe(),
    );

    const presenceChannels = entries.map((e) => {
      const ch = supabase.channel(`space-presence-${e.roomId}`);
      const sync = () => {
        const state = ch.presenceState();
        const online = Object.keys(state).length;
        if (!mounted) return;
        setMeta((prev) => ({
          ...prev,
          [e.roomId]: { ...(prev[e.roomId] ?? { playerCount: 0 }), onlineCount: online },
        }));
      };
      ch.on("presence", { event: "sync" }, sync);
      ch.on("presence", { event: "join" }, sync);
      ch.on("presence", { event: "leave" }, sync);
      ch.subscribe();
      return ch;
    });

    return () => {
      mounted = false;
      for (const c of playerChannels) supabase.removeChannel(c);
      for (const c of presenceChannels) supabase.removeChannel(c);
    };
  }, [entries]);

  function openSpace(entry: SpaceHistoryEntry) {
    const nick = entry.nickname || getNickname();
    if (!nick || nick.trim().length < 2) {
      setNameInput("");
      setAskFor(entry);
      return;
    }
    setNickname(nick);
    navigate({ to: "/room/$code", params: { code: entry.code } });
  }

  function confirmAsk() {
    if (!askFor) return;
    const trimmed = nameInput.trim();
    if (trimmed.length < 2) {
      toast.error("Zadaj nickname (min. 2 znaky).");
      return;
    }
    setNickname(trimmed);
    const code = askFor.code;
    setAskFor(null);
    navigate({ to: "/room/$code", params: { code } });
  }

  function handleRemove(code: string) {
    forgetSpace(code);
    setEntries(getSpaceHistory());
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-xs font-bold uppercase underline">
            ← Domov
          </Link>
          <div className="flex items-center gap-2">
            <div className="nb-border nb-shadow flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-2xl">
              📚
            </div>
            <h1 className="text-2xl leading-none">MY SPACES</h1>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="nb-border nb-shadow-lg rounded-xl bg-card p-6 text-center">
            <div className="mb-2 text-4xl">🗂️</div>
            <p className="mb-4 font-bold">Zatiaľ si nenavštívil žiadny space.</p>
            <Link
              to="/"
              className="nb-border nb-press inline-block rounded-md bg-primary px-4 py-2 font-black uppercase"
            >
              Vytvor alebo pripoj sa
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {entries.map((e) => {
              const m = meta[e.roomId];
              const online = m?.onlineCount ?? 0;
              return (
                <li
                  key={e.code}
                  className="nb-border nb-shadow-lg rounded-xl bg-card p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <button
                      onClick={() => openSpace(e)}
                      className="text-left"
                    >
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Kód space
                      </div>
                      <div className="text-2xl font-black tracking-[0.3em]">
                        {e.code}
                      </div>
                    </button>
                    <OnlineBadge online={online} />
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="nb-border rounded-md bg-background px-2 py-1.5">
                      <div className="font-bold uppercase opacity-60">Hráči</div>
                      <div className="text-base font-black">
                        {m?.playerCount ?? "…"}
                      </div>
                    </div>
                    <div className="nb-border rounded-md bg-background px-2 py-1.5">
                      <div className="font-bold uppercase opacity-60">Naposledy</div>
                      <div className="text-sm font-bold">
                        <RelativeTime iso={e.lastVisited} />
                      </div>
                    </div>
                  </div>

                  {e.nickname && (
                    <div className="mb-3 text-xs text-muted-foreground">
                      Ako <b className="text-foreground">{e.nickname}</b>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => openSpace(e)}
                      className="nb-border nb-shadow nb-press flex-1 rounded-md bg-primary px-3 py-2 text-sm font-black uppercase text-primary-foreground"
                    >
                      Vstúpiť
                    </button>
                    <button
                      onClick={() => handleRemove(e.code)}
                      className="nb-border nb-press rounded-md bg-card px-3 py-2 text-sm font-bold uppercase"
                      title="Odstrániť z histórie"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {askFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="nb-border-thick nb-shadow-xl w-full max-w-sm rounded-xl bg-card p-5">
            <h2 className="mb-1 text-lg">Zadaj nickname</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Pre space <b className="text-foreground">{askFor.code}</b> nemáš uložené meno.
            </p>
            <input
              autoFocus
              value={nameInput}
              onChange={(ev) => setNameInput(ev.target.value.slice(0, 24))}
              onKeyDown={(ev) => ev.key === "Enter" && confirmAsk()}
              placeholder="napr. Zuzka"
              className="nb-border mb-4 w-full rounded-md bg-background px-3 py-3 text-lg font-semibold outline-none focus:bg-primary/20"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setAskFor(null)}
                className="nb-border nb-press flex-1 rounded-md bg-card px-3 py-2 font-bold uppercase"
              >
                Zrušiť
              </button>
              <button
                onClick={confirmAsk}
                className="nb-border nb-shadow nb-press flex-1 rounded-md bg-primary px-3 py-2 font-black uppercase text-primary-foreground"
              >
                Vstúpiť
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OnlineBadge({ online }: { online: number }) {
  const isOnline = online > 0;
  return (
    <div
      className={`nb-border flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-black uppercase ${
        isOnline ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          isOnline ? "animate-pulse bg-ink" : "bg-ink/40"
        }`}
      />
      {isOnline ? `Online · ${online}` : "Offline"}
    </div>
  );
}

function RelativeTime({ iso }: { iso: string }) {
  const label = useMemo(() => formatRelative(iso), [iso]);
  return <span>{label}</span>;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "pred chvíľou";
  const m = Math.floor(s / 60);
  if (m < 60) return `pred ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `pred ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `pred ${d} d`;
  return new Date(iso).toLocaleDateString("sk-SK");
}
