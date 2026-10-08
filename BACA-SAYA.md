# Surat Batak: panduan memasang dan menulis artikel

Situs ini terdiri dari aplikasi Surat Batak, bagian **Artikel** (blog), halaman **admin** untuk menulis, dan fungsi **Statistik**. Karena ada langkah build dan fungsi server, situs dipasang lewat **GitHub + Netlify**, bukan seret-lepas di Netlify Drop.

## Isi folder

| Berkas | Fungsi |
|---|---|
| public/ | Aplikasi: index.html, data kitab, font, ikon, service worker, gaya artikel |
| public/admin/ | Halaman admin untuk menulis artikel dan mengubah profil |
| content/artikel/ | Artikel (satu berkas .md per artikel). Diisi otomatis oleh halaman admin |
| content/profil.json | Profil penulis. Diisi lewat halaman admin |
| scripts/build.mjs | Membuat halaman artikel, RSS, sitemap saat Netlify membangun situs |
| lib/batak.cjs | Mesin alih aksara (dipakai build dan admin) |
| netlify/ | Fungsi Statistik |

## Langkah 1: Unggah ke GitHub

1. Daftar atau masuk di github.com, lalu buat repositori baru bernama `surat-batak` (boleh Private).
2. Pilih **Add file → Upload files**, seret **seluruh isi** folder ini (kecuali folder `node_modules` bila ada), lalu klik **Commit changes**.

## Langkah 2: Sambungkan ke Netlify

1. Di app.netlify.com pilih **Add new site → Import an existing project → GitHub**, lalu pilih repositori `surat-batak`.
2. Pengaturan build sudah diatur oleh `netlify.toml`. Klik **Deploy**.
3. Ganti nama situs di **Site configuration → Change site name**, misalnya `suratbatak` sehingga alamatnya `https://suratbatak.netlify.app`.

## Langkah 3: Siapkan halaman admin

1. Buka `public/admin/config.yml` di GitHub (klik berkasnya, lalu ikon pensil), ganti baris
   `repo:`. Sudah diisi `rajaguntar05-art/Surat_Batak`; ubah hanya bila nama repositori Anda berbeda.
2. Buat aplikasi OAuth GitHub: buka github.com → **Settings → Developer settings → OAuth Apps → New OAuth App**, lalu isi:
   - Application name: `Admin Surat Batak`
   - Homepage URL: alamat situs Anda, misalnya `https://suratbatak.netlify.app`
   - Authorization callback URL: `https://api.netlify.com/auth/done`

   Klik **Register application**, lalu **Generate a new client secret**. Catat *Client ID* dan *Client secret*.
3. Di Netlify, buka pengaturan situs, cari bagian **OAuth** (di **Access & security**), pilih **Install provider → GitHub**, lalu tempel Client ID dan Client secret tadi.
4. Buka `https://alamat-situs-anda/admin/` dan klik **Login with GitHub**.

## Menulis artikel

1. Buka `/admin/`, pilih **Artikel → New Artikel**.
2. Isi judul, tanggal, kategori, ringkasan, gambar utama (boleh dikosongkan), lalu tulis isinya.
3. Untuk menyisipkan kalimat beraksara Batak, klik tombol **+** di editor dan pilih **Aksara Batak**, lalu tulis kalimatnya dalam huruf Latin. Di situs, kalimat itu tampil besar dalam aksara Batak dengan huruf Latin di bawahnya.
   Bisa juga diketik langsung di tengah kalimat: `{{aksara: horas}}`.
4. Klik **Publish**. Sekitar satu menit kemudian artikel tayang di `/artikel/`, muncul di tab Artikel aplikasi, di RSS, dan di sitemap.
5. Centang **Simpan sebagai draf** bila artikel belum ingin ditayangkan.

Artikel contoh "Selamat datang di Surat Batak" boleh diubah atau dihapus lewat admin.

## Profil penulis

Buka `/admin/` → **Profil penulis**. Isi nama, peran, foto, biografi (pisahkan paragraf dengan baris kosong), dan tautan media sosial. Profil tampil di tab Profil aplikasi dan di bawah setiap artikel.

## Domain sendiri (pilihan)

Bila membeli domain, misalnya `suratbatak.id`, pasang di Netlify lewat **Domain management → Add a domain**. Setelah itu ubah juga *Homepage URL* di aplikasi OAuth GitHub ke alamat baru.

## Statistik

Yang dicatat hanya angka: kunjungan per hari dan per jam (WIB), pengunjung per hari, perangkat baru, dan bagian yang dibuka (termasuk Artikel). Tidak ada alamat IP atau data pribadi yang disimpan. Data ada di Netlify Blobs, toko bernama `statistik`.

## Memperbarui aplikasi

Setiap kali `public/index.html` diubah, naikkan nomor `VERSION` di `public/sw.js` (misalnya `surat-batak-v8`) supaya perangkat pengunjung mengambil versi baru. Artikel dan profil tidak perlu langkah ini.
