/* Abdulgamid Parfum: серверная часть на Netlify Functions (путь /api/*).
   Каталог, правки из админки и загруженные фото хранятся в Netlify Blobs, GitHub для этого не нужен.
   Единственная настройка: переменная окружения ADMIN_PASSWORD в Netlify.

   Публичные маршруты:
     GET  /api/catalog.js       живой каталог (без скрытых ароматов), подключается на страницах сайта
     GET  /api/catalog          то же самое в JSON
     GET  /api/photo/<ключ>     фото, загруженные из админки
   Админ-маршруты (нужен вход по паролю, cookie ap_admin):
     POST /api/admin/login      { password }
     POST /api/admin/logout
     GET  /api/admin/session
     GET  /api/admin/catalog    весь каталог (со скрытыми) + rev + hasPrev
     PUT  /api/admin/catalog    { items, rev }: сохранить каталог целиком
     DELETE /api/admin/catalog  вернуть исходный каталог из js/data.js
     POST /api/admin/restore    вернуть предыдущее сохранение
     POST /api/admin/photo      картинка (тело запроса), ответ { path }
*/
import { getStore } from "@netlify/blobs";
import { webcrypto } from "node:crypto";

const subtle = webcrypto.subtle;
const enc = new TextEncoder();

const COOKIE = "ap_admin";
const SESSION_SEC = 12 * 3600;
const MAX_ITEMS = 1000;
const MAX_BODY = 2_500_000;
const MAX_PHOTO = 4_000_000;
const TAGS = ["oriental", "woody", "fougere", "fresh", "floral", "gourmand", "leather", "musk"];
const FAIL_LIMIT = 8;
const FAIL_WINDOW_MS = 15 * 60 * 1000;

/* ---------- окружение и ответы ---------- */
const env = (k) => {
  try { const v = globalThis.Netlify?.env?.get?.(k); if (v != null) return v; } catch { /* нет глобального Netlify */ }
  return globalThis.process?.env?.[k];
};
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const fail = (status, error, message) => json({ error, message }, status);

const catalogStore = () => getStore({ name: "catalog", consistency: "strong" });
const photoStore = () => getStore({ name: "photos", consistency: "strong" });
const adminStore = () => getStore({ name: "admin", consistency: "strong" });

/* ---------- подпись сессии (HMAC-SHA256) ---------- */
const b64u = (bytes) => {
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64u = (str) => {
  const s = atob(str.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (str.length % 4)) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
};
async function hmac(keyStr, msg) {
  const key = await subtle.importKey("raw", enc.encode(keyStr), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await subtle.sign("HMAC", key, enc.encode(msg)));
}
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}
const signKey = () => "ap-admin-v1:" + (env("ADMIN_PASSWORD") || "") + ":" + (env("ADMIN_SECRET") || "");

async function passwordOk(given) {
  const expected = env("ADMIN_PASSWORD");
  if (!expected) return false;
  const k = signKey();
  return same(await hmac(k, "pw:" + given), await hmac(k, "pw:" + expected));
}
async function makeToken() {
  const payload = b64u(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_SEC })));
  return payload + "." + b64u(await hmac(signKey(), payload));
}
async function tokenOk(token) {
  if (!token || !env("ADMIN_PASSWORD")) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  let given; try { given = fromB64u(sig); } catch { return false; }
  if (!same(given, await hmac(signKey(), payload))) return false;
  try { return JSON.parse(new TextDecoder().decode(fromB64u(payload))).exp > Date.now() / 1000; } catch { return false; }
}
function readCookie(req, name) {
  for (const part of (req.headers.get("cookie") || "").split(/;\s*/)) {
    const i = part.indexOf("="); if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1);
  }
  return "";
}
const cookieHeader = (value, maxAge) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

/* ---------- ограничение подбора пароля ---------- */
const ipOf = (req, context) => context?.ip || req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
async function ipKey(ip) {
  return "fail-" + b64u((await hmac("ap-ip", ip)).slice(0, 12));
}
async function isBlocked(key) {
  const rec = await adminStore().get(key, { type: "json" });
  return !!rec && rec.n >= FAIL_LIMIT && Date.now() - rec.t < FAIL_WINDOW_MS;
}
async function noteFail(key) {
  const st = adminStore(), rec = await st.get(key, { type: "json" });
  const fresh = !rec || Date.now() - rec.t >= FAIL_WINDOW_MS;
  await st.setJSON(key, { n: fresh ? 1 : rec.n + 1, t: fresh ? Date.now() : rec.t });
}

/* ---------- проверка и очистка ароматов ---------- */
const clean = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");
const cleanText = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, max) : "");
const today = () => new Date().toISOString().slice(0, 10);

