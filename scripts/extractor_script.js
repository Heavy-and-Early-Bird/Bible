// scripts/extractor_script.js

// --- START OF BOOK NAME MAPPING ---
const BOOK_NAME_TO_FULL_NAME_MAP = {
    // Old Testament
    'gen': 'Genesis', 'genesis': 'Genesis',
    'exo': 'Exodus', 'exodus': 'Exodus', 'ex': 'Exodus',
    'lev': 'Leviticus', 'leviticus': 'Leviticus', 'lv': 'Leviticus',
    'num': 'Numbers', 'numbers': 'Numbers', 'nm': 'Numbers', 'nu': 'Numbers',
    'deu': 'Deuteronomy', 'deut': 'Deuteronomy', 'deuteronomy': 'Deuteronomy', 'dt': 'Deuteronomy',
    'jos': 'Joshua', 'joshua': 'Joshua', 'jsh': 'Joshua',
    'jdg': 'Judges', 'judg': 'Judges', 'judges': 'Judges', 'jdgs': 'Judges',
    'rut': 'Ruth', 'ruth': 'Ruth', 'rth': 'Ruth',
    '1sa': '1 Samuel', '1 samuel': '1 Samuel', '1sam': '1 Samuel', '1 sm': '1 Samuel', 'i samuel': '1 Samuel', '1st samuel': '1 Samuel',
    '2sa': '2 Samuel', '2 samuel': '2 Samuel', '2sam': '2 Samuel', '2 sm': '2 Samuel', 'ii samuel': '2 Samuel', '2nd samuel': '2 Samuel',
    '1ki': '1 Kings', '1 kings': '1 Kings', '1kgs': '1 Kings', 'i kings': '1 Kings', '1st kings': '1 Kings',
    '2ki': '2 Kings', '2 kings': '2 Kings', '2kgs': '2 Kings', 'ii kings': '2 Kings', '2nd kings': '2 Kings',
    '1ch': '1 Chronicles', '1 chronicles': '1 Chronicles', '1chr': '1 Chronicles', '1 ch': '1 Chronicles', 'i chronicles': '1 Chronicles', '1st chronicles': '1 Chronicles',
    '2ch': '2 Chronicles', '2 chronicles': '2 Chronicles', '2chr': '2 Chronicles', '2 ch': '2 Chronicles', 'ii chronicles': '2 Chronicles', '2nd chronicles': '2 Chronicles',
    'ezr': 'Ezra', 'ezra': 'Ezra',
    'neh': 'Nehemiah', 'nehemiah': 'Nehemiah', 'ne': 'Nehemiah',
    'est': 'Esther', 'esther': 'Esther', 'es': 'Esther',
    'job': 'Job', 'jb': 'Job',
    'psa': 'Psalms', 'psalm': 'Psalms', 'psalms': 'Psalms', 'ps': 'Psalms', 'pss': 'Psalms',
    'pro': 'Proverbs', 'prov': 'Proverbs', 'proverbs': 'Proverbs', 'prv': 'Proverbs',
    'ecc': 'Ecclesiastes', 'eccles': 'Ecclesiastes', 'ecclesiastes': 'Ecclesiastes', 'ec': 'Ecclesiastes', 'qoheleth': 'Ecclesiastes',
    'sng': 'Song of Solomon', 'song of songs': 'Song of Solomon', 'song of solomon': 'Song of Solomon', 'sos': 'Song of Solomon', 'song': 'Song of Solomon', 'canticles': 'Song of Solomon', 'cant': 'Song of Solomon',
    'isa': 'Isaiah', 'isaiah': 'Isaiah', 'is': 'Isaiah',
    'jer': 'Jeremiah', 'jeremiah': 'Jeremiah', 'je': 'Jeremiah', 'jerem': 'Jeremiah',
    'lam': 'Lamentations', 'lamentations': 'Lamentations', 'la': 'Lamentations',
    'eze': 'Ezekiel', 'ezek': 'Ezekiel', 'ezekiel': 'Ezekiel', 'ez': 'Ezekiel',
    'dan': 'Daniel', 'daniel': 'Daniel', 'da': 'Daniel', 'dn': 'Daniel',
    'hos': 'Hosea', 'hosea': 'Hosea', 'ho': 'Hosea',
    'joe': 'Joel', 'joel': 'Joel', 'jl': 'Joel',
    'amo': 'Amos', 'amos': 'Amos', 'am': 'Amos',
    'oba': 'Obadiah', 'obad': 'Obadiah', 'obadiah': 'Obadiah', 'ob': 'Obadiah',
    'jon': 'Jonah', 'jonah': 'Jonah',
    'mic': 'Micah', 'micah': 'Micah', 'mi': 'Micah',
    'nah': 'Nahum', 'nahum': 'Nahum', 'na': 'Nahum',
    'hab': 'Habakkuk', 'habakkuk': 'Habakkuk', 'hk': 'Habakkuk', 'hab': 'Habakkuk',
    'zep': 'Zephaniah', 'zeph': 'Zephaniah', 'zephaniah': 'Zephaniah', 'zp': 'Zephaniah',
    'hag': 'Haggai', 'haggai': 'Haggai', 'hg': 'Haggai',
    'zec': 'Zechariah', 'zech': 'Zechariah', 'zechariah': 'Zechariah', 'zc': 'Zechariah',
    'mal': 'Malachi', 'malachi': 'Malachi', 'ml': 'Malachi',

    // New Testament
    'mat': 'Matthew', 'matthew': 'Matthew', 'mt': 'Matthew', 'matt': 'Matthew',
    'mar': 'Mark', 'mark': 'Mark', 'mrk': 'Mark', 'mk': 'Mark',
    'luk': 'Luke', 'luke': 'Luke', 'lk': 'Luke',
    'joh': 'John', 'john': 'John', 'jn': 'John',
    'act': 'Acts', 'acts': 'Acts', 'ac': 'Acts',
    'rom': 'Romans', 'romans': 'Romans', 'ro': 'Romans', 'rm': 'Romans',
    '1co': '1 Corinthians', '1 corinthians': '1 Corinthians', '1cor': '1 Corinthians', 'i corinthians': '1 Corinthians', '1st corinthians': '1 Corinthians',
    '2co': '2 Corinthians', '2 corinthians': '2 Corinthians', '2cor': '2 Corinthians', 'ii corinthians': '2 Corinthians', '2nd corinthians': '2 Corinthians',
    'gal': 'Galatians', 'galatians': 'Galatians', 'ga': 'Galatians',
    'eph': 'Ephesians', 'ephesians': 'Ephesians', 'ephes': 'Ephesians',
    'phi': 'Philippians', 'philippians': 'Philippians', 'php': 'Philippians', 'phil': 'Philippians',
    'col': 'Colossians', 'colossians': 'Colossians', 'cl': 'Colossians',
    '1th': '1 Thessalonians', '1 thessalonians': '1 Thessalonians', '1thes': '1 Thessalonians', '1thess': '1 Thessalonians', 'i thessalonians': '1 Thessalonians', '1st thessalonians': '1 Thessalonians',
    '2th': '2 Thessalonians', '2 thessalonians': '2 Thessalonians', '2thes': '2 Thessalonians', '2thess': '2 Thessalonians', 'ii thessalonians': '2 Thessalonians', '2nd thessalonians': '2 Thessalonians',
    '1ti': '1 Timothy', '1 timothy': '1 Timothy', '1tim': '1 Timothy', 'i timothy': '1 Timothy', '1st timothy': '1 Timothy',
    '2ti': '2 Timothy', '2 timothy': '2 Timothy', '2tim': '2 Timothy', 'ii timothy': '2 Timothy', '2nd timothy': '2 Timothy',
    'tit': 'Titus', 'titus': 'Titus', 'ti': 'Titus',
    'phm': 'Philemon', 'philemon': 'Philemon', 'philem': 'Philemon', 'phmn': 'Philemon',
    'heb': 'Hebrews', 'hebrews': 'Hebrews', 'hb': 'Hebrews',
    'jas': 'James', 'james': 'James', 'jm': 'James', 'jam': 'James',
    '1pe': '1 Peter', '1 peter': '1 Peter', '1pet': '1 Peter', 'i peter': '1 Peter', '1st peter': '1 Peter',
    '2pe': '2 Peter', '2 peter': '2 Peter', '2pet': '2 Peter', 'ii peter': '2 Peter', '2nd peter': '2 Peter',
    '1jn': '1 John', '1 john': '1 John', 'i john': '1 John', '1st john': '1 John', '1 jn': '1 John',
    '2jn': '2 John', '2 john': '2 John', 'ii john': '2 John', '2nd john': '2 John', '2 jn': '2 John',
    '3jn': '3 John', '3 john': '3 John', 'iii john': '3 John', '3rd john': '3 John', '3 jn': '3 John',
    'jud': 'Jude', 'jude': 'Jude', 'jd': 'Jude',
    'rev': 'Revelation', 'revelation': 'Revelation', 're': 'Revelation', 'revs': 'Revelation', 'apocalypse': 'Revelation', 'apoc': 'Revelation'
};

