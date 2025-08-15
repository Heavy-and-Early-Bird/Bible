// scripts/audiovisual_manager_script.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initDB !== 'function' || typeof saveAssetToDB !== 'function' || typeof getAssetsFromDB !== 'function' || typeof deleteAssetFromDB !== 'function' || typeof applyTheme !== 'function') {
        console.error("Critical DB or utility functions from script.js are missing.");
        alert("Error: Core database functions are not available. This page cannot function.");
        return;
    }

    // --- DOM Elements ---
    const statusMessage = document.getElementById('avManagerStatus');
    const addImagesBtn = document.getElementById('addImagesBtn');
    const imageFileInput = document.getElementById('imageFileInput');
    const imageList = document.getElementById('av-image-list');
    const addSoundsBtn = document.getElementById('addSoundsBtn');
    const soundFileInput = document.getElementById('soundFileInput');
    const soundList = document.getElementById('av-sound-list');
    const imagePreview = document.getElementById('imagePreview');
    const audioPreview = document.getElementById('audioPreview');
    const previewPlaceholder = document.getElementById('preview-placeholder');

    let currentObjectUrl = null; // To manage memory

    function showStatus(message, isError = false, duration = 4000) {
        statusMessage.textContent = message;
        statusMessage.style.color = isError ? 'var(--brand-color)' : 'var(--text-color)';
        if (duration > 0) {
            setTimeout(() => {
                if (statusMessage.textContent === message) statusMessage.textContent = '';
            }, duration);
        }
    }

    async function renderAssets() {
        showStatus("Loading assets from database...", false, 0);
        imageList.innerHTML = '<li>Loading...</li>';
        soundList.innerHTML = '<li>Loading...</li>';

        try {
            const allAssets = await getAssetsFromDB();
            imageList.innerHTML = '';
            soundList.innerHTML = '';

            const images = allAssets.filter(a => a.type === 'image');
            const sounds = allAssets.filter(a => a.type === 'sound');

            if (images.length === 0) imageList.innerHTML = '<li>No images added yet.</li>';
            images.forEach(asset => {
                const li = document.createElement('li');
                li.className = 'av-asset-item';
                li.innerHTML = `<span class="asset-name" data-name="${asset.name}">${asset.name}</span> <button class="delete-asset-btn" data-name="${asset.name}">Delete</button>`;
                imageList.appendChild(li);
            });

            if (sounds.length === 0) soundList.innerHTML = '<li>No sounds added yet.</li>';
            sounds.forEach(asset => {
                const li = document.createElement('li');
                li.className = 'av-asset-item';
                li.innerHTML = `<span class="asset-name" data-name="${asset.name}">${asset.name}</span> <button class="delete-asset-btn" data-name="${asset.name}">Delete</button>`;
                soundList.appendChild(li);
            });
            showStatus("Assets loaded.", false);
        } catch (error) {
            showStatus("Error loading assets from database.", true);
            console.error("Render Assets Error:", error);
        }
    }

    async function handleFilesSelected(files, assetType) {
        if (!files || files.length === 0) return;
        showStatus(`Importing ${files.length} ${assetType}(s)...`, false, 0);
        let successCount = 0;
        let errorCount = 0;

        for (const file of files) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const blob = new Blob([arrayBuffer], { type: file.type });
                await saveAssetToDB({ name: file.name, type: assetType, data: blob });
                successCount++;
            } catch (error) {
                errorCount++;
                console.error(`Failed to import ${file.name}:`, error);
            }
        }

        showStatus(`Import complete. ${successCount} succeeded, ${errorCount} failed.`, errorCount > 0, 5000);
        await renderAssets();
    }

    async function handleAssetClick(e) {
        if (e.target.classList.contains('delete-asset-btn')) {
            const assetName = e.target.dataset.name;
            if (confirm(`Are you sure you want to delete "${assetName}"? This cannot be undone.`)) {
                try {
                    await deleteAssetFromDB(assetName);
                    showStatus(`"${assetName}" deleted successfully.`, false);
                    await renderAssets();
                    // Clear preview if the deleted item was being previewed
                    if (imagePreview.dataset.current === assetName || audioPreview.dataset.current === assetName) {
                        clearPreview();
                    }
                } catch (error) {
                    showStatus(`Error deleting "${assetName}".`, true);
                }
            }
        } else if (e.target.classList.contains('asset-name')) {
            const assetName = e.target.dataset.name;
            previewAsset(assetName);
        }
    }
    
    function clearPreview() {
        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }
        imagePreview.src = '';
        audioPreview.src = '';
        imagePreview.style.display = 'none';
        audioPreview.style.display = 'none';
        imagePreview.removeAttribute('data-current');
        audioPreview.removeAttribute('data-current');
        previewPlaceholder.style.display = 'block';
    }

    async function previewAsset(name) {
        clearPreview();
        showStatus(`Loading preview for "${name}"...`, false, 0);
        try {
            const assets = await getAssetsFromDB(name);
            if (!assets || assets.length === 0) throw new Error("Asset not found in DB.");
            const asset = assets[0];
            
            currentObjectUrl = URL.createObjectURL(asset.data);
            previewPlaceholder.style.display = 'none';

            if (asset.type === 'image') {
                imagePreview.src = currentObjectUrl;
                imagePreview.style.display = 'block';
                imagePreview.dataset.current = name;
            } else if (asset.type === 'sound') {
                audioPreview.src = currentObjectUrl;
                audioPreview.style.display = 'block';
                audioPreview.dataset.current = name;
                audioPreview.play();
            }
            showStatus(`Previewing "${name}".`, false);
        } catch(error) {
            showStatus(`Could not load preview: ${error.message}`, true);
            console.error("Preview Error:", error);
        }
    }


    async function initialize() {
        await initDB();
        const savedTheme = localStorage.getItem('selectedTheme') || 'dark';
        applyTheme(savedTheme);
        await renderAssets();

        addImagesBtn.addEventListener('click', () => imageFileInput.click());
        imageFileInput.addEventListener('change', (e) => handleFilesSelected(e.target.files, 'image'));
        addSoundsBtn.addEventListener('click', () => soundFileInput.click());
        soundFileInput.addEventListener('change', (e) => handleFilesSelected(e.target.files, 'sound'));
        
        imageList.addEventListener('click', handleAssetClick);
        soundList.addEventListener('click', handleAssetClick);
    }

    initialize();
});