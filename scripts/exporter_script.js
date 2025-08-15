// scripts/exporter_script.js
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof initDB !== 'function' || 
        typeof getTranslationsList !== 'function' ||
        typeof getAllCollectionsFromDB !== 'function' ||
        typeof getVersesByTranslation !== 'function' ||
        typeof applyTheme !== 'function') { // Added applyTheme check
        console.error("Core functions from script.js are not available for exporter.");
        const statusEl = document.getElementById('exporterStatusMessage');
        if (statusEl) statusEl.textContent = "Initialization Error: Core functions missing. Page may not work.";
        // Try to apply a default theme if applyTheme is missing but themes might be on window
        if (typeof window.themes === 'object' && typeof document.documentElement.style.setProperty === 'function') {
            const defaultTheme = window.themes['dark'] || Object.values(window.themes)[0];
            if(defaultTheme) {
                for (const key in defaultTheme) {
                    document.documentElement.style.setProperty(key, defaultTheme[key]);
                }
            }
        }
        return;
    }

    // DOM Elements
    const exporterStatusMessage = document.getElementById('exporterStatusMessage');
    const exporterCollectionSelect = document.getElementById('exporterCollectionSelect');
    const exporterTranslationSelect = document.getElementById('exporterTranslationSelect');
    const exporterOutputMode = document.getElementById('exporterOutputMode');
    const textGenerationOptionsContainer = document.getElementById('textGenerationOptionsContainer');
    const printLayoutOptionsContainer = document.getElementById('printLayoutOptionsContainer'); 
    const exporterGenerateBtn = document.getElementById('exporterGenerateBtn');
    const exporterOutputTextarea = document.getElementById('exporterOutputTextarea');
    const exporterCopyOutputBtn = document.getElementById('exporterCopyOutputBtn');

    // Text Export Option Elements
    const textExportStartEntry = document.getElementById('textExportStartEntry');
    const textExportEndEntry = document.getElementById('textExportEndEntry');
    const textExportBulletStyle = document.getElementById('textExportBulletStyle');
    const textExportRefTextSeparator = document.getElementById('textExportRefTextSeparator');
    const textExportEntrySeparator = document.getElementById('textExportEntrySeparator');
    const textExportPerCollectionHeader = document.getElementById('textExportPerCollectionHeader');


    // --- LocalStorage Keys for Exporter-Specific Options (distinct prefix if needed) ---
    const LS_EXPORTER_OUTPUT_MODE = 'advExporter_outputMode';
    const LS_EXPORTER_START_ENTRY = 'advExporter_startEntry'; // Renamed to avoid clash with old modal
    const LS_EXPORTER_END_ENTRY = 'advExporter_endEntry';
    const LS_EXPORTER_BULLET_STYLE = 'advExporter_bulletStyle';
    const LS_EXPORTER_REF_TEXT_SEP = 'advExporter_refTextSep';
    const LS_EXPORTER_ENTRY_SEP = 'advExporter_entrySep';
    const LS_EXPORTER_PER_COLLECTION_HEADER = 'advExporter_perCollectionHeader';
    // For selected collections/translations, it's probably better not to save these
    // as the lists can change. Users will re-select each time.

    function showExporterStatus(message, isError = false, duration = 4000) {
        // ... (status function remains the same)
        if (exporterStatusMessage) {
            exporterStatusMessage.textContent = message;
            exporterStatusMessage.className = 'status-message-bar'; 
            exporterStatusMessage.classList.add(isError ? 'error-message' : 'success-message'); 
            exporterStatusMessage.style.color = isError ? 'var(--brand-color)' : 'var(--text-color)';
            
            if (duration > 0) {
                setTimeout(() => {
                    if (exporterStatusMessage.textContent === message) {
                        exporterStatusMessage.textContent = '';
                        exporterStatusMessage.className = 'status-message-bar';
                    }
                }, duration);
            }
        } else {
            console.log(`Exporter Status (${isError ? 'Error' : 'Info'}): ${message}`);
        }
    }

    async function populateSelectors() {
        // ... (populateSelectors remains the same)
        try {
            await initDB(); 

            const collections = await getAllCollectionsFromDB();
            exporterCollectionSelect.innerHTML = '';
            if (collections.length === 0) {
                exporterCollectionSelect.appendChild(new Option("-- No Collections --", ""));
                exporterCollectionSelect.disabled = true;
            } else {
                collections.sort((a, b) => a.name.localeCompare(b.name)).forEach(coll => {
                    exporterCollectionSelect.appendChild(new Option(coll.name + ` (${(coll.verses || []).length} entries)`, coll.name));
                });
                exporterCollectionSelect.disabled = false;
            }

            const translations = await getTranslationsList();
            exporterTranslationSelect.innerHTML = '';
            if (translations.length === 0) {
                exporterTranslationSelect.appendChild(new Option("-- No Translations --", ""));
                exporterTranslationSelect.disabled = true;
            } else {
                translations.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)).forEach(t => {
                    exporterTranslationSelect.appendChild(new Option(t.name || t.id, t.id));
                });
                exporterTranslationSelect.disabled = false;
            }

        } catch (error) {
            console.error("Error populating exporter selectors:", error);
            showExporterStatus("Could not load data for selectors.", true, 0);
        }
    }

    function loadSavedExporterOptions() {
        try {
            // Load common theme from main app's localStorage
            const savedTheme = localStorage.getItem('selectedTheme') || 'dark'; // From script.js SELECTED_THEME_LS_KEY
            if (typeof applyTheme === 'function') {
                applyTheme(savedTheme);
            }

            // Load exporter-specific settings
            exporterOutputMode.value = localStorage.getItem(LS_EXPORTER_OUTPUT_MODE) || 'generatedText';
            textExportStartEntry.value = localStorage.getItem(LS_EXPORTER_START_ENTRY) || "1";
            textExportEndEntry.value = localStorage.getItem(LS_EXPORTER_END_ENTRY) || "0";
            textExportBulletStyle.value = localStorage.getItem(LS_EXPORTER_BULLET_STYLE) || "none";
            textExportRefTextSeparator.value = localStorage.getItem(LS_EXPORTER_REF_TEXT_SEP) || " - ";
            textExportEntrySeparator.value = localStorage.getItem(LS_EXPORTER_ENTRY_SEP) || "\n\n";
            textExportPerCollectionHeader.checked = localStorage.getItem(LS_EXPORTER_PER_COLLECTION_HEADER) === 'true';

            // Trigger change on output mode to show/hide relevant option sections
            exporterOutputMode.dispatchEvent(new Event('change'));

        } catch (e) {
            console.warn("Error loading some exporter options from localStorage", e);
        }
    }
    
    function saveCurrentExporterOptions() { // Renamed from saveCurrentTextOptions
        try {
            localStorage.setItem(LS_EXPORTER_OUTPUT_MODE, exporterOutputMode.value);
            localStorage.setItem(LS_EXPORTER_START_ENTRY, textExportStartEntry.value);
            localStorage.setItem(LS_EXPORTER_END_ENTRY, textExportEndEntry.value);
            localStorage.setItem(LS_EXPORTER_BULLET_STYLE, textExportBulletStyle.value);
            localStorage.setItem(LS_EXPORTER_REF_TEXT_SEP, textExportRefTextSeparator.value);
            localStorage.setItem(LS_EXPORTER_ENTRY_SEP, textExportEntrySeparator.value);
            localStorage.setItem(LS_EXPORTER_PER_COLLECTION_HEADER, textExportPerCollectionHeader.checked.toString());
        } catch (e) {
            console.warn("Could not save exporter options to localStorage:", e);
        }
    }

    exporterOutputMode.addEventListener('change', () => {
        const mode = exporterOutputMode.value;
        textGenerationOptionsContainer.style.display = (mode === 'generatedText') ? 'block' : 'none';
        printLayoutOptionsContainer.style.display = (mode === 'printLayout') ? 'block' : 'none';
        saveCurrentExporterOptions(); // Save when mode changes
    });
    
    // Add event listeners to save other options as they change
    [textExportStartEntry, textExportEndEntry, textExportBulletStyle, 
     textExportRefTextSeparator, textExportEntrySeparator, textExportPerCollectionHeader].forEach(el => {
        el.addEventListener('change', saveCurrentExporterOptions);
        if (el.type === 'number' || el.type === 'text') { // Also save on input for number/text for more responsive saving
            el.addEventListener('input', saveCurrentExporterOptions);
        }
    });
    
    // --- Text Generation Logic (Adapted from collection_text_exporter.js) ---
    function getVerseTextForEntry(entryRef, bibleVersesList) { 
        // ... (remains the same)
        if (!entryRef || !bibleVersesList) return "";
        const bookKey = entryRef._book;
        const chapNum = entryRef._chapter;
        const startVerse = entryRef._startVerse;
        const endVerse = entryRef._endVerse;

        const relevantVerses = bibleVersesList
            .filter(v => v._book === bookKey && v._chapter === chapNum && v._verse >= startVerse && v._verse <= endVerse)
            .sort((a,b) => a._verse - b._verse)
            .map(v => (v.text || "").trim());

        return relevantVerses.join(' ');
    }

    function getAlphabeticalBullet(number, isUpper) { 
        // ... (remains the same)
        if (number <= 0) return "";
        let result = "";
        const baseCharCode = isUpper ? 65 : 97;
        number--; 
        do {
            result = String.fromCharCode(baseCharCode + (number % 26)) + result;
            number = Math.floor(number / 26) -1; 
        } while (number >=0);
        return result + ". ";
    }


    async function handleGenerateExport() {
        const selectedCollectionNames = Array.from(exporterCollectionSelect.selectedOptions).map(opt => opt.value);
        const selectedTranslationIds = Array.from(exporterTranslationSelect.selectedOptions).map(opt => opt.value);
        const mode = exporterOutputMode.value;

        if (selectedCollectionNames.length === 0) {
            showExporterStatus("Please select at least one collection.", true);
            return;
        }
        if (mode === 'generatedText' && selectedTranslationIds.length === 0) {
            showExporterStatus("Please select at least one translation for text generation.", true);
            return;
        }
        
        saveCurrentExporterOptions(); // Ensure latest options are saved before generation
        showExporterStatus("Generating export...", false, 0);
        exporterOutputTextarea.value = '';
        exporterGenerateBtn.disabled = true;

        if (mode === 'generatedText') {
            await generateFormattedText(selectedCollectionNames, selectedTranslationIds);
        } else if (mode === 'printLayout') {
            exporterOutputTextarea.value = "Print Layout mode is not yet implemented.";
            showExporterStatus("Print Layout feature coming soon.", false, 3000);
        }
        exporterGenerateBtn.disabled = false;
    }

    async function generateFormattedText(collectionNames, translationIds) {
        const textOptions = {
            startEntry: parseInt(textExportStartEntry.value, 10) || 1,
            endEntry: parseInt(textExportEndEntry.value, 10) || 0,
            bullet: textExportBulletStyle.value,
            refTextSep: textExportRefTextSeparator.value.replace(/\\n/g, '\n').replace(/\\t/g, '\t'),
            entrySep: textExportEntrySeparator.value.replace(/\\n/g, '\n').replace(/---/g,'\u2014\u2014\u2014'), // Replace --- with em dashes if used
            addHeader: textExportPerCollectionHeader.checked
        };
        // Note: saveCurrentExporterOptions() is called in handleGenerateExport before this function

        let outputString = "";
        const allTranslationsData = {}; 

        try {
            for (const transId of translationIds) {
                if (!allTranslationsData[transId]) {
                    const verses = await getVersesByTranslation(transId); 
                    allTranslationsData[transId] = verses || [];
                }
            }

            for (const collName of collectionNames) {
                const collection = await getCollectionFromDB(collName); 
                if (!collection || !collection.verses || collection.verses.length === 0) {
                    outputString += (outputString.length > 0 ? textOptions.entrySep : "") + `Collection "${collName}" is empty or not found.`;
                    continue;
                }
                
                if (textOptions.addHeader) {
                     outputString += (outputString.length > 0 ? textOptions.entrySep : "") + `--- Collection: ${collName} ---`;
                }


                let startIndex = Math.max(0, textOptions.startEntry - 1);
                let endIndex = (textOptions.endEntry <= 0 || textOptions.endEntry < textOptions.startEntry) 
                                ? collection.verses.length 
                                : Math.min(collection.verses.length, textOptions.endEntry);
                
                const entriesToExport = collection.verses.slice(startIndex, endIndex);

                if (entriesToExport.length === 0) {
                    if (textOptions.addHeader) { // Only add "(No entries)" if a header was added for this collection
                        outputString += (outputString.endsWith(`--- Collection: ${collName} ---`) ? "\n" : textOptions.entrySep) + `(No entries in selected range for "${collName}")`;
                    } else if (collectionNames.length > 1) { // If multiple collections, indicate which one has no entries
                        outputString += (outputString.length > 0 ? textOptions.entrySep : "") + `(No entries for "${collName}" in selected range)`;
                    }
                    continue;
                }

                for (let i = 0; i < entriesToExport.length; i++) {
                    const entry = entriesToExport[i];
                    let bulletPrefix = "";
                    const entryNumberInSlice = i + 1; 

                    switch(textOptions.bullet) {
                        case "square": bulletPrefix = "☐ "; break;
                        case "disc": bulletPrefix = "● "; break;
                        case "dash": bulletPrefix = "- "; break;
                        case "numbered": bulletPrefix = `${entryNumberInSlice}. `; break;
                        case "alpha_upper": bulletPrefix = getAlphabeticalBullet(entryNumberInSlice, true); break;
                        case "alpha_lower": bulletPrefix = getAlphabeticalBullet(entryNumberInSlice, false); break;
                        default: bulletPrefix = ""; break;
                    }
                    
                    if (outputString.length > 0 && !outputString.endsWith(textOptions.entrySep) && !(textOptions.addHeader && i===0 && outputString.endsWith(`--- Collection: ${collName} ---`))) {
                         outputString += textOptions.entrySep; // Ensure entry separator before new item if not first or just after header
                    } else if (textOptions.addHeader && i === 0 && outputString.endsWith(`--- Collection: ${collName} ---`)){
                         outputString += "\n"; // Add a newline after header before the first item
                    }


                    if (translationIds.length > 1) {
                        let multiEntryLines = [`${bulletPrefix}${entry.reference}`];
                        for (const transId of translationIds) {
                            let transName = transId;
                            const selectOption = Array.from(exporterTranslationSelect.options).find(opt => opt.value === transId);
                            if (selectOption) transName = selectOption.textContent;

                            const versesForThisTrans = allTranslationsData[transId];
                            const verseText = getVerseTextForEntry(entry, versesForThisTrans);
                            multiEntryLines.push(`\t(${transName})${textOptions.refTextSep}${verseText || "(Text not found)"}`);
                        }
                        outputString += multiEntryLines.join('\n');
                    } else { 
                        const versesForSingleTrans = allTranslationsData[translationIds[0]];
                        const verseText = getVerseTextForEntry(entry, versesForSingleTrans);
                        outputString += `${bulletPrefix}${entry.reference}${textOptions.refTextSep}${verseText || "(Text not found)"}`;
                    }
                }
            }
            exporterOutputTextarea.value = outputString.trim();
            showExporterStatus(`Text generated for ${collectionNames.length} collection(s).`, false, 4000);

        } catch (error) {
            console.error("Error during text generation:", error);
            showExporterStatus(`Error: ${error.message || "Could not generate text."}`, true, 0);
        }
    }

    function handleCopyOutput() {
        // ... (remains the same)
        if (!exporterOutputTextarea.value) {
            showExporterStatus("Nothing to copy.", true, 3000);
            return;
        }
        if (!navigator.clipboard) {
            showExporterStatus("Clipboard API not available. Please copy manually.", true, 5000);
            exporterOutputTextarea.select();
            exporterOutputTextarea.setSelectionRange(0, 99999);
            return;
        }
        navigator.clipboard.writeText(exporterOutputTextarea.value)
            .then(() => showExporterStatus("Text copied to clipboard!", false, 3000))
            .catch(err => {
                console.error("Clipboard copy failed:", err);
                showExporterStatus("Copy failed. Try manual copy.", true, 5000);
                exporterOutputTextarea.select();
                exporterOutputTextarea.setSelectionRange(0, 99999);
            });
    }
    
    // Initial setup
    exporterGenerateBtn.addEventListener('click', handleGenerateExport);
    exporterCopyOutputBtn.addEventListener('click', handleCopyOutput);

    // Apply theme and load options first, then populate dynamic content
    loadSavedExporterOptions(); 
    await populateSelectors();
    
    showExporterStatus("Exporter ready.", false, 2000);
});