function getFullBookName(parsedBookName) {
    if (!parsedBookName) return "Unknown Book";
    const lowerBook = String(parsedBookName).toLowerCase().replace(/\s+/g, ' ').trim();
    return BOOK_NAME_TO_FULL_NAME_MAP[lowerBook] || parsedBookName.charAt(0).toUpperCase() + parsedBookName.slice(1);
}
// --- END OF BOOK NAME MAPPING ---

let modalTextExtractionInput;
let modalExtractRefsButton;
let modalExtractionResultsOutput;
let modalCopyValidRefsToEditorBtn; 
let modalExtractionReferenceBibleName;
let modalExtractionStatus;
let dmCollectionVersesEditor; 

let lastModalExtractionResult = null; 
let autoSaveIntentDetails = null;     

function initExtractorModalDOM(elements) {
    modalTextExtractionInput = elements.modalTextExtractionInput;
    modalExtractRefsButton = elements.modalExtractRefsButton;
    modalExtractionResultsOutput = elements.modalExtractionResultsOutput;
    modalCopyValidRefsToEditorBtn = elements.modalCopyValidRefsToEditorBtn;
    modalExtractionReferenceBibleName = elements.modalExtractionReferenceBibleName;
    modalExtractionStatus = elements.modalExtractionStatus;
    dmCollectionVersesEditor = elements.dmCollectionVersesEditor;

    if (modalExtractRefsButton) {
        modalExtractRefsButton.removeEventListener('click', handleModalRobustExtract);
        modalExtractRefsButton.addEventListener('click', () => handleModalRobustExtract(false)); 
    }
    if (modalCopyValidRefsToEditorBtn) {
        modalCopyValidRefsToEditorBtn.removeEventListener('click', handleModalCopyOrSaveAction);
        modalCopyValidRefsToEditorBtn.addEventListener('click', handleModalCopyOrSaveAction);
    }
}
window.initExtractorModalDOM = initExtractorModalDOM;

