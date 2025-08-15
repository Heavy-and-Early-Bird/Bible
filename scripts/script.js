// script.js (Shared Utility Library)

// --- Database Constants ---
const DB_NAME = 'bibleAppDB';
const DB_VERSION = 6; // IMPORTANT: Incremented DB version to trigger upgrade for cross-references
const OS_TRANSLATIONS = 'translations';
const OS_VERSES = 'verses';
const OS_COLLECTIONS = 'collections';
const OS_ASSETS = 'custom_assets'; // For custom images and sounds
const OS_NOTES = 'notes';
const OS_CROSS_REFS = 'cross_references'; // NEW: For the cross-reference data

let db; // Global DB instance, initialized by initDB()

// --- IndexedDB Utility Functions ---

/**
 * Initializes the IndexedDB database.
 * This function should be called once when the application loads.
 * @returns {Promise<IDBDatabase>} A promise that resolves with the database instance.
 */
async function initDB() {
    return new Promise((resolve, reject) => {
        if (db) { // If db is already initialized, resolve immediately
            resolve(db);
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            const transaction = event.target.transaction;
            console.log('IndexedDB upgrade needed. Current stores:', Array.from(dbInstance.objectStoreNames));

            if (!dbInstance.objectStoreNames.contains(OS_TRANSLATIONS)) {
                dbInstance.createObjectStore(OS_TRANSLATIONS, { keyPath: 'id' });
                console.log(`Object store ${OS_TRANSLATIONS} created.`);
            }
            if (!dbInstance.objectStoreNames.contains(OS_VERSES)) {
                const verseStore = dbInstance.createObjectStore(OS_VERSES, { keyPath: ['translationId', '_book', '_chapter', '_verse'] });
                verseStore.createIndex('translationId_idx', 'translationId', { unique: false });
                console.log(`Object store ${OS_VERSES} created with index translationId_idx.`);
            }
            if (!dbInstance.objectStoreNames.contains(OS_COLLECTIONS)) {
                dbInstance.createObjectStore(OS_COLLECTIONS, { keyPath: 'name' });
                console.log(`Object store ${OS_COLLECTIONS} created.`);
            }
            
            if (!dbInstance.objectStoreNames.contains(OS_ASSETS)) {
                const assetStore = dbInstance.createObjectStore(OS_ASSETS, { keyPath: 'id', autoIncrement: true });
                assetStore.createIndex('type_idx', 'type', { unique: false });
                console.log(`Object store ${OS_ASSETS} created with index type_idx.`);
            } else if (event.oldVersion < 4) {
                 // Upgrade path for version 4: ensure type_idx exists if the store was already there
                const assetStore = transaction.objectStore(OS_ASSETS);
                if (!assetStore.indexNames.contains('type_idx')) {
                    assetStore.createIndex('type_idx', 'type', { unique: false });
                    console.log(`Index 'type_idx' created on existing ${OS_ASSETS} store.`);
                }
            }

            if (!dbInstance.objectStoreNames.contains(OS_NOTES)) {
                dbInstance.createObjectStore(OS_NOTES, { keyPath: 'name' });
                console.log(`Object store ${OS_NOTES} created.`);
            }

            // NEW in v6: Add the cross_references object store
            if (!dbInstance.objectStoreNames.contains(OS_CROSS_REFS)) {
                // The key will be the verse ID string, e.g., "Gen1.1"
                dbInstance.createObjectStore(OS_CROSS_REFS, { keyPath: 'id' });
                console.log(`Object store ${OS_CROSS_REFS} created.`);
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result; // Assign to the global db variable
            console.log('IndexedDB initialized successfully.');
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('IndexedDB error:', event.target.errorCode, event.target.error);
            reject(event.target.error);
        };

        request.onblocked = (event) => {
            console.warn('IndexedDB blocked. Please close other tabs/windows using this database.', event);
            alert('The database access is blocked. Please close other instances of this app and refresh the page.');
            reject(new Error('IndexedDB_Blocked: Older version of the database is open elsewhere.'));
        };
    });
}


// --- CROSS-REFERENCE DB FUNCTION (NEW) ---
async function getCrossRefById(refId) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_CROSS_REFS, 'readonly');
        const store = transaction.objectStore(OS_CROSS_REFS);
        const request = store.get(refId);
        request.onsuccess = () => resolve(request.result); // Returns the object {id: "...", refs: [...]} or undefined
        request.onerror = (event) => reject(event.target.error);
    });
}


// --- ASSET MANAGEMENT FUNCTIONS ---
async function addCustomAsset(name, type, data, isUrl = false) {
    if (!db) throw new Error('Database not initialized.');
    // Type must be one of 'image', 'music', 'effect'
    if (!['image', 'music', 'effect'].includes(type)) {
        return Promise.reject(new Error(`Invalid asset type: ${type}`));
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_ASSETS, 'readwrite');
        const store = transaction.objectStore(OS_ASSETS);
        const request = store.add({ name, type, data, isUrl });
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function getCustomAssets(type) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_ASSETS, 'readonly');
        const store = transaction.objectStore(OS_ASSETS);
        const index = store.index('type_idx');
        const request = index.getAll(IDBKeyRange.only(type));
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function getCustomAssetById(id) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_ASSETS, 'readonly');
        const store = transaction.objectStore(OS_ASSETS);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function deleteCustomAsset(id) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_ASSETS, 'readwrite');
        const store = transaction.objectStore(OS_ASSETS);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}


/**
 * Saves translation metadata and its verses to the database.
 * Clears existing verses for the given translationId before adding new ones.
 * @param {string} translationId - Unique ID for the translation (e.g., filename).
 * @param {string} displayName - User-friendly name for the translation.
 * @param {Array<Object>} verses - Array of verse objects.
 * @returns {Promise<void>}
 */
