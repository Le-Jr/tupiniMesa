// A small Verlet rope: N points, both ends pinned, gravity pulling the
// middle down. It is what makes the lace between cards sag, swing and
// settle like a real shoelace. Runs as a Reanimated worklet every frame.

export const ROPE_POINTS = 11;

export interface RopeState {
  /** Current positions, flat [x0, y0, x1, y1, ...]. */
  p: number[];
  /** Positions one step ago. */
  q: number[];
  /** Frames spent without visible motion; the rope sleeps once it settles. */
  still: number;
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export function makeRope(ax: number, ay: number, bx: number, by: number): RopeState {
  "worklet";
  const p: number[] = [];
  for (let i = 0; i < ROPE_POINTS; i++) {
    const t = i / (ROPE_POINTS - 1);
    p.push(ax + (bx - ax) * t, ay + (by - ay) * t);
  }
  return { p, q: p.slice(), still: 0, ax, ay, bx, by };
}

/** Rope is a little longer than the gap it spans, so it always hangs. */
export function ropeLength(dist: number): number {
  "worklet";
  return dist + Math.min(64, Math.max(16, dist * 0.2));
}

/** Advances one frame. Returns null when the rope is asleep (nothing to draw). */
export function stepRope(
  s: RopeState,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): RopeState | null {
  "worklet";
  const moved = ax !== s.ax || ay !== s.ay || bx !== s.bx || by !== s.by;
  if (!moved && s.still > 40) return null;

  const n = ROPE_POINTS;
  const p = s.p.slice();
  const q = s.q.slice();
  let energy = 0;

  for (let i = 1; i < n - 1; i++) {
    const xi = i * 2;
    const yi = xi + 1;
    const vx = ((p[xi] ?? 0) - (q[xi] ?? 0)) * 0.9;
    const vy = ((p[yi] ?? 0) - (q[yi] ?? 0)) * 0.9;
    q[xi] = p[xi] ?? 0;
    q[yi] = p[yi] ?? 0;
    p[xi] = (p[xi] ?? 0) + vx;
    p[yi] = (p[yi] ?? 0) + vy + 0.9;
    energy += Math.abs(vx) + Math.abs(vy);
  }

  const seg = ropeLength(Math.hypot(bx - ax, by - ay)) / (n - 1);
  for (let k = 0; k < 10; k++) {
    p[0] = ax;
    p[1] = ay;
    p[n * 2 - 2] = bx;
    p[n * 2 - 1] = by;
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2;
      const b = a + 2;
      const dx = (p[b] ?? 0) - (p[a] ?? 0);
      const dy = (p[b + 1] ?? 0) - (p[a + 1] ?? 0);
      const d = Math.hypot(dx, dy) || 0.0001;
      const pull = ((d - seg) / d) * 0.5;
      // Ends are pinned, so their neighbours take the whole correction.
      const wa = i === 0 ? 0 : i === n - 2 ? 2 : 1;
      const wb = i === n - 2 ? 0 : i === 0 ? 2 : 1;
      p[a] = (p[a] ?? 0) + dx * pull * wa;
      p[a + 1] = (p[a + 1] ?? 0) + dy * pull * wa;
      p[b] = (p[b] ?? 0) - dx * pull * wb;
      p[b + 1] = (p[b + 1] ?? 0) - dy * pull * wb;
    }
  }

  return {
    p,
    q,
    still: moved || energy > 0.6 ? 0 : s.still + 1,
    ax,
    ay,
    bx,
    by,
  };
}

/** Smooth SVG path through the rope points. */
export function ropePath(p: number[]): string {
  "worklet";
  const n = p.length / 2;
  const f = (v: number | undefined) => Math.round((v ?? 0) * 10) / 10;
  let d = `M${f(p[0])} ${f(p[1])}`;
  for (let i = 1; i < n - 1; i++) {
    const mx = ((p[i * 2] ?? 0) + (p[i * 2 + 2] ?? 0)) / 2;
    const my = ((p[i * 2 + 1] ?? 0) + (p[i * 2 + 3] ?? 0)) / 2;
    d += ` Q${f(p[i * 2])} ${f(p[i * 2 + 1])} ${f(mx)} ${f(my)}`;
  }
  d += ` L${f(p[n * 2 - 2])} ${f(p[n * 2 - 1])}`;
  return d;
}