function showModalExtractionStatus(message, isError = false, duration = 4000) {
    if (modalExtractionStatus) {
        modalExtractionStatus.textContent = message;
        modalExtractionStatus.style.color = isError ? 'var(--brand-color)' : 'var(--text-color)';
        if (duration > 0) {
            setTimeout(() => {
                if (modalExtractionStatus.textContent === message) modalExtractionStatus.textContent = '';
            }, duration);
        }
    }
}
window.showModalExtractionStatus = showModalExtractionStatus;

function updateModalRefBibleNameDisplay(translationId) {
    if (modalExtractionReferenceBibleName) {
        if (translationId) {
            modalExtractionReferenceBibleName.textContent = translationId.replace(/\.xml$/i, '').replace(/_/g, ' ');
        } else {
            modalExtractionReferenceBibleName.textContent = 'None (Format Parsing Only)';
        }
    }
}
window.updateModalRefBibleNameDisplay = updateModalRefBibleNameDisplay;

async function performRobustExtraction(inputText, parseRefFunc) {
    const results = {
        parsedReferences: [], 
        unparsedPotentials: []
    };
    const uniqueParsedRefStrings = new Set(); 
    const uniqueUnparsed = new Set();

    if (!inputText || typeof parseRefFunc !== 'function') {
        console.warn("Input text is empty or parsing function is unavailable for robust extraction.");
        if(!inputText) return results; 
        throw new Error("Reference parsing function (parseBibleReferenceWithNote) is not available.");
    }

    let processedText = inputText.replace(/–|—/g, '-'); 
    processedText = processedText.replace(/;/g, ' ; '); 
    const potentialBlocks = processedText.split(/\s*;\s*|\n+/);
    let currentBookForBlock = null; 

    for (const block of potentialBlocks) {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) continue;
        const fullRefPattern = /(\b(?:[1-3]\s*)?[a-zA-Z]+(?:(?:\s+|\s+of\s+)[a-zA-Z]+)*\.?)\s*(\d+)[\s:.](\d+)(?:-(\d+))?((?:[,\s]\s*\d+(?:-\d+)?)*)/gi;
        let match;
        let lastIndexInBlock = 0;
        fullRefPattern.lastIndex = 0; 
        while ((match = fullRefPattern.exec(trimmedBlock)) !== null) {
            lastIndexInBlock = fullRefPattern.lastIndex;
            const rawBookName = match[1].trim();
            const chapterNumStr = match[2];
            const startVerseNumStr = match[3];
            const endVerseNumFromMatchStr = match[4]; 
            const trailingRefsStr = match[5] ? match[5].trim() : "";
            let primaryRefForParse = `${rawBookName} ${chapterNumStr}:${startVerseNumStr}`;
            if (endVerseNumFromMatchStr) {
                primaryRefForParse += `-${endVerseNumFromMatchStr}`;
            }
            const parsedPrimary = parseRefFunc(primaryRefForParse);
            if (parsedPrimary) {
                currentBookForBlock = parsedPrimary.book; 
                const fullBookName = getFullBookName(parsedPrimary.book);
                const refStringForDedupe = `${fullBookName} ${parsedPrimary.chapter}:${parsedPrimary.startVerse}${parsedPrimary.startVerse !== parsedPrimary.endVerse ? '-' + parsedPrimary.endVerse : ''}`;
                if (!uniqueParsedRefStrings.has(refStringForDedupe)) {
                    results.parsedReferences.push({
                        book: fullBookName, 
                        chapter: parsedPrimary.chapter,
                        startVerse: parsedPrimary.startVerse,
                        endVerse: parsedPrimary.endVerse,
                        sourceText: primaryRefForParse,
                        referenceString: refStringForDedupe
                    });
                    uniqueParsedRefStrings.add(refStringForDedupe);
                }
                if (trailingRefsStr) {
                    const additionalParts = trailingRefsStr.split(',');
                    for (const part of additionalParts) {
                        const trimmedPart = part.trim();
                        if (!trimmedPart) continue;
                        const additionalRefStr = `${currentBookForBlock} ${chapterNumStr}:${trimmedPart}`;
                        const additionalParsed = parseRefFunc(additionalRefStr);
                        if (additionalParsed) {
                            const addFullBookName = getFullBookName(additionalParsed.book); 
                            const addRefStringForDedupe = `${addFullBookName} ${additionalParsed.chapter}:${additionalParsed.startVerse}${additionalParsed.startVerse !== additionalParsed.endVerse ? '-' + additionalParsed.endVerse : ''}`;
                            if (!uniqueParsedRefStrings.has(addRefStringForDedupe)) {
                                results.parsedReferences.push({
                                    book: addFullBookName,
                                    chapter: additionalParsed.chapter,
                                    startVerse: additionalParsed.startVerse,
                                    endVerse: additionalParsed.endVerse,
                                    sourceText: `${rawBookName} ${chapterNumStr}:${trimmedPart}`, 
                                    referenceString: addRefStringForDedupe
                                });
                                uniqueParsedRefStrings.add(addRefStringForDedupe);
                            }
                        } else if (!uniqueUnparsed.has(trimmedPart)) {
                            results.unparsedPotentials.push(trimmedPart);
                            uniqueUnparsed.add(trimmedPart);
                        }
                    }
                }
            } else if (!uniqueUnparsed.has(match[0].trim())) { 
                results.unparsedPotentials.push(match[0].trim());
                uniqueUnparsed.add(match[0].trim());
            }
        } 
        if (currentBookForBlock) {
            const remainingTextInBlock = trimmedBlock.substring(lastIndexInBlock).trim();
            if (remainingTextInBlock) {
                const simpleRefPattern = /(?:(\d+)[\s:.](\d+)(?:-(\d+))?)|(?:(\d+)(?:-(\d+))?)/g; 
                let simpleMatch;
                simpleRefPattern.lastIndex = 0;
                while ((simpleMatch = simpleRefPattern.exec(remainingTextInBlock)) !== null) {
                    let contextRefStr;
                    let sourceText = simpleMatch[0].trim();
                    if (simpleMatch[1]) { 
                        contextRefStr = `${currentBookForBlock} ${simpleMatch[1]}:${simpleMatch[2]}`;
                        if (simpleMatch[3]) contextRefStr += `-${simpleMatch[3]}`;
                    } else if (simpleMatch[4] && results.parsedReferences.length > 0) { 
                        const lastParsed = results.parsedReferences[results.parsedReferences.length - 1];
                        contextRefStr = `${lastParsed.book} ${lastParsed.chapter}:${simpleMatch[4]}`;
                        if (simpleMatch[5]) contextRefStr += `-${simpleMatch[5]}`;
                        sourceText = `${simpleMatch[4]}${simpleMatch[5] ? '-' + simpleMatch[5] : ''}`; 
                    } else {
                        continue; 
                    }
                    const parsedContext = parseRefFunc(contextRefStr);
                    if (parsedContext) {
                        const fullBookName = getFullBookName(parsedContext.book);
                        const refStringForDedupe = `${fullBookName} ${parsedContext.chapter}:${parsedContext.startVerse}${parsedContext.startVerse !== parsedContext.endVerse ? '-' + parsedContext.endVerse : ''}`;
                        if (!uniqueParsedRefStrings.has(refStringForDedupe)) {
                            results.parsedReferences.push({
                                book: fullBookName,
                                chapter: parsedContext.chapter,
                                startVerse: parsedContext.startVerse,
                                endVerse: parsedContext.endVerse,
                                sourceText: sourceText, 
                                referenceString: refStringForDedupe
                            });
                            uniqueParsedRefStrings.add(refStringForDedupe);
                        }
                    } else if (!uniqueUnparsed.has(sourceText)) {
                        results.unparsedPotentials.push(sourceText);
                        uniqueUnparsed.add(sourceText);
                    }
                }
            }
        }
        currentBookForBlock = null; 
    }
    return results;
}
window.performRobustExtraction = performRobustExtraction;

