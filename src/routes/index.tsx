import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getClientId, getNickname, setNickname } from "@/lib/client-id";
import { createRoom, findRoomByCode } from "@/lib/game";
import { FloatingEmojis } from "@/components/FloatingEmojis";


export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "create" | "join">(null);
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    setName(getNickname());
  }, []);

  const validName = name.trim().length >= 2;

  async function handleCreate() {
    if (!validName) return toast.error("Zadaj nickname (min. 2 znaky).");
    setBusy("create");
    try {
      setNickname(name);
      const clientId = getClientId();
      const { room } = await createRoom(clientId, name.trim());
      navigate({ to: "/room/$code", params: { code: room.code } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nepodarilo sa vytvoriť space.");
    } finally {
      setBusy(null);
    }
  }

  async function handleJoin() {
    if (!validName) return toast.error("Zadaj nickname (min. 2 znaky).");
    const c = code.trim().toUpperCase();
    if (c.length < 4) return toast.error("Zadaj kód space.");
    setBusy("join");
    try {
      setNickname(name);
      const room = await findRoomByCode(c);
      if (!room) {
        toast.error("Space s týmto kódom neexistuje.");
        return;
      }
      navigate({ to: "/room/$code", params: { code: room.code } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chyba pri pripojení.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 md:py-12">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="nb-border nb-shadow flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-2xl">
              🕵️
            </div>
            <div>
              <h1 className="text-2xl leading-none">ZUZPOSTER</h1>
              <p className="text-xs text-muted-foreground">Párty hra Imposter</p>
            </div>
          </div>
          <button
            onClick={() => setShowHowTo((v) => !v)}
            className="nb-border nb-shadow nb-press rounded-md bg-card px-3 py-1.5 text-sm font-bold"
          >
            {showHowTo ? "Skryť" : "Ako sa hrá?"}
          </button>
        </div>

        {/* How-to */}
        {showHowTo && (
          <div className="nb-border nb-shadow-lg mb-6 rounded-xl bg-secondary p-4 text-sm text-secondary-foreground">
            <h2 className="mb-2 text-lg">AKO SA HRÁ</h2>
            <ol className="list-inside list-decimal space-y-1">
              <li>Jeden hráč vytvorí space a zdieľa kód s partiou.</li>
              <li>Ostatní sa pripoja cez kód.</li>
              <li>Admin spustí kolo. Náhodne vybraný hráč zadá tajné slovo.</li>
              <li>Všetci okrem <b>impostera</b> uvidia slovo. Imposter uvidí len „IMPOSTER“.</li>
              <li>Diskutujte a hádajte, kto je imposter. Admin zapisuje skóre.</li>
            </ol>
          </div>
        )}

        {/* Nickname */}
        <div className="nb-border nb-shadow-lg mb-5 rounded-xl bg-card p-4">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider">
            Tvoj nickname
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            placeholder="napr. Zuzka"
            className="nb-border w-full rounded-md bg-background px-3 py-3 text-lg font-semibold outline-none focus:bg-primary/20"
          />
        </div>

        {/* Create */}
        <button
          onClick={handleCreate}
          disabled={busy !== null}
          className="nb-border nb-shadow-lg nb-press mb-5 w-full rounded-xl bg-primary px-4 py-5 text-2xl font-black uppercase text-primary-foreground disabled:opacity-60"
        >
          {busy === "create" ? "Vytváram…" : "Vytvoriť space"}
        </button>

        {/* Divider */}
        <div className="mb-5 flex items-center gap-3">
          <div className="h-[3px] flex-1 bg-ink" />
          <span className="text-sm font-bold uppercase">alebo</span>
          <div className="h-[3px] flex-1 bg-ink" />
        </div>


        {/* Join */}
        <div className="nb-border nb-shadow-lg mb-5 rounded-xl bg-card p-4">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider">
            Kód space
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
            placeholder="ABC12"
            className="nb-border mb-3 w-full rounded-md bg-background px-3 py-3 text-center text-2xl font-black tracking-[0.4em] outline-none focus:bg-accent/20"
          />
          <button
            onClick={handleJoin}
            disabled={busy !== null}
            className="nb-border nb-shadow nb-press w-full rounded-xl bg-accent px-4 py-3 text-lg font-black uppercase text-accent-foreground disabled:opacity-60"
          >
            {busy === "join" ? "Pripájam…" : "Pripojiť sa"}
          </button>
        </div>

        {/* My spaces */}
        <Link
          to="/my-spaces"
          className="nb-border nb-shadow nb-press flex w-full items-center justify-between rounded-xl bg-secondary px-4 py-3 font-black uppercase text-secondary-foreground"
        >
          <span className="flex items-center gap-2">
            <span className="text-xl">📚</span> My spaces
          </span>
          <span className="text-xs opacity-70">história →</span>
        </Link>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Made for chaotic evenings. 🎉
        </p>
      </div>
    </div>
  );
}
