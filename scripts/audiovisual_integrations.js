// scripts/audiovisual_integrations.js
console.log("Audiovisual Integrations script loaded (v3 - Enhanced Robustness).");

// --- Configuration: Define your assets here ---
// Ensure these paths are relative to your index.html file
const AVAILABLE_BACKGROUND_IMAGES = [
    { name: "Abstract Blue", path: "assets/images/bg/test.jpg" },
    { name: "Mountain Sunrise", path: "assets/images/bg/test1.jpg" },
    { name: "Quiet Forest", path: "assets/images/bg/quiet_forest.jpg" },
    { name: "Starry Sky", path: "assets/images/bg/starry_sky.jpg" },
    { name: "Ocean Waves", path: "assets/images/bg/ocean_waves.jpg" },
    // { name: "Non Existent Image", path: "assets/images/bg/non_existent.jpg" } // For testing image errors
];

const AVAILABLE_VERSE_CHANGE_SOUNDS = [
    { name: "Dwink", path: "assets/sounds/effects/dwink.m4a" }, // Note: .m4a might not be supported by all browsers without specific codecs. MP3/WAV/OGG are safer.
    { name: "Page Turn", path: "assets/sounds/effects/page_turn.wav" },
    { name: "Gentle Bell", path: "assets/sounds/effects/gentle_bell.ogg" },
    // { name: "Non Existent Sound", path: "assets/sounds/effects/missing_sound.mp3" }
];

const AVAILABLE_BACKGROUND_MUSIC = [
    { name: "Peaceful Ambience", path: "assets/sounds/music/test.mp3" },
    { name: "Meditation Melody", path: "assets/sounds/music/meditation_melody.ogg" },
    { name: "Nature's Calm", path: "assets/sounds/music/natures_calm.wav" }, // CORRECTED: Added colon
    // { name: "Non Existent Music", path: "assets/sounds/music/missing_music.mp3" }
];

// --- DOM Element References (to be initialized by main_app_script.js) ---
let mainContentAreaAV = null;
let bgImageSelectorAV = null;
let verseSoundSelectorAV = null;
let bgMusicSelectorAV = null;
let bgMusicVolumeSliderAV = null;
let bgMusicVolumeLabelAV = null;
let bgImageOverlayToggleAV = null;
let bgImageOverlayOpacitySliderAV = null;
let bgImageOverlayOpacityLabelAV = null;
let bgImageBlurSliderAV = null;
let bgImageBlurLabelAV = null;

// --- Audio Elements & State ---
let verseChangeAudio = new Audio();
let backgroundMusicAudio = new Audio();
backgroundMusicAudio.loop = true; // Background music should loop

// Generic error handler for audio elements
function handleAudioError(event, type) {
    const audioElement = event.target;
    console.warn(`Error with ${type} audio:`, audioElement.error);
    console.warn(`Audio source was: ${audioElement.src}`);
    // You could add user-facing error messages here if needed, or attempt to reset selectors.
    // For example, if an explicitly selected sound fails, revert the selector to "None".
    if (type === "verse change sound" && verseSoundSelectorAV && verseSoundSelectorAV.value === audioElement.currentSrc.substring(audioElement.currentSrc.lastIndexOf('/') + 1)) {
        // verseSoundSelectorAV.value = 'none'; // Uncomment to auto-reset on error
        // localStorage.setItem(LS_SELECTED_VERSE_SOUND, 'none');
        console.warn(`Failed to load selected verse change sound: ${audioElement.src}`);
    } else if (type === "background music" && bgMusicSelectorAV && bgMusicSelectorAV.value === audioElement.currentSrc.substring(audioElement.currentSrc.lastIndexOf('/') + 1)) {
        // bgMusicSelectorAV.value = 'none'; // Uncomment to auto-reset
        // playBackgroundMusic('none');
        // localStorage.setItem(LS_SELECTED_BG_MUSIC, 'none');
        console.warn(`Failed to load selected background music: ${audioElement.src}`);
    }
}
verseChangeAudio.addEventListener('error', (e) => handleAudioError(e, 'verse change sound'));
backgroundMusicAudio.addEventListener('error', (e) => handleAudioError(e, 'background music'));

