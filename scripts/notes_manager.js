// scripts/notes_manager.js

document.addEventListener('DOMContentLoaded', async () => {
    // --- Dependency Checks ---
    if (typeof initDB !== 'function' || typeof saveNoteToDB !== 'function' || typeof getAllNotesFromDB !== 'function' || typeof deleteNoteFromDB !== 'function') {
        console.error("Critical DB functions from script.js are missing for Notes Manager.");
        return;
    }
    if (typeof marked !== 'function') {
        console.error("marked.js library not found. Note preview will not work.");
    }

    // --- DOM Elements ---
    const notesModal = document.getElementById('notesModal');
    const modalCloseBtnNotes = document.getElementById('modalCloseBtnNotes');
    const accordionHeaders = notesModal.querySelectorAll('.notes-accordion-header');
    const noteSearchInput = document.getElementById('noteSearchInput');
    const addNewNoteBtn = document.getElementById('addNewNoteBtn');
    const noteList = document.getElementById('noteList');
    const currentNoteNameDisplay = document.getElementById('currentNoteNameDisplay');
    const toggleNotePreviewBtn = document.getElementById('toggleNotePreviewBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const noteEditorTextarea = document.getElementById('noteEditorTextarea');
    const notePreviewArea = document.getElementById('notePreviewArea');
    const insertRefBtn = document.getElementById('insertRefBtn');
    const insertRefWithTextBtn = document.getElementById('insertRefWithTextBtn');
    const insertVerseContainer = document.getElementById('insertVerseContainer');

    // --- State Variables ---
    let currentNote = null;
    let isPreviewing = false;
    let allNotes = [];

    // --- Status Function ---
    function showNoteStatus(message, isError = false, duration = 3000) {
        if (typeof appShowStatus === 'function') {
            appShowStatus(message, isError, duration);
        } else {
            console.log(`Note Status (${isError ? 'Error' : 'Info'}): ${message}`);
        }
    }

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

        filteredNotes.forEach(note => {
            if (note.name.includes('\\')) {
                const parts = note.name.split('\\');
                const folderName = parts[0];
                if (!folders[folderName]) folders[folderName] = [];
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
                    <button class="dm-button-small note-load-btn" title="Load Note"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16.59 7.58L10 14.17l-3.59-3.58L5 12l5 5 8-8zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"></path></svg></button>
                    <button class="dm-button-small note-delete-btn" title="Delete Note"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg></button>
                </div>`;
            li.querySelector('.note-load-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                loadNoteIntoEditor(note);
            });
            li.querySelector('.note-delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                handleDeleteNote(note.name);
            });
            return li;
        };

        Object.keys(folders).sort().forEach(folderName => {
            const folderLi = document.createElement('li');
            folderLi.className = 'note-folder-item';
            folderLi.innerHTML = `<div class="folder-header"><span class="folder-name">${folderName}</span></div><ul class="note-folder-content"></ul>`;
            const contentUl = folderLi.querySelector('.note-folder-content');
            folders[folderName].sort((a, b) => a.name.localeCompare(b.name)).forEach(note => contentUl.appendChild(createNoteItem(note)));
            folderLi.querySelector('.folder-header').addEventListener('click', () => folderLi.classList.toggle('open'));
            noteList.appendChild(folderLi);
        });

        rootNotes.sort((a, b) => a.name.localeCompare(b.name)).forEach(note => noteList.appendChild(createNoteItem(note)));
    }

    function loadNoteIntoEditor(note) {
        currentNote = note;
        currentNoteNameDisplay.textContent = note.name;
        noteEditorTextarea.value = note.content || '';
        togglePreview(false);

        const editorHeader = document.querySelector('.notes-accordion-header[data-target="#noteEditorContent"]');
        if (editorHeader) {
            openAccordionSection(editorHeader);
            noteEditorTextarea.focus();
        }
        showNoteStatus(`Loaded note: "${note.name}"`, false);
    }

    async function handleSaveNote() {
        if (!currentNote) {
            showNoteStatus("No note is loaded to save.", true);
            return;
        }
        const noteToSave = { ...currentNote, content: noteEditorTextarea.value, lastModified: new Date() };
        try {
            await saveNoteToDB(noteToSave);
            currentNote = noteToSave;
            const noteIndex = allNotes.findIndex(n => n.name === currentNote.name);
            if (noteIndex > -1) allNotes[noteIndex] = currentNote;
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
        const newNote = { name, content: `# ${name}\n\n`, lastModified: new Date(), createdDate: new Date() };
        try {
            await saveNoteToDB(newNote);
            allNotes.push(newNote);
            renderNoteList();
            loadNoteIntoEditor(newNote);
            noteSearchInput.value = '';
            noteSearchInput.dispatchEvent(new Event('input'));
        } catch (error) {
            showNoteStatus(`Failed to create note: ${error.message}`, true);
        }
    }

    async function handleDeleteNote(name) {
        if (confirm(`Are you sure you want to delete the note "${name}"? This cannot be undone.`)) {
            try {
                await deleteNoteFromDB(name);
                showNoteStatus(`Note "${name}" deleted.`, false);
                if (currentNote && currentNote.name === name) clearEditor();
                await loadAllNotes();
            } catch (error) {
                showNoteStatus(`Error deleting note: ${error.message}`, true);
            }
        }
    }

    function clearEditor() {
        currentNote = null;
        currentNoteNameDisplay.textContent = 'No note loaded';
        noteEditorTextarea.value = '';
        togglePreview(false);
    }

    function renderPreview() {
        if (typeof marked === 'function') {
            notePreviewArea.innerHTML = marked(noteEditorTextarea.value, { sanitize: true });
        } else {
            notePreviewArea.innerText = "Preview unavailable: Markdown library not loaded.";
        }
    }

    function togglePreview(forceState) {
        const shouldPreview = forceState !== undefined ? forceState : !isPreviewing;
        if (shouldPreview) {
            renderPreview();
            noteEditorTextarea.classList.add('hidden');
            notePreviewArea.classList.remove('hidden');
            toggleNotePreviewBtn.textContent = 'Edit';
            isPreviewing = true;
        } else {
            noteEditorTextarea.classList.remove('hidden');
            notePreviewArea.classList.add('hidden');
            toggleNotePreviewBtn.textContent = 'Preview';
            isPreviewing = false;
        }
    }

    function openAccordionSection(headerToOpen) {
        accordionHeaders.forEach(header => {
            const content = document.querySelector(header.dataset.target);
            const isActive = header === headerToOpen;
            header.classList.toggle('active', isActive);
            if (content) content.classList.toggle('active', isActive);
        });
    }

    // --- Event Listeners ---
    insertRefBtn.addEventListener('click', async () => {
        if (typeof window.getCurrentVerseData !== 'function') return;
        const verseInfo = await window.getCurrentVerseData();
        if (verseInfo && verseInfo.reference) {
            insertTextAtCursor(noteEditorTextarea, `[${verseInfo.reference}]`);
        } else {
            showNoteStatus("No active verse to insert.", true);
        }
    });

    insertRefWithTextBtn.addEventListener('click', async () => {
        if (typeof window.getCurrentVerseData !== 'function') return;
        const verseInfo = await window.getCurrentVerseData();
        if (verseInfo && verseInfo.reference && verseInfo.text) {
            const textToInsert = `> **${verseInfo.reference}**\n> ${verseInfo.text}\n\n`;
            insertTextAtCursor(noteEditorTextarea, textToInsert);
        } else {
            showNoteStatus("No active verse to insert.", true);
        }
    });

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => openAccordionSection(header));
    });

    modalCloseBtnNotes.addEventListener('click', () => closeModal(notesModal));
    noteSearchInput.addEventListener('input', () => {
        renderNoteList();
        const nameExists = allNotes.some(n => n.name.toLowerCase() === noteSearchInput.value.trim().toLowerCase());
        addNewNoteBtn.style.display = noteSearchInput.value.trim() && !nameExists ? 'inline-block' : 'none';
    });

    addNewNoteBtn.addEventListener('click', handleAddNewNote);
    saveNoteBtn.addEventListener('click', handleSaveNote);
    toggleNotePreviewBtn.addEventListener('click', () => togglePreview());

    // --- Global Function for Main App ---
    window.openNotesModal = async () => {
        await loadAllNotes();
        const managerHeader = document.querySelector('.notes-accordion-header[data-target="#noteManagerContent"]');
        if (managerHeader) openAccordionSection(managerHeader);
        
        // Hide editor and clear state when opening modal
        const editorHeader = document.querySelector('.notes-accordion-header[data-target="#noteEditorContent"]');
        editorHeader.classList.remove('active');
        document.querySelector(editorHeader.dataset.target).classList.remove('active');
        clearEditor();

        // Control visibility of verse insertion buttons
        const verseInfo = (typeof window.getCurrentVerseData === 'function') ? await window.getCurrentVerseData() : null;
        insertVerseContainer.style.display = (verseInfo && verseInfo.reference) ? 'flex' : 'none';
    };
});