async function saveTranslationData(translationId, displayName, verses) {
    if (!db) throw new Error('Database not initialized. Call initDB() first.');
    return new Promise(async (resolve, reject) => {
        const transaction = db.transaction([OS_TRANSLATIONS, OS_VERSES], 'readwrite');
        const translationsStore = transaction.objectStore(OS_TRANSLATIONS);
        const versesStore = transaction.objectStore(OS_VERSES);

        transaction.onerror = (event) => reject(event.target.error);
        transaction.oncomplete = () => resolve();

        // 1. Save/update translation metadata
        translationsStore.put({ id: translationId, name: displayName, importDate: new Date() });

        // 2. Clear existing verses for this translationId
        const index = versesStore.index('translationId_idx');
        const clearRequest = index.openKeyCursor(IDBKeyRange.only(translationId));
        let keysToDelete = [];

        clearRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                keysToDelete.push(cursor.primaryKey);
                cursor.continue();
            } else {
                // All keys collected, now delete them
                Promise.all(keysToDelete.map(key => new Promise((resDel, rejDel) => {
                    const delReq = versesStore.delete(key);
                    delReq.onsuccess = resDel;
                    delReq.onerror = () => rejDel(delReq.error);
                }))).then(() => {
                    // 3. Add new verses
                    return Promise.all(verses.map(verse => new Promise((resAdd, rejAdd) => {
                        const verseData = {
                            translationId,
                            text: verse.text,
                            reference: verse.reference,
                            _book: verse._book,
                            _chapter: verse._chapter,
                            _verse: verse._verse
                        };
                        const addReq = versesStore.add(verseData);
                        addReq.onsuccess = resAdd;
                        addReq.onerror = (e) => {
                            if (e.target.error?.name === 'ConstraintError') {
                                console.warn(`Duplicate verse skipped (ConstraintError): ${verse.reference} for ${translationId}`);
                                resAdd(); 
                            } else {
                                console.error(`Failed to add verse ${verse.reference} for ${translationId}:`, e.target.error);
                                rejAdd(addReq.error);
                            }
                        };
                    })));
                }).then(() => {
                    // Verse addition completed
                }).catch(reject);
            }
        };
        clearRequest.onerror = (event) => reject(event.target.error);
    });
}

async function getTranslationsList() {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const request = db.transaction(OS_TRANSLATIONS, 'readonly')
                          .objectStore(OS_TRANSLATIONS)
                          .getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

// Get metadata for a single translation by ID
async function getTranslationMetadata(translationId) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const request = db.transaction(OS_TRANSLATIONS, 'readonly')
                          .objectStore(OS_TRANSLATIONS)
                          .get(translationId);
        request.onsuccess = () => resolve(request.result); // result will be the object or undefined if not found
        request.onerror = (event) => reject(event.target.error);
    });
}

// Update a translation's display name
async function updateTranslationName(translationId, newName) {
    if (!db) throw new Error('Database not initialized. Call initDB() first.');
    return new Promise(async (resolve, reject) => {
        const transaction = db.transaction(OS_TRANSLATIONS, 'readwrite');
        const store = transaction.objectStore(OS_TRANSLATIONS);

        transaction.onerror = (event) => reject(event.target.error);
        transaction.oncomplete = () => resolve();

        const getRequest = store.get(translationId);
        getRequest.onsuccess = () => {
            const translation = getRequest.result;
            if (translation) {
                translation.name = newName;
                translation.importDate = translation.importDate || new Date(); // Ensure importDate is set, might be old data
                store.put(translation);
            } else {
                reject(new Error(`Translation with ID "${translationId}" not found for update.`));
            }
        };
        getRequest.onerror = (event) => reject(event.target.error);
    });
}


async function getVersesByTranslation(translationId) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const request = db.transaction(OS_VERSES, 'readonly')
                          .objectStore(OS_VERSES)
                          .index('translationId_idx')
                          .getAll(IDBKeyRange.only(translationId));
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function deleteTranslationFromDB(translationId) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([OS_TRANSLATIONS, OS_VERSES], 'readwrite');
        transaction.onerror = (event) => reject(event.target.error);
        transaction.oncomplete = () => resolve();

        transaction.objectStore(OS_TRANSLATIONS).delete(translationId);
        const versesStore = transaction.objectStore(OS_VERSES);
        const index = versesStore.index('translationId_idx');
        const clearRequest = index.openKeyCursor(IDBKeyRange.only(translationId));
        let keysToDelete = [];
        clearRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                keysToDelete.push(cursor.primaryKey);
                cursor.continue();
            } else {
                Promise.all(keysToDelete.map(key => new Promise((resDel, rejDel) => {
                    const delReq = versesStore.delete(key);
                    delReq.onsuccess = resDel;
                    delReq.onerror = rejDel; 
                }))).catch(reject);
            }
        };
        clearRequest.onerror = (event) => reject(event.target.error);
    });
}

async function saveCollectionToDB(collectionData) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_COLLECTIONS, 'readwrite');
        const store = transaction.objectStore(OS_COLLECTIONS);
        // Ensure verses have the new structure if not already
        const processedVerses = (collectionData.verses || []).map(v => {
            return {
                _book: v._book,
                _chapter: v._chapter,
                _startVerse: v._startVerse || v._verse, // Handle old single verse format
                _endVerse: v._endVerse || v._verse,     // Handle old single verse format
                reference: v.reference // This should be the full "Book C:S-E" string
            };
        });
        const dataToSave = { ...collectionData, verses: processedVerses };
        const request = store.put(dataToSave);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function getCollectionFromDB(collectionName) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_COLLECTIONS, 'readonly');
        const store = transaction.objectStore(OS_COLLECTIONS);
        const request = store.get(collectionName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function getAllCollectionsFromDB() {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_COLLECTIONS, 'readonly');
        const store = transaction.objectStore(OS_COLLECTIONS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function deleteCollectionFromDB(collectionName) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_COLLECTIONS, 'readwrite');
        const store = transaction.objectStore(OS_COLLECTIONS);
        const request = store.delete(collectionName);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

// --- NOTE MANAGEMENT DB FUNCTIONS (NEW) ---
async function saveNoteToDB(noteData) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_NOTES, 'readwrite');
        const store = transaction.objectStore(OS_NOTES);
        const request = store.put(noteData); // put will add or update
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function getNoteFromDB(noteName) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_NOTES, 'readonly');
        const store = transaction.objectStore(OS_NOTES);
        const request = store.get(noteName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function getAllNotesFromDB() {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_NOTES, 'readonly');
        const store = transaction.objectStore(OS_NOTES);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => reject(event.target.error);
    });
}

async function deleteNoteFromDB(noteName) {
    if (!db) throw new Error('Database not initialized.');
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OS_NOTES, 'readwrite');
        const store = transaction.objectStore(OS_NOTES);
        const request = store.delete(noteName);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}