// --- LocalStorage Keys ---
const LS_SELECTED_BG_IMAGE = 'av_selectedBgImage';
const LS_SELECTED_VERSE_SOUND = 'av_selectedVerseSound';
const LS_SELECTED_BG_MUSIC = 'av_selectedBgMusic';
const LS_BG_MUSIC_VOLUME = 'av_bgMusicVolume';
const LS_BG_IMAGE_OVERLAY_ENABLED = 'av_bgImageOverlayEnabled';
const LS_BG_IMAGE_OVERLAY_OPACITY = 'av_bgImageOverlayOpacity';
const LS_BG_IMAGE_BLUR = 'av_bgImageBlur';

// --- Initialization Function (Called by main_app_script.js) ---
function initAVSettings(elements) {
    mainContentAreaAV = elements.mainContentArea;
    bgImageSelectorAV = elements.bgImageSelector;
    verseSoundSelectorAV = elements.verseSoundSelector;
    bgMusicSelectorAV = elements.bgMusicSelector;
    bgMusicVolumeSliderAV = elements.bgMusicVolumeSlider;
    bgMusicVolumeLabelAV = elements.bgMusicVolumeLabel;
    bgImageOverlayToggleAV = elements.bgImageOverlayToggle;
    bgImageOverlayOpacitySliderAV = elements.bgImageOverlayOpacitySlider;
    bgImageOverlayOpacityLabelAV = elements.bgImageOverlayOpacityLabel;
    bgImageBlurSliderAV = elements.bgImageBlurSlider;
    bgImageBlurLabelAV = elements.bgImageBlurLabel;

    // Critical check
    if (!mainContentAreaAV || !bgImageSelectorAV || !verseSoundSelectorAV || !bgMusicSelectorAV || 
        !bgMusicVolumeSliderAV || !bgImageOverlayToggleAV || !bgImageOverlayOpacitySliderAV || !bgImageBlurSliderAV) {
        console.error("AV Integration Error: One or more critical DOM elements for settings were not found. Audiovisual features might be partially or fully disabled. Check element IDs in index.html and main_app_script.js.");
        // Optionally, disable parts of the UI if elements are missing
        return;
    }

    populateAVSelectors();
    loadAndApplyAVSettings(); // Loads settings from LocalStorage and applies them
    setupAVEventListeners();
    console.log("Audiovisual settings initialized.");
}
window.initAVSettings = initAVSettings; // Expose to main_app_script

function populateAVSelectors() {
    const populate = (selector, items, type) => {
        if (!selector) return;
        selector.innerHTML = ''; // Clear previous options
        selector.add(new Option("None", "none"));
        if (type === 'image' && items.length > 0) {
            selector.add(new Option("Random from List", "random"));
        }
        items.forEach(item => {
            if (item && typeof item.name === 'string' && typeof item.path === 'string') {
                selector.add(new Option(item.name, item.path));
            } else {
                console.warn(`Skipping invalid item in AVAILABLE_${type.toUpperCase()}_S:`, item);
            }
        });
    };

    populate(bgImageSelectorAV, AVAILABLE_BACKGROUND_IMAGES, 'image');
    populate(verseSoundSelectorAV, AVAILABLE_VERSE_CHANGE_SOUNDS, 'sound');
    populate(bgMusicSelectorAV, AVAILABLE_BACKGROUND_MUSIC, 'music');
}

