import { useEffect, useMemo, useRef, useState } from "react";

const EMOJI_POOL = ["🕵️", "🥸", "🎭", "👀", "🤫", "🤔", "🃏", "🎲", "💬", "❓", "💡", "🔍", "🫣", "😈", "👤", "🧩"];

type Item = {
  emoji: string;
  size: number;
  opacity: number;
  rotate: number;
  speed: number; // px per second toward target
  wanderAngle: number;
  wanderSpeed: number; // rad/s
  wanderRadius: number;
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
  const count = isMobile ? 8 : 14;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<Array<HTMLSpanElement | null>>([]);
  const stateRef = useRef<Array<{ x: number; y: number; vx: number; vy: number }>>([]);
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const targetUntilRef = useRef<number>(0);

  const items = useMemo<Item[]>(() => {
    const pool = [...EMOJI_POOL].sort(() => Math.random() - 0.5);
    return Array.from({ length: count }, (_, i) => ({
      emoji: pool[i % pool.length],
      size: 22 + Math.random() * 26, // 22-48px (smaller)
      opacity: 0.1 + Math.random() * 0.08,
      rotate: Math.random() * 16 - 8,
      speed: 40 + Math.random() * 90, // varied approach speed
      wanderAngle: Math.random() * Math.PI * 2,
      wanderSpeed: 0.4 + Math.random() * 0.9,
      wanderRadius: 30 + Math.random() * 60,
    }));
  }, [count]);

  // init positions
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    stateRef.current = items.map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
    }));
  }, [items]);

  // pointer tracking — emojis follow cursor (desktop) and taps/drags (mobile)
  useEffect(() => {
    function setTarget(x: number, y: number, duration = 0) {
      targetRef.current = { x, y };
      targetUntilRef.current = duration > 0 ? performance.now() + duration : Number.POSITIVE_INFINITY;
    }
    function onMove(e: MouseEvent) {
      setTarget(e.clientX, e.clientY);
    }
    function onTouch(e: TouchEvent) {
      const t = e.touches[0] ?? e.changedTouches[0];
      if (!t) return;
      setTarget(t.clientX, t.clientY, 2500);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  // animation loop
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const hasTarget = targetRef.current && now < targetUntilRef.current;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const s = stateRef.current[i];
        if (!s) continue;

        // wander
        it.wanderAngle += it.wanderSpeed * dt;
        const wx = Math.cos(it.wanderAngle) * it.wanderRadius;
        const wy = Math.sin(it.wanderAngle * 1.3) * it.wanderRadius;

        let ax = wx * 0.02;
        let ay = wy * 0.02;

        if (hasTarget && targetRef.current) {
          const dx = targetRef.current.x - s.x;
          const dy = targetRef.current.y - s.y;
          const d = Math.max(1, Math.hypot(dx, dy));
          const pull = it.speed * (0.9 + (i % 5) * 0.15);
          ax += (dx / d) * pull * 0.06;
          ay += (dy / d) * pull * 0.06;
        } else {
          // gentle roam
          ax += (Math.cos(it.wanderAngle * 0.7) - s.vx * 0.02) * 0.5;
          ay += (Math.sin(it.wanderAngle * 0.9) - s.vy * 0.02) * 0.5;
        }

        s.vx = (s.vx + ax) * 0.98;
        s.vy = (s.vy + ay) * 0.98;

        // clamp velocity
        const vmax = 220;
        const vmag = Math.hypot(s.vx, s.vy);
        if (vmag > vmax) {
          s.vx = (s.vx / vmag) * vmax;
          s.vy = (s.vy / vmag) * vmax;
        }

        s.x += s.vx * dt;
        s.y += s.vy * dt;

        // wrap around screen
        const pad = it.size;
        if (s.x < -pad) s.x = w + pad;
        if (s.x > w + pad) s.x = -pad;
        if (s.y < -pad) s.y = h + pad;
        if (s.y > h + pad) s.y = -pad;

        const node = nodesRef.current[i];
        if (node) {
          node.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${it.rotate}deg)`;
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items, reduced]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {items.map((it, i) => (
        <span
          key={i}
          ref={(el) => {
            nodesRef.current[i] = el;
          }}
          className="absolute left-0 top-0 select-none"
          style={{
            fontSize: `${it.size}px`,
            opacity: it.opacity,
            willChange: "transform",
          }}
        >
          {it.emoji}
        </span>
      ))}
    </div>
  );
}
