import test from "node:test";
import assert from "node:assert/strict";
import { mergeRemote, syncOnce, wins } from "../src/data/sync.ts";

// In-memory stand-in for the server, with the same rules as schema.sql:
// a stale write is ignored and every accepted write gets a new seq.
function server() {
  const rows = new Map();
  let seq = 0;
  return {
    rows,
    remote: {
      async push(recs) {
        for (const r of recs) {
          const old = rows.get(r.id);
          if (old && r.updatedAt <= old.rec.updatedAt) continue;
          rows.set(r.id, { rec: structuredClone(r), seq: ++seq });
        }
      },
      async pull(since) {
        const out = [...rows.values()].filter((x) => x.seq > since).sort((a, b) => a.seq - b.seq);
        return { rows: out.map((x) => structuredClone(x.rec)), seq: out.at(-1)?.seq ?? since };
      },
    },
  };
}

function device(remote) {
  let state = { records: {}, dirty: [], lastSeq: 0 };
  return {
    get state() { return state; },
    edit(rec) {
      state = { ...state, records: { ...state.records, [rec.id]: rec }, dirty: [...new Set([...state.dirty, rec.id])] };
    },
    sync: (opts) => syncOnce(() => state, (p) => { state = { ...state, ...p }; }, remote, opts),
  };
}

const rec = (id, updatedAt, extra = {}) => ({ id, kind: "stock", updatedAt, name: id, unit: "g", qty: 1, minQty: 0, place: "despensa", ...extra });

test("a change on one device reaches the other", async () => {
  const s = server();
  const phone = device(s.remote);
  const web = device(s.remote);
  phone.edit(rec("arroz", 10, { qty: 500 }));
  await phone.sync();
  assert.deepEqual(phone.state.dirty, []);
  await web.sync();
  assert.equal(web.state.records.arroz.qty, 500);
});

test("newest edit wins on both devices; deletions travel", async () => {
  const s = server();
  const phone = device(s.remote);
  const web = device(s.remote);
  phone.edit(rec("leite", 10, { qty: 1 }));
  await phone.sync();
  await web.sync();
  phone.edit(rec("leite", 20, { qty: 2 }));
  web.edit(rec("leite", 30, { qty: 3 }));
  await phone.sync();
  await web.sync();
  await phone.sync();
  assert.equal(phone.state.records.leite.qty, 3);
  assert.equal(web.state.records.leite.qty, 3);
  web.edit(rec("leite", 40, { deleted: true }));
  await web.sync();
  await phone.sync();
  assert.equal(phone.state.records.leite.deleted, true);
});

test("an older offline edit does not overwrite a newer one", async () => {
  const s = server();
  const phone = device(s.remote);
  const web = device(s.remote);
  web.edit(rec("ovo", 50, { qty: 12 }));
  await web.sync();
  phone.edit(rec("ovo", 20, { qty: 1 }));
  await phone.sync();
  assert.equal(phone.state.records.ovo.qty, 12);
  assert.equal(s.rows.get("ovo").rec.qty, 12);
});

test("an edit made while a push is in flight stays queued", async () => {
  const s = server();
  let d;
  const slow = {
    async push(recs) {
      await s.remote.push(recs);
      d.edit(rec("cafe", 99, { qty: 7 }));
    },
    pull: s.remote.pull,
  };
  d = device(slow);
  d.edit(rec("cafe", 10));
  await d.sync();
  assert.deepEqual(d.state.dirty, ["cafe"]);
  assert.equal(d.state.records.cafe.qty, 7, "pull must not undo the newer local edit");
  await d.sync();
  assert.equal(s.rows.get("cafe").rec.qty, 7);
});

test("ties resolve the same way on every device", () => {
  const a = rec("x", 5, { qty: 1 });
  const b = rec("x", 5, { qty: 2 });
  assert.notEqual(wins(a, b), wins(b, a));
  assert.equal(mergeRemote({ x: a }, [b]).records.x.qty, mergeRemote({ x: b }, [a]).records.x.qty);
});