function setupAVEventListeners() {
    // Background Image
    if (bgImageSelectorAV) bgImageSelectorAV.addEventListener('change', (e) => {
        const path = e.target.value;
        applyBackgroundImage(path);
        localStorage.setItem(LS_SELECTED_BG_IMAGE, path);
    });

    // Verse Change Sound
    if (verseSoundSelectorAV) verseSoundSelectorAV.addEventListener('change', (e) => {
        const path = e.target.value;
        if (path !== "none" && path !== "") {
            verseChangeAudio.src = path;
            verseChangeAudio.play().catch(err => { // Preview sound, catch autoplay issues
                if (err.name !== 'NotAllowedError') console.warn("Verse sound preview failed:", err);
            });
        } else {
            verseChangeAudio.src = ""; // Clear src if "None"
        }
        localStorage.setItem(LS_SELECTED_VERSE_SOUND, path);
    });

    // Background Music
    if (bgMusicSelectorAV) bgMusicSelectorAV.addEventListener('change', (e) => {
        const path = e.target.value;
        playBackgroundMusic(path); // Function handles 'none' or specific path
        localStorage.setItem(LS_SELECTED_BG_MUSIC, path);
    });

    // Background Music Volume
    if (bgMusicVolumeSliderAV) bgMusicVolumeSliderAV.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        backgroundMusicAudio.volume = volume;
        if (bgMusicVolumeLabelAV) bgMusicVolumeLabelAV.textContent = `Music Volume: ${Math.round(volume * 100)}%`;
        localStorage.setItem(LS_BG_MUSIC_VOLUME, volume.toString());
    });

    // Image Overlay Toggle
    if (bgImageOverlayToggleAV) bgImageOverlayToggleAV.addEventListener('change', (e) => {
        applyImageOverlayAndBlur();
        localStorage.setItem(LS_BG_IMAGE_OVERLAY_ENABLED, e.target.checked.toString());
    });

    // Image Overlay Opacity
    if (bgImageOverlayOpacitySliderAV) bgImageOverlayOpacitySliderAV.addEventListener('input', (e) => {
        const opacity = parseFloat(e.target.value);
        if (bgImageOverlayOpacityLabelAV) bgImageOverlayOpacityLabelAV.textContent = `Overlay Opacity: ${Math.round(opacity * 100)}%`;
        applyImageOverlayAndBlur();
        localStorage.setItem(LS_BG_IMAGE_OVERLAY_OPACITY, opacity.toString());
    });

    // Image Blur
    if (bgImageBlurSliderAV) bgImageBlurSliderAV.addEventListener('input', (e) => {
        const blur = parseInt(e.target.value, 10);
        if (bgImageBlurLabelAV) bgImageBlurLabelAV.textContent = `Image Blur: ${blur}px`;
        applyImageOverlayAndBlur();
        localStorage.setItem(LS_BG_IMAGE_BLUR, blur.toString());
    });
}

// Applies the selected background image using CSS variables for more robust styling with pseudo-elements
function applyBackgroundImage(selectedPath) {
    if (!mainContentAreaAV) return;

    // Always remove the class first to reset state
    mainContentAreaAV.classList.remove('av-has-background-image');
    mainContentAreaAV.style.removeProperty('--av-current-bg-image-url');

    let imageToApply = null;

    if (selectedPath === "none" || !selectedPath) {
        // Handled by class removal and variable clearing above
    } else if (selectedPath === "random") {
        const validImages = AVAILABLE_BACKGROUND_IMAGES.filter(img => img && img.path);
        if (validImages.length > 0) {
            const randomIndex = Math.floor(Math.random() * validImages.length);
            imageToApply = validImages[randomIndex].path;
        }
    } else { // Specific image path from selector
        imageToApply = selectedPath;
    }

    if (imageToApply) {
        // Verify image exists (optional, but good for debugging)
        // const imgTest = new Image();
        // imgTest.onload = () => {
        //     console.log("AV: Background image confirmed loadable:", imageToApply);
        //     mainContentAreaAV.style.setProperty('--av-current-bg-image-url', `url('${imageToApply}')`);
        //     mainContentAreaAV.classList.add('av-has-background-image');
        //     applyImageOverlayAndBlur(); // Apply dependent styles once image is confirmed
        // };
        // imgTest.onerror = () => {
        //     console.warn("AV: Failed to load background image for main content area:", imageToApply);
        //     // Fallback: remove class and var if image fails
        //     mainContentAreaAV.classList.remove('av-has-background-image');
        //     mainContentAreaAV.style.removeProperty('--av-current-bg-image-url');
        //     applyImageOverlayAndBlur();
        // };
        // imgTest.src = imageToApply;

        // Simpler: Assume image exists, browser will handle non-existent URLs gracefully (no image displayed)
        mainContentAreaAV.style.setProperty('--av-current-bg-image-url', `url('${imageToApply}')`);
        mainContentAreaAV.classList.add('av-has-background-image');
    }
    // Apply overlay and blur regardless of image load success (it will look fine if image fails)
    applyImageOverlayAndBlur();
}


