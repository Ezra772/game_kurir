# Tiny Courier Planet

Game browser 3D sederhana berbasis Three.js. Pemain mengendalikan kurir kecil yang berjalan di planet low-poly untuk mengambil dan mengantar surat antar NPC.

## Status Saat Ini

Project sudah sampai Tahap 6:

- Gameplay loop 5 quest pengantaran berantai.
- Skor, timer, total quest selesai, pause/resume, restart, dan completion screen.
- Visual low-poly dengan planet berwarna, dekorasi, NPC, marker target, partikel, dan UI casual modern.
- Kontrol desktop dan mobile.
- Audio manager dengan BGM/SFX opsional, mute/unmute, volume, dan fallback aman jika file audio belum tersedia.

## Quick Start

Pastikan Node.js sudah terpasang, lalu jalankan:

```bash
npm install
npm run dev
```

Buka URL lokal yang ditampilkan Vite, biasanya:

```text
http://127.0.0.1:5173/
```

Build produksi:

```bash
npm run build
```

Hasil build akan dibuat di folder `dist`.

## Cara Bermain

1. Ikuti marker kuning ke NPC pengirim.
2. Dekati NPC pengirim, lalu tekan tombol interaksi untuk mengambil surat.
3. Marker berpindah ke NPC penerima.
4. Dekati NPC penerima, lalu tekan tombol interaksi untuk menyelesaikan quest.
5. Selesaikan semua 5 quest untuk membuka layar selesai.
6. Gunakan `Restart Game` untuk mulai dari awal.

## Kontrol Desktop

- `W`: maju
- `S`: mundur
- `A`: bergerak ke kiri
- `D`: bergerak ke kanan
- `E`: interaksi dengan NPC target
- `P` atau `Esc`: pause/resume
- Tombol `Fullscreen`: masuk/keluar fullscreen
- Tombol `Sound On/Off`: mute/unmute
- Slider `Vol`: volume master

## Kontrol Mobile

- Virtual joystick kiri bawah: gerakan karakter.
- Tombol `Aksi` kanan bawah: interaksi dengan NPC target.
- Tombol `Pause`, `Fullscreen`, `Sound On/Off`, dan `Vol` tersedia di bagian atas.
- UI otomatis dipadatkan di layar kecil agar area bermain tetap terlihat.

## Fitur Utama

- Planet bola low-poly dengan warna permukaan bervariasi.
- Dekorasi planet: pohon, batu, semak, rumah kecil, jalan melingkar, dan rute visual.
- Karakter kurir dengan animasi berjalan, idle breathing, bobbing, lean, dan shadow kecil.
- 5 NPC dengan label dan dialog.
- 5 quest pengantaran berantai.
- Marker target yang berpindah dari NPC pengirim ke NPC penerima.
- Skor `+100` setiap quest selesai.
- Timer permainan yang berhenti saat pause.
- Dialog NPC berbasis UI, bukan alert browser.
- Efek quest complete: flash, partikel, marker pulse, score pop, dan SFX.
- Game complete screen berisi total skor, total waktu, dan tombol restart.
- Fullscreen support.
- Kontrol keyboard dan touch.
- Optimasi ringan untuk layar kecil/touch.

## Sistem Audio

Audio dikelola di `src/audio.js`. Sistem ini mendukung:

- Background music.
- Sound effect untuk interaksi, pickup, quest complete, game complete, UI button, pause/resume, fullscreen, restart, dan langkah kaki.
- Mute/unmute global.
- Volume master.
- Penyimpanan preferensi audio di `localStorage`.
- Fallback Web Audio sintetis jika file audio belum ada atau gagal dimuat.

File audio opsional bisa ditambahkan ke:

```text
public/audio/bgm.mp3
public/audio/interact.mp3
public/audio/pickup.mp3
public/audio/quest-complete.mp3
public/audio/game-complete.mp3
public/audio/ui.mp3
public/audio/walk.mp3
```

Gunakan file pendek dan ringan untuk SFX. Untuk BGM, gunakan loop kecil agar ukuran project tetap ramah browser.

## Struktur Kode

- `src/main.js`: entry point, game loop, input, kamera, quest orchestration, pause/fullscreen.
- `src/player.js`: pembuatan karakter, movement, reset, dan animasi.
- `src/world.js`: scene, planet, NPC, dekorasi, marker, lighting, dan efek visual.
- `src/quest.js`: data NPC, daftar quest, skor, timer state, pause-aware timer, dan progression.
- `src/ui.js`: update HUD, dialog, completion screen, restart, pause, fullscreen, audio controls, touch controls.
- `src/audio.js`: audio manager untuk BGM, SFX, mute, volume, localStorage, dan fallback aman.
- `src/utils.js`: helper umum seperti orientasi permukaan planet dan format waktu.
- `public/audio/`: folder untuk file audio opsional.

## Catatan Optimasi

- Game memakai primitive low-poly dan tidak memakai asset eksternal berat.
- Geometry dan material digunakan ulang untuk dekorasi.
- Efek partikel memakai pool sederhana.
- Pixel ratio renderer dibatasi pada layar kecil.
- Dekorasi, bintang, awan, dan partikel dikurangi otomatis pada perangkat kecil/touch.
- Missing audio file tidak membuat game crash.

## Checklist Testing Manual

Desktop:

- Jalankan `npm run dev`.
- Pastikan game tampil di browser.
- Gerakkan karakter dengan `W A S D`.
- Dekati NPC target dan tekan `E`.
- Pastikan skor bertambah setelah quest selesai.
- Pastikan marker berpindah ke target berikutnya.
- Test `Pause`, `Resume`, `Fullscreen`, `Sound On/Off`, dan slider `Vol`.
- Selesaikan 5 quest dan pastikan completion screen muncul.
- Tekan `Restart Game` dan pastikan quest, skor, timer, dan status surat kembali awal.

Mobile/responsive:

- Kecilkan ukuran browser atau buka dari HP di jaringan lokal.
- Pastikan joystick dan tombol `Aksi` muncul.
- Gerakkan karakter dengan joystick.
- Tekan `Aksi` saat dekat NPC target.
- Pastikan HUD tidak menutup area bermain secara berlebihan.

## Rencana Tahap 7

- Deploy build produksi ke hosting statis.
- Dokumentasi final fitur, kontrol, struktur kode, dan cara menambah asset.
- Tambah screenshot/GIF gameplay untuk README.
- Tambah checklist QA browser desktop dan mobile.
- Rapikan metadata project dan instruksi kontribusi sederhana.
