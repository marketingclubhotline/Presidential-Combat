import { createServer } from '../src/server/signaling.js';
import { WebSocket } from 'ws';

const silent = { log() {}, warn() {}, error() {} };

function connect(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    const inbox = [];
    const waiters = [];
    ws.on('message', raw => {
      const msg = JSON.parse(raw);
      inbox.push(msg);
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i].type === msg.type) { waiters[i].resolve(msg); waiters.splice(i, 1); }
      }
    });
    ws.on('error', reject);
    ws.on('open', () => resolve({
      ws, inbox,
      send: (type, payload = {}) => ws.send(JSON.stringify({ type, ...payload })),
      wait: (type, ms = 2000) => new Promise((res, rej) => {
        const hit = inbox.find(m => m.type === type);
        if (hit) return res(hit);
        const w = { type, resolve: res };
        waiters.push(w);
        setTimeout(() => rej(new Error(`timeout waiting for "${type}"`)), ms);
      }),
      close: () => ws.close(),
    }));
  });
}

export async function run(t) {
  const recorded = [];
  const srv = createServer({
    port: 0,
    logger: silent,
    recordResult: async (r) => { recorded.push(r); return { ok: true, winCount: 1 }; },
  });
  await srv.listen();
  const port = srv.server.address().port;

  // --- handshake ---
  const a = await connect(port);
  const b = await connect(port);
  t.ok((await a.wait('welcome')).protocol === 1, 'server sends welcome with protocol version');

  a.send('hello', { handle: 'ryu', elo: 1200, playerId: 'u1' });
  b.send('hello', { handle: 'ken', elo: 1250, playerId: 'u2' });
  t.eq((await a.wait('hello-ok')).handle, 'ryu', 'hello registers the handle');

  // --- matchmaking ---
  a.send('queue'); 
  await a.wait('queued');
  b.send('queue');
  const ma = await a.wait('matched');
  const mb = await b.wait('matched');
  t.ok(ma.roomId === mb.roomId, 'both peers land in the same room');
  t.ok(ma.role !== mb.role, 'exactly one host and one guest');
  t.eq(ma.role, 'host', 'lower-Elo player hosts (deterministic role)');
  t.eq(ma.opponent.handle, 'ken', 'opponent info relayed');

  // --- SDP/ICE relay ---
  a.send('signal', { data: { sdp: 'v=0 fake-offer' } });
  const relayed = await b.wait('signal');
  t.eq(relayed.data.sdp, 'v=0 fake-offer', 'SDP offer relayed to the peer');
  b.send('signal', { data: { candidate: 'candidate:1 udp' } });
  t.eq((await a.wait('signal')).data.candidate, 'candidate:1 udp', 'ICE candidate relayed back');

  // --- config fingerprint agreement ---
  a.send('config-check', { fingerprint: 'deadbeef' });
  b.send('config-check', { fingerprint: 'deadbeef' });
  await new Promise(r => setTimeout(r, 50));
  t.ok(!b.inbox.some(m => m.type === 'config-mismatch'), 'matching fingerprints do not warn');

  // --- state hash exchange ---
  a.send('state-hash', { frame: 60, hash: 12345 });
  const sh = await b.wait('state-hash');
  t.eq(sh.hash, 12345, 'state hashes relayed between peers');

  // --- happy path: both peers agree => verified, Elo awarded ---
  const result = { winnerId: 'u1', loserId: 'u2', stateHash: 'abc123', roundsWon: 2, roundsLost: 1, durationMs: 60000 };
  a.send('report-result', result);
  b.send('report-result', result);
  const ra = await a.wait('match-result');
  t.eq(ra.verified, true, 'agreeing peers produce a VERIFIED result');
  t.eq(recorded.length, 1, 'result written to the database exactly once');
  t.eq(recorded[0].verified, true, 'db call flagged verified');
  t.eq(recorded[0].winnerId, 'u1', 'correct winner recorded');
  t.eq(srv.stats.completed, 1, 'completed counter incremented');

  a.close(); b.close();

  // --- cheat path: peers disagree on the winner => voided ---
  recorded.length = 0;
  const c = await connect(port), d = await connect(port);
  c.send('hello', { handle: 'cheat', elo: 1200, playerId: 'u3' });
  d.send('hello', { handle: 'honest', elo: 1210, playerId: 'u4' });
  await c.wait('hello-ok'); await d.wait('hello-ok');
  c.send('queue'); await c.wait('queued'); d.send('queue');
  await c.wait('matched'); await d.wait('matched');
  c.send('report-result', { winnerId: 'u3', loserId: 'u4', stateHash: 'aaa' });
  d.send('report-result', { winnerId: 'u4', loserId: 'u3', stateHash: 'bbb' });
  const rc = await c.wait('match-result');
  t.eq(rc.verified, false, 'conflicting claims are NOT verified');
  t.ok(/disagree/.test(rc.reason), `void reason explains why: "${rc.reason}"`);
  t.eq(recorded[0].verified, false, 'db told not to award Elo');
  t.eq(srv.stats.voided, 1, 'voided counter incremented');
  c.close(); d.close();

  // --- hash mismatch (same winner, divergent sim) => voided ---
  recorded.length = 0;
  const e = await connect(port), f = await connect(port);
  e.send('hello', { handle: 'p5', elo: 1300, playerId: 'u5' });
  f.send('hello', { handle: 'p6', elo: 1310, playerId: 'u6' });
  await e.wait('hello-ok'); await f.wait('hello-ok');
  e.send('queue'); await e.wait('queued'); f.send('queue');
  await e.wait('matched'); await f.wait('matched');
  e.send('report-result', { winnerId: 'u5', loserId: 'u6', stateHash: 'HASH-A' });
  f.send('report-result', { winnerId: 'u5', loserId: 'u6', stateHash: 'HASH-B' });
  const re = await e.wait('match-result');
  t.eq(re.verified, false, 'hash mismatch voids the match even when the winner agrees');
  t.ok(/hash/.test(re.reason), 'reason cites the hash mismatch');
  e.close(); f.close();

  // --- desync abort ---
  const g = await connect(port), h = await connect(port);
  g.send('hello', { handle: 'p7', elo: 1400, playerId: 'u7' });
  h.send('hello', { handle: 'p8', elo: 1410, playerId: 'u8' });
  await g.wait('hello-ok'); await h.wait('hello-ok');
  g.send('queue'); await g.wait('queued'); h.send('queue');
  await g.wait('matched'); await h.wait('matched');
  g.send('desync', { frame: 512 });
  const ab = await h.wait('desync-abort');
  t.eq(ab.frame, 512, 'desync abort broadcast to both peers with the frame');
  t.ok(/voided/.test(ab.reason), 'desync voids the match');
  g.close(); h.close();

  // --- disconnect handling ---
  const i = await connect(port), j = await connect(port);
  i.send('hello', { handle: 'p9', elo: 1500, playerId: 'u9' });
  j.send('hello', { handle: 'p10', elo: 1510, playerId: 'u10' });
  await i.wait('hello-ok'); await j.wait('hello-ok');
  i.send('queue'); await i.wait('queued'); j.send('queue');
  await i.wait('matched'); await j.wait('matched');
  i.close();
  const left = await j.wait('opponent-left');
  t.ok(left.reason === 'disconnected', 'surviving peer is told the opponent left');
  j.close();

  // --- Elo-banded matchmaking: far-apart players do not match instantly ---
  const lo = await connect(port), hi = await connect(port);
  lo.send('hello', { handle: 'bronze', elo: 800, playerId: 'ua' });
  hi.send('hello', { handle: 'master', elo: 2400, playerId: 'ub' });
  await lo.wait('hello-ok'); await hi.wait('hello-ok');
  lo.send('queue'); hi.send('queue');
  await new Promise(r => setTimeout(r, 120));
  t.ok(!lo.inbox.some(m => m.type === 'matched'),
    '1600-Elo gap is not matched inside the initial ±100 band');
  t.eq(srv.queue.length, 2, 'both remain queued while the band widens');
  lo.close(); hi.close();

  // --- malformed input is rejected, not crashing ---
  const k = await connect(port);
  k.ws.send('this is not json');
  const err = await k.wait('error');
  t.ok(/bad JSON/.test(err.message), 'malformed JSON rejected gracefully');
  k.inbox.length = 0;   // clear the previous error before asserting on the next
  k.send('nonsense-type');
  t.ok(/unknown type/.test((await k.wait('error', 2000)).message), 'unknown message type rejected');
  k.close();

  // --- health endpoint ---
  const res = await fetch(`http://127.0.0.1:${port}/health`);
  const health = await res.json();
  t.ok(health.ok && health.protocol === 1, 'health endpoint reports status');

  await srv.close();
}
