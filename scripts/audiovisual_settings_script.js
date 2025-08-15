// scripts/audiovisual_settings_script.js
document.addEventListener('DOMContentLoaded', async () => {
    // --- Dependency Checks ---
    if (typeof initDB !== 'function' || typeof addCustomAsset !== 'function' || typeof getCustomAssets !== 'function' || typeof deleteCustomAsset !== 'function' || typeof getCustomAssetById !== 'function') {
        console.error("Critical DB functions from script.js are missing.");
        alert("Error: Core database functions are not available. This page cannot function.");
        return;
    }
    if (typeof applyTheme !== 'function') {
        console.warn("applyTheme function from script.js is missing.");
    }

    // --- NEW: Default Assets Definition ---
    const DEFAULT_ASSETS = {
        images: [
            { name: 'Abstract Light Rays', path: 'assets/images/default1.jpg' },
            { name: 'Quiet Lake', path: 'assets/images/default2.jpg' },
            { name: 'Mountain Sunrise', path: 'assets/images/default3.jpg' }
        ],
        effects: [
            { name: 'Gentle Chime', path: 'assets/sounds/effects/default-chime.mp3' },
            { name: 'Page Turn', path: 'assets/sounds/effects/default-page-turn.mp3' }
        ],
        music: [
            { name: 'Peaceful Ambient', path: 'assets/sounds/music/default-ambient.mp3' }
        ]
    };

    // --- DOM Elements ---
    const avStatusMessage = document.getElementById('avStatusMessage');
    const avPreviewArea = document.getElementById('avPreviewArea');
    const previewTextContent = avPreviewArea.querySelector('.preview-text-content');
    
    // Asset Management
    const addImageUrlBtn = document.getElementById('addImageUrlBtn');
    const imageUrlInput = document.getElementById('imageUrlInput');
    const addCustomImageFileBtn = document.getElementById('addCustomImageFileBtn');
    const customImageInput = document.getElementById('customImageInput');
    const customImagesList = document.getElementById('customImagesList');
    
    // MODIFIED: Specific sound inputs
    const addMusicFileBtn = document.getElementById('addMusicFileBtn');
    const musicFileInput = document.getElementById('musicFileInput');
    const addEffectFileBtn = document.getElementById('addEffectFileBtn');
    const effectFileInput = document.getElementById('effectFileInput');
    const customMusicList = document.getElementById('customMusicList');
    const customEffectsList = document.getElementById('customEffectsList');

    // Setting Controls
    const bgImageSelector = document.getElementById('bgImageSelector');
    const bgImageSlideshowToggle = document.getElementById('bgImageSlideshowToggle');
    const bgImageSlideshowInterval = document.getElementById('bgImageSlideshowInterval');
    const bgImageSlideshowIntervalLabel = document.getElementById('bgImageSlideshowIntervalLabel');
    const bgImageOverlayToggle = document.getElementById('bgImageOverlayToggle');
    const bgImageOverlayOpacitySlider = document.getElementById('bgImageOverlayOpacitySlider');
    const bgImageOverlayOpacityLabel = document.getElementById('bgImageOverlayOpacityLabel');
    const bgImageBlurSlider = document.getElementById('bgImageBlurSlider');
    const bgImageBlurLabel = document.getElementById('bgImageBlurLabel');
    const verseCardOpacitySlider = document.getElementById('verseCardOpacitySlider');
    const verseCardOpacityLabel = document.getElementById('verseCardOpacityLabel');
    
    const verseSoundSelector = document.getElementById('verseSoundSelector');
    const bgMusicSelector = document.getElementById('bgMusicSelector');
    const bgMusicPlaylistMode = document.getElementById('bgMusicPlaylistMode');
    const bgMusicVolumeSlider = document.getElementById('bgMusicVolumeSlider');
    const bgMusicVolumeLabel = document.getElementById('bgMusicVolumeLabel');

    // --- Audio Preview Elements ---
    let previewMusicAudio = new Audio();
    let previewSoundEffectAudio = new Audio();
    let currentPreviewObjectUrl = null;
    let slideshowIntervalId = null;

    // --- LocalStorage Keys ---
    const LS_SELECTED_BG_IMAGE = 'av_selectedBgImage';
    const LS_SLIDESHOW_ENABLED = 'av_slideshowEnabled';
    const LS_SLIDESHOW_INTERVAL = 'av_slideshowInterval';
    const LS_SELECTED_VERSE_SOUND = 'av_selectedVerseSound';
    const LS_SELECTED_BG_MUSIC = 'av_selectedBgMusic';
    const LS_BG_MUSIC_VOLUME = 'av_bgMusicVolume';
    const LS_BG_MUSIC_PLAYLIST_MODE = 'av_bgMusicPlaylistMode';
    const LS_BG_IMAGE_OVERLAY_ENABLED = 'av_bgImageOverlayEnabled';
    const LS_BG_IMAGE_OVERLAY_OPACITY = 'av_bgImageOverlayOpacity';
    const LS_BG_IMAGE_BLUR = 'av_bgImageBlur';
    const LS_VERSE_CARD_OPACITY = 'av_verseCardOpacity';

    // --- Utility Functions ---
    function showStatus(message, isError = false, duration = 4000) {
        avStatusMessage.textContent = message;
        avStatusMessage.style.color = isError ? 'var(--brand-color)' : 'var(--text-color)';
        if (duration > 0) {
            setTimeout(() => {
                if (avStatusMessage.textContent === message) avStatusMessage.textContent = '';
            }, duration);
        }
    }

    // --- Asset Management Logic ---
    async function handleAddFiles(files, type) { // MODIFIED: 'type' is now 'image', 'music', or 'effect'
        showStatus(`Importing ${files.length} ${type} file(s)...`, false, 0);
        let successCount = 0;
        for (const file of files) {
            try {
                // The duration check is no longer needed, we trust the explicit type
                await addCustomAsset(file.name, type, file, false);
                successCount++;
            } catch (error) {
                console.error(`Failed to add file ${file.name}:`, error);
            }
        }
        showStatus(`Imported ${successCount} of ${files.length} files.`, successCount < files.length, 5000);
        await renderAllAssets();
        await populateAllSelectors();
    }

    async function handleAddUrl(url, type) {
        if (!url || !url.startsWith('http')) {
            showStatus('Please enter a valid URL (starting with http/https).', true);
            return;
        }
        showStatus('Adding URL...', false, 0);
        try {
            const name = url.substring(url.lastIndexOf('/') + 1) || url;
            const assetType = type === 'sound' ? 'music' : 'image';
            await addCustomAsset(name, assetType, url, true);
            showStatus(`URL for "${name}" added successfully.`, false);
            await renderAllAssets();
            await populateAllSelectors();
        } catch (error) {
            showStatus(`Error adding URL: ${error.message}`, true);
        }
    }

    async function handleDeleteAsset(id) {
        if (!confirm('Are you sure you want to delete this custom asset? This cannot be undone.')) return;
        try {
            await deleteCustomAsset(id);
            showStatus('Asset deleted.', false);
            await renderAllAssets();
            await populateAllSelectors();
            await updateLivePreview();
        } catch (error) {
            showStatus(`Error deleting asset: ${error.message}`, true);
        }
    }

    async function renderAllAssets() {
        const createAssetListItem = (asset) => {
            const li = document.createElement('li');
            li.className = 'asset-item';
            li.innerHTML = `<span class="asset-name" title="${asset.name}">${asset.name}</span><span class="asset-status">${asset.isUrl ? 'URL' : 'File'}</span><button class="delete-asset-btn" data-id="${asset.id}" title="Delete Asset">×</button>`;
            li.querySelector('.delete-asset-btn').addEventListener('click', () => handleDeleteAsset(asset.id));
            return li;
        };
        customImagesList.innerHTML = '';
        const images = await getCustomAssets('image');
        if (images.length > 0) images.forEach(asset => customImagesList.appendChild(createAssetListItem(asset)));
        else customImagesList.innerHTML = '<li>No custom images added.</li>';
        customMusicList.innerHTML = '';
        const music = await getCustomAssets('music');
        if (music.length > 0) music.forEach(asset => customMusicList.appendChild(createAssetListItem(asset)));
        else customMusicList.innerHTML = '<li>No custom background music added.</li>';
        customEffectsList.innerHTML = '';
        const effects = await getCustomAssets('effect');
        if (effects.length > 0) effects.forEach(asset => customEffectsList.appendChild(createAssetListItem(asset)));
        else customEffectsList.innerHTML = '<li>No custom sound effects added.</li>';
    }

    // MODIFIED: To support default assets
    async function populateAllSelectors() {
        const populate = async (selector, customType, defaults) => {
            selector.querySelectorAll('optgroup').forEach(group => group.remove());

            if (defaults && defaults.length > 0) {
                const defaultGroup = document.createElement('optgroup');
                defaultGroup.label = 'Default Assets';
                defaults.forEach(asset => {
                    defaultGroup.appendChild(new Option(asset.name, asset.path));
                });
                selector.appendChild(defaultGroup);
            }

            const customAssets = await getCustomAssets(customType);
            if (customAssets.length > 0) {
                const customGroup = document.createElement('optgroup');
                customGroup.label = 'Custom Assets';
                customAssets.forEach(asset => {
                    const optionValue = `custom:${asset.id}:${asset.isUrl}`;
                    customGroup.appendChild(new Option(asset.name, optionValue));
                });
                selector.appendChild(customGroup);
            }
        };

        await populate(bgImageSelector, 'image', DEFAULT_ASSETS.images);
        await populate(verseSoundSelector, 'effect', DEFAULT_ASSETS.effects);
        await populate(bgMusicSelector, 'music', DEFAULT_ASSETS.music);
        
        await loadAndApplySettings();
    }

    // --- Live Preview & Settings Logic ---
    async function updateLivePreview() {
        const bgImageValue = bgImageSelector.value;
        avPreviewArea.style.backgroundImage = 'none';
        avPreviewArea.classList.remove('av-overlay-enabled');
        if (currentPreviewObjectUrl) {
            URL.revokeObjectURL(currentPreviewObjectUrl);
            currentPreviewObjectUrl = null;
        }

        const isBgImageActive = bgImageValue !== 'none' || bgImageSlideshowToggle.checked;

        if (bgImageValue !== 'none' && bgImageValue !== 'random') {
            let imageUrl = '';
            if (bgImageValue.startsWith('custom:')) {
                const [, idStr] = bgImageValue.split(':');
                const asset = await getCustomAssetById(parseInt(idStr, 10));
                if (asset) {
                    imageUrl = asset.isUrl ? asset.data : URL.createObjectURL(asset.data);
                    if (!asset.isUrl) currentPreviewObjectUrl = imageUrl;
                }
            } else { // It's a default asset path
                imageUrl = bgImageValue;
            }
            if(imageUrl) avPreviewArea.style.backgroundImage = `url('${imageUrl}')`;
        }

        clearInterval(slideshowIntervalId);
        if (bgImageSlideshowToggle.checked) {
            const interval = bgImageSlideshowInterval.value * 1000;
            slideshowIntervalId = setInterval(async () => {
                const options = Array.from(bgImageSelector.options).filter(opt => opt.value.startsWith('custom:'));
                if (options.length > 0) {
                    const randomIndex = Math.floor(Math.random() * options.length);
                    bgImageSelector.value = options[randomIndex].value;
                    await saveAndPreview();
                }
            }, interval);
        }

        const blur = bgImageBlurSlider.value;
        avPreviewArea.style.filter = `blur(${blur}px)`;
        
        if (isBgImageActive) {
            const cardOpacity = verseCardOpacitySlider.value;
            previewTextContent.style.backgroundColor = `rgba(0, 0, 0, ${cardOpacity})`;
        } else {
            previewTextContent.style.backgroundColor = '';
        }

        if (bgImageOverlayToggle.checked) {
            avPreviewArea.classList.add('av-overlay-enabled');
            const opacity = bgImageOverlayOpacitySlider.value;
            avPreviewArea.style.setProperty('--av-bg-image-overlay-opacity', opacity);
        }

        const verseSoundValue = verseSoundSelector.value;
        if(verseSoundValue !== 'none' && verseSoundValue !== localStorage.getItem(LS_SELECTED_VERSE_SOUND)) {
            let soundUrl = '';
             if (verseSoundValue.startsWith('custom:')) {
                const [, idStr] = verseSoundValue.split(':');
                const asset = await getCustomAssetById(parseInt(idStr, 10));
                if (asset) soundUrl = asset.isUrl ? asset.data : URL.createObjectURL(asset.data);
            } else { // It's a default asset path
                soundUrl = verseSoundValue;
            }
            if (soundUrl) {
                previewSoundEffectAudio.src = soundUrl;
                previewSoundEffectAudio.play().catch(e => console.warn("Sound preview failed:", e));
            }
        }

        const bgMusicValue = bgMusicSelector.value;
        let musicUrl = '';
        if (bgMusicValue.startsWith('custom:')) {
            const [, idStr] = bgMusicValue.split(':');
            const asset = await getCustomAssetById(parseInt(idStr, 10));
            if (asset) musicUrl = asset.isUrl ? asset.data : URL.createObjectURL(asset.data);
        } else if (bgMusicValue !== 'none') { // It's a default asset path
            musicUrl = bgMusicValue;
        }
        
        if (bgMusicValue === 'none' || !musicUrl) {
            previewMusicAudio.pause();
            previewMusicAudio.src = '';
        } else if (previewMusicAudio.src !== musicUrl) {
            previewMusicAudio.src = musicUrl;
            previewMusicAudio.play().catch(e => console.warn("Music preview failed:", e));
        }

        previewMusicAudio.volume = bgMusicVolumeSlider.value;
        previewMusicAudio.loop = bgMusicPlaylistMode.value === 'repeat';
    }

    async function saveAndPreview() {
        localStorage.setItem(LS_SELECTED_BG_IMAGE, bgImageSelector.value);
        localStorage.setItem(LS_SLIDESHOW_ENABLED, bgImageSlideshowToggle.checked);
        localStorage.setItem(LS_SLIDESHOW_INTERVAL, bgImageSlideshowInterval.value);
        localStorage.setItem(LS_BG_IMAGE_OVERLAY_ENABLED, bgImageOverlayToggle.checked);
        localStorage.setItem(LS_BG_IMAGE_OVERLAY_OPACITY, bgImageOverlayOpacitySlider.value);
        localStorage.setItem(LS_BG_IMAGE_BLUR, bgImageBlurSlider.value);
        localStorage.setItem(LS_VERSE_CARD_OPACITY, verseCardOpacitySlider.value);
        localStorage.setItem(LS_SELECTED_VERSE_SOUND, verseSoundSelector.value);
        localStorage.setItem(LS_SELECTED_BG_MUSIC, bgMusicSelector.value);
        localStorage.setItem(LS_BG_MUSIC_PLAYLIST_MODE, bgMusicPlaylistMode.value);
        localStorage.setItem(LS_BG_MUSIC_VOLUME, bgMusicVolumeSlider.value);
        
        await updateLivePreview();
    }
    
    async function loadAndApplySettings() {
        const setSelectValue = (selector, value) => {
            if(Array.from(selector.options).some(opt => opt.value === value)) {
                selector.value = value;
            } else {
                selector.value = 'none';
            }
        };

        setSelectValue(bgImageSelector, localStorage.getItem(LS_SELECTED_BG_IMAGE) || 'none');
        bgImageSlideshowToggle.checked = localStorage.getItem(LS_SLIDESHOW_ENABLED) === 'true';
        const intervalSeconds = localStorage.getItem(LS_SLIDESHOW_INTERVAL) || 10;
        bgImageSlideshowInterval.value = intervalSeconds;
        if (intervalSeconds >= 60) {
            const minutes = (intervalSeconds / 60).toFixed(1).replace('.0', '');
            bgImageSlideshowIntervalLabel.textContent = `Slideshow Interval: ${minutes} min`;
        } else {
            bgImageSlideshowIntervalLabel.textContent = `Slideshow Interval: ${intervalSeconds} sec`;
        }
        bgImageOverlayToggle.checked = localStorage.getItem(LS_BG_IMAGE_OVERLAY_ENABLED) === 'true';
        bgImageOverlayOpacitySlider.value = localStorage.getItem(LS_BG_IMAGE_OVERLAY_OPACITY) || 0.5;
        bgImageBlurSlider.value = localStorage.getItem(LS_BG_IMAGE_BLUR) || 0;
        verseCardOpacitySlider.value = localStorage.getItem(LS_VERSE_CARD_OPACITY) || 0.7;
        setSelectValue(verseSoundSelector, localStorage.getItem(LS_SELECTED_VERSE_SOUND) || 'none');
        setSelectValue(bgMusicSelector, localStorage.getItem(LS_SELECTED_BG_MUSIC) || 'none');
        bgMusicPlaylistMode.value = localStorage.getItem(LS_BG_MUSIC_PLAYLIST_MODE) || 'repeat';
        bgMusicVolumeSlider.value = localStorage.getItem(LS_BG_MUSIC_VOLUME) || 0.5;

        bgImageOverlayOpacityLabel.textContent = `Overlay Opacity: ${Math.round(bgImageOverlayOpacitySlider.value * 100)}%`;
        bgImageBlurLabel.textContent = `Image Blur: ${bgImageBlurSlider.value}px`;
        verseCardOpacityLabel.textContent = `Verse Card Opacity: ${Math.round(verseCardOpacitySlider.value * 100)}%`;
        bgMusicVolumeLabel.textContent = `Music Volume: ${Math.round(bgMusicVolumeSlider.value * 100)}%`;

        await updateLivePreview();
    }

    function setupEventListeners() {
        addCustomImageFileBtn.addEventListener('click', () => customImageInput.click());
        customImageInput.addEventListener('change', (e) => handleAddFiles(e.target.files, 'image'));
        addImageUrlBtn.addEventListener('click', () => { handleAddUrl(imageUrlInput.value, 'image'); imageUrlInput.value = ''; });
        
        // MODIFIED: Setup specific sound buttons
        addMusicFileBtn.addEventListener('click', () => musicFileInput.click());
        musicFileInput.addEventListener('change', (e) => handleAddFiles(e.target.files, 'music'));
        addEffectFileBtn.addEventListener('click', () => effectFileInput.click());
        effectFileInput.addEventListener('change', (e) => handleAddFiles(e.target.files, 'effect'));

        [bgImageSelector, bgImageSlideshowToggle, bgImageOverlayToggle, verseSoundSelector, bgMusicSelector, bgMusicPlaylistMode].forEach(el => {
            el.addEventListener('change', saveAndPreview);
        });

        const setupSlider = (slider, label, labelTemplate) => {
            slider.addEventListener('input', e => {
                if (e.target.id === 'bgImageSlideshowInterval') {
                    const seconds = parseInt(e.target.value, 10);
                    if (seconds >= 60) {
                        const minutes = (seconds / 60).toFixed(1).replace('.0', '');
                        label.textContent = `Slideshow Interval: ${minutes} min`;
                    } else {
                        label.textContent = `Slideshow Interval: ${seconds} sec`;
                    }
                } else {
                    label.textContent = labelTemplate.replace('{}', Math.round(e.target.value * 100)).replace('{px}', e.target.value);
                }
                saveAndPreview();
            });
        };

        setupSlider(bgImageSlideshowInterval, bgImageSlideshowIntervalLabel, 'Slideshow Interval: {} sec');
        setupSlider(bgImageOverlayOpacitySlider, bgImageOverlayOpacityLabel, 'Overlay Opacity: {}%');
        setupSlider(bgImageBlurSlider, bgImageBlurLabel, 'Image Blur: {px}px');
        setupSlider(verseCardOpacitySlider, verseCardOpacityLabel, 'Verse Card Opacity: {}%');
        setupSlider(bgMusicVolumeSlider, bgMusicVolumeLabel, 'Music Volume: {}%');
    }

    async function initialize() {
        showStatus('Initializing...', false, 0);
        try {
            await initDB();
            if (typeof applyTheme === 'function') {
                applyTheme(localStorage.getItem('selectedTheme') || 'dark');
            }
            bgImageSelector.innerHTML = '';
            bgImageSelector.add(new Option('None', 'none'));
            bgImageSelector.add(new Option('Random from List', 'random'));
            verseSoundSelector.innerHTML = '';
            verseSoundSelector.add(new Option('None', 'none'));
            bgMusicSelector.innerHTML = '';
            bgMusicSelector.add(new Option('None', 'none'));
            
            await renderAllAssets();
            await populateAllSelectors();
            setupEventListeners();
            showStatus('Audiovisual setup ready.', false);
        } catch (error) {
            showStatus(`Initialization failed: ${error.message}`, true, 0);
            console.error("Initialization error:", error);
        }
    }

    initialize();
});