// --- Parsing Utility Functions ---

/**
 * Parses a Bible reference string (e.g., "Genesis 1:1" or "Genesis 1:1-5" or "Genesis 1:1,3-5")
 * Notes on things like ",3-5" are ignored for simplicity now but could be complex.
 * The primary goal is to get Book C:S-E.
 * @param {string} refStr - The reference string.
 * @returns {Object|null} Parsed object {book, chapter, startVerse, endVerse, note} or null.
 *                        endVerse will be equal to startVerse if it's not a range.
 */
function parseBibleReferenceWithNote(refStr) {
    if (!refStr || typeof refStr !== 'string') return null;

    const refMatch = refStr.trim().match(
        /^([1-3]?\s*[a-zA-Z]+(?:\s+[a-zA-Z]+)*)\s*(\d+)[\s:.](\d+)(?:-(\d+))?(?:\s*\(.+?\))?/i
    );

    if (refMatch) {
        const bookName = refMatch[1].trim().replace(/\s+/g, ' ');
        const chapter = parseInt(refMatch[2]);
        const startVerse = parseInt(refMatch[3]);
        const endVerseStr = refMatch[4]; // This is the part after the hyphen
        let endVerse = startVerse; // Default to startVerse if no endVerse specified

        if (endVerseStr) {
            const parsedEndVerse = parseInt(endVerseStr);
            if (!isNaN(parsedEndVerse) && parsedEndVerse >= startVerse) {
                endVerse = parsedEndVerse;
            } else {
                // Invalid range (e.g., Gen 1:5-2 or Gen 1:1-abc)
                return null;
            }
        }
        return {
            book: bookName,
            chapter: chapter,
            startVerse: startVerse,
            endVerse: endVerse,
            note: null 
        };
    }
    return null;
}


const BIBLE_BOOK_NAMES_BY_NUMBER = [
    null, "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

function getBookNameByStandardNumber(bookNumber) {
    const num = parseInt(bookNumber, 10);
    if (num >= 1 && num < BIBLE_BOOK_NAMES_BY_NUMBER.length) {
        return BIBLE_BOOK_NAMES_BY_NUMBER[num];
    }
    console.warn(`Book number ${bookNumber} not found in standard list.`);
    return `Book ${bookNumber}`;
}

function parseXMLData(xmlText, fileName) {
    const parsedVerses = [];
    const translationId = fileName;
    let displayName = fileName.replace(/\.xml$/i, '').replace(/_/g, ' ');

    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "application/xml");
        const errNode = xmlDoc.querySelector("parsererror");
        if (errNode) {
            const errorDetails = errNode.textContent || "Unknown XML parsing error.";
            console.error("XML Parse Error Details:", errorDetails);
            throw new Error("XML Parse Error: " + errorDetails.split('\n')[0]);
        }

        const zefaniaBooks = xmlDoc.getElementsByTagName("b");
        if (zefaniaBooks.length > 0) {
            console.log("Attempting to parse as Zefania XML format...");
            for (const bookNode of zefaniaBooks) {
                const bookName = bookNode.getAttribute("n");
                if (!bookName) continue;
                const chapters = bookNode.getElementsByTagName("c");
                for (const chapNode of chapters) {
                    const chapNumStr = chapNode.getAttribute("n");
                    if (!chapNumStr) continue;
                    const chapNum = parseInt(chapNumStr);
                    const verseNodes = chapNode.getElementsByTagName("v");
                    for (const vNode of verseNodes) {
                        const vNumStr = vNode.getAttribute("n");
                        if (!vNumStr) continue;
                        const vNum = parseInt(vNumStr);
                        let vText = vNode.textContent.trim().replace(/^\d+\s*/, '');
                        parsedVerses.push({
                            text: vText,
                            reference: `${bookName} ${chapNum}:${vNum}`,
                            _book: bookName.trim().toLowerCase(),
                            _chapter: chapNum,
                            _verse: vNum
                        });
                    }
                }
            }
            if (parsedVerses.length > 0) {
                let zefaniaTitleNode = xmlDoc.querySelector("information title") ||
                                       xmlDoc.querySelector("information key[name='title']") ||
                                       xmlDoc.querySelector("identification title");
                if (zefaniaTitleNode && zefaniaTitleNode.textContent) {
                    displayName = zefaniaTitleNode.textContent.trim();
                }
            }
        }

        if (parsedVerses.length === 0) {
            console.log("Zefania parsing yielded no verses. Attempting numbered book format...");
            const bibleNode = xmlDoc.querySelector("bible");
            if (bibleNode) {
                const translationAttr = bibleNode.getAttribute("translation");
                if (translationAttr) displayName = translationAttr.trim();

                const bookNodes = xmlDoc.getElementsByTagName("book");
                if (bookNodes.length > 0) {
                    for (const bookNode of bookNodes) {
                        const bookNumberAttr = bookNode.getAttribute("number");
                        if (!bookNumberAttr) continue;
                        const bookName = getBookNameByStandardNumber(bookNumberAttr);
                        const chapters = bookNode.getElementsByTagName("chapter");
                        for (const chapNode of chapters) {
                            const chapNumAttr = chapNode.getAttribute("number");
                            if (!chapNumAttr) continue;
                            const chapNum = parseInt(chapNumAttr);
                            const verseNodes = chapNode.getElementsByTagName("verse");
                            for (const vNode of verseNodes) {
                                const vNumAttr = vNode.getAttribute("number");
                                if (!vNumAttr) continue;
                                const vNum = parseInt(vNumAttr);
                                let vText = vNode.textContent.trim();
                                parsedVerses.push({
                                    text: vText,
                                    reference: `${bookName} ${chapNum}:${vNum}`,
                                    _book: bookName.trim().toLowerCase(),
                                    _chapter: chapNum,
                                    _verse: vNum
                                });
                            }
                        }
                    }
                }
            }
        }
        if (parsedVerses.length === 0) {
            throw new Error("No verses found in XML after attempting all known formats.");
        }
        return { verses: parsedVerses, translationId: translationId, displayName: displayName };
    } catch (error) {
        console.error("XML Parsing Critical Error:", error, "Input filename:", fileName);
        return null;
    }
}

