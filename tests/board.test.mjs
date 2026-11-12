import test from "node:test";
import assert from "node:assert/strict";
import { metrics, cardXY, locate } from "../src/board/layout.ts";
import { makeRope, stepRope, ropePath, ropeLength, ROPE_POINTS } from "../src/board/rope.ts";

test("a card dropped where it was drawn lands in the same slot", () => {
  for (const w of [360, 412, 900, 1440]) {
    const m = metrics(w);
    for (const day of [0, 3, 6])
      for (const [k, meal] of ["cafe", "almoco", "lanche", "janta"].entries())
        for (const [fx, fy] of [[0, 0], [1, 1], [0.37, 0.62]]) {
          const { x, y } = cardXY(m, day, k, fx, fy);
          const slot = locate(m, x, y);
          assert.equal(slot.day, day);
          assert.equal(slot.meal, meal);
          assert.ok(Math.abs(slot.fx - fx) < 1e-9 && Math.abs(slot.fy - fy) < 1e-9);
        }
    assert.equal(locate(m, -500, 0), null);
    assert.equal(locate(m, m.pad, m.height + 400), null);
  }
});

test("the lace hangs between its pinned ends and comes to rest", () => {
  let s = makeRope(0, 0, 200, 0);
  let frames = 0;
  for (; frames < 2000; frames++) {
    const next = stepRope(s, 0, 0, 200, 0);
    if (!next) break;
    s = next;
  }
  assert.ok(frames < 2000, "rope should fall asleep");
  assert.deepEqual([s.p[0], s.p[1]], [0, 0]);
  assert.deepEqual([s.p.at(-2), s.p.at(-1)], [200, 0]);
  const mid = s.p[ROPE_POINTS - (ROPE_POINTS % 2 ? 0 : 1)];
  assert.ok(mid > 20, `middle should sag below the ends, got ${mid}`);
  let length = 0;
  for (let i = 0; i < ROPE_POINTS - 1; i++)
    length += Math.hypot(s.p[i * 2 + 2] - s.p[i * 2], s.p[i * 2 + 3] - s.p[i * 2 + 1]);
  assert.ok(Math.abs(length - ropeLength(200)) < 4, `length ${length}`);
  assert.ok(s.p.every(Number.isFinite));
  assert.match(ropePath(s.p), /^M0 0 Q/);
  // Moving an end wakes it up.
  assert.ok(stepRope(s, 0, 0, 260, 40));
});
