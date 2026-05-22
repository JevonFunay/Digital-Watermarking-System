import cv2
import numpy as np
import os

class Watermarker:
    def __init__(self, main_image_path, logo_path, output_path="output.jpg"):
        self.main_image_path = main_image_path
        self.logo_path = logo_path
        self.output_path = output_path
        self.supported_extensions = ['.jpg', '.jpeg', '.png']

    def validate_files(self):
        """
        Skenario Penanganan Error: File Tidak Ditemukan & Format File Tidak Valid
        """
        for path, name in [(self.main_image_path, "Citra Utama"), (self.logo_path, "Logo")]:
            if not os.path.exists(path):
                raise FileNotFoundError(f"[{name}] File tidak ditemukan: '{path}'. Pastikan nama dan lokasi file benar.")
            
            ext = os.path.splitext(path)[1].lower()
            if ext not in self.supported_extensions:
                raise ValueError(f"[{name}] Format file '{ext}' tidak valid. Gunakan format: {', '.join(self.supported_extensions)}. Dokumen teks (.txt atau .pdf) akan ditolak sebelum proses matriks dimulai.")

    def resize_logo(self, main_img, logo_img, scale_percent=15):
        """
        Tahap 1: Image Resizing & Normalization
        Logika PCD: Mendeteksi dimensi citra utama dan otomatis menyusutkan matriks citra watermark 
        (downscaling) agar memori tidak jebol jika resolusi logo jauh lebih besar.
        """
        h_main, w_main = main_img.shape[:2]
        h_logo, w_logo = logo_img.shape[:2]

        # Calculate target width based on percentage of main image width
        target_w = int(w_main * (scale_percent / 100))
        
        # Calculate aspect ratio to maintain logo proportions
        aspect_ratio = h_logo / w_logo
        target_h = int(target_w * aspect_ratio)

        # Perform resizing (automatically handles downscaling to fit proportion)
        resized_logo = cv2.resize(logo_img, (target_w, target_h), interpolation=cv2.INTER_AREA)
        
        return resized_logo

    def rotate_logo(self, image, angle):
        if angle == 0:
            return image
            
        (h, w) = image.shape[:2]
        (cX, cY) = (w // 2, h // 2)

        # Matriks rotasi
        M = cv2.getRotationMatrix2D((cX, cY), -angle, 1.0)
        
        # Kalkulasi bounding box baru agar ujung gambar tidak terpotong saat diputar
        cos = np.abs(M[0, 0])
        sin = np.abs(M[0, 1])

        nW = int((h * sin) + (w * cos))
        nH = int((h * cos) + (w * sin))

        # Menyesuaikan titik tengah rotasi ke dimensi baru
        M[0, 2] += (nW / 2) - cX
        M[1, 2] += (nH / 2) - cY

        # Lakukan rotasi dengan background border putih atau transparan
        if len(image.shape) == 3 and image.shape[2] == 4:
            border_val = (0, 0, 0, 0) # Gunakan transparent black agar tidak terjadi white bleeding di pinggiran
        else:
            border_val = (255, 255, 255)

        rotated = cv2.warpAffine(image, M, (nW, nH), borderValue=border_val)
        return rotated

    def apply_watermark(self, alpha=0.7, beta=0.3, pos_x_percent=1.0, pos_y_percent=1.0, scale_percent=15, angle=0):
        # 1. Validation to handle error scenarios early
        self.validate_files()

        # Load images with IMREAD_UNCHANGED to preserve Alpha channel (transparency)
        main_img = cv2.imread(self.main_image_path, cv2.IMREAD_UNCHANGED)
        logo_img = cv2.imread(self.logo_path, cv2.IMREAD_UNCHANGED)

        if main_img is None:
            raise ValueError(f"Gagal membaca piksel citra utama: {self.main_image_path}")
        if logo_img is None:
            raise ValueError(f"Gagal membaca piksel logo: {self.logo_path}")

        # Fix white bleeding: Ubah warna pixel yang 100% transparan menjadi hitam.
        # Ini mencegah interpolasi cv2.resize / rotasi mencampurkan warna putih tersembunyi ke pinggiran hitam logo.
        if len(logo_img.shape) == 3 and logo_img.shape[2] == 4:
            logo_img[logo_img[:, :, 3] == 0] = [0, 0, 0, 0]

        # Tahap 1: Resizing & Normalization & Rotation
        logo_resized = self.resize_logo(main_img, logo_img, scale_percent=scale_percent)
        logo_rotated = self.rotate_logo(logo_resized, angle)
        
        h_logo, w_logo = logo_rotated.shape[:2]
        
        # Handle 4-channel (RGBA) main image
        if len(main_img.shape) == 3 and main_img.shape[2] == 4:
            main_bgr = main_img[:, :, :3]
            main_alpha = main_img[:, :, 3]
        else:
            main_bgr = main_img
            main_alpha = None
            
        h_main, w_main = main_bgr.shape[:2]

        # Prevent issues if resized logo is somehow taller than main image
        if h_logo > h_main or w_logo > w_main:
            raise ValueError("Dimensi Tidak Proporsional: Bahkan setelah disusutkan, logo masih lebih besar dari gambar utama.")

        # Define Region of Interest (ROI) based on position
        max_y = h_main - h_logo
        max_x = w_main - w_logo
        
        start_y = int(max_y * pos_y_percent)
        start_x = int(max_x * pos_x_percent)
        
        # Guard untuk mencegah start_x atau start_y keluar batas matriks
        start_y = max(0, min(start_y, max_y))
        start_x = max(0, min(start_x, max_x))

        # Extract the exact ROI of size h_logo x w_logo from main_bgr
        roi = main_bgr[start_y:start_y + h_logo, start_x:start_x + w_logo]

        # Tahap 2 & 3: Masking & Linear Blending
        # Jika logo memiliki alpha channel (PNG transparan), gunakan Soft Masking untuk hasil yang jauh lebih halus (anti-aliasing)
        if len(logo_rotated.shape) == 3 and logo_rotated.shape[2] == 4:
            logo_bgr = logo_rotated[:, :, :3]
            alpha_channel = logo_rotated[:, :, 3]
            
            # Normalisasi alpha channel ke range 0.0 - 1.0 (Soft Mask)
            alpha_mask = alpha_channel.astype(float) / 255.0
            
            roi_float = roi.astype(float)
            logo_float = logo_bgr.astype(float)
            
            # Hitung pengaruh transparansi logo (beta)
            effective_alpha = alpha_mask * beta
            effective_alpha = effective_alpha[:, :, np.newaxis]
            
            # Terapkan redup (alpha main image) ke area tepat di bawah logo
            bg_under_logo = roi_float * alpha
            bg_outside_logo = roi_float
            
            # Jahit background: area di luar logo tetap asli, area di dalam logo menjadi redup
            bg_final = bg_outside_logo * (1.0 - alpha_mask[:, :, np.newaxis]) + bg_under_logo * alpha_mask[:, :, np.newaxis]
            
            # Tambahkan foreground (logo) yang sudah dikenakan beta
            fg = logo_float * effective_alpha
            
            final_roi = bg_final + fg
            final_roi = np.clip(final_roi, 0, 255).astype(np.uint8)
            
            # Mask inv murni biner untuk pemrosesan alpha output
            _, mask_inv = cv2.threshold(alpha_channel, 1, 255, cv2.THRESH_BINARY)
            
        else:
            # Fallback untuk gambar JPG yang tidak punya Alpha Channel: Gunakan Bitwise (Hard Masking)
            logo_bgr = logo_rotated
            logo_gray = cv2.cvtColor(logo_bgr, cv2.COLOR_BGR2GRAY)
            
            _, mask = cv2.threshold(logo_gray, 240, 255, cv2.THRESH_BINARY)
            mask_inv = cv2.bitwise_not(mask)
            
            roi_bg = cv2.bitwise_and(roi, roi, mask=mask)
            blended = cv2.addWeighted(roi, alpha, logo_bgr, beta, 0)
            blended_fg = cv2.bitwise_and(blended, blended, mask=mask_inv)
            final_roi = cv2.add(roi_bg, blended_fg)

        # Timpa kembali matriks piksel ROI ke posisi yang tepat pada citra utama
        main_bgr[start_y:start_y + h_logo, start_x:start_x + w_logo] = final_roi

        # Jika citra utama tadinya punya alpha channel (PNG), gabungkan kembali
        if main_alpha is not None:
            # Buat alpha channel menjadi 255 (solid) di area logo agar watermark tidak tembus pandang jika ditaruh di area transparan
            roi_alpha = main_alpha[start_y:start_y + h_logo, start_x:start_x + w_logo]
            roi_alpha = cv2.bitwise_or(roi_alpha, mask_inv)
            main_alpha[start_y:start_y + h_logo, start_x:start_x + w_logo] = roi_alpha
            
            final_img = cv2.merge((main_bgr[:,:,0], main_bgr[:,:,1], main_bgr[:,:,2], main_alpha))
        else:
            final_img = main_bgr

        # Simpan hasil akhir
        cv2.imwrite(self.output_path, final_img)
        print(f"Sukses! Gambar hasil watermarking berhasil disimpan di: {self.output_path}")
