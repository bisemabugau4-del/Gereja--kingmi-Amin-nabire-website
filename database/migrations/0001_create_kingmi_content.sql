create table if not exists site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null,
  short_name text,
  tagline text,
  description text,
  logo text,
  hero_text text,
  total_jemaat integer default 0,
  jemaat_hidup integer default 0,
  jemaat_meninggal integer default 0,
  address text,
  phone text,
  email text,
  instagram text,
  facebook text,
  updated_at timestamptz default now()
);

create table if not exists announcements (
  id bigserial primary key,
  title text not null,
  date_text text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists schedule (
  id bigserial primary key,
  service text not null,
  day text not null,
  time_text text not null,
  place text,
  sort_order integer default 0
);

create table if not exists articles (
  id bigserial primary key,
  title text not null,
  date_text text not null,
  image text,
  excerpt text,
  body text,
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into site_settings (id, site_name, short_name, tagline, description, logo, hero_text, total_jemaat, jemaat_hidup, jemaat_meninggal, address, phone, email, instagram, facebook)
values (1, 'Gereja Kemah Injil (KINGMI) AMIN Bumi Wonorejo Nabire, Papua Tengah', 'KINGMI AMIN Bumi Wonorejo', 'Bertumbuh dalam iman, melayani dalam kasih.', 'Website resmi Gereja Kemah Injil (KINGMI) AMIN Bumi Wonorejo Nabire, Papua Tengah.', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRQOaUDh23sjg5HfBLMAFbdHChjgGvgNhHvx-r3sIc&s=0', 'Menjadi keluarga Allah yang bertumbuh dalam iman, berakar dalam kasih, dan hadir membawa terang bagi Nabire serta Papua Tengah.', 1248, 1220, 28, 'Jl. [Nama Jalan] No. [Nomor], Bumi Wonorejo, Nabire, Papua Tengah', '+62 8XX-XXXX-XXXX', 'sekretariat@kingmi-amin.org', '@kingmiamin', 'KINGMI AMIN Bumi Wonorejo')
on conflict (id) do nothing;

insert into announcements (title, date_text, sort_order)
select * from (values
  ('Ibadah Syukur Bulanan', 'Sabtu, 26 Oktober 2026 · Pukul 17.00 WIT', 1),
  ('Rapat Majelis Jemaat', 'Senin, 28 Oktober 2026 · Ruang Konsistori', 2),
  ('Persekutuan Doa Rayon', 'Setiap Rabu · Pukul 18.30 WIT', 3)
) as seed(title, date_text, sort_order)
where not exists (select 1 from announcements);

insert into schedule (service, day, time_text, place, sort_order)
select * from (values
  ('Ibadah Jemaat Umum', 'Minggu', '09.00–11.00 WIT', 'Gedung Gereja Utama', 1),
  ('Sekolah Minggu', 'Minggu', '08.00–09.00 WIT', 'Kelas Anak & Remaja', 2),
  ('Pemuda/Pemudi', 'Sabtu', '17.00–19.00 WIT', 'Ruang Serbaguna', 3),
  ('Ibadah Rayon', 'Rabu', '18.30–20.00 WIT', 'Rumah Rayon masing-masing', 4)
) as seed(service, day, time_text, place, sort_order)
where not exists (select 1 from schedule);

insert into articles (title, date_text, image, excerpt, body, published)
select * from (values
  ('Ibadah Raya dan Perjamuan Kudus', '18 Oktober 2026', '', 'Jemaat berkumpul dalam sukacita untuk memperingati kasih dan pengorbanan Kristus.', 'Jemaat berkumpul dalam sukacita untuk memperingati kasih dan pengorbanan Kristus.', true),
  ('Pelayanan Diakonia Bagi Keluarga', '12 Oktober 2026', '', 'Tim diakonia mengunjungi dan menguatkan keluarga jemaat di beberapa rayon pelayanan.', 'Tim diakonia mengunjungi dan menguatkan keluarga jemaat di beberapa rayon pelayanan.', true),
  ('Seminar Pemuda: Bertumbuh Bersama', '05 Oktober 2026', '', 'Pemuda-pemudi KINGMI AMIN Bumi Wonorejo membangun karakter dan talenta untuk melayani Tuhan.', 'Pemuda-pemudi KINGMI AMIN Bumi Wonorejo membangun karakter dan talenta untuk melayani Tuhan.', true)
) as seed(title, date_text, image, excerpt, body, published)
where not exists (select 1 from articles);
