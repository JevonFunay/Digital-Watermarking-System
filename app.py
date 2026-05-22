import os
import uuid
from flask import Flask, render_template, request, jsonify, send_file, url_for
from werkzeug.utils import secure_filename
from watermarker import Watermarker

app = Flask(__name__)

# Konfigurasi folder unggahan
UPLOAD_FOLDER = os.path.join(app.root_path, 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process():
    if 'main_image' not in request.files or 'logo' not in request.files:
        return jsonify({'error': 'Harap unggah citra utama dan logo.'}), 400

    main_file = request.files['main_image']
    logo_file = request.files['logo']

    if main_file.filename == '' or logo_file.filename == '':
        return jsonify({'error': 'File tidak boleh kosong.'}), 400

    if not (allowed_file(main_file.filename) and allowed_file(logo_file.filename)):
        return jsonify({'error': 'Format file tidak didukung. Gunakan JPG/PNG.'}), 400

    try:
        # Generate nama unik untuk mencegah bentrok
        unique_id = str(uuid.uuid4())[:8]
        main_filename = secure_filename(f"main_{unique_id}_{main_file.filename}")
        logo_filename = secure_filename(f"logo_{unique_id}_{logo_file.filename}")
        output_filename = secure_filename(f"output_{unique_id}.png")

        main_path = os.path.join(app.config['UPLOAD_FOLDER'], main_filename)
        logo_path = os.path.join(app.config['UPLOAD_FOLDER'], logo_filename)
        output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)

        # Simpan file sementara
        main_file.save(main_path)
        logo_file.save(logo_path)

        # Inisialisasi Watermarker dan terapkan PCD
        watermarker = Watermarker(main_path, logo_path, output_path)
        # Mengambil nilai parameter dari request
        alpha = float(request.form.get('alpha', 0.7))
        beta = float(request.form.get('beta', 0.3))
        pos_x = float(request.form.get('pos_x', 1.0))
        pos_y = float(request.form.get('pos_y', 1.0))
        scale = float(request.form.get('scale', 15))
        angle = float(request.form.get('angle', 0))
        
        watermarker.apply_watermark(alpha=alpha, beta=beta, pos_x_percent=pos_x, pos_y_percent=pos_y, scale_percent=scale, angle=angle)

        # Kembalikan URL gambar output
        result_url = url_for('static', filename=f'uploads/{output_filename}')
        return jsonify({'success': True, 'result_url': result_url})

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f"Terjadi kesalahan server: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
