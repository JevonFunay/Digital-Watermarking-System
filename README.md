# Digital Watermarking System

Sebuah sistem aplikasi web berbasis Python untuk menyisipkan identitas visual (logo hak cipta atau watermark) ke dalam citra utama guna keperluan perlindungan hak cipta gambar digital. Aplikasi ini memproses gambar menggunakan manipulasi matriks nilai piksel melalui metode Pemrosesan Citra Digital (PCD) menggunakan OpenCV dan NumPy.

## Fitur Utama
1. Visual Editor Drag and Drop: Memungkinkan pengguna mengatur posisi logo watermark secara visual dan leluasa langsung di atas gambar utama.
2. Soft Alpha Blending: Menghasilkan perpaduan logo transparan yang halus tanpa pinggiran kasar (anti-aliasing) menggunakan operasi matematika presisi desimal.
3. Live Preview Settings: Pengaturan skala ukuran, sudut rotasi, dan tingkat transparansi (alpha/beta) yang dapat dipantau secara langsung sebelum pemrosesan final.

## Persyaratan Sistem
Pastikan Anda telah menginstal Python 3.x di komputer Anda.

## Cara Instalasi
1. Clone repositori ini ke dalam komputer Anda:
   git clone [URL_GITHUB_ANDA]
2. Masuk ke dalam direktori proyek:
   cd copyright
3. Instal semua dependensi pustaka yang dibutuhkan menggunakan pip:
   pip install -r requirements.txt

## Cara Menjalankan Aplikasi
1. Buka terminal atau command prompt pada folder proyek.
2. Jalankan perintah berikut untuk memulai server lokal:
   python app.py
3. Buka web browser Anda dan akses alamat berikut:
   http://127.0.0.1:5000/

## Cara Pengoperasian
1. Pada antarmuka web, klik kotak "Upload Main Image" untuk mengunggah gambar utama yang ingin diberi watermark.
2. Klik kotak "Upload Logo Watermark" untuk mengunggah gambar logo (disarankan menggunakan format PNG dengan latar belakang transparan).
3. Setelah kedua gambar diunggah, Visual Editor akan muncul di sebelah kanan layar.
4. Tahan dan geser (drag and drop) logo pada Visual Editor untuk menentukan koordinat posisi penempatan watermark.
5. Gunakan slider Blending Settings untuk menyesuaikan tingkat transparansi gambar, skala ukuran logo, dan rotasi.
6. Klik tombol "Process Watermark".
7. Sistem akan memproses gambar dan menampilkannya di bagian bawah halaman. Anda dapat mengklik tombol "Download Image" untuk menyimpan hasil akhirnya.