async function handleModalRobustExtract(autoTriggeredFromPrefill = false) {
    if (!modalTextExtractionInput || !modalExtractionResultsOutput || !modalCopyValidRefsToEditorBtn) {
        console.error("Extractor modal DOM elements not initialized for handleModalRobustExtract.");
        return;
    }
    const inputText = modalTextExtractionInput.value;
    if (!inputText.trim() && !autoTriggeredFromPrefill) {
        showModalExtractionStatus("Input text is empty. Please paste text to extract references.", true, 3000);
        modalExtractionResultsOutput.textContent = 'Input empty.';
        modalCopyValidRefsToEditorBtn.style.display = 'none';
        lastModalExtractionResult = null;
        return;
    }
    showModalExtractionStatus("Extracting references (robust format parsing)...", false, 0);
    modalExtractionResultsOutput.textContent = 'Processing...';
    modalCopyValidRefsToEditorBtn.style.display = 'none'; 
    lastModalExtractionResult = null; 

    try {
        if (typeof window.parseBibleReferenceWithNote !== 'function') {
            throw new Error("Core reference parsing function (parseBibleReferenceWithNote) is unavailable.");
        }
        if (typeof window.loadFirstAvailableTranslationVersesForExtractor === 'function') {
            await window.loadFirstAvailableTranslationVersesForExtractor();
        }

        const results = await performRobustExtraction(inputText, window.parseBibleReferenceWithNote);
        lastModalExtractionResult = { parsedReferences: results.parsedReferences };

        let outputText = `Extraction Summary (Robust Parsing):\n`;
        outputText += `----------------------------------------\n`;
        outputText += `Successfully Parsed References: ${results.parsedReferences.length}\n`;

        if (results.unparsedPotentials.length > 0 && !autoTriggeredFromPrefill) {
            outputText += `Could Not Fully Parse (Potentials/Fragments): ${results.unparsedPotentials.length}\n`;
        }
        outputText += `\n`;

        if (results.parsedReferences.length > 0) {
            outputText += `PARSED REFERENCES (Format: Full Book Name C:V[-E]):\n`;
            // ** SORTING REMOVED HERE **
            // References will appear in the order they were parsed by performRobustExtraction
            results.parsedReferences.forEach(ref => {
                outputText += `- ${ref.referenceString} (Source segment: "${ref.sourceText}")\n`;
            });
            modalCopyValidRefsToEditorBtn.style.display = 'inline-block';
            if (autoSaveIntentDetails && autoSaveIntentDetails.callback) {
                modalCopyValidRefsToEditorBtn.textContent = `Save Topic: ${autoSaveIntentDetails.proposedName.substring(0,20)}...`;
                modalCopyValidRefsToEditorBtn.title = `Save as collection: ${autoSaveIntentDetails.proposedName}`;
            } else {
                modalCopyValidRefsToEditorBtn.textContent = "Copy Valid to Editor";
                modalCopyValidRefsToEditorBtn.title = "Copy parsed references to Data Manager's collection editor";
            }
        } else {
            modalCopyValidRefsToEditorBtn.style.display = 'none';
            modalCopyValidRefsToEditorBtn.textContent = "Copy Valid to Editor";
            modalCopyValidRefsToEditorBtn.title = "Copy parsed references to Data Manager's collection editor";
        }

        if (results.unparsedPotentials.length > 0 && !autoTriggeredFromPrefill) {
            outputText += `\nUNPARSED SEGMENTS (Review these in your source text):\n`;
            results.unparsedPotentials.slice(0, 20).forEach(str => {
                outputText += `- "${str.substring(0, 100)}${str.length > 100 ? '...' : ''}"\n`;
            });
            if (results.unparsedPotentials.length > 20) {
                outputText += `... and ${results.unparsedPotentials.length - 20} more unparsed segments.\n`;
            }
        }
        modalExtractionResultsOutput.textContent = outputText;
        const statusMsg = results.parsedReferences.length > 0 ?
            `Extraction complete. Review the ${results.parsedReferences.length} parsed references.` :
            "Extraction complete. No references could be robustly parsed from the input.";
        showModalExtractionStatus(statusMsg, results.parsedReferences.length === 0, 5000);

    } catch (error) {
        console.error("Modal Robust Extraction Error:", error);
        showModalExtractionStatus(`Error during extraction: ${error.message}`, true, 0);
        modalExtractionResultsOutput.textContent = `Error: ${error.message}`;
        modalCopyValidRefsToEditorBtn.style.display = 'none';
        lastModalExtractionResult = null;
    }
}


