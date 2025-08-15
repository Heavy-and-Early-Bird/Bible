// scripts/audiovisual_integrations.js
console.log("Audiovisual Integrations script loaded (v7 - Verse Card Opacity).");

// --- DOM Element References ---
let avBackgroundTargets = [];
let verseTextDisplayElement = null;

// --- Audio Elements & State ---
let verseChangeAudio = new Audio();
let backgroundMusicAudio = new Audio();
let currentBgMusicObjectUrl = null;
let currentVerseSoundObjectUrl = null;

// Generic error handler for audio elements
function handleAudioError(event, type) {
    const audioElement = event.target;
    console.warn(`Error with ${type} audio:`, audioElement.error);
    console.warn(`Audio source was: ${audioElement.src}`);
}
verseChangeAudio.addEventListener('error', (e) => handleAudioError(e, 'verse change sound'));
backgroundMusicAudio.addEventListener('error', (e) => handleAudioError(e, 'background music'));

// --- LocalStorage Keys ---
const LS_SYSTEM_ENABLED_KEY = 'av_systemEnabled';
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
const LS_VERSE_CARD_OPACITY = 'av_verseCardOpacity'; // New key

// --- State ---
let imageSlideshowIntervalId = null;

// --- Initialization Function ---
async function initAV() {
    avBackgroundTargets = document.querySelectorAll('.av-background-target');
    verseTextDisplayElement = document.getElementById('verse-text');
    if (avBackgroundTargets.length === 0) {
        console.warn("AV Integration Warning: No '.av-background-target' elements found.");
    }
    await loadAndApplyAVSettings();
    console.log("Audiovisual system initialized.");
}
window.initAV = initAV;

async function getAssetUrl(assetValue) {
    if (!assetValue || assetValue === 'none' || assetValue === 'random') return null;

    if (assetValue.startsWith('custom:')) {
        try {
            const [, idStr] = assetValue.split(':');
            const asset = await getCustomAssetById(parseInt(idStr, 10)); // From script.js
            if (!asset) return null;
            return asset.isUrl ? asset.data : URL.createObjectURL(asset.data);
        } catch (error) {
            console.error(`Failed to get custom asset for value ${assetValue}`, error);
            return null;
        }
    }
    // If not a custom asset, it's a default path. Return it directly.
    return assetValue;
}

async function applyBackgroundImage(selectedPath) {
    if (avBackgroundTargets.length === 0) return;

    let imageToApply = null;

    if (selectedPath === "random") {
        const customImages = await getCustomAssets('image'); // from script.js
        if (customImages.length > 0) {
            const randomIndex = Math.floor(Math.random() * customImages.length);
            const randomAsset = customImages[randomIndex];
            imageToApply = `custom:${randomAsset.id}:${randomAsset.isUrl}`;
        }
    } else {
        imageToApply = selectedPath;
    }
    
    const imageUrl = await getAssetUrl(imageToApply);

    avBackgroundTargets.forEach(target => {
        if (imageUrl) {
            target.style.backgroundImage = `url('${imageUrl}')`;
            target.classList.add('av-has-background-image');
        } else {
            target.style.backgroundImage = 'none';
            target.classList.remove('av-has-background-image');
        }
    });
}

function applyImageOverlayAndBlur() {
    if (avBackgroundTargets.length === 0) return;

    const overlayEnabled = localStorage.getItem(LS_BG_IMAGE_OVERLAY_ENABLED) === 'true';
    const overlayOpacity = localStorage.getItem(LS_BG_IMAGE_OVERLAY_OPACITY) || 0.5;
    const imageBlur = localStorage.getItem(LS_BG_IMAGE_BLUR) || 0;

    avBackgroundTargets.forEach(target => {
        target.style.setProperty('--av-bg-image-blur', `${imageBlur}px`);
        if (target.classList.contains('av-has-background-image') && overlayEnabled) {
            target.style.setProperty('--av-bg-image-overlay-opacity', overlayOpacity);
            target.classList.add('av-overlay-enabled');
        } else {
            target.classList.remove('av-overlay-enabled');
        }
    });
}

function applyVerseCardOpacity() {
    if (!verseTextDisplayElement) return;

    const mainBgTarget = document.getElementById('mainContentArea');
    const isBgImageActive = mainBgTarget && mainBgTarget.classList.contains('av-has-background-image');

    if (isBgImageActive) {
        const opacity = localStorage.getItem(LS_VERSE_CARD_OPACITY) || 0.7;
        verseTextDisplayElement.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
    } else {
        // Remove the inline style to let the CSS theme variable take over
        verseTextDisplayElement.style.backgroundColor = '';
    }
}

