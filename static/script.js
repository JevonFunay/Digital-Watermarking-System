document.addEventListener('DOMContentLoaded', () => {
    const mainBox = document.getElementById('main-upload-box');
    const mainInput = document.getElementById('main_image');
    const logoBox = document.getElementById('logo-upload-box');
    const logoInput = document.getElementById('logo');
    
    const alphaInput = document.getElementById('alpha');
    const betaInput = document.getElementById('beta');
    const alphaVal = document.getElementById('alpha-val');
    const betaVal = document.getElementById('beta-val');
    
    const scaleInput = document.getElementById('scale');
    const angleInput = document.getElementById('angle');
    const scaleVal = document.getElementById('scale-val');
    const angleVal = document.getElementById('angle-val');
    
    const editorSection = document.getElementById('editor-section');
    const settingsSection = document.getElementById('settings-section');
    const canvasMain = document.getElementById('canvas-main-img');
    const canvasLogoContainer = document.getElementById('canvas-logo-container');
    const canvasLogo = document.getElementById('canvas-logo-img');
    const posXInput = document.getElementById('pos_x');
    const posYInput = document.getElementById('pos_y');
    
    let mainImgLoaded = false;
    let logoImgLoaded = false;
    let originalLogoDataURL = null;
    let transparentLogoDataURL = null;
    const autoRemoveBgCheckbox = document.getElementById('auto-remove-bg');

    const submitBtn = document.getElementById('process-btn');
    const spinner = document.getElementById('btn-spinner');
    const btnText = submitBtn.querySelector('span');
    
    const resultSection = document.getElementById('result-section');
    const resultImg = document.getElementById('result-img');
    const downloadBtn = document.getElementById('download-btn');
    const errorAlert = document.getElementById('error-alert');

    // Update slider values
    alphaInput.addEventListener('input', (e) => {
        alphaVal.textContent = e.target.value;
        updateCanvas();
    });
    betaInput.addEventListener('input', (e) => {
        betaVal.textContent = e.target.value;
        updateCanvas();
    });
    scaleInput.addEventListener('input', (e) => {
        scaleVal.textContent = e.target.value;
        updateCanvas();
    });
    angleInput.addEventListener('input', (e) => {
        angleVal.textContent = e.target.value;
        updateCanvas();
    });

    if (autoRemoveBgCheckbox) {
        autoRemoveBgCheckbox.addEventListener('change', () => {
            applyLogoSource();
        });
    }

    // Setup Drag & Drop and Preview
    function setupUploadBox(box, input, previewId) {
        box.addEventListener('click', () => input.click());

        box.addEventListener('dragover', (e) => {
            e.preventDefault();
            box.style.borderColor = 'var(--primary-color)';
            box.style.background = 'rgba(59, 130, 246, 0.2)';
        });

        box.addEventListener('dragleave', (e) => {
            e.preventDefault();
            box.style.borderColor = 'var(--glass-border)';
            box.style.background = 'rgba(15, 23, 42, 0.6)';
        });

        box.addEventListener('drop', (e) => {
            e.preventDefault();
            box.style.borderColor = 'var(--glass-border)';
            box.style.background = 'rgba(15, 23, 42, 0.6)';
            
            if (e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                const previewImg = box.querySelector('.preview-img');
                showPreview(input.files[0], previewImg, previewId);
            }
        });

        input.addEventListener('change', () => {
            if (input.files.length) {
                const previewImg = box.querySelector('.preview-img');
                showPreview(input.files[0], previewImg, previewId);
            }
        });
    }

    // Helper to convert Data URL to Blob for file submission
    function dataURLtoBlob(dataurl) {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type: mime});
    }

    // Deteksi & Hilangkan Background Solid Logo dengan Soft Chroma Keying
    function processLogoTransparency(dataURL, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            const w = canvas.width;
            const h = canvas.height;
            
            const getPixel = (x, y) => {
                const idx = (y * w + x) * 4;
                return [data[idx], data[idx+1], data[idx+2], data[idx+3]];
            };
            
            // Ambil warna piksel di 4 sudut
            const corners = [
                getPixel(0, 0),
                getPixel(w - 1, 0),
                getPixel(0, h - 1),
                getPixel(w - 1, h - 1)
            ];
            
            // Deteksi jika 4 sudut solid/tidak transparan dan memiliki warna serupa
            const isSolid = corners.every(c => c[3] === 255) && 
                            corners.every(c => {
                                const diff = Math.abs(c[0] - corners[0][0]) + 
                                             Math.abs(c[1] - corners[0][1]) + 
                                             Math.abs(c[2] - corners[0][2]);
                                return diff < 40; // Toleransi kesamaan warna sudut
                            });
            
            if (isSolid) {
                const bgR = corners[0][0];
                const bgG = corners[0][1];
                const bgB = corners[0][2];
                
                // Lakukan pembersihan warna background dengan Soft Chroma Keying
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i+1];
                    const b = data[i+2];
                    
                    const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
                    
                    if (dist < 30) {
                        data[i+3] = 0; // Transparan penuh
                    } else if (dist < 45) {
                        // Soft edge transition untuk hasil potong yang halus (anti-aliasing)
                        const softAlpha = ((dist - 30) / 15) * 255;
                        data[i+3] = Math.min(data[i+3], softAlpha);
                    }
                }
                
                ctx.putImageData(imgData, 0, 0);
                callback(canvas.toDataURL('image/png'));
            } else {
                // Tidak memiliki background solid, biarkan apa adanya
                callback(dataURL);
            }
        };
        img.src = dataURL;
    }

    // Terapkan sumber gambar logo berdasarkan toggle switch
    function applyLogoSource() {
        if (!logoImgLoaded || !originalLogoDataURL) return;
        
        const previewElement = document.getElementById('logo-preview');
        
        if (autoRemoveBgCheckbox && autoRemoveBgCheckbox.checked && transparentLogoDataURL) {
            canvasLogo.src = transparentLogoDataURL;
            previewElement.src = transparentLogoDataURL;
        } else {
            canvasLogo.src = originalLogoDataURL;
            previewElement.src = originalLogoDataURL;
        }
        
        setTimeout(updateCanvas, 50);
    }

    function showPreview(file, previewElement, previewId) {
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewElement.src = e.target.result;
                previewElement.style.display = 'block';
                
                if (previewId === 'main-preview') {
                    canvasMain.src = e.target.result;
                    mainImgLoaded = true;
                    if (mainImgLoaded && logoImgLoaded) {
                        editorSection.style.display = 'block';
                        settingsSection.style.display = 'block';
                        setTimeout(updateCanvas, 100);
                    }
                } else if (previewId === 'logo-preview') {
                    originalLogoDataURL = e.target.result;
                    logoImgLoaded = true;
                    
                    // Reset transparent logo before processing
                    transparentLogoDataURL = null;
                    
                    // Jalankan deteksi transparansi secara asinkron
                    processLogoTransparency(originalLogoDataURL, (processedUrl) => {
                        transparentLogoDataURL = processedUrl;
                        applyLogoSource();
                        
                        if (mainImgLoaded && logoImgLoaded) {
                            editorSection.style.display = 'block';
                            settingsSection.style.display = 'block';
                            setTimeout(updateCanvas, 100);
                        }
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    }

    // Visual Editor Logic
    function updateCanvas() {
        if (!mainImgLoaded || !logoImgLoaded) return;
        
        const scale = parseFloat(scaleInput.value) / 100;
        const angle = parseFloat(angleInput.value);
        const beta = parseFloat(betaInput.value);
        const alpha = parseFloat(alphaInput.value);
        
        const mainRect = canvasMain.getBoundingClientRect();
        
        const logoWidth = mainRect.width * scale;
        canvasLogoContainer.style.width = logoWidth + 'px';
        
        canvasLogo.style.opacity = beta;
        canvasLogoContainer.style.backgroundColor = `rgba(0, 0, 0, ${1 - alpha})`;
        canvasLogoContainer.style.transform = `rotate(${angle}deg)`;
        
        let px = parseFloat(posXInput.value);
        let py = parseFloat(posYInput.value);
        
        const logoRect = canvasLogoContainer.getBoundingClientRect();
        const maxX = mainRect.width - logoRect.width;
        const maxY = mainRect.height - logoRect.height;
        
        canvasLogoContainer.style.left = (px * Math.max(0, maxX)) + 'px';
        canvasLogoContainer.style.top = (py * Math.max(0, maxY)) + 'px';
    }

    // Drag and Drop
    let isDragging = false;
    let startMouseX, startMouseY;
    let startLogoX, startLogoY;

    canvasLogoContainer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        startLogoX = parseFloat(canvasLogoContainer.style.left) || 0;
        startLogoY = parseFloat(canvasLogoContainer.style.top) || 0;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const dx = e.clientX - startMouseX;
        const dy = e.clientY - startMouseY;
        
        const mainRect = canvasMain.getBoundingClientRect();
        const logoRect = canvasLogoContainer.getBoundingClientRect();
        
        const maxX = mainRect.width - logoRect.width;
        const maxY = mainRect.height - logoRect.height;
        
        let newX = startLogoX + dx;
        let newY = startLogoY + dy;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        canvasLogoContainer.style.left = newX + 'px';
        canvasLogoContainer.style.top = newY + 'px';
        
        posXInput.value = (maxX > 0) ? newX / maxX : 0;
        posYInput.value = (maxY > 0) ? newY / maxY : 0;
    });

    document.addEventListener('mouseup', () => { isDragging = false; });

    setupUploadBox(mainBox, mainInput, 'main-preview');
    setupUploadBox(logoBox, logoInput, 'logo-preview');

    // Handle Form Submission
    document.getElementById('watermark-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset Error
        errorAlert.style.display = 'none';

        // Validasi programatik untuk mencegah submit kosong
        if (!mainImgLoaded || !logoImgLoaded) {
            errorAlert.textContent = 'Harap unggah gambar utama dan logo watermark terlebih dahulu.';
            errorAlert.style.display = 'block';
            errorAlert.scrollIntoView({ behavior: 'smooth' });
            return;
        }
        
        // Show Loading State
        submitBtn.disabled = true;
        spinner.style.display = 'inline-block';
        btnText.textContent = 'Processing...';
        resultSection.style.display = 'none';

        const formData = new FormData(e.target);

        // Jika fitur auto-transparansi aktif dan terdapat data logo transparan yang diproses
        if (autoRemoveBgCheckbox && autoRemoveBgCheckbox.checked && transparentLogoDataURL && transparentLogoDataURL !== originalLogoDataURL) {
            try {
                const logoBlob = dataURLtoBlob(transparentLogoDataURL);
                formData.set('logo', logoBlob, 'logo_transparent.png');
            } catch (err) {
                console.error('Gagal mengonversi logo transparan:', err);
            }
        }

        try {
            const response = await fetch('/process', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                // Success
                resultImg.src = data.result_url + '?t=' + new Date().getTime(); // Prevent caching
                downloadBtn.href = data.result_url;
                resultSection.style.display = 'block';
                resultSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                // Server returned an error
                errorAlert.textContent = data.error || 'Terjadi kesalahan saat memproses gambar.';
                errorAlert.style.display = 'block';
            }
        } catch (error) {
            console.error('Error:', error);
            errorAlert.textContent = 'Gagal terhubung ke server. Pastikan server Flask berjalan.';
            errorAlert.style.display = 'block';
        } finally {
            // Restore Button State
            submitBtn.disabled = false;
            spinner.style.display = 'none';
            btnText.textContent = 'Process Watermark';
        }
    });
});
