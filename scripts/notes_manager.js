// scripts/notes_manager.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- Dependency Checks ---
    if (typeof initDB !== 'function' || typeof saveNoteToDB !== 'function' || typeof getAllNotesFromDB !== 'function' || typeof deleteNoteFromDB !== 'function') {
        console.error("Critical DB functions from script.js are missing for Notes Manager.");
        return;
    }
    // Check if the third-party Markdown library is loaded
    if (typeof marked !== 'function') {
        console.error("marked.js library not found. Note preview will not work.");
    }

    // --- DOM Elements ---
    const notesModal = document.getElementById('notesModal');
    const modalCloseBtnNotes = document.getElementById('modalCloseBtnNotes');
    
    // Accordion Elements
    const accordionHeaders = notesModal.querySelectorAll('.notes-accordion-header');

    // Note Manager Elements
    const noteSearchInput = document.getElementById('noteSearchInput');
    const addNewNoteBtn = document.getElementById('addNewNoteBtn');
    const noteList = document.getElementById('noteList');

    // Note Editor Elements
    const currentNoteNameDisplay = document.getElementById('currentNoteNameDisplay');
    const toggleNotePreviewBtn = document.getElementById('toggleNotePreviewBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const noteEditorTextarea = document.getElementById('noteEditorTextarea');
    const notePreviewArea = document.getElementById('notePreviewArea');
    const insertRefBtn = document.getElementById('insertRefBtn');
    const insertRefWithTextBtn = document.getElementById('insertRefWithTextBtn');

    // --- State Variables ---
    let currentNote = null; // Object { name, content, lastModified }
    let isPreviewing = false;
    let allNotes = []; // Cached list of all notes

    // --- Status Function ---
    function showNoteStatus(message, isError = false, duration = 3000) {
        // More robust status: show in a visible status area if available
        let statusBar = document.getElementById('notesStatusBar');
        if (!statusBar) {
            statusBar = document.createElement('div');
            statusBar.id = 'notesStatusBar';
            statusBar.style.position = 'fixed';
            statusBar.style.bottom = '10px';
            statusBar.style.left = '50%';
            statusBar.style.transform = 'translateX(-50%)';
            statusBar.style.zIndex = 9999;
            statusBar.style.padding = '10px 20px';
            statusBar.style.borderRadius = '6px';
            statusBar.style.background = isError ? '#ff333344' : '#1e88e544';
            statusBar.style.color = isError ? '#660000' : '#154360';
            statusBar.style.fontWeight = 'bold';
            document.body.appendChild(statusBar);
        }
        statusBar.textContent = message;
        statusBar.style.display = 'block';
        statusBar.style.opacity = 1;
        setTimeout(() => {
            statusBar.style.opacity = 0;
            setTimeout(() => { statusBar.style.display = 'none'; }, 600);
        }, duration);
        // Console fallback
        console.log(`Note Status (${isError ? 'Error' : 'Info'}): ${message}`);
        // Main app status function if available
        if (typeof appShowStatus === 'function') {
            appShowStatus(message, isError, duration);
        }
    }
    
    // Helper to insert text at cursor in a textarea
    function insertTextAtCursor(textarea, textToInsert) {
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        textarea.value = text.substring(0, start) + textToInsert + text.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
        textarea.focus();
    }

    // --- Core Logic ---
    async function loadAllNotes() {
        try {
            allNotes = await getAllNotesFromDB();
            renderNoteList();
        } catch (error) {
            showNoteStatus("Failed to load notes.", true);
        }
    }

    function renderNoteList() {
        noteList.innerHTML = '';
        const searchTerm = noteSearchInput.value.toLowerCase().trim();
        const filteredNotes = allNotes.filter(note => note.name.toLowerCase().includes(searchTerm));

        const folders = {};
        const rootNotes = [];

        // Group notes into folders
        filteredNotes.forEach(note => {
            if (note.name.includes('\\')) {
                const parts = note.name.split('\\');
                const folderName = parts[0];
                if (!folders[folderName]) {
                    folders[folderName] = [];
                }
                folders[folderName].push(note);
            } else {
                rootNotes.push(note);
            }
        });

        const createNoteItem = (note) => {
            const li = document.createElement('li');
            li.className = 'note-list-item';
            const displayName = note.name.includes('\\') ? note.name.split('\\').slice(1).join('\\') : note.name;
            li.innerHTML = `
                <span class="note-name">${displayName}</span>
                <div class="note-item-actions">
                    <button class="dm-button-small note-load-btn" title="Load Note">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.59 7.58L10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"></path></svg>
                    </button>
                    <button class="dm-button-small note-delete-btn" title="Delete Note">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
                    </button>
                </div>`;
            // Defensive: attach event listeners only if buttons exist
            const loadBtn = li.querySelector('.note-load-btn');
            if (loadBtn) {
                loadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    try {
                        loadNoteIntoEditor(note);
                    } catch (err) {
                        showNoteStatus('Error loading note: ' + err.message, true);
                        console.error(err);
                    }
                });
            }
            const deleteBtn = li.querySelector('.note-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleDeleteNote(note.name);
                });
            }
            return li;
        };
        
        // Render folders
        Object.keys(folders).sort().forEach(folderName => {
            const folderLi = document.createElement('li');
            folderLi.className = 'note-folder-item';
            folderLi.innerHTML = `
                <div class="folder-header">
                    <span class="folder-toggle">▶</span>
                    <span class="folder-name">${folderName}</span>
                </div>
                <ul class="note-folder-content"></ul>`;
            const contentUl = folderLi.querySelector('.note-folder-content');
            folders[folderName].sort((a,b) => a.name.localeCompare(b.name)).forEach(note => {
                contentUl.appendChild(createNoteItem(note));
            });
            folderLi.querySelector('.folder-header').addEventListener('click', () => {
                folderLi.classList.toggle('open');
            });
            noteList.appendChild(folderLi);
        });

        // Render root notes
        rootNotes.sort((a,b) => a.name.localeCompare(b.name)).forEach(note => {
            noteList.appendChild(createNoteItem(note));
        });
    }

    function loadNoteIntoEditor(note) {
    if (!note) {
        showNoteStatus('Invalid note object.', true);
        return;
    }
    if (!currentNoteNameDisplay || !noteEditorTextarea) {
        showNoteStatus('Note editor area not found in DOM.', true);
        return;
    }
    currentNote = note;
    currentNoteNameDisplay.textContent = note.name;
    noteEditorTextarea.value = note.content || '';
    noteEditorTextarea.style.display = 'block'; // Always show the textarea
    if (notePreviewArea) notePreviewArea.style.display = 'none'; // Hide preview
    if (isPreviewing && typeof renderPreview === 'function') renderPreview();

    // Show the editor section, hide the manager
    const editorSection = document.getElementById('noteEditorContent');
    const managerSection = document.getElementById('noteManagerContent');
    if (editorSection) {
        editorSection.style.display = 'block';
        // Optionally, scroll into view or focus
        if (noteEditorTextarea) noteEditorTextarea.focus();
    }
    if (managerSection) managerSection.style.display = 'none';

    // Accordion header handling (optional, just for UI highlight)
    let editorHeader = null;
    if (window.accordionHeaders && window.accordionHeaders.length > 0) {
        window.accordionHeaders.forEach(header => {
            if (header.dataset && header.dataset.target === "#noteEditorContent") editorHeader = header;
        });
        window.accordionHeaders.forEach(header => {
            header.classList.toggle('active', header === editorHeader);
        });
    }

    // Debug: Confirm content written
    console.log('[Note Debug] Editor content set:', noteEditorTextarea.value);

    showNoteStatus(`Loaded note: "${note.name}"`, false);
}


    async function handleSaveNote() {
        const content = noteEditorTextarea.value;
        if (!currentNote) {
            showNoteStatus("No note is loaded. Please create or load a note first.", true);
            return;
        }

        const noteToSave = {
            ...currentNote,
            content: content,
            lastModified: new Date()
        };

        try {
            await saveNoteToDB(noteToSave);
            currentNote = noteToSave; // Update the in-memory version
            // Update the main list as well
            const noteIndex = allNotes.findIndex(n => n.name === currentNote.name);
            if (noteIndex > -1) {
                allNotes[noteIndex] = currentNote;
            }
            showNoteStatus(`Note "${currentNote.name}" saved.`, false);
        } catch (error) {
            showNoteStatus(`Error saving note: ${error.message}`, true);
        }
    }

    async function handleAddNewNote() {
        const name = noteSearchInput.value.trim();
        if (!name) {
            showNoteStatus("Note name cannot be empty.", true);
            return;
        }
        if (allNotes.some(n => n.name.toLowerCase() === name.toLowerCase())) {
            showNoteStatus("A note with this name already exists.", true);
            return;
        }

        const newNote = {
            name: name,
            content: `# ${name}\n\n`,
            lastModified: new Date(),
            createdDate: new Date()
        };

        try {
            await saveNoteToDB(newNote);
            allNotes.push(newNote);
            renderNoteList();
            loadNoteIntoEditor(newNote);
            noteSearchInput.value = '';
            noteSearchInput.dispatchEvent(new Event('input')); // Trigger filter clear
        } catch (error) {
            showNoteStatus(`Failed to create note: ${error.message}`, true);
        }
    }

    async function handleDeleteNote(name) {
        if (confirm(`Are you sure you want to delete the note "${name}"? This cannot be undone.`)) {
            try {
                await deleteNoteFromDB(name);
                showNoteStatus(`Note "${name}" deleted.`, false);
                if (currentNote && currentNote.name === name) {
                    clearEditor();
                }
                await loadAllNotes(); // Reload and re-render
            } catch (error) {
                showNoteStatus(`Error deleting note: ${error.message}`, true);
            }
        }
    }

    function clearEditor() {
        currentNote = null;
        currentNoteNameDisplay.textContent = 'No note loaded';
        noteEditorTextarea.value = '';
        renderPreview();
    }

    function renderPreview() {
        if (typeof marked === 'function') {
            notePreviewArea.innerHTML = marked(noteEditorTextarea.value);
        } else {
            notePreviewArea.innerText = "Preview unavailable: Markdown library not loaded.";
        }
    }

    function togglePreview(forceState) {
        const shouldPreview = forceState !== undefined ? forceState : !isPreviewing;
        if (shouldPreview) {
            renderPreview();
            noteEditorTextarea.style.display = 'none';
            notePreviewArea.style.display = 'block';
            toggleNotePreviewBtn.textContent = 'Edit';
            isPreviewing = true;
        } else {
            noteEditorTextarea.style.display = 'block';
            notePreviewArea.style.display = 'none';
            toggleNotePreviewBtn.textContent = 'Preview';
            isPreviewing = false;
        }
    }

    function openAccordionSection(headerToOpen) {
        accordionHeaders.forEach(header => {
            const content = document.querySelector(header.dataset.target);
            if (header === headerToOpen) {
                header.classList.add('active');
                if (content) content.style.display = 'block';
            } else {
                header.classList.remove('active');
                if (content) content.style.display = 'none';
            }
        });
    }

    // --- Event Listeners ---
    if (insertRefBtn) {
        insertRefBtn.addEventListener('click', async () => {
            if (typeof window.getCurrentVerseInfo !== 'function') {
                showNoteStatus("Main app connection error.", true);
                return;
            }
            const verseInfo = await window.getCurrentVerseInfo();
            if (verseInfo && verseInfo.reference) {
                insertTextAtCursor(noteEditorTextarea, `[${verseInfo.reference}]`);
            } else {
                showNoteStatus("No active verse to insert.", true);
            }
        });
    }
    if (insertRefWithTextBtn) {
        insertRefWithTextBtn.addEventListener('click', async () => {
            if (typeof window.getCurrentVerseInfo !== 'function') {
                showNoteStatus("Main app connection error.", true);
                return;
            }
            const verseInfo = await window.getCurrentVerseInfo();
            if (verseInfo && verseInfo.reference && verseInfo.text) {
                const textToInsert = `> **${verseInfo.reference}**\n> ${verseInfo.text}\n\n`;
                insertTextAtCursor(noteEditorTextarea, textToInsert);
            } else if (verseInfo && verseInfo.reference) {
                insertTextAtCursor(noteEditorTextarea, `[${verseInfo.reference}]`);
                showNoteStatus("Reference inserted (full text not available in this view).", false);
            } else {
                showNoteStatus("No active verse to insert.", true);
            }
        });
    }

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => openAccordionSection(header));
    });

    if (modalCloseBtnNotes) {
        modalCloseBtnNotes.addEventListener('click', () => {
            if(typeof window.closeModal === 'function') {
                window.closeModal(notesModal);
            } else {
                notesModal.style.display = 'none'; // Fallback
            }
        });
    }

    if (noteSearchInput) {
        noteSearchInput.addEventListener('input', () => {
            renderNoteList();
            const nameExists = allNotes.some(n => n.name.toLowerCase() === noteSearchInput.value.trim().toLowerCase());
            addNewNoteBtn.style.display = noteSearchInput.value.trim() && !nameExists ? 'inline-block' : 'none';
        });
    }
    
    if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', handleAddNewNote);
    if (saveNoteBtn) saveNoteBtn.addEventListener('click', handleSaveNote);
    if (toggleNotePreviewBtn) toggleNotePreviewBtn.addEventListener('click', () => togglePreview());

    // --- Global Function for Main App ---
    window.openNotesModal = async () => {
        await loadAllNotes();
        // Default to showing the manager, unless a note is already loaded
        if (currentNote) {
            let editorHeader = null;
            if (accordionHeaders && accordionHeaders.length > 0) {
                accordionHeaders.forEach(header => {
                    if (header.dataset && header.dataset.target === "#noteEditorContent") editorHeader = header;
                });
            }
            if (editorHeader) {
                openAccordionSection(editorHeader);
            }
        } else {
            let managerHeader = null;
            if (accordionHeaders && accordionHeaders.length > 0) {
                accordionHeaders.forEach(header => {
                    if (header.dataset && header.dataset.target === "#noteManagerContent") managerHeader = header;
                });
            }
            if (managerHeader) {
                openAccordionSection(managerHeader);
            }
        }
    };
});                const folderName = parts[0];
                if (!folders[folderName]) {
                    folders[folderName] = [];
                }
                folders[folderName].push(note);
            } else {
                rootNotes.push(note);
            }
        });

        const createNoteItem = (note) => {
            const li = document.createElement('li');
            li.className = 'note-list-item';
            const displayName = note.name.includes('\\') ? note.name.split('\\').slice(1).join('\\') : note.name;
            li.innerHTML = `
                <span class="note-name">${displayName}</span>
                <div class="note-item-actions">
                    <button class="dm-button-small note-load-btn" title="Load Note">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.59 7.58L10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"></path></svg>
                    </button>
                    <button class="dm-button-small note-delete-btn" title="Delete Note">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>
                    </button>
                </div>`;
            li.querySelector('.note-load-btn').addEventListener('click', () => loadNoteIntoEditor(note));
            li.querySelector('.note-delete-btn').addEventListener('click', (e) => { e.stopPropagation(); handleDeleteNote(note.name); });
            return li;
        };
        
        // Render folders
        Object.keys(folders).sort().forEach(folderName => {
            const folderLi = document.createElement('li');
            folderLi.className = 'note-folder-item';
            folderLi.innerHTML = `
                <div class="folder-header">
                    <span class="folder-toggle">▶</span>
                    <span class="folder-name">${folderName}</span>
                </div>
                <ul class="note-folder-content"></ul>`;
            const contentUl = folderLi.querySelector('.note-folder-content');
            folders[folderName].sort((a,b) => a.name.localeCompare(b.name)).forEach(note => {
                contentUl.appendChild(createNoteItem(note));
            });
            folderLi.querySelector('.folder-header').addEventListener('click', () => {
                folderLi.classList.toggle('open');
            });
            noteList.appendChild(folderLi);
        });

        // Render root notes
        rootNotes.sort((a,b) => a.name.localeCompare(b.name)).forEach(note => {
            noteList.appendChild(createNoteItem(note));
        });
    }

    function loadNoteIntoEditor(note) {
        currentNote = note;
        currentNoteNameDisplay.textContent = note.name;
        noteEditorTextarea.value = note.content || '';
        if (isPreviewing) {
            renderPreview();
        }
        showNoteStatus(`Loaded note: "${note.name}"`, false);
        // Switch to editor tab
        openAccordionSection(document.querySelector('.notes-accordion-header[data-target="#noteEditorContent"]'));
    }

    async function handleSaveNote() {
        const content = noteEditorTextarea.value;
        if (!currentNote) {
            showNoteStatus("No note is loaded. Please create or load a note first.", true);
            return;
        }

        const noteToSave = {
            ...currentNote,
            content: content,
            lastModified: new Date()
        };

        try {
            await saveNoteToDB(noteToSave);
            currentNote = noteToSave; // Update the in-memory version
            // Update the main list as well
            const noteIndex = allNotes.findIndex(n => n.name === currentNote.name);
            if (noteIndex > -1) {
                allNotes[noteIndex] = currentNote;
            }
            showNoteStatus(`Note "${currentNote.name}" saved.`, false);
        } catch (error) {
            showNoteStatus(`Error saving note: ${error.message}`, true);
        }
    }

    async function handleAddNewNote() {
        const name = noteSearchInput.value.trim();
        if (!name) {
            showNoteStatus("Note name cannot be empty.", true);
            return;
        }
        if (allNotes.some(n => n.name.toLowerCase() === name.toLowerCase())) {
            showNoteStatus("A note with this name already exists.", true);
            return;
        }

        const newNote = {
            name: name,
            content: `# ${name}\n\n`,
            lastModified: new Date(),
            createdDate: new Date()
        };

        try {
            await saveNoteToDB(newNote);
            allNotes.push(newNote);
            renderNoteList();
            loadNoteIntoEditor(newNote);
            noteSearchInput.value = '';
            noteSearchInput.dispatchEvent(new Event('input')); // Trigger filter clear
        } catch (error) {
            showNoteStatus(`Failed to create note: ${error.message}`, true);
        }
    }

    async function handleDeleteNote(name) {
        if (confirm(`Are you sure you want to delete the note "${name}"? This cannot be undone.`)) {
            try {
                await deleteNoteFromDB(name);
                showNoteStatus(`Note "${name}" deleted.`, false);
                if (currentNote && currentNote.name === name) {
                    clearEditor();
                }
                await loadAllNotes(); // Reload and re-render
            } catch (error) {
                showNoteStatus(`Error deleting note: ${error.message}`, true);
            }
        }
    }

    function clearEditor() {
        currentNote = null;
        currentNoteNameDisplay.textContent = 'No note loaded';
        noteEditorTextarea.value = '';
        renderPreview();
    }

    function renderPreview() {
        if (typeof marked === 'function') {
            notePreviewArea.innerHTML = marked(noteEditorTextarea.value);
        } else {
            notePreviewArea.innerText = "Preview unavailable: Markdown library not loaded.";
        }
    }

    function togglePreview(forceState) {
        const shouldPreview = forceState !== undefined ? forceState : !isPreviewing;
        if (shouldPreview) {
            renderPreview();
            noteEditorTextarea.style.display = 'none';
            notePreviewArea.style.display = 'block';
            toggleNotePreviewBtn.textContent = 'Edit';
            isPreviewing = true;
        } else {
            noteEditorTextarea.style.display = 'block';
            notePreviewArea.style.display = 'none';
            toggleNotePreviewBtn.textContent = 'Preview';
            isPreviewing = false;
        }
    }

    function openAccordionSection(headerToOpen) {
        accordionHeaders.forEach(header => {
            const content = document.querySelector(header.dataset.target);
            if (header === headerToOpen) {
                header.classList.add('active');
                content.style.display = 'block';
            } else {
                header.classList.remove('active');
                content.style.display = 'none';
            }
        });
    }

    // --- Event Listeners ---
    if (insertRefBtn) {
        insertRefBtn.addEventListener('click', async () => {
            if (typeof window.getCurrentVerseInfo !== 'function') {
                showNoteStatus("Main app connection error.", true);
                return;
            }
            const verseInfo = await window.getCurrentVerseInfo();
            if (verseInfo && verseInfo.reference) {
                insertTextAtCursor(noteEditorTextarea, `[${verseInfo.reference}]`);
            } else {
                showNoteStatus("No active verse to insert.", true);
            }
        });
    }

    if (insertRefWithTextBtn) {
        insertRefWithTextBtn.addEventListener('click', async () => {
            if (typeof window.getCurrentVerseInfo !== 'function') {
                showNoteStatus("Main app connection error.", true);
                return;
            }
            const verseInfo = await window.getCurrentVerseInfo();
            if (verseInfo && verseInfo.reference && verseInfo.text) {
                const textToInsert = `> **${verseInfo.reference}**\n> ${verseInfo.text}\n\n`;
                insertTextAtCursor(noteEditorTextarea, textToInsert);
            } else if (verseInfo && verseInfo.reference) {
                insertTextAtCursor(noteEditorTextarea, `[${verseInfo.reference}]`);
                showNoteStatus("Reference inserted (full text not available in this view).", false);
            } else {
                showNoteStatus("No active verse to insert.", true);
            }
        });
    }

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => openAccordionSection(header));
    });

    if (modalCloseBtnNotes) {
        modalCloseBtnNotes.addEventListener('click', () => {
            if(typeof window.closeModal === 'function') {
                window.closeModal(notesModal);
            } else {
                notesModal.style.display = 'none'; // Fallback
            }
        });
    }

    if (noteSearchInput) {
        noteSearchInput.addEventListener('input', () => {
            renderNoteList();
            const nameExists = allNotes.some(n => n.name.toLowerCase() === noteSearchInput.value.trim().toLowerCase());
            addNewNoteBtn.style.display = noteSearchInput.value.trim() && !nameExists ? 'inline-block' : 'none';
        });
    }
    
    if (addNewNoteBtn) addNewNoteBtn.addEventListener('click', handleAddNewNote);
    if (saveNoteBtn) saveNoteBtn.addEventListener('click', handleSaveNote);
    if (toggleNotePreviewBtn) toggleNotePreviewBtn.addEventListener('click', () => togglePreview());

    // --- Global Function for Main App ---
    window.openNotesModal = async () => {
        await loadAllNotes();
        // Default to showing the manager, unless a note is already loaded
        if (currentNote) {
            openAccordionSection(document.querySelector('.notes-accordion-header[data-target="#noteEditorContent"]'));
        } else {
            openAccordionSection(document.querySelector('.notes-accordion-header[data-target="#noteManagerContent"]'));
        }
    };
});
