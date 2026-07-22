/**
 * Global candle counter for babykohen.com
 * GET  /api/candles -> { candles }
 * POST /api/candles -> { ok, candles, already?: true }
 *
 * Env: WALL (KV)
 * POST is soft-idempotent per IP for 24h (one counted light per visitor/day).
 */

const DAY = 86400;

function cors(res) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type");
  headers.set("Cache-Control", "no-store");
  return new Response(res.body, { status: res.status, headers });
}

function json(data, status = 200) {
  return cors(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    })
  );
}

function clientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "unknown"
  );
}

async function count(env) {
  return Math.max(0, Number((await env.WALL.get("candles")) || 0) || 0);
}

export async function onRequestOptions() {
  return cors(new Response(null, { status: 204 }));
}

export async function onRequestGet({ env }) {
  try {
    return json({ candles: await count(env) });
  } catch {
    return json({ candles: 0 });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const ip = clientIp(request);
    const key = `rate:candle:${ip}`;
    const prior = await env.WALL.get(key);
    let n = await count(env);
    if (prior) {
      return json({ ok: true, candles: n, already: true });
    }
    n = n + 1;
    await env.WALL.put("candles", String(n));
    await env.WALL.put(key, "1", { expirationTtl: DAY });
    return json({ ok: true, candles: n });
  } catch {
    return json({ error: "candle_unavailable", candles: 0 }, 500);
  }
}