function handleModalCopyOrSaveAction() {
    if (autoSaveIntentDetails && autoSaveIntentDetails.callback && lastModalExtractionResult && lastModalExtractionResult.parsedReferences && lastModalExtractionResult.parsedReferences.length > 0) {
        const referencesForDB = lastModalExtractionResult.parsedReferences.map(ref => {
            return { 
                _book: ref.book, 
                _chapter: ref.chapter,
                _startVerse: ref.startVerse,
                _endVerse: ref.endVerse,
                reference: ref.referenceString 
            };
        });
        showModalExtractionStatus(`Sending ${referencesForDB.length} refs to save collection "${autoSaveIntentDetails.proposedName}"...`, false, 0);
        autoSaveIntentDetails.callback(autoSaveIntentDetails.proposedName, referencesForDB);
        const referenceExtractionModal = document.getElementById('referenceExtractionModal');
        if (referenceExtractionModal) referenceExtractionModal.style.display = 'none';
        autoSaveIntentDetails = null; 
        modalCopyValidRefsToEditorBtn.textContent = "Copy Valid to Editor"; 
        modalCopyValidRefsToEditorBtn.title = "Copy parsed references to Data Manager's collection editor";
    } else {
        if (!dmCollectionVersesEditor) {
            showModalExtractionStatus("Error: Data Manager's collection editor not accessible.", true, 3000);
            return;
        }
        if (!lastModalExtractionResult || !lastModalExtractionResult.parsedReferences || lastModalExtractionResult.parsedReferences.length === 0) {
            showModalExtractionStatus("No parsed references available to copy.", true, 3000);
            return;
        }
        const existingContent = dmCollectionVersesEditor.innerText.trim();
        const referencesToCopyText = lastModalExtractionResult.parsedReferences
            .map(ref => ref.referenceString)
            .join('\n');
        let newContentInEditor = referencesToCopyText;
        if (existingContent) {
            if (confirm("Append references to the current content in Data Manager's collection editor?\n\n(Cancel will replace the editor's content).")) {
                newContentInEditor = existingContent + (existingContent.endsWith('\n') ? '' : '\n') + referencesToCopyText;
            }
        }
        dmCollectionVersesEditor.innerText = newContentInEditor;
        showModalExtractionStatus(`${lastModalExtractionResult.parsedReferences.length} references copied to Data Manager's editor. You can now close this modal.`, false, 5000);
        if (typeof window.localShowStatus === 'function') { 
            window.localShowStatus("References copied. Review in Collection Editor, Validate Lines if needed, then Save/Update.", false, 6000);
        }
        const editArea = document.getElementById('dmCreateEditCollectionArea');
        if(editArea) editArea.scrollIntoView({ behavior: 'smooth' });
    }
}

