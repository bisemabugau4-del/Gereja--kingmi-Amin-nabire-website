import { neon } from '@neondatabase/serverless';
import crypto from 'node:crypto';

let sql;
let runtimeEnv = {};
function connectionInfo() {
  const value = String(runtimeEnv.DATABASE_URL || '').trim();
  return value ? { value, source: 'DATABASE_URL' } : { value: '', source: null };
}
function db() {
  if (!sql) {
    const connection = connectionInfo();
    if (!connection.value) throw new Error('DATABASE_URL belum tersedia di Cloudflare Pages Environment Variables.');
    sql = neon(connection.value);
  }
  return sql;
}

const json = (body, statusCode = 200, headers = {}) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  body: JSON.stringify(body)
});

function pathOf(event) {
  try { return new URL(event.rawUrl || `https://local${event.path || ''}`).pathname; }
  catch { return event.path || '/api'; }
}

function bodyOf(event) {
  try { return event.body ? JSON.parse(event.body) : {}; }
  catch { throw new Error('Body JSON tidak valid.'); }
}

function cookieMap(event) {
  return Object.fromEntries((event.headers?.cookie || '').split(';').map(x => x.trim().split('=').map(decodeURIComponent)).filter(x => x.length === 2));
}

function secret() { return (runtimeEnv.SESSION_SECRET || runtimeEnv.SESSION_SECRET || '').trim(); }
function sign(value) { return crypto.createHmac('sha256', secret()).update(value).digest('base64url'); }
function token(email) {
  const value = Buffer.from(JSON.stringify({ email, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString('base64url');
  return `${value}.${sign(value)}`;
}
function currentUser(event) {
  const raw = cookieMap(event).kingmi_session;
  if (!raw || !secret()) return null;
  const [value, signature] = raw.split('.');
  const expected = value ? sign(value) : '';
  if (!value || !signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const user = JSON.parse(Buffer.from(value, 'base64url').toString());
    return user.exp > Date.now() ? user : null;
  } catch { return null; }
}
function cookie(value, maxAge = 28800) { return `kingmi_session=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`; }
function requireUser(event) { const user = currentUser(event); if (!user) throw Object.assign(new Error('Sesi admin tidak ditemukan atau sudah berakhir.'), { statusCode: 401 }); return user; }
function adminCredentials() { return { email: (runtimeEnv.ADMIN_EMAIL || 'admin@kingmi.local').trim(), password: runtimeEnv.ADMIN_PASSWORD || '' }; }

async function data() {
  const [settings, announcements, schedule, articles] = await Promise.all([
    db()`select * from site_settings where id = 1`,
    db()`select * from announcements order by sort_order, id`,
    db()`select * from schedule order by sort_order, id`,
    db()`select * from articles order by created_at desc, id desc`
  ]);
  return { settings: settings[0] || null, announcements, schedule, articles };
}


let devotionCache = { expires: 0, value: null };
const devotionFallback = {
  title: 'Berjalan dalam Kasih Tuhan',
  verse: '“Kita mengasihi, karena Allah lebih dahulu mengasihi kita.” — 1 Yohanes 4:19',
  text: 'Kasih Tuhan tidak pernah bergantung pada keadaan kita. Ketika hari terasa berat, kita tetap memiliki alasan untuk berharap karena Allah lebih dahulu mengasihi dan memelihara kita. Kasih itu bukan hanya kata-kata, melainkan kekuatan yang menolong kita mengampuni, menguatkan keluarga, dan melayani sesama dengan tulus. Di tengah kesibukan dan tantangan hidup, mari menyediakan waktu untuk datang kepada Tuhan dalam doa. Mintalah hati yang peka melihat kebutuhan orang lain dan keberanian untuk menjadi berkat. Sebagai jemaat, kita dipanggil untuk berjalan bersama, saling menopang, dan menunjukkan bahwa terang Kristus masih hadir di tengah dunia. Hari ini, lakukan satu tindakan kasih yang sederhana: dengarkan seseorang, doakan keluarga, atau bantu mereka yang membutuhkan. Kiranya damai Kristus memenuhi hati dan rumah kita.',
  prayer: 'Tuhan Yesus, ajar kami menerima kasih-Mu dan membagikannya kepada sesama. Beri kami hati yang lembut, iman yang teguh, dan kekuatan untuk melayani dengan sukacita. Amin.',
  verses: [
    { reference: 'Yohanes 3:16', text: 'Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal.' },
    { reference: 'Mazmur 23:1', text: 'TUHAN adalah gembalaku, takkan kekurangan aku.' },
    { reference: 'Filipi 4:13', text: 'Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku.' }
  ],
  image: null,
  imageAlt: 'Ilustrasi suasana doa dan pengharapan',
  imageLink: null,
  photographer: null,
  source: 'fallback'
};

function extractGeminiText(payload) {
  return payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim() || '';
}

async function generateDevotion() {
  if (devotionCache.value && devotionCache.expires > Date.now()) return devotionCache.value;
  const geminiKey = (runtimeEnv.GEMINI_API_KEY || '').trim();
  const unsplashKey = (runtimeEnv.UNSPLASH_ACCESS_KEY || '').trim();
  let content = { ...devotionFallback, source: geminiKey ? 'gemini' : 'fallback' };

  if (geminiKey) {
    const prompt = `Buat konten renungan Kristen harian dalam Bahasa Indonesia untuk jemaat gereja di Nabire, Papua Tengah. Renungan harus hangat, mudah dipahami, tidak menghakimi, dan panjang teks renungan 150-200 kata. Pilih satu ayat tema dan tiga ayat Alkitab populer. Buat juga doa singkat 40-70 kata. Kembalikan HANYA JSON valid tanpa markdown dengan format: {"title":"...","verse":"...","text":"...","prayer":"...","verses":[{"reference":"...","text":"..."},{"reference":"...","text":"..."},{"reference":"...","text":"..."}],"imageQuery":"2-4 kata bahasa Inggris untuk foto ilustrasi yang tenang"}. Jangan membuat klaim sensitif atau kontroversial.`;
    try {
      const model = (runtimeEnv.GEMINI_MODEL || 'gemini-2.5-flash').trim();
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.75, responseMimeType: 'application/json' } },)
      });
      if (response.ok) {
        const parsed = JSON.parse(extractGeminiText(await response.json()));
        if (parsed?.text && Array.isArray(parsed.verses)) content = { ...content, ...parsed, verses: parsed.verses.slice(0, 3), source: 'gemini' };
      }
    } catch (_) { /* fallback tetap ditampilkan agar beranda tidak kosong */ }
  }

  if (unsplashKey) {
    try {
      const query = encodeURIComponent(content.imageQuery || 'bible prayer sunrise');
      const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape&content_filter=high`, { headers: { Authorization: `Client-ID ${unsplashKey}` } });
      const payload = await response.json();
      const photo = payload?.results?.[0];
      if (photo?.urls?.regular) { content.image = photo.urls.regular; content.imageAlt = photo.alt_description || content.title; content.imageLink = photo.links?.html || null; content.photographer = photo.user?.name || null; }
    } catch (_) { /* gambar opsional */ }
  }

  delete content.imageQuery;
  devotionCache = { expires: Date.now() + 15 * 60 * 1000, value: content };
  return content;
}

async function handler(event) {
  const path = pathOf(event).replace(/^\/api/, '/api').replace(/\/$/, '') || '/api';
  const method = event.httpMethod || 'GET';

  if (path === '/api/health' && method === 'GET') {
    try { const connection = connectionInfo(); await db()`select 1`; return json({ ok: true, database: true, connection: connection.source }); }
    catch (error) { return json({ ok: false, database: false, error: error.message, hint: 'Cloudflare Pages harus memiliki DATABASE_URL pada Settings > Variables and Secrets dan deploy ulang.' }, 503); }
  }

  if (path === '/api/devotion' && method === 'GET') {
    try { return json(await generateDevotion(), 200, { 'Cache-Control': 'public, max-age=300' }); }
    catch (error) { return json({ ...devotionFallback, error: error.message }, 200); }
  }

  if (path === '/api/auth/login' && method === 'POST') {
    try {
      const input = bodyOf(event);
      const expected = adminCredentials();
      if (!expected.password) return json({ error: 'ADMIN_PASSWORD belum disetel di Cloudflare Pages Variables and Secrets.' }, 503);
      if (!secret()) return json({ error: 'SESSION_SECRET belum disetel di Cloudflare Pages Variables and Secrets.' }, 503);
      if ((input.email || '').trim() !== expected.email || input.password !== expected.password) return json({ error: 'Email atau password admin salah.' }, 401);
      return json({ ok: true, user: { email: expected.email } }, 200, { 'Set-Cookie': cookie(token(expected.email)) });
    } catch (error) { return json({ error: error.message }, 400); }
  }

  if (path === '/api/auth/logout' && method === 'POST') return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
  if (path === '/api/auth/me' && method === 'GET') { const user = currentUser(event); return json({ authenticated: !!user, user }); }

  try {
    if (path === '/api/data' && method === 'GET') return json(await data());
    requireUser(event);

    if (path === '/api/settings' && method === 'PUT') {
      const input = bodyOf(event);
      const rows = await db()`update site_settings set total_jemaat=${Number(input.total_jemaat) || 0}, jemaat_hidup=${Number(input.jemaat_hidup) || 0}, jemaat_meninggal=${Number(input.jemaat_meninggal) || 0}, updated_at=now() where id=1 returning *`;
      return json(rows[0]);
    }

    if (path === '/api/schedule' && method === 'PUT') {
      const input = bodyOf(event);
      const items = Array.isArray(input.items) ? input.items : [];
      const sqlDb = db();
      await sqlDb`delete from schedule`;
      for (const [i, item] of items.filter(x => x.service).entries()) await sqlDb`insert into schedule (service, day, time_text, place, sort_order) values (${String(item.service).trim()}, ${String(item.day || '').trim()}, ${String(item.time_text || '').trim()}, ${String(item.place || '').trim()}, ${i})`;
      return json({ ok: true });
    }

    if (path === '/api/articles' && method === 'POST') {
      const input = bodyOf(event);
      const rows = await db()`insert into articles (title, date_text, image, excerpt, body, published) values (${input.title || ''}, ${input.date_text || ''}, ${input.image || ''}, ${input.excerpt || ''}, ${input.body || ''}, ${input.published !== false}) returning *`;
      return json(rows[0], 201);
    }

    const articleMatch = path.match(/^\/api\/articles\/(\d+)$/);
    if (articleMatch && (method === 'PUT' || method === 'DELETE')) {
      const id = Number(articleMatch[1]);
      if (method === 'DELETE') { await db()`delete from articles where id=${id}`; return json({ ok: true }); }
      const input = bodyOf(event);
      const rows = await db()`update articles set title=${input.title || ''}, date_text=${input.date_text || ''}, image=${input.image || ''}, excerpt=${input.excerpt || ''}, body=${input.body || ''}, updated_at=now() where id=${id} returning *`;
      return json(rows[0] || null);
    }

    return json({ error: 'Endpoint tidak ditemukan.' }, 404);
  } catch (error) { return json({ error: error.message || 'Server error.' }, error.statusCode || 500); }
}

export async function onRequest(context) {
  runtimeEnv = context.env || {};
  sql = null;
  const request = context.request;
  const url = new URL(request.url);
  const body = request.method === 'GET' || request.method === 'HEAD' ? null : await request.text();
  const event = {
    rawUrl: request.url,
    path: url.pathname,
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body
  };
  const result = await handler(event);
  return new Response(result.body, { status: result.statusCode, headers: result.headers });
}
