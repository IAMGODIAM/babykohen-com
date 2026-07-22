/**
 * Public letter wall for babykohen.com
 * GET  /api/letters  -> { letters: [...], candles: number }
 * POST /api/letters  -> { ok, letter, candles }
 *
 * Env: WALL (KV)
 */

const MAX_LETTERS = 500;
const MAX_MSG = 600;
const MIN_MSG = 4;
const RATE_WINDOW_SEC = 120;

const BLOCK = [
  /\b(https?:\/\/|www\.)/i, // no raw outbound spam links in wall text
  /<[^>]+>/, // no HTML
  /\b(viagra|casino|crypto\s*airdrop|onlyfans)\b/i,
];

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

function clean(s, max) {
  return String(s || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, max);
}

function validLetter(body) {
  const m = clean(body.m ?? body.message, MAX_MSG);
  const f = clean(body.f ?? body.first, 40);
  const l = clean(body.l ?? body.last, 1).toUpperCase();
  const c = clean(body.c ?? body.city, 32);
  const s = clean(body.s ?? body.usState ?? body.state, 16);
  const tone = body.tone === "anger" ? "anger" : "love";

  if (m.length < MIN_MSG) return { error: "WRITE A FEW WORDS FIRST — THE WALL IS WAITING." };
  if (!f) return { error: "ADD YOUR FIRST NAME — IT SIGNS YOUR CANDLE." };
  for (const re of BLOCK) {
    if (re.test(m) || re.test(f) || re.test(c)) {
      return { error: "PLEASE KEEP THIS WALL FREE OF LINKS AND MARKUP." };
    }
  }
  return {
    letter: { m, f, l, c, s, tone, t: Date.now() },
  };
}

async function readWall(env) {
  const letters = (await env.WALL.get("letters", "json")) || [];
  const candles = Number((await env.WALL.get("candles")) || 0) || 0;
  return {
    letters: Array.isArray(letters) ? letters : [],
    candles: Math.max(0, candles | 0),
  };
}

export async function onRequestOptions() {
  return cors(new Response(null, { status: 204 }));
}

export async function onRequestGet({ env }) {
  try {
    const wall = await readWall(env);
    return json({
      letters: wall.letters.slice(0, 200),
      candles: wall.candles,
    });
  } catch (e) {
    return json({ letters: [], candles: 0, error: "wall_unavailable" }, 200);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const ip = clientIp(request);
    const rateKey = `rate:letter:${ip}`;
    const hit = await env.WALL.get(rateKey);
    if (hit) {
      return json({ error: "PLEASE WAIT A MOMENT BEFORE POSTING AGAIN." }, 429);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "INVALID REQUEST." }, 400);
    }

    const v = validLetter(body || {});
    if (v.error) return json({ error: v.error }, 400);

    const wall = await readWall(env);
    const letters = [v.letter].concat(wall.letters).slice(0, MAX_LETTERS);
    const candles = wall.candles + 1;

    await env.WALL.put("letters", JSON.stringify(letters));
    await env.WALL.put("candles", String(candles));
    await env.WALL.put(rateKey, "1", { expirationTtl: RATE_WINDOW_SEC });

    return json({ ok: true, letter: v.letter, candles, letters: letters.slice(0, 200) });
  } catch (e) {
    return json({ error: "COULD NOT POST JUST NOW. PLEASE TRY AGAIN." }, 500);
  }
}
