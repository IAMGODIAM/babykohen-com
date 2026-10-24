/**
 * Moderation for the babykohen.com letter wall.
 *
 * Auth: header "x-mod-token" must match env MOD_TOKEN (Pages secret).
 * If MOD_TOKEN is not set, the endpoint is disabled (503).
 *
 * GET  /api/moderate           -> { pending: [...], published: n, candles }
 * POST /api/moderate { action: "approve", id } -> moves the held letter to
 *                                the public wall and increments the candle count
 * POST /api/moderate { action: "reject",  id } -> drops the held letter
 *
 * Env: WALL (KV), MOD_TOKEN (secret)
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function authed(request, env) {
  const token = env.MOD_TOKEN;
  if (!token) return false;
  const given = request.headers.get("x-mod-token") || "";
  if (given.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= given.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

async function readJson(env, key, fallback) {
  const v = await env.WALL.get(key, "json");
  return v == null ? fallback : v;
}

async function state(env) {
  const letters = await readJson(env, "letters", []);
  const pending = await readJson(env, "pending", []);
  const candles = Math.max(0, Number((await env.WALL.get("candles")) || 0) || 0);
  return {
    letters: Array.isArray(letters) ? letters : [],
    pending: Array.isArray(pending) ? pending : [],
    candles,
  };
}

export async function onRequestGet({ request, env }) {
  if (!env.MOD_TOKEN) return json({ error: "moderation_disabled" }, 503);
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);
  const s = await state(env);
  return json({ pending: s.pending, published: s.letters.length, candles: s.candles });
}

export async function onRequestPost({ request, env }) {
  if (!env.MOD_TOKEN) return json({ error: "moderation_disabled" }, 503);
  if (!authed(request, env)) return json({ error: "unauthorized" }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const { action, id } = body || {};
  if ((action !== "approve" && action !== "reject") || !id) {
    return json({ error: "invalid_request" }, 400);
  }

  const s = await state(env);
  const idx = s.pending.findIndex((p) => p && p.id === id);
  if (idx < 0) return json({ error: "not_found" }, 404);
  const [item] = s.pending.splice(idx, 1);

  if (action === "reject") {
    await env.WALL.put("pending", JSON.stringify(s.pending));
    return json({ ok: true, action, pending: s.pending.length, candles: s.candles });
  }

  // approve: publish at the head of the wall (newest first), count the candle
  const letters = [item].concat(s.letters).slice(0, 500);
  const candles = s.candles + 1;
  await env.WALL.put("letters", JSON.stringify(letters));
  await env.WALL.put("candles", String(candles));
  await env.WALL.put("pending", JSON.stringify(s.pending));
  return json({ ok: true, action, letter: item, pending: s.pending.length, candles });
}
