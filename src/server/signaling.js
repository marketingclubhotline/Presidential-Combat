/**
 * Phase 13 — signaling + matchmaking server.
 *
 * WebRTC cannot bootstrap itself: two browsers need somewhere to swap SDP
 * offers/answers and ICE candidates before the P2P channel exists. This is
 * that somewhere. Once the data channel opens, gameplay traffic never touches
 * this server again — it only brokers the handshake, then arbitrates the
 * result (Phase 12) because neither peer can be trusted to report its own win.
 */
import { WebSocketServer } from 'ws';
import express from 'express';
import http from 'node:http';
import crypto from 'node:crypto';

const PROTOCOL_VERSION = 1;
const HEARTBEAT_MS = 15000;
const QUEUE_ELO_WIDEN_MS = 4000;   // widen the Elo band every 4s of waiting

export function createServer({ port = 8787, recordResult = null, logger = console } = {}) {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  /** @type {Map<string, Peer>} */
  const peers = new Map();
  /** @type {Map<string, Room>} */
  const rooms = new Map();
  /** queue entries: {id, elo, joinedAt} */
  let queue = [];

  const stats = { connected: 0, matched: 0, completed: 0, voided: 0, peak: 0 };

  /* ----------------------------- HTTP ----------------------------- */
  app.get('/health', (_req, res) => res.json({
    ok: true, protocol: PROTOCOL_VERSION,
    peers: peers.size, rooms: rooms.size, queue: queue.length, stats,
  }));
  app.get('/stats', (_req, res) => res.json(stats));

  /* --------------------------- helpers ---------------------------- */
  const send = (ws, type, payload = {}) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type, ...payload }));
    }
  };
  const newId = () => crypto.randomBytes(8).toString('hex');

  function eloBand(waitedMs) {
    // start at ±100, widen 100 per interval, cap at ±1000
    return Math.min(1000, 100 + 100 * Math.floor(waitedMs / QUEUE_ELO_WIDEN_MS));
  }

  function tryMatch() {
    if (queue.length < 2) return;
    const now = Date.now();
    // sort by elo so neighbours are the best candidates
    queue.sort((a, b) => a.elo - b.elo);
    for (let i = 0; i < queue.length - 1; i++) {
      const a = queue[i], b = queue[i + 1];
      const band = Math.max(eloBand(now - a.joinedAt), eloBand(now - b.joinedAt));
      if (Math.abs(a.elo - b.elo) <= band) {
        queue.splice(i, 2);
        pair(a.id, b.id);
        return tryMatch();
      }
    }
  }

  function pair(idA, idB) {
    const a = peers.get(idA), b = peers.get(idB);
    if (!a || !b) return;
    const roomId = newId();
    // the lower-Elo player hosts, purely so the role is deterministic
    const host = a.elo <= b.elo ? a : b;
    const guest = host === a ? b : a;

    const room = {
      id: roomId, host: host.id, guest: guest.id,
      createdAt: Date.now(), results: new Map(), hashes: new Map(),
      configFingerprint: null, state: 'signaling',
    };
    rooms.set(roomId, room);
    host.roomId = roomId; guest.roomId = roomId;
    stats.matched++;

    send(host.ws, 'matched', {
      roomId, role: 'host', opponent: { handle: guest.handle, elo: guest.elo },
    });
    send(guest.ws, 'matched', {
      roomId, role: 'guest', opponent: { handle: host.handle, elo: host.elo },
    });
    logger.log(`[match] ${host.handle}(${host.elo}) vs ${guest.handle}(${guest.elo}) room=${roomId}`);
  }

  function otherPeer(room, id) {
    return peers.get(room.host === id ? room.guest : room.host);
  }

  function closeRoom(roomId, reason) {
    const room = rooms.get(roomId);
    if (!room) return;
    for (const pid of [room.host, room.guest]) {
      const p = peers.get(pid);
      if (p) { p.roomId = null; if (reason) send(p.ws, 'room-closed', { reason }); }
    }
    rooms.delete(roomId);
  }

  /**
   * Phase 12 arbitration. Both peers report who won plus their final state
   * hash. Elo moves only if they agree on BOTH. Otherwise the match is
   * recorded as unverified and scores nothing.
   */
  async function arbitrate(room) {
    if (room.results.size < 2) return;
    const [ra, rb] = [...room.results.values()];
    const agreeWinner = ra.winnerId === rb.winnerId;
    const agreeHash = ra.stateHash === rb.stateHash;
    const verified = agreeWinner && agreeHash;

    room.state = 'complete';
    if (verified) stats.completed++; else stats.voided++;

    let outcome = { verified, reason: null };
    if (!agreeWinner) outcome.reason = 'peers disagree on the winner';
    else if (!agreeHash) outcome.reason = 'final state hash mismatch (desync or tampering)';

    if (recordResult && ra.winnerId && ra.loserId) {
      try {
        const res = await recordResult({
          winnerId: ra.winnerId, loserId: ra.loserId,
          roundsWon: ra.roundsWon ?? 2, roundsLost: ra.roundsLost ?? 0,
          durationMs: ra.durationMs ?? null,
          stateHash: verified ? ra.stateHash : null,
          verified,
        });
        outcome.record = res;
      } catch (e) {
        logger.error('[db] recordResult failed:', e.message);
        outcome.dbError = e.message;
      }
    }
    for (const pid of [room.host, room.guest]) {
      const p = peers.get(pid);
      if (p) send(p.ws, 'match-result', outcome);
    }
    logger.log(`[result] room=${room.id} verified=${verified}${outcome.reason ? ' — ' + outcome.reason : ''}`);
    closeRoom(room.id, null);
  }

  /* ------------------------- WS lifecycle ------------------------- */
  wss.on('connection', (ws, req) => {
    const id = newId();
    const peer = {
      id, ws, handle: 'anon', elo: 1200, playerId: null,
      roomId: null, alive: true, ip: req.socket.remoteAddress,
      msgTimes: [],
    };
    peers.set(id, peer);
    stats.connected++;
    stats.peak = Math.max(stats.peak, peers.size);
    send(ws, 'welcome', { id, protocol: PROTOCOL_VERSION });

    ws.on('pong', () => { peer.alive = true; });

    ws.on('message', async (raw) => {
      // cheap rate limit: 60 messages / 10s
      const now = Date.now();
      peer.msgTimes = peer.msgTimes.filter(t => now - t < 10000);
      peer.msgTimes.push(now);
      if (peer.msgTimes.length > 60) {
        send(ws, 'error', { message: 'rate limit exceeded' });
        return ws.close(1008, 'rate limit');
      }
      if (raw.length > 64 * 1024) return ws.close(1009, 'message too large');

      let msg;
      try { msg = JSON.parse(raw); } catch { return send(ws, 'error', { message: 'bad JSON' }); }
      const room = peer.roomId ? rooms.get(peer.roomId) : null;

      switch (msg.type) {
        case 'hello': {
          peer.handle = String(msg.handle || 'anon').slice(0, 16);
          peer.elo = Number.isFinite(msg.elo) ? Math.max(0, Math.min(4000, msg.elo | 0)) : 1200;
          peer.playerId = msg.playerId || null;
          peer.configFingerprint = msg.configFingerprint || null;
          send(ws, 'hello-ok', { id: peer.id, handle: peer.handle, elo: peer.elo });
          break;
        }
        case 'queue': {
          if (peer.roomId) return send(ws, 'error', { message: 'already in a room' });
          if (queue.some(q => q.id === peer.id)) return;
          queue.push({ id: peer.id, elo: peer.elo, joinedAt: Date.now() });
          send(ws, 'queued', { position: queue.length });
          tryMatch();
          break;
        }
        case 'dequeue': {
          queue = queue.filter(q => q.id !== peer.id);
          send(ws, 'dequeued', {});
          break;
        }
        /* --- pure SDP/ICE relay: the server never inspects the payload --- */
        case 'signal': {
          if (!room) return send(ws, 'error', { message: 'not in a room' });
          const other = otherPeer(room, peer.id);
          if (other) send(other.ws, 'signal', { from: peer.id, data: msg.data });
          break;
        }
        case 'config-check': {
          if (!room) break;
          if (!room.configFingerprint) room.configFingerprint = msg.fingerprint;
          else if (room.configFingerprint !== msg.fingerprint) {
            // peers are running different balance data — refuse to rank it
            for (const pid of [room.host, room.guest]) {
              const p = peers.get(pid);
              if (p) send(p.ws, 'config-mismatch', {
                message: 'opponent is running different game data; match will not be ranked',
              });
            }
            room.state = 'unranked';
          }
          break;
        }
        /* --- Phase 12: periodic hash exchange --- */
        case 'state-hash': {
          if (!room) break;
          const other = otherPeer(room, peer.id);
          if (other) send(other.ws, 'state-hash', { frame: msg.frame, hash: msg.hash });
          break;
        }
        case 'desync': {
          if (!room) break;
          room.state = 'desynced';
          for (const pid of [room.host, room.guest]) {
            const p = peers.get(pid);
            if (p) send(p.ws, 'desync-abort', {
              frame: msg.frame, reason: 'state divergence detected; match voided',
            });
          }
          logger.warn(`[desync] room=${room.id} frame=${msg.frame}`);
          closeRoom(room.id, 'desync');
          break;
        }
        case 'report-result': {
          if (!room) break;
          room.results.set(peer.id, {
            winnerId: msg.winnerId, loserId: msg.loserId,
            stateHash: String(msg.stateHash ?? ''),
            roundsWon: msg.roundsWon, roundsLost: msg.roundsLost,
            durationMs: msg.durationMs,
          });
          if (room.state === 'unranked' || room.state === 'desynced') {
            room.results.forEach(r => { r.stateHash = '__unranked__' + Math.random(); });
          }
          await arbitrate(room);
          break;
        }
        case 'ping': send(ws, 'pong', { t: msg.t }); break;
        default: send(ws, 'error', { message: `unknown type "${msg.type}"` });
      }
    });

    ws.on('close', () => {
      queue = queue.filter(q => q.id !== peer.id);
      if (peer.roomId) {
        const room = rooms.get(peer.roomId);
        if (room) {
          const other = otherPeer(room, peer.id);
          if (other) send(other.ws, 'opponent-left', { reason: 'disconnected' });
          closeRoom(room.id, 'opponent disconnected');
        }
      }
      peers.delete(id);
    });
  });

  // drop half-open sockets
  const hb = setInterval(() => {
    for (const peer of peers.values()) {
      if (!peer.alive) { peer.ws.terminate(); continue; }
      peer.alive = false;
      try { peer.ws.ping(); } catch {}
    }
  }, HEARTBEAT_MS);
  wss.on('close', () => clearInterval(hb));

  return {
    app, server, wss, peers, rooms, stats,
    get queue() { return queue; },
    listen: () => new Promise(res => server.listen(port, '0.0.0.0', () => res(server))),
    close: () => new Promise(res => { clearInterval(hb); wss.close(); server.close(res); }),
    _internal: { tryMatch, pair, arbitrate, rooms, peers },
  };
}
