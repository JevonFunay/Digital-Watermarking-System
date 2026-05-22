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

    const submitBtn = document.getElementById('process-btn');
    const spinner = document.getElementById('btn-spinner');
    const btnText = submitBtn.querySelector('span');
    
    const resultSection = document.getElementById('result-section');
    const resultImg = document.getElementById('result-img');
    const downloadBtn = document.getElementById('download-btn');
    const errorAlert = document.getElementById('error-alert');

    // Update slider values
    alphaInput.addEventListener('input', (e) => alphaVal.textContent = e.target.value);
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

    function showPreview(file, previewElement, previewId) {
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewElement.src = e.target.result;
                previewElement.style.display = 'block';
                
                if (previewId === 'main-preview') {
                    canvasMain.src = e.target.result;
                    mainImgLoaded = true;
                } else if (previewId === 'logo-preview') {
                    canvasLogo.src = e.target.result;
                    logoImgLoaded = true;
                }
                
                if (mainImgLoaded && logoImgLoaded) {
                    editorSection.style.display = 'block';
                    settingsSection.style.display = 'block';
                    setTimeout(updateCanvas, 100);
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
        
        const mainRect = canvasMain.getBoundingClientRect();
        
        const logoWidth = mainRect.width * scale;
        canvasLogoContainer.style.width = logoWidth + 'px';
        
        canvasLogo.style.opacity = beta;
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
        
        // Show Loading State
        submitBtn.disabled = true;
        spinner.style.display = 'inline-block';
        btnText.textContent = 'Processing...';
        resultSection.style.display = 'none';

        const formData = new FormData(e.target);

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
