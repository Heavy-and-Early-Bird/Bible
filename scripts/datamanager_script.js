// datamanager_script.js
document.addEventListener('DOMContentLoaded', () => {
    // Ensure db is initialized
    if (typeof initDB !== 'function' || typeof parseBibleReferenceWithNote !== 'function' ) {
        console.error("Core functions from script.js not found. Make sure script.js is loaded correctly.");
        alert("Critical error: Core functions not available.");
        return;
    }

    // --- Get DOM Elements ---
    const dmStatusMessage = document.getElementById('dmStatusMessage');
    const dmImportBibleBtn = document.getElementById('dmImportBibleBtn');
    const dmXmlFileInput = document.getElementById('dmXmlFileInput');
    const dmTranslationsList = document.getElementById('dmTranslationsList');
    const dmImportCollectionTxtBtn = document.getElementById('dmImportCollectionTxtBtn');
    const dmCollectionFileInput = document.getElementById('dmCollectionFileInput');
    const dmImportCollectionsJsonBtn = document.getElementById('dmImportCollectionsJsonBtn');
    const dmCollectionsJsonInput = document.getElementById('dmCollectionsJsonInput');
    const dmExportAllCollectionsBtn = document.getElementById('dmExportAllCollectionsBtn');
    const dmCollectionsList = document.getElementById('dmCollectionsList');
    const dmCollectionNameInput = document.getElementById('dmCollectionNameInput');
    const dmCollectionVersesEditor = document.getElementById('dmCollectionVersesEditor');
    const dmCollectionNoteTextarea = document.getElementById('dmCollectionNoteTextarea');
    const dmSaveNewCollectionBtn = document.getElementById('dmSaveNewCollectionBtn');
    const dmUpdateExistingCollectionBtn = document.getElementById('dmUpdateExistingCollectionBtn');
    const dmClearCollectionEditorBtn = document.getElementById('dmClearCollectionEditorBtn');
    const dmValidateVersesBtn = document.getElementById('dmValidateVersesBtn');

    // Tab Elements
    const tabButtons = document.querySelectorAll('.dm-tab-button');
    const tabPanes = document.querySelectorAll('.dm-tab-pane');

    // Validation Modal Elements
    const validationModal = document.getElementById('validationModal');
    const modalCloseBtnValidation = document.getElementById('modalCloseBtnValidation');
    const validationModalTitle = document.getElementById('validationModalTitle');
    const validationIssuesContainer = document.getElementById('validationIssuesContainer');
    const validationCancelBtn = document.getElementById('validationCancelBtn');
    const validationSaveValidOnlyBtn = document.getElementById('validationSaveValidOnlyBtn');
    const validationApplyAndSaveBtn = document.getElementById('validationApplyAndSaveBtn');

    // Export Modal Elements (for JSON export)
    const exportModal = document.getElementById('exportModal');
    const exportModalCloseBtn = document.getElementById('exportModalCloseBtn');
    const exportModalCloseBtnFooter = document.getElementById('exportModalCloseBtnFooter');
    const exportDownloadBtn = document.getElementById('exportDownloadBtn');
    const exportCopyBtn = document.getElementById('exportCopyBtn');
    const exportShowJsonBtn = document.getElementById('exportShowJsonBtn');
    const exportJsonTextarea = document.getElementById('exportJsonTextarea');
    const exportStatusMessage = document.getElementById('exportStatusMessage');

    // Extraction Modal Control Elements
    const openRefExtractionModalBtn = document.getElementById('openRefExtractionModalBtn');
    const referenceExtractionModal = document.getElementById('referenceExtractionModal');
    const refExtractionModalCloseBtn = document.getElementById('refExtractionModalCloseBtn');
    const refExtractionModalCloseBtnFooter = document.getElementById('refExtractionModalCloseBtnFooter');

    // NEW: Cross-Reference Elements
    const dmImportCrossRefBtn = document.getElementById('dmImportCrossRefBtn');
    const dmCrossRefJsonInput = document.getElementById('dmCrossRefJsonInput');
    const crossRefStatusMessage = document.getElementById('crossRefStatusMessage');


    // --- State Variables ---
    let localFullBibleVerses = [];
    let localCurrentTranslationId = null;
    let currentlyEditingCollectionName = null;
    let currentValidationResult = null;
    let fullListOfLinesFromEditor = [];
    let currentExportJsonString = '';

    window.localShowStatus = localShowStatus;

    // --- Status Message Function ---
    function localShowStatus(message, isError = false, duration = 4000) {
        if (typeof showStatusMessage === 'function') {
            showStatusMessage(message, isError, duration, dmStatusMessage);
        } else {
            dmStatusMessage.textContent = message;
            dmStatusMessage.style.color = isError ? 'var(--brand-color)' : 'var(--text-color)';
            if (duration > 0) setTimeout(() => { if(dmStatusMessage.textContent === message) dmStatusMessage.textContent = ''; }, duration);
        }
    }
    
    function setStatus(element, message, isError, duration = 4000) {
        if (element) {
            element.textContent = message;
            element.style.color = isError ? 'var(--brand-color)' : 'var(--text-color)';
            if (duration > 0) {
                setTimeout(() => { if (element.textContent === message) element.textContent = ''; }, duration);
            }
        }
    }

    function showExportStatus(message, isError = false, duration = 4000) { 
         if (exportStatusMessage) {
             exportStatusMessage.textContent = message;
             exportStatusMessage.style.color = isError ? 'var(--brand-color)' : 'var(--text-color)';
             if (duration > 0) {
                 setTimeout(() => {
                     if (exportStatusMessage.textContent === message) exportStatusMessage.textContent = '';
                 }, duration);
             }
         }
     }

    // --- Tab Navigation Logic ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            button.classList.add('active');
            const targetPaneId = button.dataset.tabTarget;
            const targetPane = document.querySelector(targetPaneId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // --- Helper: Load Bible for Reference ---
    async function loadFirstAvailableTranslationVerses() {
        const translations = await getTranslationsList(); // From script.js
        if (translations.length > 0) {
            const firstLi = dmTranslationsList?.querySelector('li');
            const firstIdFromList = firstLi?.querySelector('.dm-delete-translation-btn')?.dataset.id;
            localCurrentTranslationId = firstIdFromList || translations[0].id;
            window.localCurrentTranslationId = localCurrentTranslationId; // Expose for extractor
            try {
                 localFullBibleVerses = await getVersesByTranslation(localCurrentTranslationId); // From script.js
                 window.localFullBibleVerses = localFullBibleVerses; // Expose for extractor
                 console.log(`DataManager: Using translation "${localCurrentTranslationId}" for context (${localFullBibleVerses.length} verses).`);
                 if (typeof window.updateModalRefBibleNameDisplay === 'function') { // From extractor_script.js
                     window.updateModalRefBibleNameDisplay(localCurrentTranslationId);
                 }
                 return true;
            } catch (error) {
                 console.error(`DataManager: Error loading verses for ${localCurrentTranslationId}:`, error);
                 localFullBibleVerses = []; window.localFullBibleVerses = [];
                 localCurrentTranslationId = null; window.localCurrentTranslationId = null;
                 if (typeof window.updateModalRefBibleNameDisplay === 'function') {
                     window.updateModalRefBibleNameDisplay(null);
                 }
                 return false;
            }
        }
        localFullBibleVerses = []; window.localFullBibleVerses = [];
        localCurrentTranslationId = null; window.localCurrentTranslationId = null;
        if (typeof window.updateModalRefBibleNameDisplay === 'function') {
            window.updateModalRefBibleNameDisplay(null);
        }
        console.warn("DataManager: No translations available for context.");
        return false;
    }
     
     window.loadFirstAvailableTranslationVersesForExtractor = async () => {
        if (localFullBibleVerses.length > 0 && localCurrentTranslationId) {
            if (typeof window.updateModalRefBibleNameDisplay === 'function') {
                window.updateModalRefBibleNameDisplay(localCurrentTranslationId);
            }
            return true;
        }
        return await loadFirstAvailableTranslationVerses();
    };

    // --- Translations Management ---
    async function populateTranslationsList() {
        if (!dmTranslationsList) return;
        dmTranslationsList.innerHTML = '';
        try {
            const translations = await getTranslationsList();
            if (translations.length === 0) {
                dmTranslationsList.innerHTML = '<li>No translations imported yet.</li>';
                localFullBibleVerses = []; window.localFullBibleVerses = [];
                localCurrentTranslationId = null; window.localCurrentTranslationId = null;
                if (typeof window.updateModalRefBibleNameDisplay === 'function') {
                    window.updateModalRefBibleNameDisplay(null);
                }
                return;
            }
            translations.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)).forEach(t => {
                const li = document.createElement('li');
                li.className = 'dm-item';
                const importDateStr = t.importDate ? new Date(t.importDate).toLocaleDateString() : 'N/A';
                const displayName = t.name || t.id; 
                const displayId = t.id;
                li.innerHTML = `
                    <span class="dm-item-name" title="ID: ${displayId}">${displayName} (Imported: ${importDateStr})</span>
                    <div class="dm-item-actions">
                        <button data-id="${t.id}" class="dm-edit-translation-name-btn dm-button" style="background-color: var(--options-panel-item-hover-bg); color:var(--text-color);" title="Edit display name">Edit Name</button>
                        <button data-id="${t.id}" class="dm-delete-translation-btn dm-button">Delete</button>
                    </div>
                `;
                dmTranslationsList.appendChild(li);
            });
            await loadFirstAvailableTranslationVerses();
        } catch (error) {
            console.error("Error populating translations list:", error);
            localShowStatus("Could not load translations.", true);
        }
    }

    if(dmImportBibleBtn) dmImportBibleBtn.addEventListener('click', () => dmXmlFileInput.click());
    if(dmXmlFileInput) dmXmlFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        localShowStatus("Processing XML...", false, 0);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const parseResult = parseXMLData(evt.target.result, file.name);
            if (parseResult && parseResult.verses.length > 0) {
                try {
                    localShowStatus(`Saving "${parseResult.displayName}" (${parseResult.verses.length} verses)...`, false, 0);
                    await saveTranslationData(parseResult.translationId, parseResult.displayName, parseResult.verses);
                    localShowStatus(`"${parseResult.displayName}" imported successfully.`, false);
                    await populateTranslationsList();
                } catch (dbError) {
                    console.error("Error saving translation:", dbError);
                    localShowStatus(`DB Save Error: ${dbError.message || 'Unknown error'}`, true);
                }
            } else if (parseResult && parseResult.verses.length === 0) {
                localShowStatus(`XML parsed but no verses found in: ${file.name}`, true);
            } else {
                localShowStatus(`Failed to parse XML: ${file.name}. Check console.`, true);
            }
        };
        reader.onerror = () => { localShowStatus("Error reading XML file.", true); };
        reader.readAsText(file);
        dmXmlFileInput.value = null;
    });

    if(dmTranslationsList) dmTranslationsList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('dm-delete-translation-btn')) {
            const translationId = e.target.dataset.id;
            if (confirm(`DELETE Translation "${translationId}"?\n\nThis cannot be undone.`)) {
                try {
                    localShowStatus(`Deleting "${translationId}"...`, false, 0);
                    await deleteTranslationFromDB(translationId);
                    localShowStatus(`Translation "${translationId}" deleted.`, false);
                    await populateTranslationsList();
                } catch (error) {
                    console.error("Error deleting translation:", error);
                    localShowStatus(`Failed to delete translation: ${error.message || 'Unknown error'}`, true);
                }
            }
        } else if (e.target.classList.contains('dm-edit-translation-name-btn')) {
            const translationId = e.target.dataset.id;
            const translationMeta = await getTranslationMetadata(translationId);
            const currentDisplayName = translationMeta ? (translationMeta.name || translationMeta.id) : translationId;

            const newName = prompt(`Enter new display name for translation (ID: ${translationId}):`, currentDisplayName);

            if (newName === null) { 
                localShowStatus("Name edit cancelled.", false, 2000);
                return;
            }
            const trimmedNewName = newName.trim();
            if (trimmedNewName === "") {
                localShowStatus("Display name cannot be empty.", true);
                return;
            }
            if (trimmedNewName === currentDisplayName) {
                 localShowStatus("No changes made to display name.", false, 2000);
                 return;
            }

            try {
                localShowStatus(`Updating name for "${translationId}"...`, false, 0);
                await updateTranslationName(translationId, trimmedNewName);
                localShowStatus(`Display name for "${translationId}" updated to "${trimmedNewName}".`, false);
                await populateTranslationsList();
            } catch (error) {
                console.error("Error updating translation name:", error);
                localShowStatus(`Failed to update name: ${error.message || 'Unknown error'}`, true);
            }
        }
    });

    // --- Collections Management ---
    async function populateCollectionsList() {
        if(!dmCollectionsList) return;
        dmCollectionsList.innerHTML = '';
        try {
            const collections = await getAllCollectionsFromDB();
            if (collections.length === 0) {
                dmCollectionsList.innerHTML = '<li>No collections created or imported yet.</li>';
                if(dmExportAllCollectionsBtn) dmExportAllCollectionsBtn.disabled = true;
                return;
            }
            if(dmExportAllCollectionsBtn) dmExportAllCollectionsBtn.disabled = false;
            collections.sort((a, b) => a.name.localeCompare(b.name)).forEach(coll => {
                const li = document.createElement('li');
                li.className = 'dm-item';
                const verseCount = (coll.verses || []).length;
                li.innerHTML = `
                    <span class="dm-item-name">${coll.name} (${verseCount} entries)</span>
                    <div class="dm-item-actions">
                        <button data-name="${coll.name}" class="dm-edit-collection-btn dm-button">Edit</button>
                        <button data-name="${coll.name}" class="dm-delete-collection-btn dm-button">Delete</button>
                    </div>
                `;
                dmCollectionsList.appendChild(li);
            });
        } catch (error) {
            console.error("Error populating collections list:", error);
            localShowStatus("Could not load collections.", true);
            if(dmExportAllCollectionsBtn) dmExportAllCollectionsBtn.disabled = true;
        }
    }

    function clearCollectionEditor() {
        if(dmCollectionNameInput) dmCollectionNameInput.value = '';
        if(dmCollectionNameInput) dmCollectionNameInput.disabled = false;
        if(dmCollectionVersesEditor) dmCollectionVersesEditor.innerHTML = '';
        if(dmCollectionNoteTextarea) dmCollectionNoteTextarea.value = '';
        if(dmUpdateExistingCollectionBtn) dmUpdateExistingCollectionBtn.disabled = true;
        if(dmSaveNewCollectionBtn) dmSaveNewCollectionBtn.disabled = false;
        currentlyEditingCollectionName = null;
        currentValidationResult = null;
        fullListOfLinesFromEditor = [];
        localShowStatus("Editor cleared.", false, 1500);
    }
    if(dmClearCollectionEditorBtn) dmClearCollectionEditorBtn.addEventListener('click', clearCollectionEditor);

    async function validateVerseLines(textContent) {
         const lines = textContent.split('\n');
         const linesData = [];
         let overallIsValid = true;

         for (let i = 0; i < lines.length; i++) {
             const lineNumber = i + 1;
             const originalText = lines[i];
             const trimmedLine = originalText.trim();
             if (trimmedLine === "") {
                 linesData.push({ originalText, lineNumber, status: 'empty', parsedRef: null });
                 continue;
             }
             let status = 'valid';
             let parsedRef = parseBibleReferenceWithNote(trimmedLine);

             if (!parsedRef) {
                 status = 'invalid-format';
                 overallIsValid = false;
             }
             linesData.push({ originalText, lineNumber, status, parsedRef });
         }
         const hasProblem = linesData.some(l => l.status === 'invalid-format');
         overallIsValid = !hasProblem;
         fullListOfLinesFromEditor = lines;
         return { isValid: overallIsValid, linesData };
     }

    function displayValidationResults(linesData) {
        if(!dmCollectionVersesEditor) return;
         let htmlContent = '';
         for (const lineData of linesData) {
              const escapedText = lineData.originalText.replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
              const problemClass = (lineData.status === 'invalid-format') ? lineData.status : '';
              htmlContent += `<span class="validation-line ${problemClass}">${escapedText || ''}</span>`;
         }
         dmCollectionVersesEditor.innerHTML = htmlContent;
    }

    if(dmImportCollectionTxtBtn) dmImportCollectionTxtBtn.addEventListener('click', () => dmCollectionFileInput.click());
    if(dmCollectionFileInput) dmCollectionFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        localShowStatus(`Loading "${file.name}"...`, false, 0);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            const collText = evt.target.result;
            clearCollectionEditor();
            const initialValidation = await validateVerseLines(collText);
            displayValidationResults(initialValidation.linesData);
            let proposedName = file.name.replace(/\.txt$/i, '').replace(/[_\s]+/g, ' ').trim();
            if(dmCollectionNameInput) dmCollectionNameInput.value = proposedName;
            if(dmUpdateExistingCollectionBtn) dmUpdateExistingCollectionBtn.disabled = true;
            if(dmSaveNewCollectionBtn) dmSaveNewCollectionBtn.disabled = false;
            const problemCount = initialValidation.linesData.filter(l => l.status === 'invalid-format').length;
            if (problemCount > 0) {
                localShowStatus(`Loaded "${file.name}". ${problemCount} formatting issues highlighted. Review.`, true, 8000);
            } else if (collText.trim() === '') {
                 localShowStatus(`Loaded empty file "${file.name}".`, false, 5000);
            } else {
                 localShowStatus(`Loaded "${file.name}". Format looks good! Review or save.`, false, 5000);
            }
        };
        reader.onerror = () => { localShowStatus("Error reading .txt file.", true); };
        reader.readAsText(file);
        dmCollectionFileInput.value = null;
    });

    if(dmValidateVersesBtn) dmValidateVersesBtn.addEventListener('click', async () => {
        if (!dmCollectionVersesEditor) return;
        const textContent = dmCollectionVersesEditor.innerText;
        if (textContent.trim() === '') {
            localShowStatus("Editor is empty. Nothing to validate.", false, 3000);
            dmCollectionVersesEditor.innerHTML = '';
            return;
        }
        localShowStatus("Validating format...", false, 0);
        const validationResult = await validateVerseLines(textContent);
        displayValidationResults(validationResult.linesData);
        const problemCount = validationResult.linesData.filter(l => l.status === 'invalid-format').length;
        localShowStatus(problemCount > 0 ? `Validation: ${problemCount} format issues highlighted.` : "Validation: All lines format looks good!", problemCount > 0, 6000);
    });

    function openValidationModal(validationResult) {
        if (!validationIssuesContainer || !validationModalTitle || !validationModal) return;
        currentValidationResult = validationResult;
        validationIssuesContainer.innerHTML = '';
        let issueCount = 0;
        validationResult.linesData.forEach((lineData, index) => {
            if (lineData.status === 'invalid-format') {
                issueCount++;
                const issueDiv = document.createElement('div');
                issueDiv.className = 'validation-issue-item';
                issueDiv.dataset.originalIndex = index;
                const escapedText = (lineData.originalText || '').replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">");
                let statusText = 'Invalid Format';
                issueDiv.innerHTML = `
                    <span class="original-text" title="Original Line ${lineData.lineNumber}">${escapedText || '(Empty)'}</span>
                    <span class="issue-status ${lineData.status}" title="Problem type">${statusText}</span>
                    <div class="correction-input"><input type="text" placeholder="Correction for Line ${lineData.lineNumber}" value="${lineData.originalText}"></div>`;
                validationIssuesContainer.appendChild(issueDiv);
            }
        });
        if (issueCount === 0) { localShowStatus("Modal opened without issues (unexpected).", true); return; }
        validationModalTitle.textContent = `Review ${issueCount} Formatting Issue(s)`;
        if(validationSaveValidOnlyBtn) validationSaveValidOnlyBtn.textContent = "Save Parsable Lines Only";
        validationModal.style.display = 'block';
        validationIssuesContainer.querySelector('.correction-input input')?.focus();
    }

    if(modalCloseBtnValidation) modalCloseBtnValidation.addEventListener('click', () => { if(validationModal) validationModal.style.display = 'none'; });
    if(validationCancelBtn) validationCancelBtn.addEventListener('click', () => { if(validationModal) validationModal.style.display = 'none'; localShowStatus("Save cancelled.", false); });

    function getValidFormatVerseObjectsFromModalSource() {
        if (!currentValidationResult?.linesData) return [];
        return currentValidationResult.linesData
            .filter(line => line.status === 'valid' && line.parsedRef)
            .map(lineData => ({
                _book: lineData.parsedRef.book.toLowerCase().replace(/\s+/g, ' '),
                _chapter: lineData.parsedRef.chapter,
                _startVerse: lineData.parsedRef.startVerse,
                _endVerse: lineData.parsedRef.endVerse,
                reference: `${lineData.parsedRef.book} ${lineData.parsedRef.chapter}:${lineData.parsedRef.startVerse}${lineData.parsedRef.startVerse !== lineData.parsedRef.endVerse ? '-' + lineData.parsedRef.endVerse : ''}`
            }));
    }

    async function performSave(name, note, versesToSaveObjects, isUpdate, messageSuffix = "") {
        if (!versesToSaveObjects || versesToSaveObjects.length === 0) {
             localShowStatus("Cannot save: No parsable verses." + messageSuffix, true); return;
        }
        if (!isUpdate) {
            const existing = await getCollectionFromDB(name);
            if (existing && !confirm(`Collection "${name}" exists. Overwrite?`)) {
                localShowStatus("Save cancelled.", false); return;
            }
        }
        const collectionToSave = {
            name,
            collectionNote: note || null,
            verses: versesToSaveObjects,
            lastModified: new Date()
        };
        try {
            await saveCollectionToDB(collectionToSave);
            localShowStatus(`Collection "${name}" ${isUpdate ? "updated" : "saved"} (${versesToSaveObjects.length} entries).${messageSuffix}`, false);
            await populateCollectionsList();
            clearCollectionEditor();
        } catch (e) {
            localShowStatus(`Save failed: ${e.message || 'Unknown'}`, true);
        }
    }

    if (validationSaveValidOnlyBtn) validationSaveValidOnlyBtn.addEventListener('click', async () => {
        if (!dmCollectionNameInput || !dmCollectionNoteTextarea || !validationModal) return;
        const name = dmCollectionNameInput.value.trim();
        const note = dmCollectionNoteTextarea.value.trim();
        const isUpdate = (currentlyEditingCollectionName === name && name !== '');
        localShowStatus("Saving parsable verses, ignoring formatting issues...", false, 1500);
        validationModal.style.display = 'none';
        const parsableVerseRefs = getValidFormatVerseObjectsFromModalSource();
        await performSave(name, note, parsableVerseRefs, isUpdate, " Formatting issues were ignored.");
    });

    if(validationApplyAndSaveBtn) validationApplyAndSaveBtn.addEventListener('click', async () => {
         if (!validationIssuesContainer || !validationModal || !dmCollectionNameInput) return;
         localShowStatus("Applying corrections and re-validating format...", false, 0);
         const correctionItems = validationIssuesContainer.querySelectorAll('.validation-issue-item');
         const updatedLines = [...fullListOfLinesFromEditor];
         correctionItems.forEach(item => {
             const originalIndex = parseInt(item.dataset.originalIndex, 10);
             const input = item.querySelector('.correction-input input');
             if (input && originalIndex >= 0 && originalIndex < updatedLines.length) {
                updatedLines[originalIndex] = input.value;
             }
         });
         const updatedTextContent = updatedLines.join('\n');
         const tempValidation = await validateVerseLines(updatedTextContent);
         displayValidationResults(tempValidation.linesData);
         validationModal.style.display = 'none';
         const isUpdate = (currentlyEditingCollectionName === dmCollectionNameInput.value.trim() && currentlyEditingCollectionName !== null);
         await handleSaveOrUpdate(isUpdate);
     });

    async function handleSaveOrUpdate(isUpdate = false) {
        if (!dmCollectionNameInput || !dmCollectionNoteTextarea || !dmCollectionVersesEditor) return;
        const name = dmCollectionNameInput.value.trim();
        const note = dmCollectionNoteTextarea.value.trim();
        const textContent = dmCollectionVersesEditor.innerText;
        if (!name) { localShowStatus("Collection name required.", true); return; }
        if (isUpdate && name !== currentlyEditingCollectionName) { localShowStatus("Name change not allowed during update.", true); return; }
        if (textContent.trim() === '') { localShowStatus("Collection verses area is empty.", true); return; }

        localShowStatus("Validating format...", false, 0);
        const validationResult = await validateVerseLines(textContent);

        if (!validationResult.isValid) {
            displayValidationResults(validationResult.linesData);
            localShowStatus(`Validation failed: ${validationResult.linesData.filter(l=>l.status === 'invalid-format').length} format issues. Opening review...`, true, 3000);
            openValidationModal(validationResult);
            return;
        }

        const versesToSave = validationResult.linesData
            .filter(line => line.status === 'valid' && line.parsedRef)
            .map(ld => ({
                _book: ld.parsedRef.book.toLowerCase().replace(/\s+/g, ' '),
                _chapter: ld.parsedRef.chapter,
                _startVerse: ld.parsedRef.startVerse,
                _endVerse: ld.parsedRef.endVerse,
                reference: `${ld.parsedRef.book} ${ld.parsedRef.chapter}:${ld.parsedRef.startVerse}${ld.parsedRef.startVerse !== ld.parsedRef.endVerse ? '-' + ld.parsedRef.endVerse : ''}`
            }));

        localShowStatus("Format validation passed. Saving...", false, 1000);
        await performSave(name, note, versesToSave, isUpdate);
    }

    if(dmSaveNewCollectionBtn) dmSaveNewCollectionBtn.addEventListener('click', () => handleSaveOrUpdate(false));
    if(dmUpdateExistingCollectionBtn) dmUpdateExistingCollectionBtn.addEventListener('click', () => handleSaveOrUpdate(true));

    if(dmCollectionsList) dmCollectionsList.addEventListener('click', async (e) => {
         if (e.target.classList.contains('dm-delete-collection-btn')) {
             const collName = e.target.dataset.name;
              if (confirm(`DELETE Collection "${collName}"?\nCannot be undone.`)) {
                 try {
                     await deleteCollectionFromDB(collName);
                     localShowStatus(`Collection "${collName}" deleted.`, false);
                     await populateCollectionsList();
                     if (currentlyEditingCollectionName === collName) clearCollectionEditor();
                 } catch (error) { localShowStatus(`Delete failed: ${error.message || 'Unknown'}`, true); }
             }
         } else if (e.target.classList.contains('dm-edit-collection-btn')) {
             const collName = e.target.dataset.name;
             if (!dmCollectionNameInput || !dmCollectionNoteTextarea || !dmUpdateExistingCollectionBtn || !dmSaveNewCollectionBtn ) return;
             try {
                 const collection = await getCollectionFromDB(collName);
                 if (collection) {
                     clearCollectionEditor();
                     dmCollectionNameInput.value = collection.name;
                     dmCollectionNameInput.disabled = true;
                     dmCollectionNoteTextarea.value = collection.collectionNote || '';

                     const verseText = (collection.verses || []).map(v => v.reference).join('\n');

                     const initialValidation = await validateVerseLines(verseText);
                     displayValidationResults(initialValidation.linesData);

                     currentlyEditingCollectionName = collection.name;
                     dmUpdateExistingCollectionBtn.disabled = false;
                     dmSaveNewCollectionBtn.disabled = true;
                     localShowStatus(`Editing "${collection.name}". Format highlighting applied.`, false);
                     const editArea = document.getElementById('dmCreateEditCollectionArea');
                     if(editArea) editArea.scrollIntoView({ behavior: 'smooth' });
                     if(dmCollectionVersesEditor) dmCollectionVersesEditor.focus();
                 } else { localShowStatus(`Collection "${collName}" not found for edit.`, true); await populateCollectionsList(); }
             } catch (error) { localShowStatus(`Load for edit failed: ${error.message || 'Unknown'}`, true); }
         }
    });

    if(dmImportCollectionsJsonBtn) dmImportCollectionsJsonBtn.addEventListener('click', () => dmCollectionsJsonInput.click());
    if(dmCollectionsJsonInput) dmCollectionsJsonInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        localShowStatus("Importing JSON...", false, 0);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const importedData = JSON.parse(evt.target.result);
                if (!Array.isArray(importedData)) throw new Error("JSON is not a collection array.");
                let imp = 0, ovr = 0, skp = 0, err = 0;
                for (const iColl of importedData) {
                     if (!iColl.name || typeof iColl.name !== 'string' || !Array.isArray(iColl.verses)) { skp++; console.warn("Skipping invalid coll obj in JSON import", iColl); continue; }

                     const sVerses = (iColl.verses||[]).map(v => {
                        if (v && typeof v._book ==='string' && typeof v._chapter ==='number' &&
                            typeof v._startVerse ==='number' && typeof v._endVerse === 'number' &&
                            typeof v.reference ==='string') {
                            return {
                                _book:v._book.trim().toLowerCase(),
                                _chapter:v._chapter,
                                _startVerse:v._startVerse,
                                _endVerse:v._endVerse,
                                reference:v.reference.trim()
                            };
                        }
                        if (v && typeof v._book ==='string' && typeof v._chapter ==='number' &&
                            typeof v._verse ==='number' && typeof v.reference ==='string') {
                            console.warn(`Importing old format verse for ${iColl.name}: ${v.reference}. Converting to range.`);
                             return {
                                _book:v._book.trim().toLowerCase(),
                                _chapter:v._chapter,
                                _startVerse:v._verse,
                                _endVerse:v._verse,
                                reference:v.reference.trim()
                            };
                        }
                        return null;
                     }).filter(v=>v!==null);

                     let lMod = new Date(); if (iColl.lastModified) { try { lMod = new Date(iColl.lastModified); } catch {} if(isNaN(lMod.getTime())) lMod = new Date(); }
                     const cSave = {name:iColl.name.trim(),collectionNote:(typeof iColl.collectionNote==='string'?iColl.collectionNote.trim():null),verses:sVerses,lastModified:lMod};

                     try {
                         const ex = await getCollectionFromDB(cSave.name); 
                         if (ex) { if(confirm(`Overwrite "${cSave.name}" from JSON?`)) { await saveCollectionToDB(cSave); ovr++; } else { skp++; } } 
                         else { await saveCollectionToDB(cSave); imp++; } 
                     } catch(sErr) { err++; console.error(`Error saving imported coll "${cSave.name}":`, sErr); }
                 }
                 await populateCollectionsList();
                 localShowStatus(`${imp} new, ${ovr} overwrote, ${skp} skipped. ${err>0?err+' errors.':''}`, err>0, err>0?0:6000);
            } catch (error) { console.error("JSON Import Error:", error); localShowStatus(`JSON Import Failed: ${error.message || 'Invalid file'}`, true); }
        };
        reader.readAsText(file);
        dmCollectionsJsonInput.value = null;
    });

    if(dmExportAllCollectionsBtn) dmExportAllCollectionsBtn.addEventListener('click', async () => {
        localShowStatus("Preparing export data...", false, 0);
        try {
            const allCols = await getAllCollectionsFromDB(); 
            if (allCols.length === 0) { localShowStatus("No collections to export.", false); return; }
            currentExportJsonString = JSON.stringify(allCols, null, 2);
            if (exportJsonTextarea) { exportJsonTextarea.value = ''; exportJsonTextarea.style.display = 'none'; }
            if (exportShowJsonBtn) exportShowJsonBtn.style.display = 'block';
            showExportStatus('');
            if (exportModal) exportModal.style.display = 'block';
            localShowStatus("");
        } catch (error) { localShowStatus(`Export Prep Failed: ${error.message || 'Unknown'}`, true); currentExportJsonString = ''; }
    });

    const closeExportModal = () => { if (exportModal) exportModal.style.display = 'none'; currentExportJsonString = ''; showExportStatus(''); if (exportJsonTextarea) exportJsonTextarea.style.display = 'none'; };
    if (exportModalCloseBtn) exportModalCloseBtn.addEventListener('click', closeExportModal);
    if (exportModalCloseBtnFooter) exportModalCloseBtnFooter.addEventListener('click', closeExportModal);

    if (exportDownloadBtn) exportDownloadBtn.addEventListener('click', () => {
        if (!currentExportJsonString) { showExportStatus("No JSON data to download.", true); return; }
        try {
            const blob = new Blob([currentExportJsonString], {type:'application/json'});
            const url = URL.createObjectURL(blob); const a = document.createElement('a');
            a.href = url; a.download = `bible_app_collections_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            showExportStatus("Download initiated!", false, 3000);
        } catch (e) { showExportStatus(`Download Failed: ${e.message || 'Unknown'}`, true); }
    });

    if (exportCopyBtn) exportCopyBtn.addEventListener('click', async () => {
        if (!currentExportJsonString) { showExportStatus("No JSON data to copy.", true); return; }
        if (!navigator.clipboard) { showExportStatus("Clipboard API unavailable.", true, 5000); return; }
        try { await navigator.clipboard.writeText(currentExportJsonString); showExportStatus("JSON copied!", false, 3000); }
        catch (e) { showExportStatus("Copy failed. Try manual.", true, 5000); }
    });

    if (exportShowJsonBtn) exportShowJsonBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentExportJsonString) { showExportStatus("No JSON to show.", true); return; }
        if (exportJsonTextarea) { exportJsonTextarea.value = currentExportJsonString; exportJsonTextarea.style.display = 'block'; exportJsonTextarea.focus(); exportJsonTextarea.select(); }
        showExportStatus("JSON below for manual copy.", false, 0);
        if (exportShowJsonBtn) exportShowJsonBtn.style.display = 'none';
    });

    // --- Reference Extraction Modal Control ---
    if (openRefExtractionModalBtn) {
        openRefExtractionModalBtn.addEventListener('click', async () => {
            if (typeof initExtractorModalDOM !== 'function' || typeof window.loadFirstAvailableTranslationVersesForExtractor !== 'function') {
                localShowStatus("Error: Extractor module is not loaded. Make sure extractor_script.js is included.", true, 6000);
                console.error("Extractor script not loaded or required functions not found.");
                return;
            }
            initExtractorModalDOM({ 
                modalTextExtractionInput: document.getElementById('modalTextExtractionInput'),
                modalExtractRefsButton: document.getElementById('modalExtractRefsButton'),
                modalExtractionResultsOutput: document.getElementById('modalExtractionResultsOutput'),
                modalCopyValidRefsToEditorBtn: document.getElementById('modalCopyValidRefsToEditorBtn'),
                modalExtractionReferenceBibleName: document.getElementById('modalExtractionReferenceBibleName'),
                modalExtractionStatus: document.getElementById('modalExtractionStatus'),
                dmCollectionVersesEditor: dmCollectionVersesEditor
            });
            await window.loadFirstAvailableTranslationVersesForExtractor();
            const mInput = document.getElementById('modalTextExtractionInput');
            const mOutput = document.getElementById('modalExtractionResultsOutput');
            const mCopyBtn = document.getElementById('modalCopyValidRefsToEditorBtn');
            if(mInput) mInput.value = '';
            if(mOutput) mOutput.textContent = 'Results will appear here...';
            if(mCopyBtn) mCopyBtn.style.display = 'none';
            if(typeof window.showModalExtractionStatus === 'function') window.showModalExtractionStatus(''); 

            if (referenceExtractionModal) referenceExtractionModal.style.display = 'block';
            if(mInput) mInput.focus();
        });
    }

    const closeRefExtractionModal = () => {
        if (referenceExtractionModal) referenceExtractionModal.style.display = 'none';
    };
    if (refExtractionModalCloseBtn) refExtractionModalCloseBtn.addEventListener('click', closeRefExtractionModal);
    if (refExtractionModalCloseBtnFooter) refExtractionModalCloseBtnFooter.addEventListener('click', closeRefExtractionModal);
    
    // --- NEW: Cross-Reference Import Logic ---
    if (dmImportCrossRefBtn) {
        dmImportCrossRefBtn.addEventListener('click', () => dmCrossRefJsonInput.click());
    }

    if (dmCrossRefJsonInput) {
        dmCrossRefJsonInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            setStatus(crossRefStatusMessage, 'Reading and parsing JSON file...', false, 0);
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const crossRefData = JSON.parse(evt.target.result);
                    setStatus(crossRefStatusMessage, 'JSON parsed. Importing to database (this may take a moment)...', false, 0);

                    const tx = db.transaction(OS_CROSS_REFS, 'readwrite');
                    const store = tx.objectStore(OS_CROSS_REFS);
                    let count = 0;

                    // Clear the store before importing to ensure a fresh dataset
                    await new Promise((resolve, reject) => {
                        const req = store.clear();
                        req.onsuccess = resolve;
                        req.onerror = reject;
                    });
                    
                    setStatus(crossRefStatusMessage, 'Old data cleared. Starting import...', false, 0);

                    for (const key in crossRefData) {
                        if (Object.hasOwnProperty.call(crossRefData, key)) {
                            // The key from JSON is the 'id', the value is the array of refs
                            const record = { id: key, refs: crossRefData[key] };
                            store.put(record);
                            count++;
                        }
                    }

                    await new Promise((resolve, reject) => {
                        tx.oncomplete = resolve;
                        tx.onerror = () => reject(tx.error);
                    });

                    setStatus(crossRefStatusMessage, `Successfully imported ${count} cross-reference entries.`, false);

                } catch (err) {
                    console.error("Cross-reference import failed:", err);
                    setStatus(crossRefStatusMessage, `Import failed: ${err.message}`, true, 0);
                }
            };
            reader.onerror = () => {
                setStatus(crossRefStatusMessage, 'Failed to read the file.', true, 0);
            };
            reader.readAsText(file);
        });
    }


    async function initializeDataManager() {
        localShowStatus("Initializing Data Manager...", false, 0);
        try {
            await initDB();
            const theme = localStorage.getItem('selectedTheme') || 'dark';
            if (typeof applyTheme === 'function') applyTheme(theme);

            await populateTranslationsList();
            await populateCollectionsList();
            clearCollectionEditor();

            if (validationModal) validationModal.style.display = 'none';
            if (exportModal) exportModal.style.display = 'none';
            if (referenceExtractionModal) referenceExtractionModal.style.display = 'none';
            
            if (tabButtons.length > 0 && tabPanes.length > 0) {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));
                tabButtons[0].classList.add('active');
                const firstTargetPaneId = tabButtons[0].dataset.tabTarget;
                const firstTargetPane = document.querySelector(firstTargetPaneId);
                if (firstTargetPane) firstTargetPane.classList.add('active');
            }

            localShowStatus("Data Manager Ready.", false, 2000);
        } catch (error) {
            console.error("Error initializing Data Manager:", error);
            localShowStatus(`Initialization Failed: ${error.message || 'Database error'}`, true, 0);
             if (error?.message?.includes("Database not initialized")) {
                alert("DB connection failed. Ensure browser storage is enabled.");
             }
        }
    }
    initializeDataManager();
});