function prefillExtractorModal(text, proposedCollectionName = "", autoSaveCallback = null) {
    if (modalTextExtractionInput) {
        modalTextExtractionInput.value = text; 
        modalExtractionResultsOutput.textContent = "Text loaded. Click 'Extract References' to process.";
        modalCopyValidRefsToEditorBtn.style.display = 'none';
        autoSaveIntentDetails = null; 
        const dmCollectionNameInput = document.getElementById('dmCollectionNameInput');
        if (autoSaveCallback && typeof autoSaveCallback === 'function') {
            autoSaveIntentDetails = { 
                proposedName: proposedCollectionName || "New Topic Collection",
                callback: autoSaveCallback 
            };
            showModalExtractionStatus("Raw text pre-filled. Auto-extraction will start.", false, 3000);
            setTimeout(() => {
                handleModalRobustExtract(true); 
            }, 100); 
        } else {
             if (dmCollectionNameInput && proposedCollectionName) {
                 const currentDmName = dmCollectionNameInput.value.trim();
                 if (currentDmName === "" || currentDmName.endsWith("(OpenBible)")) {
                    dmCollectionNameInput.value = proposedCollectionName;
                 }
             }
             showModalExtractionStatus("Text pre-filled. Click 'Extract References'.", false, 3000);
        }
    } else {
        console.error("Extractor modal input element not found for pre-filling.");
    }
}
window.prefillExtractorModal = prefillExtractorModal;

