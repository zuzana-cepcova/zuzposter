import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getClientId, getNickname } from "@/lib/client-id";
import {
  adjustScore,
  clearCurrentRound,
  endRound,
  joinRoom,
  startRound,
  submitWord,
  type Player,
  type Room,
  type Round,
} from "@/lib/game";

export const Route = createFileRoute("/room/$code")({
  component: RoomPage,
});

type Tab = "game" | "leaderboard";

function RoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();

  const [clientId, setClientId] = useState("");
  const [nickname, setNick] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("game");

  const me = useMemo(() => players.find((p) => p.client_id === clientId) ?? null, [players, clientId]);
  const isAdmin = !!room && !!clientId && room.admin_client_id === clientId;

  // Bootstrap: join or attach to room
  useEffect(() => {
    const cid = getClientId();
    const nn = getNickname();
    setClientId(cid);
    setNick(nn);
    if (!nn || nn.trim().length < 2) {
      navigate({ to: "/" });
      return;
    }
    (async () => {
      try {
        const { room: r } = await joinRoom(code, cid, nn);
        setRoom(r);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Chyba");
        navigate({ to: "/" });
      } finally {
        setLoading(false);
      }
    })();
  }, [code, navigate]);

  // Load players + subscribe realtime
  useEffect(() => {
    if (!room) return;

    let mounted = true;
    async function refreshPlayers() {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room!.id)
        .order("joined_at", { ascending: true });
      if (mounted) setPlayers((data as Player[]) ?? []);
    }
    async function refreshRoom() {
      const { data } = await supabase.from("rooms").select("*").eq("id", room!.id).maybeSingle();
      if (mounted && data) setRoom(data as Room);
    }
    async function refreshRound(id: string | null) {
      if (!id) {
        if (mounted) setRound(null);
        return;
      }
      const { data } = await supabase.from("rounds").select("*").eq("id", id).maybeSingle();
      if (mounted) setRound((data as Round) ?? null);
    }

    refreshPlayers();
    refreshRound(room.current_round_id);

    const channel = supabase
      .channel(`room-${room.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` }, () => {
        refreshPlayers();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` }, (payload) => {
        const newRoom = payload.new as Room;
        setRoom(newRoom);
        refreshRound(newRoom.current_round_id);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${room.id}` }, (payload) => {
        const newRound = (payload.new ?? payload.old) as Round | undefined;
        if (newRound?.id) {
          if (mounted) setRound(newRound as Round);
          refreshRound(newRound.id);
        }
        refreshRoom();
      })
      .subscribe();

    // Poll as a fallback in case realtime is delayed / unavailable
    const poll = setInterval(() => {
      refreshRoom();
      refreshPlayers();
      const rid = room?.current_round_id;
      if (rid) refreshRound(rid);
    }, 2500);

    return () => {
      mounted = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
    // Only re-subscribe when room id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id]);

  // Refresh round when current_round_id changes
  useEffect(() => {
    if (!room?.current_round_id) {
      setRound(null);
      return;
    }
    (async () => {
      const { data } = await supabase.from("rounds").select("*").eq("id", room.current_round_id!).maybeSingle();
      setRound((data as Round) ?? null);
    })();
  }, [room?.current_round_id]);

  if (loading) {
    return <FullScreenMessage title="Načítavam…" />;
  }
  if (!room || !me) {
    return <FullScreenMessage title="Space nenájdený" cta />;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top bar */}
      <div className="nb-border-thick sticky top-0 z-10 border-b-4 bg-primary px-4 py-3">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link to="/" className="text-xs font-bold uppercase underline">
            ← Domov
          </Link>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">Kód space</div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(room.code);
                toast.success("Kód skopírovaný!");
              }}
              className="text-2xl font-black tracking-[0.3em]"
              title="Skopírovať kód"
            >
              {room.code}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-md px-4 pt-4">
        <div className="nb-border nb-shadow mb-5 grid grid-cols-2 overflow-hidden rounded-xl bg-card">
          <TabBtn active={tab === "game"} onClick={() => setTab("game")}>
            🎮 Hra
          </TabBtn>
          <TabBtn active={tab === "leaderboard"} onClick={() => setTab("leaderboard")}>
            🏆 Rebríček
          </TabBtn>
        </div>

        {tab === "game" ? (
          <GameTab
            room={room}
            players={players}
            round={round}
            me={me}
            isAdmin={isAdmin}
          />
        ) : (
          <Leaderboard players={players} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-3 text-sm font-black uppercase transition-colors ${
        active ? "bg-ink text-background" : "bg-card text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function GameTab({
  room,
  players,
  round,
  me,
  isAdmin,
}: {
  room: Room;
  players: Player[];
  round: Round | null;
  me: Player;
  isAdmin: boolean;
}) {
  // States: no round → lobby; choosing_word → chooser inputs word / others wait; active → cards; ended → scoring
  if (!round) return <LobbyView room={room} players={players} me={me} isAdmin={isAdmin} />;
  if (round.status === "choosing_word") return <ChoosingWordView round={round} players={players} me={me} isAdmin={isAdmin} room={room} />;
  if (round.status === "active") return <ActiveRoundView round={round} me={me} isAdmin={isAdmin} players={players} />;
  return <EndedRoundView round={round} players={players} isAdmin={isAdmin} room={room} />;
}

function LobbyView({ room, players, me, isAdmin }: { room: Room; players: Player[]; me: Player; isAdmin: boolean }) {
  const [busy, setBusy] = useState(false);
  const canStart = players.length >= 3;

  async function handleStart() {
    setBusy(true);
    try {
      await startRound(room.id, players);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chyba");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="nb-border nb-shadow-lg mb-5 rounded-xl bg-card p-4">
        <h2 className="mb-1 text-xl">LOBBY</h2>
        <p className="text-sm text-muted-foreground">
          Zdieľaj kód <b className="text-foreground">{room.code}</b> s partiou. Potrebujete aspoň 3 hráčov.
        </p>
      </div>

      <PlayerList players={players} me={me} adminClientId={room.admin_client_id} />

      {isAdmin ? (
        <button
          onClick={handleStart}
          disabled={!canStart || busy}
          className="nb-border nb-shadow-lg nb-press mt-5 w-full rounded-xl bg-secondary px-4 py-5 text-xl font-black uppercase text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Spúšťam…" : canStart ? "🚀 Spustiť kolo" : `Potrebuješ ${3 - players.length} viac hráčov`}
        </button>
      ) : (
        <div className="nb-border nb-shadow mt-5 rounded-xl bg-muted p-4 text-center text-sm">
          Čakáme na admina, kým spustí kolo…
        </div>
      )}
    </div>
  );
}

function ChoosingWordView({
  round,
  players,
  me,
  isAdmin,
  room,
}: {
  round: Round;
  players: Player[];
  me: Player;
  isAdmin: boolean;
  room: Room;
}) {
  const chooser = players.find((p) => p.id === round.word_chooser_id);
  const iAmChooser = chooser?.client_id === me.client_id;
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (word.trim().length < 2) return toast.error("Zadaj slovo (min. 2 znaky).");
    setBusy(true);
    try {
      await submitWord(round, word, players);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chyba");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="nb-border nb-shadow-lg mb-5 rounded-xl bg-accent p-4 text-accent-foreground">
        <div className="text-xs font-bold uppercase opacity-80">Vyberá slovo</div>
        <div className="text-2xl font-black">{chooser?.name ?? "…"}</div>
      </div>

      {iAmChooser ? (
        <div className="nb-border nb-shadow-lg rounded-xl bg-card p-4">
          <label className="mb-2 block text-xs font-bold uppercase">Tvoje tajné slovo pre kolo</label>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value.slice(0, 40))}
            placeholder="napr. banán"
            className="nb-border mb-3 w-full rounded-md bg-background px-3 py-3 text-lg font-semibold outline-none focus:bg-primary/20"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="nb-border nb-shadow nb-press w-full rounded-xl bg-primary px-4 py-4 text-lg font-black uppercase text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Odosielam…" : "✅ Potvrdiť slovo"}
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Ostatní ho uvidia — okrem jedného, ktorý bude imposter.
          </p>
        </div>
      ) : (
        <div className="nb-border nb-shadow rounded-xl bg-muted p-6 text-center">
          <div className="mb-2 text-4xl">⏳</div>
          <p className="font-bold">Čakáme na {chooser?.name}, kým zadá tajné slovo…</p>
        </div>
      )}

      {isAdmin && (
        <button
          onClick={() => clearCurrentRound(room.id)}
          className="nb-border nb-press mt-4 w-full rounded-xl bg-card px-4 py-2 text-sm font-bold uppercase"
        >
          Zrušiť kolo
        </button>
      )}
    </div>
  );
}

