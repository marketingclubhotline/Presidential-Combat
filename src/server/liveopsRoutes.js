/**
 * HTTP surface for Phases 15-20. Mounted by src/server/index.js.
 *
 * Every route degrades safely: with no database configured the endpoints
 * still answer with bundled/in-memory data so the game boots and plays.
 */
import express from 'express';
import { aggregateSummaries, balanceReport, funnelDropoff, computeRetention } from '../shared/telemetry.js';
import { resolveConfigFor } from '../shared/liveconfig.js';
import { AbuseDetector, buildBracket, advanceBracket, ContentScheduler,
         assertCosmeticOnly, projectCosts, breakEvenDAU,
         sunsetStage, capability, sunsetRecommendation } from './liveops.js';

export function liveopsRoutes({ store, logger = console } = {}) {
  const r = express.Router();
  const detector = new AbuseDetector();

  /* ---------------- PHASE 20 gate: applies to everything ------------- */
  // A capability that is switched off during sunset must be off everywhere,
  // not just hidden in the UI.
  const requireCap = (cap) => (req, res, next) => {
    const mode = store.status().mode;
    if (!capability(mode, cap)) {
      return res.status(503).json({
        error: 'service_unavailable', capability: cap, mode,
        message: sunsetStage(mode).playerMessage || 'This service has been retired.',
      });
    }
    next();
  };

  r.get('/status', (_req, res) => {
    const s = store.status();
    res.json({ ...s, stage: sunsetStage(s.mode) });
  });

  /* ---------------------- PHASE 16: OTA config ----------------------- */
  r.get('/config', (req, res) => {
    const playerId = String(req.query.player || 'anon');
    try {
      const resolved = resolveConfigFor(playerId, store.configState());
      store.recordExposure(playerId, resolved.experiments);
      res.set('Cache-Control', 'no-store');   // never let a CDN pin balance data
      res.json(resolved);
    } catch (e) {
      logger.error('[config] resolve failed:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Publish a new version / move a channel / pull the kill switch.
  r.post('/admin/config/publish', express.json(), (req, res) => {
    try { res.json(store.publishConfig(req.body)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  r.post('/admin/config/rollout', express.json(), (req, res) => {
    try { res.json(store.setRollout(req.body.channel, req.body.pct)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  r.post('/admin/config/kill', express.json(), (req, res) => {
    const { channel = 'experiment', killed = true } = req.body || {};
    try { res.json(store.setKill(channel, killed)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });

  /* --------------------- PHASE 15: telemetry ------------------------- */
  r.post('/telemetry', express.json({ limit: '256kb' }), requireCap('telemetry'), (req, res) => {
    const batch = req.body;
    if (!batch || !Array.isArray(batch.events)) {
      return res.status(400).json({ error: 'bad batch' });
    }
    if (batch.events.length > 500) return res.status(413).json({ error: 'batch too large' });
    const n = store.ingest(batch);
    res.json({ ok: true, accepted: n });
  });

  r.get('/analytics/balance', (_req, res) => {
    res.json(balanceReport(store.rollups()));
  });
  r.get('/analytics/funnel', (_req, res) => {
    res.json(funnelDropoff(store.sessions()));
  });
  r.get('/analytics/retention', (req, res) => {
    const cohort = String(req.query.cohort || new Date().toISOString().slice(0, 10));
    res.json(computeRetention(store.activity(), cohort));
  });

  /* --------------------- PHASE 17: content --------------------------- */
  r.get('/content', async (_req, res) => {
    res.json(await new ContentScheduler({ store: store.contentStore }).liveContent());
  });

  /* -------------------- PHASE 18: moderation ------------------------- */
  r.post('/report', express.json(), (req, res) => {
    const { reporterId, targetId, reason, matchId, detail } = req.body || {};
    if (!targetId || !reason) return res.status(400).json({ error: 'targetId and reason required' });
    store.addReport({ reporterId, targetId, reason, matchId, detail });
    const verdict = detector.evaluate({
      playerId: targetId,
      connStats: store.connStats(targetId),
      reports: store.reports(targetId),
    });
    if (verdict.action && verdict.autoApply) store.enforce(verdict);
    else if (verdict.action) store.queueForReview(verdict);
    res.json({ ok: true, reviewed: !!verdict.action });
  });

  r.get('/admin/moderation/queue', (_req, res) => res.json(store.reviewQueue()));

  /* -------------------- PHASE 18: tournaments ------------------------ */
  r.post('/tournaments', express.json(), (req, res) => {
    try { res.json(store.createTournament(req.body)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  r.post('/tournaments/:id/start', (req, res) => {
    try { res.json(store.startTournament(req.params.id, buildBracket)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  r.get('/tournaments/:id/bracket', (req, res) => {
    const t = store.tournament(req.params.id);
    if (!t) return res.status(404).json({ error: 'not found' });
    res.json({ id: t.id, name: t.name, state: t.state, matches: t.matches });
  });
  r.post('/tournaments/:id/result', express.json(), (req, res) => {
    try { res.json(store.reportBracketResult(req.params.id, req.body, advanceBracket)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  // Spectator: read-only stream key for a live bracket match.
  r.get('/tournaments/:id/spectate/:key', (req, res) => {
    const m = store.spectate(req.params.id, req.params.key);
    if (!m) return res.status(404).json({ error: 'no live match for that key' });
    res.json(m);
  });

  /* ----------------------- PHASE 19: store --------------------------- */
  r.get('/store', requireCap('store'), (_req, res) => res.json(store.catalogue()));
  r.post('/store/purchase', express.json(), requireCap('store'), (req, res) => {
    try { res.json(store.purchase(req.body)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  r.get('/admin/costs', (req, res) => {
    const dau = Number(req.query.dau || 1000);
    res.json({ projection: projectCosts({ dau }), breakEvenDAU: breakEvenDAU() });
  });

  /* ----------------------- PHASE 20: sunset -------------------------- */
  r.post('/admin/sunset', express.json(), (req, res) => {
    try { res.json(store.setMode(req.body.mode, req.body.message)); }
    catch (e) { res.status(400).json({ error: e.message }); }
  });
  r.get('/admin/sunset/recommend', (req, res) => {
    res.json(sunsetRecommendation({
      dau: Number(req.query.dau || 0),
      medianQueueSec: Number(req.query.queue || 0),
      monthlyCost: Number(req.query.cost || 0),
      monthlyRevenue: Number(req.query.revenue || 0),
      monthsUnprofitable: Number(req.query.months || 0),
    }));
  });
  r.get('/export/:playerId', (req, res) => {
    // Players keep their data even after shutdown.
    res.json(store.exportPlayer(req.params.playerId));
  });

  return r;
}
