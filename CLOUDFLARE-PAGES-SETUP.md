# Setup Website KINGMI di Cloudflare Pages

Versi ini sudah dimigrasikan dari Netlify ke **Cloudflare Pages Functions**.

## Struktur backend

```text
functions/api/[[path]].js
```

File tersebut menangani endpoint:

```text
/api/health
/api/auth/login
/api/auth/logout
/api/auth/me
/api/data
/api/settings
/api/schedule
/api/articles
/api/devotion
```

Browser tidak membaca credential database. Semua koneksi dilakukan server-side oleh Cloudflare Pages Function.

## Database

Function membaca satu Environment Variable Cloudflare dengan nama:

```text
DATABASE_URL
```

Gunakan connection string PostgreSQL yang dapat diakses melalui driver HTTP serverless, misalnya database PostgreSQL/Neon. Versi ini tidak memakai Netlify Database, `NETLIFY_DATABASE_URL`, atau `@netlify/database`.

Pada Cloudflare Dashboard:

1. Buka **Workers & Pages**.
2. Pilih project Pages.
3. Buka **Settings → Variables and Secrets**.
4. Tambahkan `DATABASE_URL` pada Environment variables untuk **Production** dan **Preview** jika diperlukan.
5. Tandai sebagai encrypted/secret.
6. Lakukan deployment baru.

Migration SQL tersedia di:

```text
database/migrations/0001_create_kingmi_content.sql
```

Jalankan migration tersebut satu kali pada database PostgreSQL Anda melalui SQL Editor/provider database. Cloudflare Pages tidak otomatis menjalankan file migration hanya karena file tersebut ada di ZIP.

## Environment Variables lain

Tambahkan juga sebagai secret pada Cloudflare Pages:

```text
ADMIN_EMAIL=admin@email-anda.com
ADMIN_PASSWORD=password-kuat
SESSION_SECRET=random-string-minimal-32-karakter
GEMINI_API_KEY=API-key-Gemini-Anda
UNSPLASH_ACCESS_KEY=Access-Key-Unsplash-Anda
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_MODEL` opsional. Jangan menaruh nilai secret di `index.html`, `admin.js`, atau file publik lainnya.

## Deploy

1. Unggah isi ZIP ke repository Git atau gunakan **Direct Upload** Cloudflare Pages.
2. Build command dapat dikosongkan karena website berupa HTML/CSS/JavaScript tanpa build step.
3. Set **Build output directory** ke root project (`/`).
4. Pastikan folder `functions/` ikut berada di root project, sejajar dengan `index.html`.
5. Pastikan file `netlify.toml` tidak digunakan; file tersebut sudah dihapus dari paket ini.
6. Deploy ulang setelah semua Variables and Secrets disimpan.

## Pengujian

Health check:

```text
https://domain-pages-anda.pages.dev/api/health
```

Jika berhasil:

```json
{
  "ok": true,
  "database": true,
  "connection": "DATABASE_URL"
}
```

Login admin:

```text
https://domain-pages-anda.pages.dev/admin.html
```

## Catatan Cloudflare

Cloudflare Pages Functions tidak dapat memakai `process.env` seperti server Node biasa. Karena itu Function membaca secret dari `context.env`, dan file `functions/api/[[path]].js` mengadaptasi request Cloudflare ke seluruh endpoint aplikasi.