async function playVerseChangeSound() {
    if (localStorage.getItem(LS_SYSTEM_ENABLED_KEY) !== 'true') return;

    const soundValue = localStorage.getItem(LS_SELECTED_VERSE_SOUND);
    if (!soundValue || soundValue === 'none') return;
    
    if (currentVerseSoundObjectUrl) URL.revokeObjectURL(currentVerseSoundObjectUrl);

    const soundUrl = await getAssetUrl(soundValue);
    if(soundUrl){
        if (soundUrl.startsWith('blob:')) currentVerseSoundObjectUrl = soundUrl;
        verseChangeAudio.src = soundUrl;
        verseChangeAudio.currentTime = 0;
        verseChangeAudio.play().catch(e => {
            if (e.name !== 'NotAllowedError') console.warn("Verse change sound playback failed:", e);
        });
    }
}
window.playVerseChangeSound = playVerseChangeSound;

async function controlBackgroundMusic() {
    const musicValue = localStorage.getItem(LS_SELECTED_BG_MUSIC);
    const volume = localStorage.getItem(LS_BG_MUSIC_VOLUME) || 0.5;
    const mode = localStorage.getItem(LS_BG_MUSIC_PLAYLIST_MODE) || 'repeat';

    backgroundMusicAudio.volume = parseFloat(volume);
    
    if (localStorage.getItem(LS_SYSTEM_ENABLED_KEY) !== 'true' || !musicValue || musicValue === 'none') {
        backgroundMusicAudio.pause();
        backgroundMusicAudio.src = '';
        if (currentBgMusicObjectUrl) URL.revokeObjectURL(currentBgMusicObjectUrl);
        currentBgMusicObjectUrl = null;
        return;
    }
    
    const musicUrl = await getAssetUrl(musicValue);
    
    if(musicUrl && backgroundMusicAudio.src !== musicUrl){
        if (currentBgMusicObjectUrl) URL.revokeObjectURL(currentBgMusicObjectUrl);
        if (musicUrl.startsWith('blob:')) currentBgMusicObjectUrl = musicUrl;
        
        backgroundMusicAudio.src = musicUrl;
        backgroundMusicAudio.loop = (mode === 'repeat');
        backgroundMusicAudio.play().catch(e => {
            if (e.name === 'NotAllowedError') console.log("BG music autoplay blocked. User interaction required.");
            else console.warn("Background music playback failed:", e);
        });
    } else if (musicUrl && backgroundMusicAudio.paused) {
        backgroundMusicAudio.play().catch(e => console.warn("Resuming music failed:", e));
    }
}
window.controlBackgroundMusic = controlBackgroundMusic;

function startSlideshow() {
    clearInterval(imageSlideshowIntervalId);
    if (localStorage.getItem(LS_SYSTEM_ENABLED_KEY) !== 'true') return;

    if (localStorage.getItem(LS_SLIDESHOW_ENABLED) === 'true') {
        const interval = (localStorage.getItem(LS_SLIDESHOW_INTERVAL) || 10) * 1000;
        imageSlideshowIntervalId = setInterval(async () => {
            await applyBackgroundImage('random');
            applyImageOverlayAndBlur();
            applyVerseCardOpacity();
        }, interval);
    }
}

async function loadAndApplyAVSettings() {
    clearInterval(imageSlideshowIntervalId);

    const isAVSystemEnabled = localStorage.getItem(LS_SYSTEM_ENABLED_KEY) === 'true';

    if (!isAVSystemEnabled) {
        await applyBackgroundImage('none');
    } else {
        const savedBgImage = localStorage.getItem(LS_SELECTED_BG_IMAGE) || 'none';
        if (localStorage.getItem(LS_SLIDESHOW_ENABLED) === 'true') {
            await applyBackgroundImage('random');
            startSlideshow();
        } else {
            await applyBackgroundImage(savedBgImage);
        }
    }

    // These should run regardless to either apply effects or clear them
    applyImageOverlayAndBlur();
    applyVerseCardOpacity();
    await controlBackgroundMusic();
}
window.loadAndApplyAVSettings = loadAndApplyAVSettings;

window.addEventListener('storage', (event) => {
    if (event.key.startsWith('av_')) {
        console.log(`AV setting changed in another tab: ${event.key}. Re-applying.`);
        loadAndApplyAVSettings();
    }
});