function sanitizeItem(x, i) {
  const where = `Строка ${i + 1}`;
  if (!x || typeof x !== "object") throw new Error(`${where}: пустая запись`);
  const id = clean(x.id, 90).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,89}$/.test(id)) throw new Error(`${where}: неверный id «${id}»`);
  const n = clean(x.n, 90);
  if (!n) throw new Error(`${where} (${id}): не указано название`);
  const it = {
    id,
    b: clean(x.b, 70),
    n,
    t: x.t === "o" ? "o" : "s",
    g: ["m", "w", "u"].includes(x.g) ? x.g : "",
    fam: clean(x.fam, 90),
    tags: Array.isArray(x.tags) ? [...new Set(x.tags.filter((t) => TAGS.includes(t)))] : [],
    y: /^\d{4}$/.test(String(x.y ?? "")) ? String(x.y) : "",
    c: clean(x.c, 40),
    pf: clean(x.pf, 70),
    d: cleanText(x.d, 800),
    p: "",
    ig: /^[A-Za-z0-9_-]{0,20}$/.test(String(x.ig ?? "")) ? String(x.ig ?? "") : "",
    dt: /^\d{4}-\d{2}-\d{2}$/.test(String(x.dt ?? "")) ? String(x.dt) : today(),
  };
  const p = typeof x.p === "string" ? x.p.trim() : "";
  if (p) {
    if (!/^[A-Za-z0-9._\/-]{1,180}$/.test(p) || p.includes("..") || p.includes("//")) throw new Error(`${where} (${id}): неверное имя файла фото`);
    it.p = p;
  }
  if (x.nt && typeof x.nt === "object") {
    const nt = { t: clean(x.nt.t, 260), h: clean(x.nt.h, 260), b: clean(x.nt.b, 260) };
    if (nt.t || nt.h || nt.b) it.nt = nt;
  }
  const na = clean(x.na, 320);
  if (na && !it.nt) it.na = na;
  if (x.pr && typeof x.pr === "object") {
    const pr = {};
    for (const k of ["3", "5", "10", "full"]) {
      const v = Math.round(Number(x.pr[k]));
      if (Number.isFinite(v) && v > 0) {
        if (v > 10_000_000) throw new Error(`${where} (${id}): слишком большая цена`);
        pr[k] = v;
      }
    }
    if (Object.keys(pr).length) it.pr = pr;
  }
  if (x.bl) it.bl = 1;
  if (x.sg) it.sg = 1;
  if (x.out) it.out = 1;
  if (x.hide) it.hide = 1;
  return it;
}
function sanitizeCatalog(items) {
  if (!Array.isArray(items)) throw new Error("Каталог должен быть списком");
  if (items.length > MAX_ITEMS) throw new Error(`Слишком много ароматов (максимум ${MAX_ITEMS})`);
  const seen = new Set();
  return items.map((x, i) => {
    const it = sanitizeItem(x, i);
    if (seen.has(it.id)) throw new Error(`Строка ${i + 1}: повторяется id «${it.id}»`);
    seen.add(it.id);
    return it;
  });
}
const newRev = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- публичные маршруты ---------- */
async function publicCatalog(req, asJs) {
  const rec = await catalogStore().get("items", { type: "json" });
  const headers = { "cache-control": "no-cache" };
  if (!rec) {
    return asJs
      ? new Response("/* живого каталога ещё нет: используется js/data.js */", { headers: { ...headers, "content-type": "application/javascript; charset=utf-8" } })
      : json({ items: null, rev: null }, 200, headers);
  }
  const etag = `W/"${rec.rev}"`;
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { ...headers, etag } });
  const items = rec.items.filter((x) => !x.hide);
  if (!asJs) return json({ items, rev: rec.rev }, 200, { ...headers, etag });
  return new Response(`window.CATALOG=${JSON.stringify(items)};window.CATALOG_REV=${JSON.stringify(rec.rev)};`, {
    headers: { ...headers, etag, "content-type": "application/javascript; charset=utf-8" },
  });
}
async function servePhoto(key) {
  if (!/^[a-f0-9]{16,64}\.(jpg|png|webp)$/.test(key)) return fail(404, "not_found", "Нет такого фото");
  const hit = await photoStore().getWithMetadata(key, { type: "arrayBuffer" });
  if (!hit) return fail(404, "not_found", "Нет такого фото");
  return new Response(hit.data, { headers: { "content-type": hit.metadata?.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
}

/* ---------- админ-маршруты ---------- */
async function readJson(req) {
  const text = await req.text();
  if (text.length > MAX_BODY) throw Object.assign(new Error("Слишком большой запрос"), { status: 413 });
  try { return JSON.parse(text || "{}"); } catch { throw Object.assign(new Error("Неверный формат данных"), { status: 400 }); }
}
function sniffImage(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return ["image/jpeg", "jpg"];
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return ["image/png", "png"];
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return ["image/webp", "webp"];
  return null;
}

async function admin(req, context, path, url) {
  const method = req.method;

  if (path === "/api/admin/login" && method === "POST") {
    if (!env("ADMIN_PASSWORD")) return fail(503, "not_configured", "Пароль админки не задан. Добавьте переменную ADMIN_PASSWORD в настройках Netlify и запустите деплой заново.");
    const key = await ipKey(ipOf(req, context));
    if (await isBlocked(key)) return fail(429, "too_many", "Слишком много неудачных попыток. Подождите 15 минут.");
    const body = await readJson(req);
    if (!(await passwordOk(String(body.password ?? "")))) {
      await noteFail(key);
      await new Promise((r) => setTimeout(r, 700));
      return fail(401, "bad_password", "Неверный пароль");
    }
    await adminStore().delete(key);
    return json({ ok: true }, 200, { "set-cookie": cookieHeader(await makeToken(), SESSION_SEC) });
  }
  if (path === "/api/admin/logout" && method === "POST") return json({ ok: true }, 200, { "set-cookie": cookieHeader("", 0) });

  /* всё остальное только после входа */
  if (!(await tokenOk(readCookie(req, COOKIE)))) return fail(401, "auth", "Нужно войти в админку");
  if (method !== "GET") {
    if (req.headers.get("x-ap-admin") !== "1") return fail(403, "csrf", "Запрос отклонён");
    const origin = req.headers.get("origin");
    if (origin && origin !== url.origin) return fail(403, "csrf", "Запрос отклонён");
  }

  if (path === "/api/admin/session" && method === "GET") return json({ ok: true });

  if (path === "/api/admin/catalog") {
    const st = catalogStore();
    if (method === "GET") {
      const rec = await st.get("items", { type: "json" });
      const prev = await st.get("prev", { type: "json" });
      return json({ items: rec ? rec.items : null, rev: rec ? rec.rev : null, hasPrev: !!prev });
    }
    if (method === "PUT") {
      const body = await readJson(req);
      let items;
      try { items = sanitizeCatalog(body.items); } catch (e) { return fail(400, "invalid", e.message); }
      const cur = await st.get("items", { type: "json" });
      if (cur && body.rev !== cur.rev) return fail(409, "conflict", "Каталог уже изменили в другом окне. Обновите страницу, чтобы не потерять чужие правки.");
      if (cur) await st.setJSON("prev", cur);
      const rev = newRev();
      await st.setJSON("items", { rev, items });
      return json({ ok: true, rev, count: items.length, items, hasPrev: !!cur });
    }
    if (method === "DELETE") {
      const cur = await st.get("items", { type: "json" });
      if (cur) await st.setJSON("prev", cur);
      await st.delete("items");
      return json({ ok: true, hasPrev: !!cur });
    }
  }

  if (path === "/api/admin/restore" && method === "POST") {
    const st = catalogStore();
    const prev = await st.get("prev", { type: "json" });
    if (!prev) return fail(404, "no_prev", "Предыдущего сохранения нет");
    const cur = await st.get("items", { type: "json" });
    if (cur) await st.setJSON("prev", cur); else await st.delete("prev");
    const rev = newRev();
    await st.setJSON("items", { rev, items: prev.items });
    return json({ ok: true, rev, items: prev.items, hasPrev: !!cur });
  }

  if (path === "/api/admin/photo" && method === "POST") {
    const buf = new Uint8Array(await req.arrayBuffer());
    if (!buf.length) return fail(400, "empty", "Файл пустой");
    if (buf.length > MAX_PHOTO) return fail(413, "too_big", "Фото слишком большое (максимум 4 МБ)");
    const kind = sniffImage(buf);
    if (!kind) return fail(415, "not_image", "Нужна картинка JPG, PNG или WebP");
    const hash = [...new Uint8Array(await subtle.digest("SHA-256", buf))].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
    const key = `${hash}.${kind[1]}`;
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    await photoStore().set(key, ab, { metadata: { type: kind[0] } });
    return json({ ok: true, path: `/api/photo/${key}` });
  }

  return fail(404, "not_found", "Нет такого маршрута");
}

/* ---------- вход ---------- */
export default async (req, context) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  try {
    if (req.method === "GET" && path === "/api/catalog.js") return await publicCatalog(req, true);
    if (req.method === "GET" && path === "/api/catalog") return await publicCatalog(req, false);
    if (req.method === "GET" && path.startsWith("/api/photo/")) return await servePhoto(decodeURIComponent(path.slice("/api/photo/".length)));
    if (path.startsWith("/api/admin/")) return await admin(req, context, path, url);
    return fail(404, "not_found", "Нет такого маршрута");
  } catch (e) {
    console.error("api error:", e);
    if (e && e.status) return fail(e.status, "request", e.message);
    return fail(500, "server", "Ошибка сервера. Попробуйте ещё раз.");
  }
};

export const config = { path: "/api/*" };
