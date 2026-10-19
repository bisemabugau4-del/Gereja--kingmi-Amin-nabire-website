# Website KINGMI AMIN Bumi Wonorejo Nabire

Website resmi Gereja Kemah Injil (KINGMI) AMIN Bumi Wonorejo Nabire, Papua Tengah.

## Deployment

Proyek ini menggunakan Cloudflare Pages Functions:

- Frontend: `index.html`
- API serverless: `functions/api/[[path]].js`
- Database migration: `database/migrations/0001_create_kingmi_content.sql`
- Panduan: `CLOUDFLARE-PAGES-SETUP.md`

Set environment variables di Cloudflare Pages sebelum deployment. Jangan commit nilai secret ke repository.
