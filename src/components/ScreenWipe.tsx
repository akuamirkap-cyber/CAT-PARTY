import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { toPng } from "html-to-image";

/** Screens that can be swapped behind the wipe. */
export type ScreenKey = "menu" | "matching" | "game";

export interface WipeTheme {
  /** Wipe panel colour */
  main: string;
  /** Trailing edge panel + page background */
  deep: string;
  /** Ink used for the badge shadow */
  ink: string;
  label: string;
  sub: string;
}

export const WIPE_THEMES: Record<ScreenKey, WipeTheme> = {
  menu: { main: "#ffa412", deep: "#e57f00", ink: "#7a3d00", label: "MAIN MENU", sub: "Kembali ke markas" },
  matching: { main: "#ffa412", deep: "#e57f00", ink: "#7a3d00", label: "MATCHMAKING", sub: "Mencari lawan" },
  game: { main: "#1b8cf0", deep: "#0f63c4", ink: "#05325e", label: "SIAP GEBUK", sub: "Semua naik ke pesawat" },
};

// Same beats as the reference sweep: cover → hold (badge) → reveal.
const COVER = 680;
const HOLD = 520;
const REVEAL = 760;
const LAG = 70;
const EASE_IO = "cubic-bezier(.77,0,.175,1)";
const EASE_OUT = "cubic-bezier(.16,1,.3,1)";
/** How long we are willing to wait for the frozen screenshot of the old page. */
const SHOT_BUDGET = 240;

