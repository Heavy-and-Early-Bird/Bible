// scripts/bulk_reference_compiler.js
console.log("Bulk Reference Text Compiler script loaded.");

document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Elements ---
    const bulkRefInput = document.getElementById('bulkRefInput');
    const bulkRefTranslationSelect = document.getElementById('bulkRefTranslationSelect');
    const bulkRefProcessBtn = document.getElementById('bulkRefProcessBtn');
    const bulkRefStatusMessage = document.getElementById('bulkRefStatusMessage');
    const bulkRefOutputArea = document.getElementById('bulkRefOutputArea');
    const bulkRefOutputTextarea = document.getElementById('bulkRefOutputTextarea');
    const bulkRefCopyBtn = document.getElementById('bulkRefCopyBtn');

    // --- Dependency Checks ---
    if (typeof initDB !== 'function' || typeof getTranslationsList !== 'function' ||
        typeof getVersesByTranslation !== 'function' ||
        typeof window.performRobustExtraction !== 'function' || // from extractor_script.js
        typeof window.getFullBookName !== 'function' || // from extractor_script.js, assuming it's exposed or reimplement BOOK_MAP here
        typeof parseBibleReferenceWithNote !== 'function') { // from script.js
        showBulkStatus("Critical Error: Core functions missing. Compiler disabled.", true, 0);
        if(bulkRefProcessBtn) bulkRefProcessBtn.disabled = true;
        return;
    }

    // --- Utility to show status ---
    function showBulkStatus(message, isError = false, duration = 4000) {
        if (bulkRefStatusMessage) {
            bulkRefStatusMessage.textContent = message;
            bulkRefStatusMessage.className = 'status-message-inline';
            if (isError) bulkRefStatusMessage.classList.add('error-inline');
            
            if (duration > 0) {
                setTimeout(() => {
                    if (bulkRefStatusMessage.textContent === message) bulkRefStatusMessage.textContent = '';
                }, duration);
            }
        }
    }

    // --- Populate Translation Selector ---
    async function populateBulkTranslationSelector() {
        if (!bulkRefTranslationSelect) return;
        try {
            await initDB(); // Ensure DB is ready
            const translations = await getTranslationsList();
            bulkRefTranslationSelect.innerHTML = '';
            if (translations.length > 0) {
                translations.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)).forEach(t => {
                    bulkRefTranslationSelect.add(new Option(t.name || t.id, t.id));
                });
                // Load last selected for this tool if available
                const lastUsed = localStorage.getItem('bulkRef_lastTranslationId');
                if (lastUsed && translations.some(t => t.id === lastUsed)) {
                    bulkRefTranslationSelect.value = lastUsed;
                } else {
                    bulkRefTranslationSelect.value = translations[0].id; // Default to first
                }
            } else {
                bulkRefTranslationSelect.add(new Option("-- No Translations --", ""));
                if (bulkRefProcessBtn) bulkRefProcessBtn.disabled = true;
                showBulkStatus("No translations found. Please import Bibles first.", true, 0);
            }
        } catch (e) {
            showBulkStatus("Error loading translations: " + e.message, true, 0);
        }
    }

    if (bulkRefTranslationSelect) {
        bulkRefTranslationSelect.addEventListener('change', () => {
            localStorage.setItem('bulkRef_lastTranslationId', bulkRefTranslationSelect.value);
        });
    }


    // --- Main Processing Logic ---
    async function processAndCompilePrompts() {
        const promptsText = bulkRefInput.value.trim();
        const selectedTranslationId = bulkRefTranslationSelect.value;

        if (!promptsText) { showBulkStatus("Please enter reference prompts.", true); return; }
        if (!selectedTranslationId) { showBulkStatus("Please select a translation.", true); return; }

        showBulkStatus("Processing prompts...", false, 0);
        if(bulkRefProcessBtn) bulkRefProcessBtn.disabled = true;
        if(bulkRefOutputArea) bulkRefOutputArea.style.display = 'none';
        if(bulkRefOutputTextarea) bulkRefOutputTextarea.value = '';

        const prompts = promptsText.split('\n').map(p => p.trim()).filter(p => p);
        if (prompts.length === 0) {
            showBulkStatus("No valid prompts found after trimming.", true);
            if(bulkRefProcessBtn) bulkRefProcessBtn.disabled = false;
            return;
        }

        let compiledOutput = "";
        let successfulPrompts = 0;
        let failedPrompts = 0;

        try {
            const bibleVersesList = await getVersesByTranslation(selectedTranslationId);
            if (!bibleVersesList || bibleVersesList.length === 0) {
                showBulkStatus(`Translation "${selectedTranslationId.replace('.xml','')}" is empty or failed to load.`, true, 0);
                if(bulkRefProcessBtn) bulkRefProcessBtn.disabled = false;
                return;
            }

            for (const originalPrompt of prompts) {
                showBulkStatus(`Processing: "${originalPrompt}"...`, false, 0);
                let promptTitle = originalPrompt; // Default title
                let versesForThisPrompt = [];

                // Use robust extractor for initial parsing of the prompt
                // `performRobustExtraction` calls `parseBibleReferenceWithNote` internally.
                const extractionResult = await window.performRobustExtraction(originalPrompt, window.parseBibleReferenceWithNote);

                if (extractionResult.parsedReferences && extractionResult.parsedReferences.length > 0) {
                    for (const refObj of extractionResult.parsedReferences) {
                        // refObj is { book (full normalized from getFullBookName), chapter, startVerse, endVerse, referenceString, sourceText }
                        let actualStartVerse = Number(refObj.startVerse);
                        let actualEndVerse = Number(refObj.endVerse);
                        
                        // --- INTERNAL WHOLE CHAPTER DETECTION & EXPANSION ---
                        // Heuristic: If parsed as V1-1 AND original prompt for THIS part looked like "Book Chapter"
                        // (e.g., `refObj.sourceText` from `performRobustExtraction` was just "Genesis 1")
                        // then expand to the whole chapter.
                        // `performRobustExtraction` returns sourceText which is the *specific segment* it parsed for that refObj.
                        const sourceTextSimplified = refObj.sourceText.trim().toLowerCase();
                        const chapterOnlyPatternTest = /^(?:[1-3]\s*)?[a-zA-Z\s]+?\s+\d+$/; // "Book C" "1 Book C" "Song of Sol 1"
                        
                        if (actualStartVerse === 1 && actualEndVerse === 1 && 
                            chapterOnlyPatternTest.test(sourceTextSimplified) &&
                            !sourceTextSimplified.includes(':') && !sourceTextSimplified.includes('.') && !sourceTextSimplified.includes('-')) {
                            
                            console.log(`Bulk Compiler: Expanding "${refObj.sourceText}" (parsed as ${refObj.referenceString}) to full chapter.`);
                            promptTitle = `${refObj.book} Chapter ${refObj.chapter}`;
                            const versesInChapter = bibleVersesList.filter(
                                v => v._book.toLowerCase() === refObj.book.toLowerCase() && // refObj.book is already full name
                                     Number(v._chapter) === Number(refObj.chapter)
                            );
                            if (versesInChapter.length > 0) {
                                actualStartVerse = 1;
                                actualEndVerse = Math.max(...versesInChapter.map(v => Number(v._verse)));
                            } else {
                                console.warn(`No verses found to expand chapter for: ${promptTitle}`);
                                // Keep original 1-1 if chapter expansion fails, it'll just be verse 1
                            }
                        } else {
                            promptTitle = refObj.referenceString; // Use the specific range as title
                        }
                        // --- End of Chapter Expansion ---

                        // Fetch verses for the (potentially expanded) range
                        for (let vNum = actualStartVerse; vNum <= actualEndVerse; vNum++) {
                            const foundVerse = bibleVersesList.find(
                                v => v._book.toLowerCase() === refObj.book.toLowerCase() &&
                                     Number(v._chapter) === Number(refObj.chapter) &&
                                     Number(v._verse) === Number(vNum)
                            );
                            if (foundVerse && foundVerse.text) {
                                versesForThisPrompt.push(foundVerse.text);
                            }
                        }
                    } // End loop over parsedReferences from ONE prompt
                } else {
                     console.warn(`Prompt "${originalPrompt}" did not yield any parsable references from robust extractor.`);
                }


                if (versesForThisPrompt.length > 0) {
                    if (compiledOutput) compiledOutput += "\n\n---\n\n"; // Separator between prompts
                    compiledOutput += `== ${promptTitle} ==\n\n`;
                    compiledOutput += versesForThisPrompt.join("\n"); // Join verses of a single prompt with single newline
                    successfulPrompts++;
                } else {
                    if (compiledOutput) compiledOutput += "\n\n---\n\n";
                    compiledOutput += `== ${originalPrompt} (No text found/loaded) ==\n\n(Could not retrieve text for this prompt. Check reference or translation.)\n`;
                    failedPrompts++;
                }
            } // End loop over all prompts

            if(bulkRefOutputTextarea) bulkRefOutputTextarea.value = compiledOutput.trim();
            if(bulkRefOutputArea) bulkRefOutputArea.style.display = 'block';
            if(bulkRefCopyBtn) bulkRefCopyBtn.disabled = !compiledOutput.trim();

            let finalStatus = `Processed ${prompts.length} prompts. ${successfulPrompts} successful, ${failedPrompts} failed/empty.`;
            showBulkStatus(finalStatus, failedPrompts > 0, failedPrompts > 0 ? 0 : 5000);

        } catch (error) {
            console.error("Error processing prompts:", error);
            showBulkStatus(`Error: ${error.message || 'Could not compile text.'}`, true, 0);
        } finally {
            if(bulkRefProcessBtn) bulkRefProcessBtn.disabled = false;
        }
    }


    // --- Copy Button Functionality ---
    function handleBulkCopy() {
        if (!bulkRefOutputTextarea || !bulkRefOutputTextarea.value) {
            showBulkStatus("Nothing to copy.", true); return;
        }
        if (!navigator.clipboard) {
            showBulkStatus("Clipboard API not available. Select text manually.", true);
            bulkRefOutputTextarea.focus();
            bulkRefOutputTextarea.select();
            return;
        }
        navigator.clipboard.writeText(bulkRefOutputTextarea.value)
            .then(() => showBulkStatus("Compiled text copied to clipboard!", false))
            .catch(err => {
                console.error("Bulk copy failed:", err);
                showBulkStatus("Failed to copy. Select manually or see console.", true);
                bulkRefOutputTextarea.focus();
                bulkRefOutputTextarea.select();
            });
    }

    // --- Event Listeners ---
    if (bulkRefProcessBtn) bulkRefProcessBtn.addEventListener('click', processAndCompilePrompts);
    if (bulkRefCopyBtn) bulkRefCopyBtn.addEventListener('click', handleBulkCopy);


    // --- Initialization ---
    async function initializeBulkCompiler() {
        showBulkStatus("Initializing Bulk Compiler...", false, 0);
        // Apply theme (assuming applyTheme and SELECTED_THEME_LS_KEY are global from script.js)
        const savedTheme = localStorage.getItem('SELECTED_THEME_LS_KEY') || 'dark'; // Use the correct key
        if (typeof applyTheme === 'function') applyTheme(savedTheme);
        else console.warn("applyTheme function not found for Bulk Compiler.");

        await populateBulkTranslationSelector();
        showBulkStatus("Bulk Compiler ready. Enter prompts and select a translation.", false);
    }

    initializeBulkCompiler();
});