function showStatusMessage(message, isError = false, duration = 3000, targetElement = null) {
    if (targetElement && targetElement instanceof HTMLElement) {
        targetElement.textContent = message;
        targetElement.style.color = isError ? 'var(--brand-color)' : 'var(--text-color)';
        if (duration > 0) {
            setTimeout(() => {
                if (targetElement.textContent === message) {
                    targetElement.textContent = '';
                }
            }, duration);
        }
    } else if (message) {
        console.log(`Status (${isError ? 'Error' : 'Info'}): ${message}`);
    }
}

const themes = {
    // --- Original Themes ---
    dark: {'--bg-color':'#1a1a1d','--text-color':'#c5c6c7','--navbar-bg':'#000000','--navbar-text':'#f0f0f0','--brand-color':'#DC143C','--verse-card-bg':'#2c2f33','--verse-text-color':'#e0e0e0','--reference-color':'#DC143C','--progress-bar-track':'#000000','--progress-bar-fill':'#DC143C','--progress-bar-fill-paused':'#8a0f29','--button-bg':'#DC143C','--button-text':'#ffffff','--button-hover-bg':'#b21030','--options-button-bg':'var(--brand-color)','--options-button-text':'var(--button-text)','--options-button-hover-bg':'var(--button-hover-bg)','--options-panel-bg':'#1e1e21','--options-panel-border':'#4f4f52','--options-panel-text':'var(--navbar-text)','--options-panel-item-hover-bg':'rgba(255,255,255,0.05)','--modal-bg':'rgba(0,0,0,0.7)','--modal-content-bg':'var(--bg-color)','--modal-content-text':'var(--text-color)','--modal-highlight-bg':'rgba(220,20,60,0.15)','--modal-highlight-border':'var(--brand-color)', '--verse-change-flash-bg': '#440000', '--verse-text-shadow': '1px 1px 3px rgba(0,0,0,0.7)', '--timer-icon-button-bg': 'rgba(255,255,255,0.1)', '--timer-icon-button-hover-bg': 'rgba(255,255,255,0.2)', '--timer-icon-button-fill': 'var(--options-panel-text)', '--timer-icon-button-border': 'var(--options-panel-border)', '--settings-modal-header-color': 'var(--brand-color)', '--floating-button-bg': 'rgba(0,0,0,0.6)', '--floating-button-hover-bg': 'rgba(0,0,0,0.8)', '--floating-button-icon-fill': 'var(--navbar-text)', '--collection-note-color': 'var(--text-color)', '--collection-note-border-color': 'var(--options-panel-border)', '--collection-note-bg': 'rgba(79,79,82,0.15)', '--fullscreen-editor-bg': 'var(--bg-color)', '--fullscreen-editor-text':'var(--text-color)', '--fullscreen-editor-textarea-bg': 'var(--verse-card-bg)', '--brand-color-rgb': '220, 20, 60'},
    light: {
        '--bg-color':'#f4f4f8', '--text-color':'#333333', '--navbar-bg':'#DC143C', '--navbar-text':'#ffffff', '--brand-color':'#EE8A9E', /* MODIFIED: Averaged with white */ '--verse-card-bg':'#ffffff', '--verse-text-color':'#333333', '--reference-color':'#B21030', '--progress-bar-track':'#ffffff', '--progress-bar-fill':'#DC143C', '--progress-bar-fill-paused':'#b21030', '--button-bg':'#DC143C', '--button-text':'#ffffff', '--button-hover-bg':'#b21030', '--options-button-bg':'#ffffff', '--options-button-text':'#DC143C', '--options-button-hover-bg':'#f0f0f0', '--options-panel-bg':'#ffffff', '--options-panel-border':'#cccccc', '--options-panel-text':'#333333', '--options-panel-item-hover-bg':'rgba(220,20,60,0.05)', '--modal-bg':'rgba(0,0,0,0.5)', '--modal-content-bg':'#fdfdfd', '--modal-content-text':'#333333', '--modal-highlight-bg':'rgba(220,20,60,0.1)', '--modal-highlight-border':'#DC143C', '--verse-change-flash-bg': '#FFCDD2', '--verse-text-shadow': '1px 1px 2px rgba(0,0,0,0.2)', '--timer-icon-button-bg': 'rgba(0,0,0,0.05)', '--timer-icon-button-hover-bg': 'rgba(0,0,0,0.1)', '--timer-icon-button-fill': '#333333', '--timer-icon-button-border': '#cccccc', '--settings-modal-header-color': '#DC143C', '--floating-button-bg': 'rgba(220,20,60,0.8)', '--floating-button-hover-bg': 'rgba(220,20,60,1)', '--floating-button-icon-fill': '#ffffff', '--collection-note-color': '#555555', '--collection-note-border-color': '#dddddd', '--collection-note-bg': 'rgba(0,0,0,0.03)', '--fullscreen-editor-bg': '#f4f4f8', '--fullscreen-editor-text':'#333333', '--fullscreen-editor-textarea-bg': '#ffffff', '--brand-color-rgb': '238, 138, 158' /* MODIFIED */
    },
    dark_sepia: { '--bg-color': '#4E342E', '--text-color': '#D7CCC8', '--navbar-bg': '#3E2723', '--navbar-text': '#EFEBE9', '--brand-color': '#A1887F', '--verse-card-bg': '#5D4037', '--verse-text-color': '#EFEBE9', '--reference-color': '#BCAAA4', '--progress-bar-track': '#6D4C41', '--progress-bar-fill': '#A1887F', '--progress-bar-fill-paused': '#8D6E63', '--button-bg': '#A1887F', '--button-text': '#ffffff', '--button-hover-bg': '#8D6E63', '--options-button-bg': '#A1887F', '--options-button-text': '#ffffff', '--options-button-hover-bg': '#8D6E63', '--options-panel-bg': '#4A352F', '--options-panel-border': '#6D4C41', '--options-panel-text': '#D7CCC8', '--options-panel-item-hover-bg': 'rgba(161, 136, 127, 0.15)', '--modal-bg': 'rgba(62, 39, 35, 0.7)', '--modal-content-bg': '#4E342E', '--modal-content-text': '#D7CCC8', '--modal-highlight-bg': 'rgba(161, 136, 127, 0.2)', '--modal-highlight-border': '#A1887F', '--verse-change-flash-bg': '#795548', '--verse-text-shadow': '1px 1px 2px rgba(0,0,0,0.6)', '--timer-icon-button-bg': 'rgba(161, 136, 127, 0.1)', '--timer-icon-button-hover-bg': 'rgba(161, 136, 127, 0.25)', '--timer-icon-button-fill': '#D7CCC8', '--timer-icon-button-border': '#6D4C41', '--settings-modal-header-color': '#A1887F', '--floating-button-bg': 'rgba(62, 39, 35, 0.7)', '--floating-button-hover-bg': 'rgba(62, 39, 35, 0.9)', '--floating-button-icon-fill': '#EFEBE9', '--collection-note-color': '#D7CCC8', '--collection-note-border-color': '#6D4C41', '--collection-note-bg': 'rgba(93, 64, 55, 0.15)', '--fullscreen-editor-bg': '#4E342E', '--fullscreen-editor-text': '#D7CCC8', '--fullscreen-editor-textarea-bg': '#5D4037', '--brand-color-rgb': '161, 136, 127' },
    ocean_blue: {
        '--bg-color': '#e0f7ff', '--text-color': '#2a3f54', '--navbar-bg': '#4a90e2', '--navbar-text': '#ffffff', '--brand-color': '#A5C8F1', /* MODIFIED: Averaged with white */ '--verse-card-bg': '#ffffff', '--verse-text-color': '#1a2e44', '--reference-color': '#357ABD', '--progress-bar-track': '#ffffff', '--progress-bar-fill': '#4a90e2', '--progress-bar-fill-paused': '#357abd', '--button-bg': '#4a90e2', '--button-text': '#ffffff', '--button-hover-bg': '#357abd', '--options-button-bg': '#ffffff', '--options-button-text': '#4a90e2', '--options-button-hover-bg': '#e6f3ff', '--options-panel-bg': '#d6e6f2', '--options-panel-border': '#9cbadd', '--options-panel-text': '#2a3f54', '--options-panel-item-hover-bg':'rgba(74,144,226,0.1)', '--modal-bg':'rgba(42,63,84,0.6)', '--modal-content-bg':'#e9f2f9', '--modal-content-text':'#2a3f54', '--modal-highlight-bg':'rgba(74,144,226,0.15)', '--modal-highlight-border':'#4a90e2', '--verse-change-flash-bg': '#a7d7f9', '--verse-text-shadow': '1px 1px 2px rgba(0,0,0,0.15)', '--timer-icon-button-bg': 'rgba(74,144,226,0.1)', '--timer-icon-button-hover-bg': 'rgba(74,144,226,0.2)', '--timer-icon-button-fill': '#357abd', '--timer-icon-button-border': '#9cbadd', '--settings-modal-header-color': '#357abd', '--floating-button-bg': 'rgba(53,122,189,0.8)', '--floating-button-hover-bg': 'rgba(53,122,189,1)', '--floating-button-icon-fill': '#ffffff', '--collection-note-color': '#3a4f64', '--collection-note-border-color': '#b0c4de', '--collection-note-bg': 'rgba(176,196,222,0.1)', '--fullscreen-editor-bg': '#e0f7ff', '--fullscreen-editor-text':'#2a3f54', '--fullscreen-editor-textarea-bg': '#ffffff', '--brand-color-rgb': '165, 200, 241' /* MODIFIED */
    },
    deep_forest: { '--bg-color': '#0A140A', '--text-color': '#aaccbb', '--navbar-bg': '#102010', '--navbar-text': '#cce0dd', '--brand-color': '#50c878', '--verse-card-bg': '#0D1A0D', '--verse-text-color': '#d8f0e0', '--reference-color': '#50c878', '--progress-bar-track': '#000000', '--progress-bar-fill': '#50c878', '--progress-bar-fill-paused': '#388e3c', '--button-bg': '#50c878', '--button-text': '#ffffff', '--button-hover-bg': '#388e3c', '--options-button-bg': '#50c878', '--options-button-text': '#ffffff', '--options-button-hover-bg': '#388e3c', '--options-panel-bg': '#0F1A0F', '--options-panel-border': '#203020', '--options-panel-text': '#aaccbb', '--options-panel-item-hover-bg': 'rgba(80, 200, 120, 0.1)', '--modal-bg': 'rgba(10, 20, 10, 0.7)', '--modal-content-bg': '#0A140A', '--modal-content-text': '#aaccbb', '--modal-highlight-bg': 'rgba(80, 200, 120, 0.15)', '--modal-highlight-border': '#50c878', '--verse-change-flash-bg': '#205030', '--verse-text-shadow': '1px 1px 2px rgba(0,0,0,0.5)', '--timer-icon-button-bg': 'rgba(80, 200, 120, 0.1)', '--timer-icon-button-hover-bg': 'rgba(80, 200, 120, 0.2)', '--timer-icon-button-fill': '#aaccbb', '--timer-icon-button-border': '#203020', '--settings-modal-header-color': '#50c878', '--floating-button-bg': 'rgba(16, 32, 16, 0.7)', '--floating-button-hover-bg': 'rgba(16, 32, 16, 0.9)', '--floating-button-icon-fill': '#cce0dd', '--collection-note-color': '#aaccbb', '--collection-note-border-color': '#203020', '--collection-note-bg': 'rgba(32, 48, 32, 0.1)', '--fullscreen-editor-bg': '#0A140A', '--fullscreen-editor-text': '#aaccbb', '--fullscreen-editor-textarea-bg': '#0D1A0D', '--brand-color-rgb': '80, 200, 120' },
    sunset_orange: {
        '--bg-color': '#fff3e0', '--text-color': '#6d4c41', '--navbar-bg': '#ef6c00', '--navbar-text': '#ffffff', '--brand-color': '#F7B680', /* MODIFIED: Averaged with white */ '--verse-card-bg': '#ffe0b2', '--verse-text-color': '#4e342e', '--reference-color': '#D84315', '--progress-bar-track': '#ffffff', '--progress-bar-fill': '#ef6c00', '--progress-bar-fill-paused': '#e65100', '--button-bg': '#ef6c00', '--button-text': '#ffffff', '--button-hover-bg': '#e65100', '--options-button-bg': '#ffffff', '--options-button-text': '#ef6c00', '--options-button-hover-bg': '#fff3e0', '--options-panel-bg': '#ffeccf', '--options-panel-border': '#ffb74d', '--options-panel-text': '#6d4c41', '--options-panel-item-hover-bg': 'rgba(239,108,0,0.1)', '--modal-bg': 'rgba(109,76,65,0.6)', '--modal-content-bg': '#fff8e1', '--modal-content-text': '#6d4c41', '--modal-highlight-bg': 'rgba(239,108,0,0.15)', '--modal-highlight-border': '#ef6c00', '--verse-change-flash-bg': '#ffdda6', '--verse-text-shadow': '1px 1px 2px rgba(0,0,0,0.2)', '--timer-icon-button-bg': 'rgba(239,108,0,0.1)', '--timer-icon-button-hover-bg': 'rgba(239,108,0,0.2)', '--timer-icon-button-fill': '#e65100', '--timer-icon-button-border': '#ffb74d', '--settings-modal-header-color': '#D84315', '--floating-button-bg': 'rgba(230,81,0,0.8)', '--floating-button-hover-bg': 'rgba(230,81,0,1)', '--floating-button-icon-fill': '#ffffff', '--collection-note-color': '#7a584b', '--collection-note-border-color': '#ffcc80', '--collection-note-bg': 'rgba(255,204,128,0.1)', '--fullscreen-editor-bg': '#fff3e0', '--fullscreen-editor-text': '#6d4c41', '--fullscreen-editor-textarea-bg': '#ffe0b2', '--brand-color-rgb': '247, 182, 128' /* MODIFIED */
    },

    // --- New Revolutionary Themes ---
    midnight_bloom: {
        '--bg-color': '#101028','--text-color': '#D0D0E0','--navbar-bg': '#0B0B1C','--navbar-text': '#E0E0F0','--brand-color': '#E91E63','--verse-card-bg': '#1A1A3A','--verse-text-color': '#E0E0F0','--reference-color': '#E91E63','--progress-bar-track': '#000000','--progress-bar-fill': '#E91E63','--progress-bar-fill-paused': '#B8174F','--button-bg': '#E91E63','--button-text': '#FFFFFF','--button-hover-bg': '#B8174F','--options-button-bg': 'var(--brand-color)','--options-button-text': 'var(--button-text)','--options-button-hover-bg': 'var(--button-hover-bg)','--options-panel-bg': '#151530','--options-panel-border': '#2A2A50','--options-panel-text': 'var(--navbar-text)','--options-panel-item-hover-bg': 'rgba(233, 30, 99, 0.1)','--modal-bg': 'rgba(16, 16, 40, 0.7)','--modal-content-bg': 'var(--bg-color)','--modal-content-text': 'var(--text-color)','--modal-highlight-bg': 'rgba(233, 30, 99, 0.2)','--modal-highlight-border': 'var(--brand-color)','--verse-change-flash-bg': 'rgba(233, 30, 99, 0.3)','--verse-text-shadow': '1px 1px 2px rgba(0, 0, 0, 0.4)','--timer-icon-button-bg': 'rgba(208, 208, 224, 0.1)','--timer-icon-button-hover-bg': 'rgba(208, 208, 224, 0.2)','--timer-icon-button-fill': 'var(--options-panel-text)','--timer-icon-button-border': 'var(--options-panel-border)','--settings-modal-header-color': 'var(--brand-color)','--floating-button-bg': 'rgba(11, 11, 28, 0.7)','--floating-button-hover-bg': 'rgba(11, 11, 28, 0.9)','--floating-button-icon-fill': 'var(--navbar-text)','--collection-note-color': 'var(--text-color)','--collection-note-border-color': 'var(--options-panel-border)','--collection-note-bg': 'rgba(42, 42, 80, 0.15)','--fullscreen-editor-bg': 'var(--bg-color)','--fullscreen-editor-text': 'var(--text-color)','--fullscreen-editor-textarea-bg': 'var(--verse-card-bg)','--brand-color-rgb': '233, 30, 99'
    },
    charcoal_amber: {
        '--bg-color': '#222831','--text-color': '#EEEEEE','--navbar-bg': '#1A1E25','--navbar-text': '#FAFAFA','--brand-color': '#FFC107','--verse-card-bg': '#393E46','--verse-text-color': '#FAFAFA','--reference-color': '#FFC107','--progress-bar-track': '#000000','--progress-bar-fill': '#FFC107','--progress-bar-fill-paused': '#D4A106','--button-bg': '#FFC107','--button-text': '#1A1E25','--button-hover-bg': '#D4A106','--options-button-bg': 'var(--brand-color)','--options-button-text': 'var(--button-text)','--options-button-hover-bg': 'var(--button-hover-bg)','--options-panel-bg': '#2B303A','--options-panel-border': '#4A4F58','--options-panel-text': 'var(--navbar-text)','--options-panel-item-hover-bg': 'rgba(255, 193, 7, 0.1)','--modal-bg': 'rgba(34, 40, 49, 0.7)','--modal-content-bg': 'var(--bg-color)','--modal-content-text': 'var(--text-color)','--modal-highlight-bg': 'rgba(255, 193, 7, 0.15)','--modal-highlight-border': 'var(--brand-color)','--verse-change-flash-bg': 'rgba(255, 193, 7, 0.2)','--verse-text-shadow': '1px 1px 2px rgba(0, 0, 0, 0.3)','--timer-icon-button-bg': 'rgba(238, 238, 238, 0.05)','--timer-icon-button-hover-bg': 'rgba(238, 238, 238, 0.1)','--timer-icon-button-fill': 'var(--options-panel-text)','--timer-icon-button-border': 'var(--options-panel-border)','--settings-modal-header-color': 'var(--brand-color)','--floating-button-bg': 'rgba(26, 30, 37, 0.7)','--floating-button-hover-bg': 'rgba(26, 30, 37, 0.9)','--floating-button-icon-fill': 'var(--navbar-text)','--collection-note-color': 'var(--text-color)','--collection-note-border-color': 'var(--options-panel-border)','--collection-note-bg': 'rgba(74, 79, 88, 0.15)','--fullscreen-editor-bg': 'var(--bg-color)','--fullscreen-editor-text': 'var(--text-color)','--fullscreen-editor-textarea-bg': 'var(--verse-card-bg)','--brand-color-rgb': '255, 193, 7'
    },
    obsidian_emerald: {
        '--bg-color': '#0D0D0D','--text-color': '#E0E0E0','--navbar-bg': '#000000','--navbar-text': '#F5F5F5','--brand-color': '#00C853','--verse-card-bg': '#1A1A1A','--verse-text-color': '#F5F5F5','--reference-color': '#00C853','--progress-bar-track': '#000000','--progress-bar-fill': '#00C853','--progress-bar-fill-paused': '#00A042','--button-bg': '#00C853','--button-text': '#FFFFFF','--button-hover-bg': '#00A042','--options-button-bg': 'var(--brand-color)','--options-button-text': 'var(--button-text)','--options-button-hover-bg': 'var(--button-hover-bg)','--options-panel-bg': '#141414','--options-panel-border': '#2C2C2C','--options-panel-text': 'var(--navbar-text)','--options-panel-item-hover-bg': 'rgba(0, 200, 83, 0.1)','--modal-bg': 'rgba(13, 13, 13, 0.75)','--modal-content-bg': 'var(--bg-color)','--modal-content-text': 'var(--text-color)','--modal-highlight-bg': 'rgba(0, 200, 83, 0.15)','--modal-highlight-border': 'var(--brand-color)','--verse-change-flash-bg': 'rgba(0, 200, 83, 0.2)','--verse-text-shadow': '1px 1px 2px rgba(0, 0, 0, 0.5)','--timer-icon-button-bg': 'rgba(224, 224, 224, 0.05)','--timer-icon-button-hover-bg': 'rgba(224, 224, 224, 0.1)','--timer-icon-button-fill': 'var(--options-panel-text)','--timer-icon-button-border': 'var(--options-panel-border)','--settings-modal-header-color': 'var(--brand-color)','--floating-button-bg': 'rgba(0, 0, 0, 0.7)','--floating-button-hover-bg': 'rgba(0, 0, 0, 0.9)','--floating-button-icon-fill': 'var(--navbar-text)','--collection-note-color': 'var(--text-color)','--collection-note-border-color': 'var(--options-panel-border)','--collection-note-bg': 'rgba(44, 44, 44, 0.15)','--fullscreen-editor-bg': 'var(--bg-color)','--fullscreen-editor-text': 'var(--text-color)','--fullscreen-editor-textarea-bg': 'var(--verse-card-bg)','--brand-color-rgb': '0, 200, 83'
    },
    daybreak_haze: {
        '--bg-color': '#F0F4F8', '--text-color': '#37474F', '--navbar-bg': '#9575CD', '--navbar-text': '#FFFFFF', '--brand-color': '#CABAEE', /* MODIFIED: Averaged with white */ '--verse-card-bg': '#FFFFFF', '--verse-text-color': '#263238', '--reference-color': '#7E57C2', '--progress-bar-track': '#ffffff', '--progress-bar-fill': '#9575CD', '--progress-bar-fill-paused': '#7E57C2', '--button-bg': '#9575CD', '--button-text': '#FFFFFF', '--button-hover-bg': '#7E57C2', '--options-button-bg': '#ffffff', '--options-button-text': '#9575CD', '--options-button-hover-bg': '#EDE7F6', '--options-panel-bg': '#E8EAF6', '--options-panel-border': '#B0BEC5', '--options-panel-text': 'var(--text-color)', '--options-panel-item-hover-bg': 'rgba(149, 117, 205, 0.1)', '--modal-bg': 'rgba(55, 71, 79, 0.5)', '--modal-content-bg': '#FAFBFC', '--modal-content-text': 'var(--text-color)', '--modal-highlight-bg': 'rgba(149, 117, 205, 0.15)', '--modal-highlight-border': '#9575CD', '--verse-change-flash-bg': 'rgba(149, 117, 205, 0.2)', '--verse-text-shadow': '1px 1px 1px rgba(0, 0, 0, 0.05)', '--timer-icon-button-bg': 'rgba(149, 117, 205, 0.08)', '--timer-icon-button-hover-bg': 'rgba(149, 117, 205, 0.15)', '--timer-icon-button-fill': '#7E57C2', '--timer-icon-button-border': '#B0BEC5', '--settings-modal-header-color': '#7E57C2', '--floating-button-bg': 'rgba(126, 87, 194, 0.8)', '--floating-button-hover-bg': 'rgba(126, 87, 194, 1)', '--floating-button-icon-fill': '#FFFFFF', '--collection-note-color': '#455A64', '--collection-note-border-color': '#CFD8DC', '--collection-note-bg': 'rgba(176, 190, 197, 0.1)', '--fullscreen-editor-bg': 'var(--bg-color)', '--fullscreen-editor-text': 'var(--text-color)', '--fullscreen-editor-textarea-bg': 'var(--verse-card-bg)', '--brand-color-rgb': '202, 186, 230' /* MODIFIED */
    },
    vanilla_cream: {
        '--bg-color': '#FAF0E6', '--text-color': '#5D4037', '--navbar-bg': '#FFCA28', '--navbar-text': '#4E342E', '--brand-color': '#FFE594', /* MODIFIED: Averaged with white */ '--verse-card-bg': '#FFFFFF', '--verse-text-color': '#4E342E', '--reference-color': '#FFA000', '--progress-bar-track': '#ffffff', '--progress-bar-fill': '#FFCA28', '--progress-bar-fill-paused': '#FFA000', '--button-bg': '#FFCA28', '--button-text': '#4E342E', '--button-hover-bg': '#FFA000', '--options-button-bg': '#4E342E', '--options-button-text': '#FFEB3B', '--options-button-hover-bg': '#6A4F44', '--options-panel-bg': '#FFF3E0', '--options-panel-border': '#FFCC80', '--options-panel-text': 'var(--text-color)', '--options-panel-item-hover-bg': 'rgba(255, 202, 40, 0.1)', '--modal-bg': 'rgba(93, 64, 55, 0.5)', '--modal-content-bg': '#FFF8E1', '--modal-content-text': 'var(--text-color)', '--modal-highlight-bg': 'rgba(255, 202, 40, 0.15)', '--modal-highlight-border': '#FFCA28', '--verse-change-flash-bg': 'rgba(255, 202, 40, 0.2)', '--verse-text-shadow': '1px 1px 1px rgba(0, 0, 0, 0.05)', '--timer-icon-button-bg': 'rgba(255, 202, 40, 0.08)', '--timer-icon-button-hover-bg': 'rgba(255, 202, 40, 0.15)', '--timer-icon-button-fill': '#FFA000', '--timer-icon-button-border': '#FFCC80', '--settings-modal-header-color': '#FFA000', '--floating-button-bg': 'rgba(255, 160, 0, 0.8)', '--floating-button-hover-bg': 'rgba(255, 160, 0, 1)', '--floating-button-icon-fill': '#FFFFFF', '--collection-note-color': '#6D4C41', '--collection-note-border-color': '#FFE0B2', '--collection-note-bg': 'rgba(255, 224, 178, 0.2)', '--fullscreen-editor-bg': 'var(--bg-color)', '--fullscreen-editor-text': 'var(--text-color)', '--fullscreen-editor-textarea-bg': 'var(--verse-card-bg)', '--brand-color-rgb': '255, 229, 148' /* MODIFIED */
    },
    minty_dew: {
        '--bg-color': '#E0F2F1', '--text-color': '#004D40', '--navbar-bg': '#26A69A', '--navbar-text': '#FFFFFF', '--brand-color': '#93D3CD', /* MODIFIED: Averaged with white */ '--verse-card-bg': '#FFFFFF', '--verse-text-color': '#004D40', '--reference-color': '#00796B', '--progress-bar-track': '#ffffff', '--progress-bar-fill': '#26A69A', '--progress-bar-fill-paused': '#00897B', '--button-bg': '#26A69A', '--button-text': '#FFFFFF', '--button-hover-bg': '#00897B', '--options-button-bg': '#FFFFFF', '--options-button-text': '#26A69A', '--options-button-hover-bg': '#E0F2F1', '--options-panel-bg': '#CCECE6', '--options-panel-border': '#A7DBD4', '--options-panel-text': 'var(--text-color)', '--options-panel-item-hover-bg': 'rgba(38, 166, 154, 0.1)', '--modal-bg': 'rgba(0, 77, 64, 0.5)', '--modal-content-bg': '#F5FAF9', '--modal-content-text': 'var(--text-color)', '--modal-highlight-bg': 'rgba(38, 166, 154, 0.15)', '--modal-highlight-border': '#26A69A', '--verse-change-flash-bg': 'rgba(38, 166, 154, 0.2)', '--verse-text-shadow': '1px 1px 1px rgba(0, 0, 0, 0.05)', '--timer-icon-button-bg': 'rgba(38, 166, 154, 0.08)', '--timer-icon-button-hover-bg': 'rgba(38, 166, 154, 0.15)', '--timer-icon-button-fill': '#00796B', '--timer-icon-button-border': '#A7DBD4', '--settings-modal-header-color': '#00796B', '--floating-button-bg': 'rgba(0, 137, 123, 0.8)', '--floating-button-hover-bg': 'rgba(0, 137, 123, 1)', '--floating-button-icon-fill': '#FFFFFF', '--collection-note-color': '#00695C', '--collection-note-border-color': '#B2DFDB', '--collection-note-bg': 'rgba(178, 223, 219, 0.2)', '--fullscreen-editor-bg': 'var(--bg-color)', '--fullscreen-editor-text': 'var(--text-color)', '--fullscreen-editor-textarea-bg': 'var(--verse-card-bg)', '--brand-color-rgb': '147, 211, 205' /* MODIFIED */
    }
};
 