// Applies overlay and blur effects based on current settings and whether an image is active
function applyImageOverlayAndBlur() {
    if (!mainContentAreaAV) return;

    const overlayEnabled = bgImageOverlayToggleAV ? bgImageOverlayToggleAV.checked : false;
    const overlayOpacity = bgImageOverlayOpacitySliderAV ? parseFloat(bgImageOverlayOpacitySliderAV.value) : 0.5;
    const imageBlur = bgImageBlurSliderAV ? parseInt(bgImageBlurSliderAV.value, 10) : 0;

    // Check if the 'av-has-background-image' class is present (set by applyBackgroundImage)
    if (mainContentAreaAV.classList.contains('av-has-background-image')) {
        mainContentAreaAV.style.setProperty('--av-bg-image-blur', `${imageBlur}px`);
        if (overlayEnabled) {
            mainContentAreaAV.style.setProperty('--av-bg-image-overlay-opacity', overlayOpacity.toString());
            mainContentAreaAV.classList.add('av-overlay-enabled');
        } else {
            mainContentAreaAV.classList.remove('av-overlay-enabled');
            mainContentAreaAV.style.setProperty('--av-bg-image-overlay-opacity', '0'); // Ensure opacity is 0 if disabled
        }
    } else {
        // No background image active, so reset visual effect properties
        mainContentAreaAV.style.setProperty('--av-bg-image-blur', `0px`);
        mainContentAreaAV.classList.remove('av-overlay-enabled');
        mainContentAreaAV.style.setProperty('--av-bg-image-overlay-opacity', '0');
    }
}


// --- Playback Functions (Called by main_app_script.js or internally) ---
function playVerseChangeSound() {
    if (verseChangeAudio.src && verseChangeAudio.src !== window.location.href && verseSoundSelectorAV && verseSoundSelectorAV.value !== "none") {
        verseChangeAudio.currentTime = 0; // Rewind to start if playing again quickly
        const playPromise = verseChangeAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') { // Ignore common autoplay blocks unless it's a real error
                    console.warn("Verse change sound playback problem:", error);
                }
            });
        }
    }
}
window.playVerseChangeSound = playVerseChangeSound;

function playBackgroundMusic(path) {
    const newMusicPath = (path === "none" || !path) ? "" : new URL(path, window.location.href).href;
    const currentMusicPath = backgroundMusicAudio.currentSrc ? new URL(backgroundMusicAudio.currentSrc, window.location.href).href : "";
    
    if (!newMusicPath) { // Stop music if "none" or empty path
        if (!backgroundMusicAudio.paused) backgroundMusicAudio.pause();
        backgroundMusicAudio.src = "";
        return;
    }

    if (currentMusicPath !== newMusicPath) { // New track selected
        backgroundMusicAudio.src = path; // Path here should be relative or absolute as provided
    }
    
    // Try to play if src is set (either new or same but was paused)
    if (backgroundMusicAudio.src && backgroundMusicAudio.src !== window.location.href) {
        if (backgroundMusicAudio.paused) { // Play if paused or new src set
            const playPromise = backgroundMusicAudio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    if (error.name === 'NotAllowedError') {
                        console.log("Background music autoplay blocked by browser. User interaction required to start.");
                        // Optionally, display a "click to play music" button or message.
                    } else if (error.name !== 'AbortError') {
                        console.warn("Background music playback failed:", error);
                    }
                });
            }
        }
    }
}
window.playBackgroundMusic = playBackgroundMusic;


