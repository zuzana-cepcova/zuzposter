import { useEffect, useMemo, useState } from "react";

const EMOJI_POOL = ["🕵️", "🥸", "🎭", "👀", "🤫", "🤔", "🃏", "🎲", "💬", "❓", "💡", "🔍", "🫣", "😈", "👤", "🧩"];

type Item = {
  emoji: string;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  rotate: number;
  driftX: number;
  driftY: number;
  opacity: number;
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

export function FloatingEmojis() {
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();

  const count = isMobile ? 6 : 11;

  const items = useMemo<Item[]>(() => {
    const pool = [...EMOJI_POOL].sort(() => Math.random() - 0.5);
    const arr: Item[] = [];
    // grid-ish placement to avoid clustering
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jitterX = Math.random() * (100 / cols) * 0.6;
      const jitterY = Math.random() * (100 / rows) * 0.6;
      arr.push({
        emoji: pool[i % pool.length],
        left: (col * 100) / cols + jitterX + 2,
        top: (row * 100) / rows + jitterY + 2,
        size: 56 + Math.random() * 72,
        duration: 22 + Math.random() * 22,
        delay: -Math.random() * 20,
        rotate: (Math.random() * 16 - 8),
        driftX: (Math.random() * 60 - 30),
        driftY: (Math.random() * 60 - 30),
        opacity: 0.1 + Math.random() * 0.08,
      });
    }
    return arr;
  }, [count]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {items.map((it, i) => (
        <span
          key={i}
          className="absolute select-none"
          style={{
            left: `${it.left}%`,
            top: `${it.top}%`,
            fontSize: `${it.size}px`,
            opacity: it.opacity,
            animation: reduced
              ? undefined
              : `floaty-${i % 4} ${it.duration}s ease-in-out ${it.delay}s infinite alternate`,
            transform: `rotate(${it.rotate}deg)`,
            willChange: "transform",
          }}
        >
          {it.emoji}
        </span>
      ))}
      <style>{`
        @keyframes floaty-0 {
          0% { transform: translate(0,0) rotate(-6deg); }
          100% { transform: translate(30px, -20px) rotate(6deg); }
        }
        @keyframes floaty-1 {
          0% { transform: translate(0,0) rotate(4deg); }
          100% { transform: translate(-25px, 30px) rotate(-5deg); }
        }
        @keyframes floaty-2 {
          0% { transform: translate(0,0) rotate(-3deg); }
          100% { transform: translate(20px, 25px) rotate(7deg); }
        }
        @keyframes floaty-3 {
          0% { transform: translate(0,0) rotate(5deg); }
          100% { transform: translate(-30px, -15px) rotate(-7deg); }
        }
      `}</style>
    </div>
  );
}