function applyTheme(themeName) {
    const theme = themes[themeName];
    if (theme) {
        for (const key in theme) {
            document.documentElement.style.setProperty(key, theme[key]);
        }
        localStorage.setItem('selectedTheme', themeName);
    } else {
        console.warn("Theme not found:", themeName);
    }
}

const playIconSVG = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>';
const pauseIconSVG = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>';
const enterFullscreenIconSVG = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>';
const exitFullscreenIconSVG = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"></path></svg>';
const eyeOpenIconSVG = '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path></svg>';
const eyeClosedIconSVG = '<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.44-4.75C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l1.65 1.65C10.74 6.13 11.35 6 12 6c.35 0 .69.06 1 .17L11.17 8H12c1.66 0 3 1.34 3 3 0 .35-.07.69-.18 1L16.83 14c.52-.91.82-1.92.82-3 0-2.76-2.24-5-5-5zm-4.64 1.64L9.83 7.17C9.26 7.51 8.76 8 8.34 8.57L7.25 7.5C7.78 6.97 8.36 6.5 9 6.17V4.27c-1.79.52-3.35 1.55-4.59 2.91L3.36 6.17c1.24-1.37 2.8-2.39 4.59-2.91v1.89c-.64.33-1.22.76-1.75 1.29L4.36 5.64C3.11 7.11 2 8.99 1 11c1.73 4.39 6 7.5 11 7.5 1.28 0 2.52-.2 3.7-.57l-2.1-2.1c-.57.23-1.18.37-1.82.37-2.76 0-5-2.24-5-5 0-.65.13-1.26.36-1.83L7.05 8.05c-.59.99-.94 2.08-.94 3.2 0 2.76 2.24 5 5 5 .35 0 .69-.06 1-.17l2.1 2.1c-.57.23-1.18.37-1.82.37zm5.28-4.93L14 8.83C14 8.56 14 8.29 14 8c0-1.66-1.34-3-3-3-.29 0-.56.04-.83.12L8.05 7.05c.99-.59 2.08-.94 3.2-.94zm-1.08 4.28l2.92 2.92C16.39 13.26 17 12.65 17 12c0-2.76-2.24-5-5-5l-.12.01 2.2 2.2z"></path></svg>';
const editIconSVG = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>';
const trashIconSVG = '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>';

const LAST_ACTIVE_COLLECTION_LS_KEY = 'bibleAppLastActiveCollectionName';
const LAST_ACTIVE_TRANSLATION_LS_KEY = 'bibleAppLastActiveTranslation';
const SELECTED_THEME_LS_KEY = 'selectedTheme';
const VERSE_FONT_LS_KEY = 'bibleAppVerseFont';
const SHOW_PROGRESS_BAR_LS_KEY = 'bibleAppShowProgressBar';
const FULLSCREEN_LS_KEY = 'bibleAppFullscreen';
const SHOW_COLLECTION_NOTE_LS_KEY = 'bibleAppShowCollectionNote';
const VERSE_INTERVAL_MINUTES_LS_KEY = 'verseIntervalMinutes';
const FONT_SIZE_PERCENTAGE_LS_KEY = 'verseFontSizePercentage';

console.log("Shared script.js loaded (utilities, DB functions, themes corrected).");