// Loads settings from LocalStorage and applies them to the UI elements and audio/visual state
function loadAndApplyAVSettings() {
    // Background Image
    const savedBgImage = localStorage.getItem(LS_SELECTED_BG_IMAGE);
    if (bgImageSelectorAV) {
        bgImageSelectorAV.value = Array.from(bgImageSelectorAV.options).some(opt => opt.value === savedBgImage) ? savedBgImage : 'none';
    }
    // applyBackgroundImage will be called based on selector value, which might need a separate call
    // if not handled by a 'change' event during population or value setting.
    // For safety, call it after setting the selector's value:
    applyBackgroundImage(bgImageSelectorAV ? bgImageSelectorAV.value : 'none');


    // Verse Change Sound
    const savedVerseSound = localStorage.getItem(LS_SELECTED_VERSE_SOUND);
    if (verseSoundSelectorAV) {
        verseSoundSelectorAV.value = Array.from(verseSoundSelectorAV.options).some(opt => opt.value === savedVerseSound) ? savedVerseSound : 'none';
        verseChangeAudio.src = (verseSoundSelectorAV.value !== 'none') ? verseSoundSelectorAV.value : "";
    }

    // Background Music & Volume
    const savedBgMusic = localStorage.getItem(LS_SELECTED_BG_MUSIC);
    const savedBgMusicVolume = parseFloat(localStorage.getItem(LS_BG_MUSIC_VOLUME) || "0.3"); // Default 0.3
    if (bgMusicSelectorAV) {
        bgMusicSelectorAV.value = Array.from(bgMusicSelectorAV.options).some(opt => opt.value === savedBgMusic) ? savedBgMusic : 'none';
    }
    if (bgMusicVolumeSliderAV) bgMusicVolumeSliderAV.value = savedBgMusicVolume;
    if (bgMusicVolumeLabelAV) bgMusicVolumeLabelAV.textContent = `Music Volume: ${Math.round(savedBgMusicVolume * 100)}%`;
    backgroundMusicAudio.volume = savedBgMusicVolume;

    // Attempt to play BG music based on saved settings. 
    // IMPORTANT: This might be blocked by browser autoplay policies until user interaction.
    playBackgroundMusic(bgMusicSelectorAV ? bgMusicSelectorAV.value : 'none');


    // Image Overlay & Blur Settings (these set slider values, applyImageOverlayAndBlur uses these values)
    const savedOverlayEnabled = localStorage.getItem(LS_BG_IMAGE_OVERLAY_ENABLED) === 'true';
    const savedOverlayOpacity = parseFloat(localStorage.getItem(LS_BG_IMAGE_OVERLAY_OPACITY) || "0.5");
    const savedImageBlur = parseInt(localStorage.getItem(LS_BG_IMAGE_BLUR) || "0", 10);

    if (bgImageOverlayToggleAV) bgImageOverlayToggleAV.checked = savedOverlayEnabled;
    if (bgImageOverlayOpacitySliderAV) bgImageOverlayOpacitySliderAV.value = savedOverlayOpacity;
    if (bgImageOverlayOpacityLabelAV) bgImageOverlayOpacityLabelAV.textContent = `Overlay Opacity: ${Math.round(savedOverlayOpacity * 100)}%`;
    if (bgImageBlurSliderAV) bgImageBlurSliderAV.value = savedImageBlur;
    if (bgImageBlurLabelAV) bgImageBlurLabelAV.textContent = `Image Blur: ${savedImageBlur}px`;
    
    // Final application of visual effects based on all loaded settings.
    applyImageOverlayAndBlur();
}