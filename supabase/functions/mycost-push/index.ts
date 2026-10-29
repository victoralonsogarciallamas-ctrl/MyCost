// MyCost reminders: stores push subscriptions and, once an hour (pg_cron), reminds anyone
// who has not added an expense for 24 hours. Only the subscription and that time are stored.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const ORIGINS = ["https://victoralonsogarciallamas-ctrl.github.io", "http://localhost:8765"];
const DAY = 24 * 3600 * 1000;

function cors(req: Request) {
  const o = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Content-Type": "application/json",
  };
}

// The key pair is created on first use and kept in the database, so no secret has to be set by hand.
async function keys() {
  const { data } = await db.from("push_config").select("public_key, private_key").eq("id", 1).maybeSingle();
  if (data) return data;
  const k = webpush.generateVAPIDKeys();
  const row = { id: 1, public_key: k.publicKey, private_key: k.privateKey };
  await db.from("push_config").upsert(row);
  const { data: again } = await db.from("push_config").select("public_key, private_key").eq("id", 1).single();
  return again!;
}

// Reminders go out between 9:00 and 22:00, Spanish time.
function daytime() {
  const h = +new Intl.DateTimeFormat("es-ES", { hour: "numeric", hour12: false, timeZone: "Europe/Madrid" }).format(new Date());
  return h >= 9 && h < 22;
}

async function cron() {
  if (!daytime()) return { sent: 0, skipped: "night" };
  const k = await keys();
  webpush.setVapidDetails("mailto:avisos@mycost.app", k.public_key, k.private_key);
  const cut = new Date(Date.now() - DAY).toISOString();
  const { data: due } = await db.from("push_subs").select("endpoint, sub, last_expense_at, last_notified_at")
    .lt("last_expense_at", cut).or(`last_notified_at.is.null,last_notified_at.lt.${cut}`);
  let sent = 0;
  for (const s of due || []) {
    const days = Math.floor((Date.now() - new Date(s.last_expense_at).getTime()) / DAY);
    const body = days >= 2 ? `Llevas ${days} días sin apuntar ningún gasto. Tómate un minuto para ponerte al día.` : "Hace un día que no apuntas ningún gasto. ¿Has comprado algo hoy?";
    try {
      await webpush.sendNotification(s.sub, JSON.stringify({ title: "Apunta tus gastos", body }), { TTL: 6 * 3600 });
      await db.from("push_subs").update({ last_notified_at: new Date().toISOString() }).eq("endpoint", s.endpoint);
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subs").delete().eq("endpoint", s.endpoint);
    }
  }
  return { sent };
}

Deno.serve(async (req) => {
  const h = cors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: h });
  try {
    if (req.method === "GET") return new Response(JSON.stringify({ publicKey: (await keys()).public_key }), { headers: h });
    const b = await req.json().catch(() => ({}));
    if (b.action === "cron") return new Response(JSON.stringify(await cron()), { headers: h });
    // Test notification to every registered phone, sent from the database console when needed.
    if (b.action === "test") {
      const k = await keys();
      webpush.setVapidDetails("mailto:avisos@mycost.app", k.public_key, k.private_key);
      const { data } = await db.from("push_subs").select("sub");
      let sent = 0;
      for (const s of data || []) { try { await webpush.sendNotification(s.sub, JSON.stringify({ title: "Prueba de MyCost", body: "Si ves esto, los avisos funcionan." })); sent++; } catch (_) { /* keep going */ } }
      return new Response(JSON.stringify({ sent }), { headers: h });
    }
    const sub = b.sub;
    if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
      return new Response(JSON.stringify({ error: "bad subscription" }), { status: 400, headers: h });
    }
    if (b.action === "unsub") {
      await db.from("push_subs").delete().eq("endpoint", sub.endpoint);
      return new Response(JSON.stringify({ ok: true }), { headers: h });
    }
    // action "sub": register or refresh, with the time of the last expense added on the phone.
    const last = b.last && !isNaN(Date.parse(b.last)) ? new Date(Math.min(Date.parse(b.last), Date.now())).toISOString() : new Date().toISOString();
    await db.from("push_subs").upsert({
      endpoint: sub.endpoint,
      sub: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
      last_expense_at: last,
      updated_at: new Date().toISOString(),
    });
    return new Response(JSON.stringify({ ok: true }), { headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: h });
  }
});