function ActiveRoundView({
  round,
  me,
  isAdmin,
  players,
}: {
  round: Round;
  me: Player;
  isAdmin: boolean;
  players: Player[];
}) {
  const iAmImposter = round.imposter_id === me.id;
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleEnd() {
    setBusy(true);
    try {
      await endRound(round.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chyba");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-3 text-center text-xs font-bold uppercase text-muted-foreground">
        Tvoja karta — pozri sám, nikomu neukazuj!
      </p>

      <button
        onClick={() => setRevealed((v) => !v)}
        className={`nb-border-thick nb-shadow-xl relative aspect-[3/4] w-full overflow-hidden rounded-2xl transition-colors ${
          revealed
            ? iAmImposter
              ? "bg-danger text-danger-foreground"
              : "bg-secondary text-secondary-foreground"
            : "bg-ink text-background"
        }`}
      >
        {revealed ? (
          <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
            <div className="text-xs font-bold uppercase opacity-70">
              {iAmImposter ? "Ty si…" : "Tajné slovo"}
            </div>
            <div className="mt-4 break-words text-5xl font-black uppercase leading-none">
              {iAmImposter ? "IMPOSTER" : round.word}
            </div>
            <div className="mt-6 text-xs opacity-80">Klikni znova pre skrytie</div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="text-7xl">🃏</div>
            <div className="text-2xl font-black uppercase">Odhaliť kartu</div>
            <div className="text-xs opacity-70">Klikni pre zobrazenie</div>
          </div>
        )}
      </button>

      <div className="mt-5 space-y-2">
        <div className="nb-border nb-shadow rounded-xl bg-card p-3 text-sm">
          <div className="text-[10px] font-bold uppercase opacity-70">V hre</div>
          <div className="font-semibold">{players.map((p) => p.name).join(" · ")}</div>
        </div>
      </div>

      {isAdmin && (
        <button
          onClick={handleEnd}
          disabled={busy}
          className="nb-border nb-shadow-lg nb-press mt-5 w-full rounded-xl bg-danger px-4 py-4 text-lg font-black uppercase text-danger-foreground disabled:opacity-60"
        >
          {busy ? "Ukončujem…" : "🛑 Ukončiť kolo"}
        </button>
      )}
    </div>
  );
}

function EndedRoundView({
  round,
  players,
  isAdmin,
  room,
}: {
  round: Round;
  players: Player[];
  isAdmin: boolean;
  room: Room;
}) {
  const imposter = players.find((p) => p.id === round.imposter_id);
  const [busy, setBusy] = useState(false);

  async function handleNext() {
    setBusy(true);
    try {
      await clearCurrentRound(room.id);
      await startRound(room.id, players);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chyba");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="nb-border nb-shadow-lg mb-5 rounded-xl bg-accent p-5 text-center text-accent-foreground">
        <div className="text-xs font-bold uppercase opacity-80">Kolo skončilo</div>
        <div className="mt-1 text-lg font-bold">Slovo bolo</div>
        <div className="text-3xl font-black uppercase">{round.word}</div>
        <div className="mt-3 text-lg font-bold">Imposter bol</div>
        <div className="text-3xl font-black uppercase">🕵️ {imposter?.name ?? "?"}</div>
      </div>

      {isAdmin ? (
        <>
          <h3 className="mb-2 text-lg">Zapíš skóre</h3>
          <ScoreList players={players} />
          <button
            onClick={handleNext}
            disabled={busy}
            className="nb-border nb-shadow-lg nb-press mt-5 w-full rounded-xl bg-secondary px-4 py-4 text-lg font-black uppercase text-secondary-foreground disabled:opacity-60"
          >
            {busy ? "…" : "▶ Ďalšie kolo"}
          </button>
        </>
      ) : (
        <>
          <h3 className="mb-2 text-lg">Aktuálne skóre</h3>
          <ReadOnlyScoreList players={players} />
          <div className="nb-border nb-shadow mt-5 rounded-xl bg-muted p-4 text-center text-sm">
            Admin zapisuje skóre a spustí ďalšie kolo…
          </div>
        </>
      )}
    </div>
  );
}

function PlayerList({
  players,
  me,
  adminClientId,
}: {
  players: Player[];
  me: Player;
  adminClientId: string;
}) {
  return (
    <div className="nb-border nb-shadow rounded-xl bg-card p-2">
      <div className="px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
        Hráči ({players.length})
      </div>
      <ul className="space-y-1">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-md px-3 py-2"
            style={{ background: p.id === me.id ? "var(--muted)" : "transparent" }}
          >
            <span className="font-semibold">
              {p.name}
              {p.id === me.id && <span className="ml-2 text-xs text-muted-foreground">(ty)</span>}
            </span>
            {p.client_id === adminClientId && (
              <span className="nb-border rounded bg-primary px-2 py-0.5 text-[10px] font-black uppercase">
                Admin
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScoreList({ players }: { players: Player[] }) {
  return (
    <div className="space-y-2">
      {players.map((p) => (
        <ScoreRow key={p.id} player={p} />
      ))}
    </div>
  );
}

function ScoreRow({ player }: { player: Player }) {
  const [busy, setBusy] = useState(false);
  async function change(delta: number) {
    setBusy(true);
    try {
      await adjustScore(player.id, delta);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chyba");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="nb-border nb-shadow flex items-center justify-between rounded-xl bg-card px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">{player.name}</div>
        <div className="text-xs text-muted-foreground">{player.score} b</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          disabled={busy}
          onClick={() => change(-1)}
          className="nb-border nb-press h-10 w-10 rounded-md bg-danger text-lg font-black text-danger-foreground disabled:opacity-60"
        >
          −
        </button>
        <div className="min-w-[2.5rem] text-center text-2xl font-black">{player.score}</div>
        <button
          disabled={busy}
          onClick={() => change(1)}
          className="nb-border nb-press h-10 w-10 rounded-md bg-secondary text-lg font-black text-secondary-foreground disabled:opacity-60"
        >
          +
        </button>
      </div>
    </div>
  );
}

function ReadOnlyScoreList({ players }: { players: Player[] }) {
  return (
    <div className="space-y-2">
      {players.map((p) => (
        <div key={p.id} className="nb-border nb-shadow flex items-center justify-between rounded-xl bg-card px-3 py-2">
          <div className="font-bold">{p.name}</div>
          <div className="text-2xl font-black">{p.score}</div>
        </div>
      ))}
    </div>
  );
}

function Leaderboard({ players, isAdmin }: { players: Player[]; isAdmin: boolean }) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <h2 className="mb-3 text-xl">🏆 REBRÍČEK</h2>
      <div className="space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`nb-border nb-shadow flex items-center gap-3 rounded-xl px-4 py-3 ${
              i === 0 ? "bg-primary text-primary-foreground" : "bg-card"
            }`}
          >
            <div className="w-8 text-center text-2xl">{medals[i] ?? `#${i + 1}`}</div>
            <div className="flex-1 truncate font-bold">{p.name}</div>
            <div className="text-2xl font-black">{p.score}</div>
          </div>
        ))}
        {sorted.length === 0 && (
          <div className="nb-border rounded-xl bg-muted p-6 text-center text-sm">
            Zatiaľ žiadni hráči.
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-bold uppercase text-muted-foreground">Upraviť skóre</h3>
          <ScoreList players={sorted} />
        </div>
      )}
    </div>
  );
}

function FullScreenMessage({ title, cta }: { title: string; cta?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="nb-border nb-shadow-lg max-w-sm rounded-xl bg-card p-6 text-center">
        <h1 className="mb-3 text-2xl">{title}</h1>
        {cta && (
          <Link
            to="/"
            className="nb-border nb-press inline-block rounded-md bg-primary px-4 py-2 font-black uppercase"
          >
            Domov
          </Link>
        )}
      </div>
    </div>
  );
}