function openExtractorModalGlobal() {
    if (!modalTextExtractionInput || !document.getElementById('referenceExtractionModal')) {
        console.error("Extractor modal DOM elements not fully initialized for global open. Attempting late init.");
        const tempElements = {
            modalTextExtractionInput: document.getElementById('modalTextExtractionInput'),
            modalExtractRefsButton: document.getElementById('modalExtractRefsButton'),
            modalExtractionResultsOutput: document.getElementById('modalExtractionResultsOutput'),
            modalCopyValidRefsToEditorBtn: document.getElementById('modalCopyValidRefsToEditorBtn'),
            modalExtractionReferenceBibleName: document.getElementById('modalExtractionReferenceBibleName'),
            modalExtractionStatus: document.getElementById('modalExtractionStatus'),
            dmCollectionVersesEditor: document.getElementById('dmCollectionVersesEditor') 
        };
        if (tempElements.modalTextExtractionInput && tempElements.modalExtractRefsButton && document.getElementById('referenceExtractionModal')) { 
            initExtractorModalDOM(tempElements); 
        } else {
            if (typeof window.localShowStatus === 'function') { 
                window.localShowStatus("Error: Extractor modal components could not be fully initialized.", true, 6000);
            }
            return; 
        }
    }
    const referenceExtractionModal = document.getElementById('referenceExtractionModal');
    if (typeof window.loadFirstAvailableTranslationVersesForExtractor === 'function') {
        window.loadFirstAvailableTranslationVersesForExtractor().then(() => {
            if (referenceExtractionModal) referenceExtractionModal.style.display = 'block';
            if (modalTextExtractionInput) modalTextExtractionInput.focus();
        }).catch(err => {
            console.warn("Error preparing reference Bible for extractor modal:", err);
            if (referenceExtractionModal) referenceExtractionModal.style.display = 'block'; 
            if (modalTextExtractionInput) modalTextExtractionInput.focus();
        });
    } else {
        if (referenceExtractionModal) referenceExtractionModal.style.display = 'block';
        if (modalTextExtractionInput) modalTextExtractionInput.focus();
    }
    if (!autoSaveIntentDetails && modalCopyValidRefsToEditorBtn) {
        modalCopyValidRefsToEditorBtn.textContent = "Copy Valid to Editor";
        modalCopyValidRefsToEditorBtn.title = "Copy parsed references to Data Manager's collection editor";
    }
}
window.openExtractorModalGlobal = openExtractorModalGlobal;

console.log("Extractor_script.js loaded. Includes BOOK_NAME_MAP, robust extraction, auto-save intent logic, and removed sorting.");