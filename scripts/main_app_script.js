// main_app_script.js
document.addEventListener('DOMContentLoaded', () => {
    // Ensure shared functions are available
    if (typeof initDB !== 'function' || 
        typeof getTranslationsList !== 'function' || 
        typeof getVersesByTranslation !== 'function' || 
        typeof getAllCollectionsFromDB !== 'function' || 
        typeof saveCollectionToDB !== 'function' || 
        typeof parseBibleReferenceWithNote !== 'function' || 
        typeof applyTheme !== 'function') {
        console.error("Shared functions from script.js are not available. Make sure script.js is loaded first and correctly.");
        alert("Critical application error: Core functions missing. The app may not work correctly.");
        const vt = document.getElementById('verse-text');
        if (vt) vt.innerHTML = "<p>Application Error: Core functions missing. Check console.</p>";
        return;
    }
    
    // --- DOM Element References ---
    const bodyElement = document.body;
    const mainContentArea = document.getElementById('mainContentArea'); 
    const verseTextElement = document.getElementById('verse-text');
    const statusMessageElement = document.getElementById('statusMessage');
    const optionsContainer = document.querySelector('.options-container');
    const optionsBtn = document.getElementById('optionsBtn');
    const optionsPanel = document.getElementById('optionsPanel');
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    
    let timerPrevVerseBtn = null; 
    let timerNextVerseBtn = null; 
    let randomVerseBtn = null;    
    let pausePlayBtn = null;      

    const fullscreenToggleBtn = document.getElementById('fullscreenToggleBtn');
    const settingsModal = document.getElementById('settingsModal');
    const modalCloseBtnSettings = document.getElementById('modalCloseBtnSettings');
    const translationSelectorOptionsPanel = document.getElementById('translationSelectorOptionsPanel');
    const activeCollectionForSettingsDisplay = document.getElementById('activeCollectionForSettingsDisplay');
    const intervalSlider = document.getElementById('intervalSlider');
    const intervalValueLabel = document.getElementById('intervalValueLabel');
    const showProgressBarToggle = document.getElementById('showProgressBarToggle');
    const themeSelector = document.getElementById('themeSelector');
    const fontSizeSlider = document.getElementById('fontSizeSlider');
    const fontSizeValueLabel = document.getElementById('fontSizeValueLabel');
    const verseFontSelector = document.getElementById('verseFontSelector');
    const openCollectionsModalBtn = document.getElementById('openCollectionsModalBtn');
    const activeCollectionDisplay = document.getElementById('activeCollectionDisplay');
    const collectionsModal = document.getElementById('collectionsModal');
    const modalCloseBtnCollections = document.getElementById('modalCloseBtnCollections');
    const collectionSearchInput = document.getElementById('collectionSearchInput');
    const collectionsListContainer = document.getElementById('collectionsListContainer');
    const verseCountDisplay = document.getElementById('verseCountDisplay');
    const viewModeSelector = document.getElementById('viewModeSelector');
    const dynamicBrandArea = document.getElementById('dynamicBrandArea');
    const goodmanLogoInStatus = document.getElementById('goodmanLogoInStatus');

    // Status Bar Elements
    const appStatusBar = document.getElementById('appStatusBar');
    const statusBarTimeLeft = document.getElementById('statusBarTimeLeft');
    const statusBarFullWidthProgressFill = document.getElementById('statusBarFullWidthProgressFill');

    // Modal & Panel References
    const notesModal = document.getElementById('notesModal');
    const crossRefPanel = document.getElementById('crossRefPanel');

    // Quick Seek Panel elements
    const quickSeekPanel = document.getElementById('quickSeekPanel');
    const toggleQuickSeekPanelBtnInStatusBar = document.getElementById('toggleQuickSeekPanelBtnInStatusBar');
    const quickSeekControlsContainer = document.getElementById('quickSeekControlsContainer');
    const quickSeekNoteBtn = document.getElementById('quickSeekNoteBtn'); 
    const quickSeekGoToContainer = document.getElementById('quickSeekGoToContainer');
    const quickSeekReferenceInput = document.getElementById('quickSeekReferenceInput');
    const quickSeekGoBtn = document.getElementById('quickSeekGoBtn');
    const openReferencePickerBtn = document.getElementById('openReferencePickerBtn');

    // Reference Picker Modal elements
    const referencePickerModal = document.getElementById('referencePickerModal');
    const modalCloseBtnRefPicker = document.getElementById('modalCloseBtnRefPicker');
    const refPickerBook = document.getElementById('refPickerBook');
    const refPickerChapter = document.getElementById('refPickerChapter');
    const refPickerVerse = document.getElementById('refPickerVerse');
    const refPickerGoBtn = document.getElementById('refPickerGoBtn');

    // AV Settings Master Toggle
    const toggleAVSystemBtn = document.getElementById('toggleAVSystemBtn');


    // --- SVG Icons ---
    const playIconSVG = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>';
    const pauseIconSVG = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>';
    const enterFullscreenIconSVG = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>';
    const exitFullscreenIconSVG = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"></path></svg>';

    // --- State Variables ---
    let fullBibleVerses = [];
    window.fullBibleVerses = fullBibleVerses; // EXPOSE for other scripts
    let activeVerseList = [];
    let currentVerseIndex = 0;
    let allStoredCollections = {};
    let activeCollectionName = null;
    let currentTranslationId = null;
    let currentViewMode = 'fullChapter'; 
    const VIEW_MODE_FULL_COLLECTION = 'fullCollection'; 
    const VIEW_MODE_MULTI_TRANSLATION = 'multiTranslation'; 

    let translationVerseCache = {};

    const COLLECTION_INDICES_LS_KEY = 'bibleAppCollectionIndices';
    const VIEW_MODE_LS_KEY = 'bibleAppViewMode';
    const AV_SYSTEM_ENABLED_LS_KEY = 'av_systemEnabled';
    const FULL_BIBLE_INDEX_LS_KEY = 'bibleAppFullBibleIndex';
    const LS_REF_PICKER_BOOK = 'refPickerLastBook';
    const LS_REF_PICKER_CHAPTER = 'refPickerLastChapter';
    const LS_REF_PICKER_VERSE = 'refPickerLastVerse';


    // --- Timer & Control Flags ---
    const DEFAULT_INTERVAL_MINUTES = 4;
    let VERSE_CHANGE_INTERVAL_MS = DEFAULT_INTERVAL_MINUTES * 60 * 1000;
    let TOTAL_DURATION_SECONDS = VERSE_CHANGE_INTERVAL_MS / 1000;
    let timeLeftInSeconds = TOTAL_DURATION_SECONDS;
    let isPaused = false;
    let autoAdvanceTimeoutId;
    let countdownIntervalId;
    let isProgressHiddenByUser = false;
    const PULSE_THRESHOLD_SECONDS = 5;
    let verseChangeFlashTimeoutId;
    let wasPausedBeforeModalOpen = null;

    let allTimerButtonsInOptions = []; 


    // --- Pinch to Zoom State ---
    let initialPinchDistance = 0;
    let currentFontSizeMultiplier = 1.0; 
    const MIN_FONT_MULTIPLIER = 0.5; 
    const MAX_FONT_MULTIPLIER = 4.0; 

    // --- EXPOSED FUNCTIONS for other modules ---
    window.getCurrentVerseData = async () => {
        if (!currentTranslationId || fullBibleVerses.length === 0) return null;
        if (currentViewMode === VIEW_MODE_FULL_COLLECTION || currentVerseIndex < 0 || activeVerseList.length === 0) return null;

        const entry = activeVerseList[currentVerseIndex];
        if (!entry) return null;

        const bookKey = entry._book;
        const chapNum = entry._chapter;
        const startVerseNum = entry._startVerse;
        const endVerseNum = entry._endVerse;

        const entryVerses = fullBibleVerses
            .filter(v => v._book === bookKey && v._chapter === chapNum && v._verse >= startVerseNum && v._verse <= endVerseNum)
            .sort((a, b) => a._verse - b._verse);
        
        if (entryVerses.length === 0) return { reference: entry.reference, text: "(Text not found in current translation)" };
        
        const text = entryVerses.map(v => v.text.trim()).join(' ');
        
        return {
            reference: entry.reference,
            text: text
        };
    };

    function appShowStatus(message, isError = false, duration = 3000) {
        if (typeof showStatusMessage === 'function') {
            showStatusMessage(message, isError, duration, statusMessageElement);
        } else {
            console.warn("showStatusMessage not found, using fallback.");
            statusMessageElement.textContent = message;
            statusMessageElement.style.color = isError ? 'var(--brand-color)' : 'var(--text-color)';
            if (duration > 0) setTimeout(() => { if (statusMessageElement.textContent === message) statusMessageElement.textContent = ''; }, duration);
        }
    }
    window.appShowStatus = appShowStatus; // Expose for other scripts

    function openModal(modalElement) {
        if (!modalElement) return;
        if (wasPausedBeforeModalOpen === null) {
            wasPausedBeforeModalOpen = isPaused;
            if (!isPaused) {
                pauseTimer(true);
            }
        }
        modalElement.style.display = 'block';
    }
    window.openModal = openModal;

    function closeModal(modalElement) {
        if (!modalElement) return;
        modalElement.style.display = 'none';

        const isAnotherModalOpen = [settingsModal, collectionsModal, notesModal, referencePickerModal].some(m => m && m.style.display === 'block');

        if (!isAnotherModalOpen) {
            if (wasPausedBeforeModalOpen === false) {
                resumeTimer();
            }
            wasPausedBeforeModalOpen = null;
        }
    }
    window.closeModal = closeModal;

    // --- Utility Functions ---
    function updateAllTimerButtonsArray() {
        if (quickSeekPanel) {
            timerPrevVerseBtn = quickSeekPanel.querySelector('#timerPrevVerseBtn');
            pausePlayBtn = quickSeekPanel.querySelector('#pausePlayBtn');
            timerNextVerseBtn = quickSeekPanel.querySelector('#timerNextVerseBtn');
            randomVerseBtn = quickSeekPanel.querySelector('#randomVerseBtn');
        } else {
            console.error("Quick Seek Panel not found in DOM for button reassignment!");
            timerPrevVerseBtn = null;
            pausePlayBtn = null;
            timerNextVerseBtn = null;
            randomVerseBtn = null;
        }
        
        allTimerButtonsInOptions = [timerPrevVerseBtn, pausePlayBtn, timerNextVerseBtn, randomVerseBtn].filter(btn => btn != null);
    }

    function setControlsState(enabled) {
        updateAllTimerButtonsArray(); 
        allTimerButtonsInOptions.forEach(btn => { if (btn) btn.disabled = !enabled;});
        if(intervalSlider) intervalSlider.disabled = !enabled;
        
        if (appStatusBar) {
             const isProgressSystemActive = enabled && 
                                         !isProgressHiddenByUser && 
                                         activeVerseList.length > 0 && 
                                         currentVerseIndex >= 0 &&
                                         currentViewMode !== VIEW_MODE_FULL_COLLECTION;
             appStatusBar.classList.toggle('progress-active', isProgressSystemActive);
             appStatusBar.classList.toggle('progress-inactive', !isProgressSystemActive);
        }
        if (!enabled) {
            stopTimers();
        }
        updateProgressBar();
    }

    function getStoredCollectionIndices() {
        try {
            const stored = localStorage.getItem(COLLECTION_INDICES_LS_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error("Error reading collection indices:", e);
            return {};
        }
    }

    function saveCollectionIndex(collectionName, index) {
        if (!collectionName) return;
        try {
            const indices = getStoredCollectionIndices();
            indices[collectionName] = index;
            localStorage.setItem(COLLECTION_INDICES_LS_KEY, JSON.stringify(indices));
        } catch (e) {
            console.error("Error saving collection index:", e);
        }
    }

    function updateVerseCountDisplay() {
        if (!verseCountDisplay) return;

        if (currentViewMode === VIEW_MODE_FULL_COLLECTION) {
            if (activeCollectionName && activeVerseList && activeVerseList.length > 0) {
                verseCountDisplay.textContent = `${activeVerseList.length} Entries in Collection`;
                verseCountDisplay.style.display = 'block';
            } else if (activeCollectionName) {
                verseCountDisplay.textContent = `0 Entries in Collection`;
                verseCountDisplay.style.display = 'block';
            } else {
                verseCountDisplay.style.display = 'none';
            }
            return;
        }

        if (activeVerseList && activeVerseList.length > 0 && currentVerseIndex >=0 ) {
            const displayIndex = currentVerseIndex + 1;
            verseCountDisplay.textContent = `Entry ${displayIndex} / ${activeVerseList.length}`;
            verseCountDisplay.style.display = 'block';
        } else {
            verseCountDisplay.textContent = 'Entry 0 / 0';
            verseCountDisplay.style.display = activeCollectionName ? 'block' : 'none';
        }
    }

    async function loadCollectionsAndSetActive() {
        try {
            const collectionsArray = await getAllCollectionsFromDB();
            allStoredCollections = collectionsArray.reduce((acc, coll) => {
                coll.verses = (coll.verses || []).map(v => ({
                    _book: v._book,
                    _chapter: v._chapter,
                    _startVerse: v._startVerse || v._verse,
                    _endVerse: v._endVerse || v._verse,
                    reference: v.reference
                }));
                acc[coll.name] = coll;
                return acc;
            }, {});
        } catch (e) {
            console.error("Error loading collections from DB:", e);
            appShowStatus("Error loading collections.", true);
            allStoredCollections = {};
        }
        const lastActiveName = localStorage.getItem(LAST_ACTIVE_COLLECTION_LS_KEY);
        activeCollectionName = (lastActiveName && allStoredCollections[lastActiveName]) ? lastActiveName : null;
        updateActiveCollectionUIDisplay();
    }

    function updateActiveCollectionUIDisplay() {
        const displayName = activeCollectionName ? activeCollectionName : "-- Full Bible --";
        if (activeCollectionDisplay) {
            activeCollectionDisplay.textContent = displayName;
            activeCollectionDisplay.title = displayName;
        }
        if (activeCollectionForSettingsDisplay) {
            activeCollectionForSettingsDisplay.textContent = activeCollectionName ? activeCollectionName : "N/A (Full Bible selected)";
            const settingsItem = document.getElementById('activeCollectionActionsForSettings');
            if (settingsItem) {
                 settingsItem.style.display = activeCollectionName ? 'block' : 'none';
            }
        }
        if (quickSeekGoToContainer) {
            quickSeekGoToContainer.classList.toggle('visible', !activeCollectionName);
        }
        updateCollectionRelatedButtonStates();
        updateVerseCountDisplay();
    }

    function updateCollectionRelatedButtonStates() {
        if (quickSeekNoteBtn) quickSeekNoteBtn.disabled = false;
        if (openReferencePickerBtn) openReferencePickerBtn.disabled = fullBibleVerses.length === 0;
    }

    async function loadAndPopulateTranslationsDropdown() {
        const targetSelector = translationSelectorOptionsPanel;
        try {
            const translations = await getTranslationsList();
            if(targetSelector) targetSelector.innerHTML = ''; else return [];

            if (translations.length > 0) {
                translations.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)).forEach(t => {
                    const opt = document.createElement('option');
                    opt.value = t.id;
                    opt.textContent = t.name || t.id;
                    targetSelector.appendChild(opt);
                });
            } else {
                targetSelector.appendChild(new Option("-- No Translations Available --", ""));
                appShowStatus("No Bibles found. Use Data Manager (Settings) to import.", true, 5000);
            }
            return translations;
        } catch (error) {
            console.error("Error loading translations list:", error);
            appShowStatus("Could not load translations.", true);
            if(targetSelector) targetSelector.appendChild(new Option("-- Error Loading --", ""));
            return [];
        } finally {
            updateCollectionRelatedButtonStates(); 
        }
    }

    async function activateTranslation(translationIdToActivate) {
        stopTimers();
        setControlsState(false);
        if (verseTextElement) verseTextElement.innerHTML = "<p>Loading...</p>";
        if (dynamicBrandArea) dynamicBrandArea.textContent = "Loading...";
        updateVerseCountDisplay();

        if (!translationIdToActivate) {
            currentTranslationId = null;
            fullBibleVerses = [];
            window.fullBibleVerses = fullBibleVerses;
            localStorage.removeItem(LAST_ACTIVE_TRANSLATION_LS_KEY);
            await setActiveVerseList();
            return;
        }

        try {
            appShowStatus(`Loading translation "${translationIdToActivate.replace(/\.xml$/i, '')}"...`, false, 0);
            let verses;

            if (translationVerseCache[translationIdToActivate] && translationVerseCache[translationIdToActivate].length > 0) {
                verses = translationVerseCache[translationIdToActivate];
            } else {
                verses = await getVersesByTranslation(translationIdToActivate);
                if (verses && verses.length > 0) {
                    translationVerseCache[translationIdToActivate] = verses;
                } else {
                    delete translationVerseCache[translationIdToActivate];
                }
            }

            if (verses && verses.length > 0) {
                currentTranslationId = translationIdToActivate;
                fullBibleVerses = verses;
                window.fullBibleVerses = fullBibleVerses;
                localStorage.setItem(LAST_ACTIVE_TRANSLATION_LS_KEY, currentTranslationId);
                appShowStatus(`Loaded "${currentTranslationId.replace(/\.xml$/i, '')}" (${fullBibleVerses.length} verses).`, false, 3000);
            } else {
                 currentTranslationId = translationIdToActivate;
                 fullBibleVerses = [];
                 window.fullBibleVerses = fullBibleVerses;
                 localStorage.setItem(LAST_ACTIVE_TRANSLATION_LS_KEY, currentTranslationId);
                 delete translationVerseCache[currentTranslationId];
                 appShowStatus(`No verses found for "${translationIdToActivate.replace(/\.xml$/i, '')}". Select another or re-import.`, true, 5000);
            }
        } catch (error) {
            console.error(`Error activating translation ${translationIdToActivate}:`, error);
            appShowStatus(`Error loading translation: ${error.message || 'Unknown error'}`, true);
            currentTranslationId = null;
            fullBibleVerses = [];
            window.fullBibleVerses = fullBibleVerses;
            delete translationVerseCache[translationIdToActivate];
            localStorage.removeItem(LAST_ACTIVE_TRANSLATION_LS_KEY);
        } finally {
             await setActiveVerseList();
             populateBookPicker();
             updateCollectionRelatedButtonStates();
        }
    }

    if(translationSelectorOptionsPanel) translationSelectorOptionsPanel.addEventListener('change', async (e) => {
        await activateTranslation(e.target.value);
        if(optionsPanel) optionsPanel.classList.remove('visible');
    });

    async function handleViewModeChange(event) {
        const newMode = event.target.value;
        if (newMode === currentViewMode) return; 

        currentViewMode = newMode;
        localStorage.setItem(VIEW_MODE_LS_KEY, currentViewMode);
        if (viewModeSelector && viewModeSelector.options[viewModeSelector.selectedIndex]) {
            appShowStatus(`View mode: ${viewModeSelector.options[viewModeSelector.selectedIndex].text}`, false, 2000);
        }

        if (optionsPanel) optionsPanel.classList.remove('visible');

        if (currentViewMode === VIEW_MODE_FULL_COLLECTION) {
            stopTimers();
            setControlsState(false); 
        } else {
             if (activeVerseList.length > 0 && currentVerseIndex >= 0) {
                // displayVerse will handle restarting timers if applicable
            } else {
                setControlsState(false);
            }
        }
        displayVerse(currentVerseIndex); 
    }
    if(viewModeSelector) viewModeSelector.addEventListener('change', handleViewModeChange);

    async function setActiveVerseList() {
        stopTimers(); 
        updateActiveCollectionUIDisplay(); 

        let noVersesMessage = "Please import a Bible via Data Manager (Settings).";
        if (!db) {
            noVersesMessage = "Database connection error.";
        } else if (!currentTranslationId && ![VIEW_MODE_MULTI_TRANSLATION, VIEW_MODE_FULL_COLLECTION].includes(currentViewMode)) {
            const availableTranslations = await getTranslationsList();
             noVersesMessage = availableTranslations.length > 0 ?
                "Please select an active Bible translation." :
                "No Bible translations found. Please import one via Data Manager.";
        } else if ((!fullBibleVerses || fullBibleVerses.length === 0) && ![VIEW_MODE_MULTI_TRANSLATION, VIEW_MODE_FULL_COLLECTION].includes(currentViewMode)) { 
             noVersesMessage = `Selected Bible "${(currentTranslationId || 'N/A').replace(/\.xml$/i, '')}" appears empty or failed to load fully.`;
        }
        if (verseTextElement) verseTextElement.dataset.noVersesMessage = noVersesMessage;


        if (activeCollectionName && allStoredCollections[activeCollectionName] ) {
            const currentCollectionData = allStoredCollections[activeCollectionName];
            activeVerseList = (currentCollectionData.verses || []).map(collVRef => ({
                _book: collVRef._book,
                _chapter: collVRef._chapter,
                _startVerse: collVRef._startVerse,
                _endVerse: collVRef._endVerse,
                reference: collVRef.reference
            })).filter(v => v && typeof v._book === 'string' && typeof v._chapter === 'number' && typeof v._startVerse === 'number');

            if (activeVerseList.length === 0 && currentViewMode !== VIEW_MODE_FULL_COLLECTION) { 
                 noVersesMessage = `Collection "${activeCollectionName}" is empty.`;
                 if(verseTextElement) verseTextElement.dataset.noVersesMessage = noVersesMessage;
                 appShowStatus(noVersesMessage, true, 5000);
            }

        } else {
            activeVerseList = (fullBibleVerses || []).map(v => ({
                _book: v._book,
                _chapter: v._chapter,
                _startVerse: v._verse,
                _endVerse: v._verse,
                reference: v.reference
            }));
        }

        if (currentViewMode !== VIEW_MODE_FULL_COLLECTION) {
            if (activeCollectionName && activeVerseList.length > 0) {
                const storedIndices = getStoredCollectionIndices();
                const savedIndex = storedIndices[activeCollectionName];
                currentVerseIndex = (typeof savedIndex === 'number' && savedIndex >= 0 && savedIndex < activeVerseList.length) ? savedIndex : 0;
            } else if (activeVerseList.length > 0){
                 const savedIndex = parseInt(localStorage.getItem(FULL_BIBLE_INDEX_LS_KEY), 10);
                 currentVerseIndex = (typeof savedIndex === 'number' && savedIndex >= 0 && savedIndex < activeVerseList.length) ? savedIndex : 0;
            } else {
                 currentVerseIndex = -1;
            }
        } else {
            currentVerseIndex = -1; 
        }

        if (currentViewMode === VIEW_MODE_FULL_COLLECTION) {
            stopTimers();
            setControlsState(false);
        }

        displayVerse(currentVerseIndex); 
        updateVerseCountDisplay(); 
    }

    function formatEntryVersesFromList(entry, bibleVersesList, translationName = "") {
        if (!entry) {
             return `<p><i>No entry specified.</i></p>`;
        }
        const bookKey = entry._book;
        const chapNum = entry._chapter;
        const startVerseNum = entry._startVerse;
        const endVerseNum = entry._endVerse;

        const entryVerses = bibleVersesList.filter(v =>
            v._book === bookKey &&
            v._chapter === chapNum &&
            v._verse >= startVerseNum &&
            v._verse <= endVerseNum
        );
        entryVerses.sort((a, b) => a._verse - b._verse);

        let html = "";
        if (entryVerses.length === 0) {
            const transMsg = translationName ? `in "${translationName.replace(/\.xml$/i, '')}"` : "in loaded content";
            return `<p><i>Entry "${entry.reference}" not found ${transMsg}.</i></p>`;
        }
        entryVerses.forEach(v => {
            const escapedText = v.text || "[Verse text not available]";
            html += `<p data-verse-num="${v._verse}" data-verse-id="${v._book}-${v._chapter}-${v._verse}">`;
            html += `<span class="verse-number">${v._verse}</span>`;
            html += `${escapedText}</p>`;
        });
        return html;
    }

    async function displayVerse(idx = currentVerseIndex) {
        updateAllTimerButtonsArray(); 

        if (currentViewMode !== VIEW_MODE_FULL_COLLECTION && 
            activeVerseList.length > 0 && 
            ( (currentVerseIndex !== idx && idx >=0) || 
              (currentVerseIndex >=0 && idx === currentVerseIndex && !isPaused) ) 
            ) {
            if (typeof window.playVerseChangeSound === 'function') {
                window.playVerseChangeSound(); 
            }
        }


        if (currentViewMode !== VIEW_MODE_FULL_COLLECTION) { 
            if (idx < 0 && activeVerseList.length === 0 && currentViewMode !== VIEW_MODE_MULTI_TRANSLATION) {
                if (verseTextElement) verseTextElement.innerHTML = `<p>${verseTextElement.dataset.noVersesMessage || "No verses available."}</p>`;
                if (dynamicBrandArea) dynamicBrandArea.textContent = "No Verses";
                updateVerseCountDisplay();
                setControlsState(false);
                updateCollectionRelatedButtonStates();
                return;
            }
            currentVerseIndex = (activeVerseList.length > 0 && idx >=0) ? Math.max(0, Math.min(idx, activeVerseList.length - 1)) : (idx === -1 ? -1 : 0) ;

            const currentActiveEntry = (currentVerseIndex >=0 && activeVerseList.length > 0) ? activeVerseList[currentVerseIndex] : null;

            if (currentActiveEntry) {
                if (dynamicBrandArea) {
                    dynamicBrandArea.textContent = currentActiveEntry.reference;
                    dynamicBrandArea.style.opacity = 1;
                }
                if (activeCollectionName) {
                    saveCollectionIndex(activeCollectionName, currentVerseIndex);
                } else {
                    localStorage.setItem(FULL_BIBLE_INDEX_LS_KEY, currentVerseIndex.toString());
                }
            } else {
                if (dynamicBrandArea) {
                     const firstEntryInList = activeVerseList.length > 0 ? activeVerseList[0] : null;
                     dynamicBrandArea.textContent = (currentViewMode === VIEW_MODE_MULTI_TRANSLATION && firstEntryInList) ? firstEntryInList.reference + " (Multi)" : "No Active Entry";
                     dynamicBrandArea.style.opacity = 1;
                }
            }
        }
        
        if (goodmanLogoInStatus) {
            goodmanLogoInStatus.textContent = "Goodman";
        }

        updateVerseCountDisplay();

        if (currentViewMode !== VIEW_MODE_FULL_COLLECTION && (currentViewMode === 'fullChapter' || currentViewMode === 'entryOnly')) {
            const currentActiveEntryForCheck = (currentVerseIndex >=0 && activeVerseList.length > 0) ? activeVerseList[currentVerseIndex] : null;
            if (!currentActiveEntryForCheck) {
                 if (verseTextElement) verseTextElement.innerHTML = `<p>No active entry to display.</p>`;
                 if (dynamicBrandArea && currentViewMode !== VIEW_MODE_FULL_COLLECTION) dynamicBrandArea.textContent = "No Entry";
                 setControlsState(false); updateCollectionRelatedButtonStates(); return;
            }
            if (!currentTranslationId || !fullBibleVerses || fullBibleVerses.length === 0) {
                if (verseTextElement) verseTextElement.innerHTML = `<p>${verseTextElement.dataset.noVersesMessage || "Selected translation is empty or not loaded."}</p>`;
                if (dynamicBrandArea && currentActiveEntryForCheck && currentViewMode !== VIEW_MODE_FULL_COLLECTION) dynamicBrandArea.textContent = currentActiveEntryForCheck.reference + " (No Data)";
                else if (dynamicBrandArea && currentViewMode !== VIEW_MODE_FULL_COLLECTION) dynamicBrandArea.textContent = "No Translation Data";
                setControlsState(false); updateCollectionRelatedButtonStates(); return;
            }
        }
        
        let entryToDisplay = null;
        if (currentViewMode !== VIEW_MODE_FULL_COLLECTION) {
             const currentActiveEntryForLogic = (currentVerseIndex >=0 && activeVerseList.length > 0) ? activeVerseList[currentVerseIndex] : null;
             entryToDisplay = currentActiveEntryForLogic || (activeVerseList.length > 0 && currentViewMode === VIEW_MODE_MULTI_TRANSLATION ? activeVerseList[0] : null);

            if (currentViewMode === VIEW_MODE_MULTI_TRANSLATION && !entryToDisplay) { 
                 if (verseTextElement) verseTextElement.innerHTML = `<p>No reference to display for Multi-Translation. Select a collection with entries.</p>`;
                 if (dynamicBrandArea) dynamicBrandArea.textContent = "No Ref (Multi)";
                 setControlsState(false); updateCollectionRelatedButtonStates(); return;
            } else if (!entryToDisplay && currentViewMode !== VIEW_MODE_FULL_COLLECTION) { 
                if (dynamicBrandArea) dynamicBrandArea.textContent = "No Entry";
                if (verseTextElement) verseTextElement.innerHTML = `<p>No entry to display.</p>`;
                setControlsState(false); updateCollectionRelatedButtonStates(); return;
            }
        }

        if (verseChangeFlashTimeoutId) clearTimeout(verseChangeFlashTimeoutId);
        if (mainContentArea) mainContentArea.classList.add('verse-change-flash');
        verseChangeFlashTimeoutId = setTimeout(() => {
            if (mainContentArea) mainContentArea.classList.remove('verse-change-flash');
        }, 300);

        if (verseTextElement) verseTextElement.style.opacity = 0;

        setTimeout(async () => {
            let displayHTML = "";
            let successfulContent = false;
            if (verseTextElement) verseTextElement.className = 'verse-text-display'; 

            if (mainContentArea && (currentViewMode === 'entryOnly' || currentViewMode === VIEW_MODE_MULTI_TRANSLATION)) {
                mainContentArea.style.justifyContent = 'center';
            } else { 
                mainContentArea.style.justifyContent = 'flex-start';
            }

            switch (currentViewMode) {
                case 'fullChapter':
                    if (!entryToDisplay) { displayHTML = "<p>No entry selected for chapter view.</p>"; break; }
                    const bookKeyFull = entryToDisplay._book;
                    const chapNumFull = entryToDisplay._chapter;
                    const startHighlightVerseNumFull = entryToDisplay._startVerse;
                    const endHighlightVerseNumFull = entryToDisplay._endVerse;

                    const chapterVersesFromBible = fullBibleVerses.filter(v =>
                        v._book === bookKeyFull && v._chapter === chapNumFull
                    );
                    chapterVersesFromBible.sort((a, b) => a._verse - b._verse);

                    if (chapterVersesFromBible.length === 0) {
                        const chapterRefMatch = entryToDisplay.reference.match(/^([1-3]?\s*[a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s*(\d+):/);
                        const chapterRefDisplay = chapterRefMatch ? `${chapterRefMatch[1]} ${chapterRefMatch[2]}` : "current chapter";
                        displayHTML = `<p>No verses found for ${chapterRefDisplay} in "${(currentTranslationId || 'N/A').replace(/\.xml$/i, '')}".</p>`;
                    } else {
                        let tempChapterHTML = "";
                        chapterVersesFromBible.forEach(v => {
                            const isHighlighted = (v._verse >= startHighlightVerseNumFull && v._verse <= endHighlightVerseNumFull);
                            const escapedText = v.text || "[Verse text not available]";
                            tempChapterHTML += `<p class="${isHighlighted ? 'current-verse-highlight' : ''}" data-verse-num="${v._verse}" data-verse-id="${v._book}-${v._chapter}-${v._verse}">`;
                            tempChapterHTML += `<span class="verse-number">${v._verse}</span>`;
                            tempChapterHTML += `${escapedText}</p>`;
                        });
                        displayHTML = tempChapterHTML;
                        successfulContent = true;
                    }
                    break;

                case 'entryOnly':
                    if (!entryToDisplay) { displayHTML = "<p>No entry selected for entry-only view.</p>"; break; }
                    displayHTML = formatEntryVersesFromList(entryToDisplay, fullBibleVerses, currentTranslationId);
                    successfulContent = !displayHTML.includes("not found");
                    break;

                case VIEW_MODE_MULTI_TRANSLATION:
                    if (!entryToDisplay) { displayHTML = "<p>No entry selected for multi-translation view.</p>"; break; }
                    appShowStatus("Loading multi-translation view...", false, 0);
                    if (verseTextElement) verseTextElement.className = 'verse-text-display multi-translation-view';

                    const translations = await getTranslationsList();
                    if (translations.length === 0) {
                        displayHTML = "<p>No translations imported for multi-translation view.</p>";
                        appShowStatus("No translations available.", true);
                        break;
                    }
                    translations.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

                    let multiTransHTMLParts = [];
                    let foundInAtLeastOne = false;

                    const translationDataPromises = translations.map(async (trans) => {
                        let versesOfThisTrans;
                        if (translationVerseCache[trans.id] && translationVerseCache[trans.id].length > 0) {
                            versesOfThisTrans = translationVerseCache[trans.id];
                        } else {
                            versesOfThisTrans = await getVersesByTranslation(trans.id);
                            if (versesOfThisTrans && versesOfThisTrans.length > 0) {
                                translationVerseCache[trans.id] = versesOfThisTrans;
                            } else {
                                translationVerseCache[trans.id] = []; 
                            }
                        }
                        return { trans, versesOfThisTrans };
                    });

                    const allTranslationData = await Promise.all(translationDataPromises);

                    for (const { trans, versesOfThisTrans } of allTranslationData) {
                        try {
                            let entryTextForThisTrans = `<p><i>(Translation data unavailable)</i></p>`;
                            if (!versesOfThisTrans || versesOfThisTrans.length === 0) {
                                entryTextForThisTrans = `<p><i>Entry "${entryToDisplay.reference}" not found (translation is empty or entry not in translation).</i></p>`;
                            } else {
                                entryTextForThisTrans = formatEntryVersesFromList(entryToDisplay, versesOfThisTrans, `"${trans.name || trans.id}"`);
                                if (!entryTextForThisTrans.includes("not found")) foundInAtLeastOne = true;
                            }
                            multiTransHTMLParts.push(`<div class="multi-trans-item">
                                <h4 class="multi-trans-name">${trans.name || trans.id}</h4>
                                ${entryTextForThisTrans}
                            </div>`);
                        } catch (error) {
                            console.error(`Error processing verses for ${trans.id} in multi-view:`, error);
                            multiTransHTMLParts.push(`<div class="multi-trans-item">
                                <h4 class="multi-trans-name">${trans.name || trans.id}</h4>
                                <p><i>(Error processing verses)</i></p>
                            </div>`);
                        }
                    }
                    displayHTML = multiTransHTMLParts.join('');
                    successfulContent = foundInAtLeastOne;
                    if(statusMessageElement && statusMessageElement.textContent === "Loading multi-translation view...") appShowStatus("Multi-translation view loaded.", false, 2000);
                    break;
                
                case VIEW_MODE_FULL_COLLECTION: 
                    if (verseTextElement) verseTextElement.className = 'verse-text-display full-collection-view';

                    if (!activeCollectionName || !allStoredCollections[activeCollectionName]) {
                        displayHTML = `<p>Please select a specific collection to use "Full Collection View".</p>`;
                        if (dynamicBrandArea) dynamicBrandArea.textContent = "Select Collection";
                        break;
                    }
                    if (!currentTranslationId || !fullBibleVerses || fullBibleVerses.length === 0) {
                        const activeTranslationName = (currentTranslationId || 'Selected Translation').replace(/\.xml$/i, '');
                        displayHTML = `<p>The translation "${activeTranslationName}" is empty or not loaded. Cannot display collection entries.</p>`;
                        if (dynamicBrandArea) dynamicBrandArea.textContent = activeCollectionName + " (No Translation Data)";
                        break;
                    }

                    if (activeVerseList.length === 0) {
                        displayHTML = `<p>The collection "${activeCollectionName}" is empty.</p>`;
                        if (dynamicBrandArea) dynamicBrandArea.textContent = activeCollectionName + " (Empty)";
                    } else {
                        appShowStatus(`Loading full collection "${activeCollectionName}"...`, false, 0);
                        let fullCollectionHTMLParts = [];
                        for (const entry of activeVerseList) {
                            const entryHTML = formatEntryVersesFromList(entry, fullBibleVerses, currentTranslationId);
                            fullCollectionHTMLParts.push(
                                `<div class="full-collection-entry-item">
                                    <h4 class="full-collection-entry-reference">${entry.reference}</h4>
                                    ${entryHTML}
                                 </div><hr class="full-collection-entry-separator">`
                            );
                        }
                        let rawHTML = fullCollectionHTMLParts.join('');
                        const lastSeparatorTag = '<hr class="full-collection-entry-separator">';
                        if (rawHTML.endsWith(lastSeparatorTag)) {
                           rawHTML = rawHTML.substring(0, rawHTML.length - lastSeparatorTag.length);
                        }
                        displayHTML = rawHTML;

                        successfulContent = true; 
                        if (dynamicBrandArea) dynamicBrandArea.textContent = activeCollectionName; 
                        if(statusMessageElement && statusMessageElement.textContent.startsWith("Loading full collection")) {
                            appShowStatus(`"${activeCollectionName}" displayed (${activeVerseList.length} entries).`, false, 2000);
                        }
                    }
                    break;
            }

            if(verseTextElement) verseTextElement.innerHTML = displayHTML;
            if (verseTextElement) verseTextElement.style.opacity = 1;

            if (currentViewMode === 'fullChapter' && successfulContent && entryToDisplay) {
                const firstHighlightedElement = verseTextElement?.querySelector(`[data-verse-num="${entryToDisplay._startVerse}"]`);
                if (firstHighlightedElement) {
                    setTimeout(() => {
                        firstHighlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 50);
                } else if (verseTextElement?.firstChild ) {
                     verseTextElement.firstChild.scrollIntoView({ behavior: 'smooth', block: 'start'});
                }
            } else if (successfulContent && currentViewMode !== VIEW_MODE_FULL_COLLECTION) { 
                 if (verseTextElement) verseTextElement.scrollTop = 0;
            } else if (currentViewMode === VIEW_MODE_FULL_COLLECTION && verseTextElement) {
                verseTextElement.scrollTop = 0; 
            }

            const insertVerseContainer = document.getElementById('insertVerseContainer');
            if (insertVerseContainer) {
                const canInsert = (successfulContent || currentViewMode === VIEW_MODE_MULTI_TRANSLATION) && currentViewMode !== VIEW_MODE_FULL_COLLECTION && currentVerseIndex >= 0;
                insertVerseContainer.style.display = canInsert ? 'flex' : 'none';
            }
            
            if (currentViewMode === VIEW_MODE_FULL_COLLECTION) {
                stopTimers();
                setControlsState(false);
            } else if (successfulContent || (currentViewMode === VIEW_MODE_MULTI_TRANSLATION && entryToDisplay) ) {
                resetAndStartTimers();
                setControlsState(true);
            } else {
                stopTimers();
                setControlsState(false);
            }
            updateCollectionRelatedButtonStates(); 
        }, 150);
    }

    function pauseTimer(isSystemPause = false) {
        if (isPaused) return;
        isPaused = true;
        updatePausePlayButtonIcon();
        stopTimers();
        updateProgressBar();
    }

    function resumeTimer() {
        if (!isPaused) return;
        isPaused = false;
        updatePausePlayButtonIcon();
        if (timeLeftInSeconds <= 0) {
            timeLeftInSeconds = TOTAL_DURATION_SECONDS;
        }
        countdownIntervalId = setInterval(countdown, 1000);
        autoAdvanceTimeoutId = setTimeout(autoAdvanceVerse, timeLeftInSeconds * 1000);
        updateProgressBar();
    }

    if (quickSeekNoteBtn) { 
        quickSeekNoteBtn.addEventListener('click', () => { 
            if (typeof window.openNotesModal === 'function') {
                openModal(notesModal);
                window.openNotesModal();
            } else {
                console.error("Notes Manager is not available.");
                appShowStatus("Error: Notes feature could not be loaded.", true);
            }
        });
    }

     function populateCollectionsModal() {
         if (!collectionsListContainer) return;
         collectionsListContainer.innerHTML = '';
         const searchTerm = collectionSearchInput?.value.toLowerCase() || '';

         const fullBibleBtn = document.createElement('button');
         fullBibleBtn.textContent = '-- Full Bible --';
         fullBibleBtn.className = 'full-bible-tag-button';
         if (!activeCollectionName) {
             fullBibleBtn.classList.add('active-collection-tag');
         }
         fullBibleBtn.addEventListener('click', async () => {
             activeCollectionName = null;
             localStorage.removeItem(LAST_ACTIVE_COLLECTION_LS_KEY);
             await setActiveVerseList();
             closeModal(collectionsModal);
             if(optionsPanel) optionsPanel.classList.remove('visible');
         });
         collectionsListContainer.appendChild(fullBibleBtn);

         Object.keys(allStoredCollections)
             .sort((a,b) => a.localeCompare(b))
             .filter(name => name.toLowerCase().includes(searchTerm))
             .forEach(name => {
                 const collBtn = document.createElement('button');
                 collBtn.textContent = name;
                 collBtn.className = 'collection-tag-button';
                 if (name === activeCollectionName) {
                     collBtn.classList.add('active-collection-tag');
                 }
                 collBtn.addEventListener('click', async () => {
                     activeCollectionName = name;
                     localStorage.setItem(LAST_ACTIVE_COLLECTION_LS_KEY, activeCollectionName);
                     await setActiveVerseList();
                     closeModal(collectionsModal);
                     if(optionsPanel) optionsPanel.classList.remove('visible');
                 });
                 collectionsListContainer.appendChild(collBtn);
         });
     }

     if(openCollectionsModalBtn) openCollectionsModalBtn.addEventListener('click', () => {
         populateCollectionsModal();
         openModal(collectionsModal);
         if(collectionSearchInput) {
            collectionSearchInput.value = '';
            collectionSearchInput.focus();
         }
         if(optionsPanel) optionsPanel.classList.remove('visible');
     });
     if(modalCloseBtnCollections) modalCloseBtnCollections.addEventListener('click', () => { closeModal(collectionsModal); });
     if(collectionSearchInput) collectionSearchInput.addEventListener('input', populateCollectionsModal);

     if(optionsBtn) optionsBtn.addEventListener('click', (e) => { e.stopPropagation(); optionsPanel?.classList.toggle('visible'); });

     if(openSettingsBtn) openSettingsBtn.addEventListener('click', () => { openModal(settingsModal); if(optionsPanel) optionsPanel.classList.remove('visible'); updateCollectionRelatedButtonStates(); });
     if(modalCloseBtnSettings) modalCloseBtnSettings.addEventListener('click', () => { closeModal(settingsModal); });

      document.addEventListener('click', (e) => {
        if (optionsPanel?.classList.contains('visible') && !optionsContainer?.contains(e.target)) {
            optionsPanel.classList.remove('visible');
        }
        if (settingsModal?.style.display === "block" && !settingsModal.querySelector('.modal-content')?.contains(e.target) && e.target !== openSettingsBtn && !openSettingsBtn?.contains(e.target)) {
             closeModal(settingsModal);
         }
        if (collectionsModal?.style.display === "block" && !collectionsModal.querySelector('.modal-content')?.contains(e.target) && e.target !== openCollectionsModalBtn && !openCollectionsModalBtn?.contains(e.target)) {
             closeModal(collectionsModal);
         }
        if (notesModal?.style.display === "block" && 
            !notesModal.querySelector('.modal-content')?.contains(e.target) && 
            e.target !== quickSeekNoteBtn && !quickSeekNoteBtn?.contains(e.target) ) { 
            closeModal(notesModal);
        }
        if (referencePickerModal?.style.display === "block" && !referencePickerModal.querySelector('.modal-content')?.contains(e.target) && e.target !== openReferencePickerBtn && !openReferencePickerBtn?.contains(e.target) ) { 
            closeModal(referencePickerModal);
        }
        if (crossRefPanel?.classList.contains("active") && !crossRefPanel.contains(e.target) && e.target.id !== 'dynamicBrandArea') {
            if(typeof window.closeCrossRefPanel === 'function') window.closeCrossRefPanel();
        }
        if (quickSeekPanel?.classList.contains("visible") && 
            !quickSeekPanel.contains(e.target) && 
            e.target !== toggleQuickSeekPanelBtnInStatusBar && 
            !toggleQuickSeekPanelBtnInStatusBar?.contains(e.target) 
        ) {
           quickSeekPanel.classList.remove("visible");
        }
    });

    function updateInterval(mins) { VERSE_CHANGE_INTERVAL_MS = parseInt(mins) * 60 * 1000; TOTAL_DURATION_SECONDS = VERSE_CHANGE_INTERVAL_MS / 1000; if(intervalValueLabel) intervalValueLabel.textContent = `Interval: ${mins} min`; }
    if(intervalSlider) intervalSlider.addEventListener('input', (e) => { const m = e.target.value; updateInterval(m); localStorage.setItem(VERSE_INTERVAL_MINUTES_LS_KEY, m); if (currentViewMode !== VIEW_MODE_FULL_COLLECTION && activeVerseList.length > 0 && currentVerseIndex >= 0 && !(allTimerButtonsInOptions[0] && allTimerButtonsInOptions[0].disabled) ) resetAndStartTimers(); });

    function updateFontSize(percentage) {
        currentFontSizeMultiplier = parseFloat(percentage) / 100;
        document.documentElement.style.setProperty('--verse-font-size-multiplier', currentFontSizeMultiplier);
        if (fontSizeValueLabel) fontSizeValueLabel.textContent = `Font Size: ${percentage}%`;
        if (fontSizeSlider && parseInt(fontSizeSlider.value) !== parseInt(percentage)) {
            fontSizeSlider.value = parseInt(percentage);
        }
        localStorage.setItem(FONT_SIZE_PERCENTAGE_LS_KEY, percentage.toString());
    }
    if(fontSizeSlider) fontSizeSlider.addEventListener('input', (e) => { updateFontSize(e.target.value); });


    function applyVerseFont(fontFamily) { document.documentElement.style.setProperty('--verse-font-family', fontFamily); localStorage.setItem(VERSE_FONT_LS_KEY, fontFamily); if (verseFontSelector && verseFontSelector.value !== fontFamily) verseFontSelector.value = fontFamily; }
    if(verseFontSelector) verseFontSelector.addEventListener('change', (e) => { applyVerseFont(e.target.value); });

    if(themeSelector) themeSelector.addEventListener('change', (e) => {
        if (typeof applyTheme === 'function') {
             applyTheme(e.target.value);
         } else {
             console.error("applyTheme function not found.");
         }
    });

    if(showProgressBarToggle) showProgressBarToggle.addEventListener('change', () => {
        isProgressHiddenByUser = !showProgressBarToggle.checked;
        localStorage.setItem(SHOW_PROGRESS_BAR_LS_KEY, (!isProgressHiddenByUser).toString());

        if (appStatusBar) {
            const isProgressSystemActive = !isProgressHiddenByUser && 
                                           activeVerseList.length > 0 && 
                                           currentVerseIndex >= 0 &&
                                           currentViewMode !== VIEW_MODE_FULL_COLLECTION &&
                                           !(allTimerButtonsInOptions[0] && allTimerButtonsInOptions[0].disabled);
            appStatusBar.classList.toggle('progress-active', isProgressSystemActive);
            appStatusBar.classList.toggle('progress-inactive', !isProgressSystemActive);
        }
        updateProgressBar();
    });

    if (toggleAVSystemBtn) {
        toggleAVSystemBtn.addEventListener('click', async () => {
            const isCurrentlyEnabled = localStorage.getItem(AV_SYSTEM_ENABLED_LS_KEY) === 'true';
            const newIsEnabled = !isCurrentlyEnabled;
            localStorage.setItem(AV_SYSTEM_ENABLED_LS_KEY, newIsEnabled);
            toggleAVSystemBtn.textContent = newIsEnabled ? 'Disable' : 'Enable';
            appShowStatus(`Audiovisual system ${newIsEnabled ? 'enabled' : 'disabled'}.`, false);

            if (typeof window.loadAndApplyAVSettings === 'function') {
                await window.loadAndApplyAVSettings();
            } else {
                console.error("AV integration function 'loadAndApplyAVSettings' not found.");
            }
        });
    }


    function navigateVerse(dir) {
        if (currentViewMode === VIEW_MODE_FULL_COLLECTION) return; 
        if (activeVerseList.length === 0 || currentVerseIndex < 0) return;
        let newIdx = currentVerseIndex;
        if (dir === 'next') newIdx = (currentVerseIndex + 1) % activeVerseList.length;
        else if (dir === 'prev') newIdx = (currentVerseIndex - 1 + activeVerseList.length) % activeVerseList.length;
        else if (typeof dir === 'number' && dir >= 0 && dir < activeVerseList.length) newIdx = dir; 
        else if (dir !== 'prev' && dir !== 'next') { console.warn("Invalid navigation direction:", dir); return;}

        displayVerse(newIdx); 
        resetAndStartTimers();
    }
    function showRandomVerse() {
        if (currentViewMode === VIEW_MODE_FULL_COLLECTION) return; 
        if (activeVerseList.length <= 1 || currentVerseIndex < 0) return;
        let randIdx;
        do { randIdx = Math.floor(Math.random() * activeVerseList.length); }
        while (randIdx === currentVerseIndex && activeVerseList.length > 1);
        displayVerse(randIdx); 
        resetAndStartTimers();
    }
    
     document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        const isInputActive = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
        
         if (e.key === 'Escape') {
             if (settingsModal?.style.display === "block") { closeModal(settingsModal); return; }
             if (collectionsModal?.style.display === "block") { closeModal(collectionsModal); return; }
             if (notesModal?.style.display === "block") { closeModal(notesModal); return; }
             if (referencePickerModal?.style.display === "block") { closeModal(referencePickerModal); return; }
             if (crossRefPanel?.classList.contains("active")) { if(typeof window.closeCrossRefPanel === 'function') window.closeCrossRefPanel(); return; }
             if (optionsPanel?.classList.contains("visible")) { optionsPanel.classList.remove("visible"); return; }
             if (quickSeekPanel?.classList.contains("visible")) { quickSeekPanel.classList.remove("visible"); return; }
        }

         if (isInputActive && e.key !== 'Escape') return;
        
        if (currentViewMode === VIEW_MODE_FULL_COLLECTION && e.key !== 'Escape') return; 

         if(allTimerButtonsInOptions.length === 0) updateAllTimerButtonsArray(); 
         
         if ((activeVerseList.length === 0 || currentVerseIndex < 0) && e.key !== 'Escape') return;

        const firstTimerButton = allTimerButtonsInOptions.length > 0 ? allTimerButtonsInOptions[0] : null;
        if (firstTimerButton?.disabled) return; 

         if (e.key === 'ArrowLeft') navigateVerse('prev');
         else if (e.key === 'ArrowRight') navigateVerse('next');
         else if (e.key === ' ' && pausePlayBtn && !pausePlayBtn.disabled) {
            e.preventDefault();
             pausePlayBtn.click();
         }
     });

    function formatTime(secs) { const mins = Math.floor(secs / 60); const s = Math.round(secs % 60); return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }

    function updateProgressBar() {
        if (!statusBarFullWidthProgressFill || !statusBarTimeLeft || !appStatusBar) return;
        const timerControlsCurrentlyDisabled = allTimerButtonsInOptions.length > 0 && allTimerButtonsInOptions[0] && allTimerButtonsInOptions[0].disabled;

        const isProgressEffectivelyActive = !isProgressHiddenByUser &&
                                          activeVerseList.length > 0 &&
                                          currentVerseIndex >= 0 &&
                                          !timerControlsCurrentlyDisabled &&
                                          currentViewMode !== VIEW_MODE_FULL_COLLECTION; 

        appStatusBar.classList.toggle('progress-active', isProgressEffectivelyActive);
        appStatusBar.classList.toggle('progress-inactive', !isProgressEffectivelyActive);

        if (!isProgressEffectivelyActive) {
            statusBarFullWidthProgressFill.style.width = '0%';
            statusBarFullWidthProgressFill.classList.remove('pulsing');
            statusBarFullWidthProgressFill.classList.remove('paused');
            statusBarTimeLeft.textContent = formatTime( (activeVerseList.length > 0 && currentVerseIndex >=0 && currentViewMode !== VIEW_MODE_FULL_COLLECTION) ? TOTAL_DURATION_SECONDS : 0);
            return;
        }

        const elapsedSeconds = TOTAL_DURATION_SECONDS - timeLeftInSeconds;
        const percComplete = (elapsedSeconds / TOTAL_DURATION_SECONDS) * 100;
        statusBarFullWidthProgressFill.style.width = `${Math.max(0, Math.min(100, percComplete))}%`;

        statusBarTimeLeft.textContent = formatTime(timeLeftInSeconds);

        statusBarFullWidthProgressFill.classList.toggle('paused', isPaused);
        statusBarFullWidthProgressFill.classList.toggle('pulsing', !isPaused && timeLeftInSeconds > 0 && timeLeftInSeconds <= PULSE_THRESHOLD_SECONDS);
    }


    function countdown() {
        if (isPaused || timeLeftInSeconds <= 0 || activeVerseList.length === 0 || currentVerseIndex < 0 || currentViewMode === VIEW_MODE_FULL_COLLECTION) {
            if (timeLeftInSeconds <= 0 && statusBarFullWidthProgressFill) {
                statusBarFullWidthProgressFill.classList.remove('pulsing');
                statusBarFullWidthProgressFill.style.width = '100%';
            }
            return;
        }
        timeLeftInSeconds--;
        updateProgressBar();
    }
    function autoAdvanceVerse() {
        if (activeVerseList.length === 0 || currentVerseIndex < 0 || currentViewMode === VIEW_MODE_FULL_COLLECTION) return;
        if (isPaused) {
            clearTimeout(autoAdvanceTimeoutId);
            autoAdvanceTimeoutId = setTimeout(autoAdvanceVerse, 1000); return;
        }
        navigateVerse('next');
    }
    function stopTimers() {
        clearTimeout(autoAdvanceTimeoutId);
        clearInterval(countdownIntervalId);
        if (statusBarFullWidthProgressFill) statusBarFullWidthProgressFill.classList.remove('pulsing');
    }

    function resetAndStartTimers() {
         if (currentViewMode === VIEW_MODE_FULL_COLLECTION) { 
             stopTimers();
             setControlsState(false); 
             if (appStatusBar) {
                appStatusBar.classList.remove('progress-active');
                appStatusBar.classList.add('progress-inactive');
             }
             updateProgressBar(); 
             return;
         }
         
         if (activeVerseList.length === 0 || currentVerseIndex < 0) {
             stopTimers();
             if (appStatusBar) {
                 appStatusBar.classList.remove('progress-active');
                 appStatusBar.classList.add('progress-inactive');
             }
             updateProgressBar();
             return;
         }
         stopTimers();
         timeLeftInSeconds = TOTAL_DURATION_SECONDS;
         isPaused = false;
         updatePausePlayButtonIcon();
         if (statusBarFullWidthProgressFill) {
            statusBarFullWidthProgressFill.classList.remove('paused');
            statusBarFullWidthProgressFill.style.width = '0%';
         }

         if (appStatusBar) {
            appStatusBar.classList.toggle('progress-active', !isProgressHiddenByUser && currentViewMode !== VIEW_MODE_FULL_COLLECTION);
            appStatusBar.classList.toggle('progress-inactive', isProgressHiddenByUser || currentViewMode === VIEW_MODE_FULL_COLLECTION);
         }
         updateProgressBar();
         if (currentViewMode !== VIEW_MODE_FULL_COLLECTION) {
             countdownIntervalId = setInterval(countdown, 1000);
             autoAdvanceTimeoutId = setTimeout(autoAdvanceVerse, VERSE_CHANGE_INTERVAL_MS);
         }
     }

    function updatePausePlayButtonIcon() {
        updateAllTimerButtonsArray();
        if(pausePlayBtn) { pausePlayBtn.innerHTML = isPaused ? playIconSVG : pauseIconSVG; pausePlayBtn.setAttribute('title', isPaused ? 'Play Timer' : 'Pause Timer'); }
    }

    function setFullscreen(isFullscreen) { if(bodyElement) bodyElement.classList.toggle('fullscreen-active', isFullscreen); if(fullscreenToggleBtn) { fullscreenToggleBtn.innerHTML = isFullscreen ? exitFullscreenIconSVG : enterFullscreenIconSVG; fullscreenToggleBtn.title = isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'; } localStorage.setItem(FULLSCREEN_LS_KEY, isFullscreen.toString()); }
    if(fullscreenToggleBtn) fullscreenToggleBtn.addEventListener('click', () => { setFullscreen(!bodyElement?.classList.contains('fullscreen-active')); });

    function getDistance(p1, p2) {
        return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
    }

    let initialFontSizeAtPinchStart = currentFontSizeMultiplier;

    function handlePinchStart(event) {
        if (event.touches.length === 2) {
            event.preventDefault();
            initialPinchDistance = getDistance(event.touches[0], event.touches[1]);
            initialFontSizeAtPinchStart = currentFontSizeMultiplier; 
        }
    }

    function handlePinchMove(event) {
        if (event.touches.length === 2) {
            event.preventDefault();
            const currentPinchDistance = getDistance(event.touches[0], event.touches[1]);
            if (initialPinchDistance === 0) return; 

            const scaleFactor = currentPinchDistance / initialPinchDistance;
            let newMultiplier = initialFontSizeAtPinchStart * scaleFactor;
            newMultiplier = Math.max(MIN_FONT_MULTIPLIER, Math.min(MAX_FONT_MULTIPLIER, newMultiplier));
            
            const newPercentage = Math.round(newMultiplier * 100);
            updateFontSize(newPercentage.toString()); 
        }
    }

    function handlePinchEnd(event) {
        initialPinchDistance = 0; 
    }

    if (mainContentArea) { 
        mainContentArea.addEventListener('touchstart', handlePinchStart, { passive: false });
        mainContentArea.addEventListener('touchmove', handlePinchMove, { passive: false });
        mainContentArea.addEventListener('touchend', handlePinchEnd);
        mainContentArea.addEventListener('touchcancel', handlePinchEnd);
    }

    async function handleGoToReference() {
        const refText = quickSeekReferenceInput.value.trim();
        if (!refText) return;
        if (activeCollectionName) {
            appShowStatus("Go To is only for 'Full Bible' mode.", true);
            return;
        }
        if (!currentTranslationId || !fullBibleVerses || fullBibleVerses.length === 0) {
            appShowStatus("Please select a valid translation first.", true);
            return;
        }

        const parsedRef = parseBibleReferenceWithNote(refText);
        if (!parsedRef) {
            appShowStatus(`Could not parse reference: "${refText}"`, true);
            return;
        }
        
        if (currentViewMode !== 'fullChapter') {
            currentViewMode = 'fullChapter';
            viewModeSelector.value = 'fullChapter';
            localStorage.setItem(VIEW_MODE_LS_KEY, currentViewMode);
            appShowStatus("Switched to Chapter Context view.", false, 2000);
        }

        const foundIndex = activeVerseList.findIndex(v =>
            v._book.toLowerCase() === parsedRef.book.toLowerCase().replace(/\s+/g, ' ') &&
            v._chapter === parsedRef.chapter &&
            v._startVerse === parsedRef.startVerse
        );

        if (foundIndex !== -1) {
            appShowStatus(`Jumping to ${parsedRef.book} ${parsedRef.chapter}:${parsedRef.startVerse}...`, false, 2000);
            displayVerse(foundIndex);
            quickSeekReferenceInput.value = '';
            if(quickSeekPanel) quickSeekPanel.classList.remove('visible');
        } else {
            appShowStatus(`Reference "${refText}" not found in this translation.`, true);
        }
    }

    function populateBookPicker() {
        if (!refPickerBook || typeof BIBLE_BOOK_NAMES_BY_NUMBER === 'undefined') return;
        refPickerBook.innerHTML = '<option value="">-- Select Book --</option>';
        BIBLE_BOOK_NAMES_BY_NUMBER.slice(1).forEach(bookName => {
            refPickerBook.add(new Option(bookName, bookName));
        });
        refPickerChapter.innerHTML = '<option value="">-- Chapter --</option>';
        refPickerVerse.innerHTML = '<option value="">-- Verse --</option>';
    }
    
    function updateChapterPicker() {
        if (!refPickerBook.value || fullBibleVerses.length === 0) {
            refPickerChapter.innerHTML = '<option value="">-- Chapter --</option>';
            refPickerVerse.innerHTML = '<option value="">-- Verse --</option>';
            return;
        }
        const selectedBook = refPickerBook.value.toLowerCase();
        const chapters = [...new Set(fullBibleVerses.filter(v => v._book === selectedBook).map(v => v._chapter))];
        chapters.sort((a,b) => a-b);
        refPickerChapter.innerHTML = '<option value="">-- Chapter --</option>';
        chapters.forEach(chapNum => refPickerChapter.add(new Option(chapNum, chapNum)));
        if (Array.from(refPickerChapter.options).some(opt => opt.value === '1')) {
            refPickerChapter.value = '1';
        }
        updateVersePicker();
    }
    
    function updateVersePicker() {
        if (!refPickerBook.value || !refPickerChapter.value || fullBibleVerses.length === 0) {
            refPickerVerse.innerHTML = '<option value="">-- Verse --</option>';
            return;
        }
        const selectedBook = refPickerBook.value.toLowerCase();
        const selectedChap = parseInt(refPickerChapter.value, 10);
        const verses = fullBibleVerses.filter(v => v._book === selectedBook && v._chapter === selectedChap).map(v => v._verse);
        verses.sort((a,b) => a-b);
        refPickerVerse.innerHTML = '<option value="">-- Verse --</option>';
        verses.forEach(vNum => refPickerVerse.add(new Option(vNum, vNum)));
        if (Array.from(refPickerVerse.options).some(opt => opt.value === '1')) {
            refPickerVerse.value = '1';
        }
    }

    async function initializeApp() {
        appShowStatus("Initializing...", false, 0);
        try {
            await initDB();
        } catch (dbError) {
            appShowStatus("Database Initialization Failed!", true, 0);
            console.error("DB Init Error:", dbError);
            if(verseTextElement) verseTextElement.innerHTML = "<p>Error initializing database. App cannot function.</p>";
            if(dynamicBrandArea) dynamicBrandArea.textContent = "DB Error";
            return;
        }

        if (dynamicBrandArea) dynamicBrandArea.textContent = "Loading...";
        if (goodmanLogoInStatus) goodmanLogoInStatus.textContent = "Goodman";


        const savedViewMode = localStorage.getItem(VIEW_MODE_LS_KEY);
        if (savedViewMode && ['fullChapter', 'entryOnly', VIEW_MODE_MULTI_TRANSLATION, VIEW_MODE_FULL_COLLECTION].includes(savedViewMode)) { 
            currentViewMode = savedViewMode;
        }
        if (viewModeSelector) viewModeSelector.value = currentViewMode;

        await loadCollectionsAndSetActive(); 
        const translationsFromDB = await loadAndPopulateTranslationsDropdown();

        const theme = localStorage.getItem(SELECTED_THEME_LS_KEY) || 'dark';
        if (themeSelector) themeSelector.value = theme;
        if (typeof applyTheme === 'function') applyTheme(theme);

        const interval = parseInt(localStorage.getItem(VERSE_INTERVAL_MINUTES_LS_KEY)) || DEFAULT_INTERVAL_MINUTES;
        if (intervalSlider) intervalSlider.value = interval;
        updateInterval(interval);

        const fontSizePercent = parseInt(localStorage.getItem(FONT_SIZE_PERCENTAGE_LS_KEY)) || 100;
        currentFontSizeMultiplier = fontSizePercent / 100; 
        updateFontSize(fontSizePercent.toString()); 
        
        const font = localStorage.getItem(VERSE_FONT_LS_KEY) || "'Roboto Slab', serif";
        if (verseFontSelector) verseFontSelector.value = font;
        applyVerseFont(font);

        const storedShowProgress = localStorage.getItem(SHOW_PROGRESS_BAR_LS_KEY);
        isProgressHiddenByUser = storedShowProgress === 'false';
        if (showProgressBarToggle) showProgressBarToggle.checked = !isProgressHiddenByUser;

        const isAVEnabled = localStorage.getItem(AV_SYSTEM_ENABLED_LS_KEY) === 'true';
        if (toggleAVSystemBtn) {
            toggleAVSystemBtn.textContent = isAVEnabled ? 'Disable' : 'Enable';
        }

        if (typeof window.initAV === 'function') {
            await window.initAV();
        } else {
            console.warn("Audiovisual system 'initAV' not found.");
        }
        
        if (appStatusBar) {
            const isProgressInitiallyActive = !isProgressHiddenByUser && 
                                           activeVerseList.length > 0 && 
                                           currentVerseIndex >= 0 &&
                                           currentViewMode !== VIEW_MODE_FULL_COLLECTION;
            appStatusBar.classList.toggle('progress-active', isProgressInitiallyActive);
            appStatusBar.classList.toggle('progress-inactive', !isProgressInitiallyActive);
        }

        const storedFullscreen = localStorage.getItem(FULLSCREEN_LS_KEY) === 'true';
        setFullscreen(storedFullscreen);
        
        updateAllTimerButtonsArray(); 

        setControlsState(false);
        updatePausePlayButtonIcon(); 
        if(statusBarFullWidthProgressFill) statusBarFullWidthProgressFill.style.width = '0%';

        if (toggleQuickSeekPanelBtnInStatusBar && quickSeekPanel) {
            toggleQuickSeekPanelBtnInStatusBar.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (quickSeekGoToContainer) {
                    quickSeekGoToContainer.classList.toggle('visible', !activeCollectionName);
                }
                quickSeekPanel.classList.toggle('visible');
            });
        }
        
        if (quickSeekGoBtn) quickSeekGoBtn.addEventListener('click', handleGoToReference);
        if (quickSeekReferenceInput) quickSeekReferenceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleGoToReference();
            }
        });

        if(openReferencePickerBtn) openReferencePickerBtn.addEventListener('click', () => {
            const lastBook = localStorage.getItem(LS_REF_PICKER_BOOK);
            const lastChapter = localStorage.getItem(LS_REF_PICKER_CHAPTER);
            const lastVerse = localStorage.getItem(LS_REF_PICKER_VERSE);

            if (lastBook && Array.from(refPickerBook.options).some(opt => opt.value === lastBook)) {
                refPickerBook.value = lastBook;
                const selectedBook = refPickerBook.value.toLowerCase();
                const chapters = [...new Set(fullBibleVerses.filter(v => v._book === selectedBook).map(v => v._chapter))].sort((a,b) => a-b);
                refPickerChapter.innerHTML = '<option value="">-- Chapter --</option>';
                chapters.forEach(chapNum => refPickerChapter.add(new Option(chapNum, chapNum)));

                if (lastChapter && Array.from(refPickerChapter.options).some(opt => opt.value === lastChapter)) {
                    refPickerChapter.value = lastChapter;
                    const selectedChap = parseInt(refPickerChapter.value, 10);
                    const verses = fullBibleVerses.filter(v => v._book === selectedBook && v._chapter === selectedChap).map(v => v._verse).sort((a,b) => a-b);
                    refPickerVerse.innerHTML = '<option value="">-- Verse --</option>';
                    verses.forEach(vNum => refPickerVerse.add(new Option(vNum, vNum)));
                    
                    if (lastVerse && Array.from(refPickerVerse.options).some(opt => opt.value === lastVerse)) {
                        refPickerVerse.value = lastVerse;
                    }
                }
            }
            openModal(referencePickerModal);
        });
        if(modalCloseBtnRefPicker) modalCloseBtnRefPicker.addEventListener('click', () => { closeModal(referencePickerModal) });
        if(refPickerBook) refPickerBook.addEventListener('change', updateChapterPicker);
        if(refPickerChapter) refPickerChapter.addEventListener('change', updateVersePicker);
        if(refPickerGoBtn) refPickerGoBtn.addEventListener('click', () => {
            if (refPickerBook.value && refPickerChapter.value && refPickerVerse.value) {
                localStorage.setItem(LS_REF_PICKER_BOOK, refPickerBook.value);
                localStorage.setItem(LS_REF_PICKER_CHAPTER, refPickerChapter.value);
                localStorage.setItem(LS_REF_PICKER_VERSE, refPickerVerse.value);
                quickSeekReferenceInput.value = `${refPickerBook.value} ${refPickerChapter.value}:${refPickerVerse.value}`;
                handleGoToReference();
                closeModal(referencePickerModal);
            } else {
                appShowStatus("Please select a book, chapter, and verse.", true);
            }
        });

        if (timerPrevVerseBtn) timerPrevVerseBtn.addEventListener('click', () => navigateVerse('prev'));
        if (timerNextVerseBtn) timerNextVerseBtn.addEventListener('click', () => navigateVerse('next'));
        if (randomVerseBtn) randomVerseBtn.addEventListener('click', showRandomVerse);
        if (pausePlayBtn) {
            pausePlayBtn.addEventListener('click', () => {
                if (currentViewMode === VIEW_MODE_FULL_COLLECTION) return; 
                if (activeVerseList.length === 0 || currentVerseIndex < 0) return;
                
                if (isPaused) {
                    resumeTimer();
                } else {
                    pauseTimer();
                }
            });
        }

        if (verseTextElement && verseTextElement.dataset) {
            let initialMsg = "Please import a Bible via Data Manager (Settings).";
             if (translationsFromDB && translationsFromDB.length > 0) {
                initialMsg = "Please select an active Bible translation from the Menu.";
             }
             verseTextElement.dataset.noVersesMessage = initialMsg;
             verseTextElement.innerHTML = `<p>${verseTextElement.dataset.noVersesMessage}</p>`;
        }
        if ((activeVerseList.length === 0 || currentVerseIndex < 0) && currentViewMode !== VIEW_MODE_FULL_COLLECTION) {
             if (translationsFromDB && translationsFromDB.length > 0) {
                 if (dynamicBrandArea) dynamicBrandArea.textContent = "Select Content";
             } else {
                 if (dynamicBrandArea) dynamicBrandArea.textContent = "No Bible Loaded";
             }
        } else if (currentViewMode === VIEW_MODE_FULL_COLLECTION && activeCollectionName) {
            if (dynamicBrandArea) dynamicBrandArea.textContent = activeCollectionName;
        } else if (currentViewMode === VIEW_MODE_FULL_COLLECTION && !activeCollectionName) {
            if (dynamicBrandArea) dynamicBrandArea.textContent = "Select Collection";
        }

        populateBookPicker();

        const lastActiveTranslationId = localStorage.getItem(LAST_ACTIVE_TRANSLATION_LS_KEY);
        const targetSelectorForInitialLoad = translationSelectorOptionsPanel;
        if (lastActiveTranslationId && translationsFromDB.some(t => t.id === lastActiveTranslationId)) {
             if (targetSelectorForInitialLoad) targetSelectorForInitialLoad.value = lastActiveTranslationId;
             await activateTranslation(lastActiveTranslationId);
        } else if (translationsFromDB && translationsFromDB.length > 0) {
            const firstValidOption = targetSelectorForInitialLoad?.options[0]?.value;
            if (firstValidOption && firstValidOption !== "") {
                if (targetSelectorForInitialLoad) targetSelectorForInitialLoad.value = firstValidOption;
                await activateTranslation(firstValidOption);
             } else {
                console.warn("No valid translations found to activate initially.");
                await setActiveVerseList(); 
             }
        } else {
             console.warn("No translations available in DB during initialization.");
             await setActiveVerseList(); 
        }
        
        const firstTimerButton = allTimerButtonsInOptions.length > 0 ? allTimerButtonsInOptions[0] : null;
        if (firstTimerButton?.disabled) { 
            setControlsState(false);
        } else { 
            setControlsState(true);
             if (!isPaused) resetAndStartTimers(); 
        }
        updateProgressBar();

        // --- Settings Modal Tab Logic ---
        const settingsTabButtons = settingsModal.querySelectorAll('.settings-tab-button');
        const settingsTabPanes = settingsModal.querySelectorAll('.settings-tab-pane');

        settingsTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                settingsTabButtons.forEach(btn => btn.classList.remove('active'));
                settingsTabPanes.forEach(pane => pane.classList.remove('active'));
                button.classList.add('active');
                const targetPaneId = button.dataset.tabTarget;
                const targetPane = document.querySelector(targetPaneId);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
        
        // --- Initialize Modular Scripts ---
        if (typeof window.initCrossRefManager === 'function') {
            window.initCrossRefManager();
        } else {
            console.error("Cross-Reference Manager failed to initialize.");
        }

        if (statusMessageElement?.textContent === "Initializing...") {
            appShowStatus("", false, 1);
        }
    }
    initializeApp();
});