export interface WipeHandle {
  /** Play the page sweep, swapping screens while the panels cover the viewport. */
  play: (target: ScreenKey, onCover: () => void) => Promise<void>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function CatMark() {
  return (
    <svg viewBox="0 0 120 110" aria-hidden="true">
      <path d="M22 50 L28 10 Q30 4 35 8 L55 28Z" fill="#fff" />
      <path d="M98 50 L92 10 Q90 4 85 8 L65 28Z" fill="#fff" />
      <path d="M30 40 L33 18 L48 32Z" fill="#ffb4c0" />
      <path d="M90 40 L87 18 L72 32Z" fill="#ffb4c0" />
      <ellipse cx="60" cy="64" rx="46" ry="42" fill="#fff" />
      {[40, 80].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="62" r="11" fill="var(--wipe-ink, #7a3d00)" />
          <circle cx={cx + 3} cy="58" r="3.5" fill="#fff" />
          <path
            d={cx < 60 ? `M${cx - 12} 46 L${cx + 10} 51` : `M${cx + 12} 46 L${cx - 10} 51`}
            stroke="var(--wipe-ink, #7a3d00)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      ))}
      <ellipse cx="60" cy="76" rx="4" ry="3" fill="#ff8fa0" />
      <path d="M52 82 Q56 87 60 82 Q64 87 68 82" stroke="var(--wipe-ink, #7a3d00)" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Full-screen page transition: the frozen old page slides away while two skewed
 * panels sweep in from the right, a badge (cat logo + page name + loading bar)
 * holds the middle, then everything keeps sliding out to the left. The screens
 * themselves are swapped during the hold.
 */
export default function ScreenWipe({ handleRef }: { handleRef: Ref<WipeHandle> }) {
  const root = useRef<HTMLDivElement>(null);
  const shot = useRef<HTMLDivElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const sub = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const play = useCallback(async (target: ScreenKey, onCover: () => void) => {
    const rootEl = root.current;
    if (!rootEl || busy.current) return;
    const theme = WIPE_THEMES[target];
    busy.current = true;

    const reset = () => {
      for (const el of [edge.current, main.current, logo.current, sub.current, label.current, bar.current, shot.current]) {
        el?.getAnimations().forEach((a) => a.cancel());
      }
      rootEl.classList.remove("is-active");
      if (shot.current) {
        shot.current.classList.remove("is-visible");
        shot.current.style.backgroundImage = "none";
      }
      busy.current = false;
    };

    try {
      const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        onCover();
        return;
      }

      rootEl.style.setProperty("--wipe-main", theme.main);
      rootEl.style.setProperty("--wipe-deep", theme.deep);
      rootEl.style.setProperty("--wipe-ink", theme.ink);
      if (sub.current) sub.current.textContent = theme.sub;
      if (label.current) label.current.textContent = theme.label;

      // Freeze the screen we are leaving (WebGL canvases included) so it slides
      // away under the wipe instead of being unmounted mid-transition. Capped so
      // a slow snapshot can never hold the transition up.
      const outgoing = document.querySelector<HTMLElement>("[data-screen]");
      if (outgoing && shot.current) {
        const capture = toPng(outgoing, { pixelRatio: 0.6, cacheBust: true, skipFonts: true }).catch(() => "");
        const dataUrl = await Promise.race([capture, wait(SHOT_BUDGET).then(() => "")]);
        if (dataUrl && alive.current && shot.current) {
          shot.current.style.backgroundImage = `url(${dataUrl})`;
          shot.current.classList.add("is-visible");
        }
      }
      rootEl.classList.add("is-active");
      await frame();
      if (!alive.current) return;

      const E = edge.current;
      const M = main.current;
      if (!E || !M || !logo.current || !sub.current || !label.current || !bar.current) return;
      const opts = (duration: number, delay = 0, easing = EASE_IO): KeyframeAnimationOptions => ({ duration, delay, easing, fill: "forwards" });

      // ---- COVER: the old page slides left while the panels sweep across
      if (shot.current?.classList.contains("is-visible")) {
        shot.current.animate(
          [
            { transform: "none", filter: "brightness(1)" },
            { transform: "translate3d(-5vw,0,0) scale(.97)", filter: "brightness(.82)" },
          ],
          opts(COVER + LAG),
        );
      }
      E.animate(
        [{ transform: "translate3d(140vw,0,0) skewX(-18deg)" }, { transform: "translate3d(-60vw,0,0) skewX(-18deg)" }],
        opts(COVER),
      );
      M.animate(
        [{ transform: "translate3d(140vw,0,0) skewX(-18deg)" }, { transform: "translate3d(-60vw,0,0) skewX(-18deg)" }],
        opts(COVER, LAG),
      );
      await wait(COVER + LAG);
      if (!alive.current) return;

      // ---- HOLD: swap the screen, show the badge
      onCover();
      logo.current.animate(
        [
          { transform: "scale(.4) rotate(-10deg)", opacity: 0 },
          { transform: "scale(1.08) rotate(3deg)", opacity: 1, offset: 0.6 },
          { transform: "none", opacity: 1 },
        ],
        opts(440, 0, EASE_OUT),
      );
      sub.current.animate([{ transform: "translateY(110%)", opacity: 0 }, { transform: "none", opacity: 1 }], opts(380, 80, EASE_OUT));
      label.current.animate([{ transform: "translateY(110%)" }, { transform: "none" }], opts(460, 120, EASE_OUT));
      bar.current.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], opts(HOLD + 40, 100, "cubic-bezier(.4,0,.2,1)"));
      await wait(HOLD + 40);
      if (!alive.current) return;

      // ---- REVEAL: badge leaves, panels keep going off-screen left
      [logo, sub, label].forEach((el, i) =>
        el.current?.animate(
          [{ transform: "none", opacity: 1 }, { transform: "translate3d(-60px,0,0)", opacity: 0 }],
          opts(260, i * 30, "cubic-bezier(.5,0,.75,0)"),
        ),
      );
      M.animate(
        [{ transform: "translate3d(-60vw,0,0) skewX(-18deg)" }, { transform: "translate3d(-270vw,0,0) skewX(-18deg)" }],
        opts(REVEAL, 120),
      );
      E.animate(
        [{ transform: "translate3d(-60vw,0,0) skewX(-18deg)" }, { transform: "translate3d(-270vw,0,0) skewX(-18deg)" }],
        opts(REVEAL, 120 + LAG),
      );
      await wait(REVEAL + LAG + 120);
    } catch {
      // A failed animation must never block navigation for good.
    } finally {
      if (alive.current) reset();
      else busy.current = false;
    }
  }, []);

  useImperativeHandle(handleRef, () => ({ play }), [play]);

  return (
    <div ref={root} className="wipe" aria-hidden="true">
      <div ref={shot} className="wipe-shot" />
      <div ref={edge} className="wipe-panel wipe-panel-edge" />
      <div ref={main} className="wipe-panel wipe-panel-main" />
      <div className="wipe-badge">
        <div ref={logo} className="wipe-logo">
          <CatMark />
        </div>
        <div className="wipe-clip">
          <div ref={sub} className="wipe-sub">
            Mencari lawan
          </div>
        </div>
        <div className="wipe-clip wipe-clip-label">
          <div ref={label} className="wipe-label">
            MATCHMAKING
          </div>
        </div>
        <div className="wipe-bar">
          <i ref={bar} />
        </div>
      </div>
    </div>
  );
}
