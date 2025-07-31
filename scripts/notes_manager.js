// scripts/notes_manager.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Dependency Checks ---
    if (typeof initDB !== 'function' || typeof saveNoteToDB !== 'function' || typeof getNoteFromDB !== 'function' || typeof getAllNotesFromDB !== 'function' || typeof deleteNoteFromDB !== 'function') {
        console.error("Critical Note DB functions from script.js are missing.");
        return;
    }

    // --- DOM Elements ---
    const notesModal = document.getElementById('notesModal');
    const closeModalBtn = document.getElementById('modalCloseBtnNotes');
    const accordionHeaders = document.querySelectorAll('.notes-accordion-header');
    
    // Manager Elements
    const noteManagerContent = document.getElementById('noteManagerContent');
    const noteSearchInput = document.getElementById('noteSearchInput');
    const addNewNoteBtn = document.getElementById('addNewNoteBtn');
    const noteList = document.getElementById('noteList');
    
    // Editor Elements
    const noteEditorContent = document.getElementById('noteEditorContent');
    const currentNoteNameDisplay = document.getElementById('currentNoteNameDisplay');
    const toggleNotePreviewBtn = document.getElementById('toggleNotePreviewBtn');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const noteEditorTextarea = document.getElementById('noteEditorTextarea');
    const notePreviewArea = document.getElementById('notePreviewArea');

    // --- State ---
    let allNotesCache = [];
    let currentLoadedNoteName = null;
    let isPreviewMode = false;
    const LS_LAST_OPENED_NOTE = 'notes_lastOpenedNote';
    
    const addIconSVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"></path></svg>`;
    const loadIconSVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"></path></svg>`;
    const deleteIconSVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path></svg>`;


    // --- Accordion Logic ---
    function switchAccordion(targetContentElement) {
        document.querySelectorAll('.notes-accordion-content').forEach(el => el.style.display = 'none');
        accordionHeaders.forEach(el => el.classList.remove('active'));
        
        if (targetContentElement) {
            targetContentElement.style.display = 'block';
            const correspondingHeader = document.querySelector(`.notes-accordion-header[data-target="#${targetContentElement.id}"]`);
            if(correspondingHeader) correspondingHeader.classList.add('active');
        }
    }

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const target = document.querySelector(header.dataset.target);
            switchAccordion(target);
        });
    });

    // --- Note Manager Logic ---
    async function refreshNoteCacheAndRender() {
        allNotesCache = await getAllNotesFromDB();
        renderNoteList();
    }

    function renderNoteList() {
        const searchTerm = noteSearchInput.value.trim().toLowerCase();
        let filteredNotes = allNotesCache;
        if (searchTerm) {
            filteredNotes = allNotesCache.filter(note => note.name.toLowerCase().includes(searchTerm));
        }

        noteList.innerHTML = '';

        // --- NEW FOLDER LOGIC ---
        const organized = {
            folders: {},
            standalone: []
        };

        filteredNotes.forEach(note => {
            // Note: The key in IndexedDB might be 'folder\\note', but JS reads it as 'folder\note'
            const parts = note.name.split('\\');
            if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
                const folderName = parts[0];
                if (!organized.folders[folderName]) {
                    organized.folders[folderName] = [];
                }
                organized.folders[folderName].push(note);
            } else {
                organized.standalone.push(note);
            }
        });

        // Render folders first, sorted
        Object.keys(organized.folders).sort().forEach(folderName => {
            const notesInFolder = organized.folders[folderName];
            
            const folderLi = document.createElement('li');
            folderLi.className = 'note-folder-item';
            folderLi.innerHTML = `
                <div class="folder-header">
                    <span class="folder-toggle">▶</span>
                    <span class="folder-name">${folderName}</span>
                </div>
            `;
            
            const nestedUl = document.createElement('ul');
            nestedUl.className = 'note-folder-content';

            notesInFolder.sort((a,b) => a.name.localeCompare(b.name)).forEach(note => {
                const noteLi = document.createElement('li');
                noteLi.className = 'note-list-item';
                const noteNameInFolder = note.name.split('\\')[1];
                noteLi.innerHTML = `
                    <span class="note-name" title="${note.name}">${noteNameInFolder}</span>
                    <div class="note-item-actions">
                        <button class="dm-button-small note-load-btn" data-name="${note.name}" title="Load this note">${loadIconSVG}</button>
                        <button class="dm-button-small note-delete-btn" data-name="${note.name}" title="Delete this note">${deleteIconSVG}</button>
                    </div>
                `;
                nestedUl.appendChild(noteLi);
            });

            folderLi.appendChild(nestedUl);
            noteList.appendChild(folderLi);

            folderLi.querySelector('.folder-header').addEventListener('click', () => {
                folderLi.classList.toggle('open');
            });
        });

        // Render standalone notes next, sorted
        organized.standalone.sort((a,b) => a.name.localeCompare(b.name)).forEach(note => {
            const li = document.createElement('li');
            li.className = 'note-list-item';
            li.innerHTML = `
                <span class="note-name" title="${note.name}">${note.name}</span>
                <div class="note-item-actions">
                    <button class="dm-button-small note-load-btn" data-name="${note.name}" title="Load this note">${loadIconSVG}</button>
                    <button class="dm-button-small note-delete-btn" data-name="${note.name}" title="Delete this note">${deleteIconSVG}</button>
                </div>
            `;
            noteList.appendChild(li);
        });
        
        if (noteList.children.length === 0 && !searchTerm) {
            noteList.innerHTML = '<li class="note-list-empty">No notes found. Create one above!</li>';
        }

        // Manage "Add" button visibility
        const exactMatch = allNotesCache.some(note => note.name.toLowerCase() === searchTerm);
        if (searchTerm && !exactMatch) {
            addNewNoteBtn.style.display = 'inline-block';
        } else {
            addNewNoteBtn.style.display = 'none';
        }
    }

    noteSearchInput.addEventListener('input', renderNoteList);

    addNewNoteBtn.addEventListener('click', async () => {
        const newNoteName = noteSearchInput.value.trim();
        if (!newNoteName) return;

        try {
            const newNote = {
                name: newNoteName,
                content: `# ${newNoteName}\n\n`,
                lastModified: new Date()
            };
            await saveNoteToDB(newNote);
            await loadNoteIntoEditor(newNoteName);
            await refreshNoteCacheAndRender();
            noteSearchInput.value = '';
            addNewNoteBtn.style.display = 'none';
        } catch (error) {
            console.error("Error creating new note:", error);
            alert(`Could not create note: ${error.message}`);
        }
    });

    noteList.addEventListener('click', async (e) => {
        const button = e.target.closest('button.dm-button-small');
        if (!button) return;

        const noteName = button.dataset.name;
        if (!noteName) return;

        if (button.classList.contains('note-load-btn')) {
            await loadNoteIntoEditor(noteName);
        } else if (button.classList.contains('note-delete-btn')) {
            if (confirm(`Are you sure you want to delete the note "${noteName}"? This cannot be undone.`)) {
                try {
                    await deleteNoteFromDB(noteName);
                    if (currentLoadedNoteName === noteName) {
                        clearEditor();
                    }
                    await refreshNoteCacheAndRender();
                } catch (error) {
                    console.error("Error deleting note:", error);
                }
            }
        }
    });


    // --- Note Editor Logic ---
    function clearEditor() {
        currentLoadedNoteName = null;
        currentNoteNameDisplay.textContent = 'No note loaded';
        noteEditorTextarea.value = '';
        localStorage.removeItem(LS_LAST_OPENED_NOTE);
    }
    
    async function loadNoteIntoEditor(noteName) {
        try {
            const note = await getNoteFromDB(noteName);
            if (note) {
                currentLoadedNoteName = note.name;
                currentNoteNameDisplay.textContent = note.name;
                noteEditorTextarea.value = note.content || '';
                localStorage.setItem(LS_LAST_OPENED_NOTE, note.name);
                
                // Ensure preview is off and editor is visible
                isPreviewMode = true; // Set to true so toggle logic will switch it to false
                togglePreview(); 
                
                switchAccordion(noteEditorContent);
            } else {
                alert(`Note "${noteName}" not found.`);
                clearEditor();
                localStorage.removeItem(LS_LAST_OPENED_NOTE);
            }
        } catch (error) {
            console.error(`Error loading note "${noteName}":`, error);
        }
    }

    function parseMarkdown(text) {
        let html = text
            .replace(/</g, '<').replace(/>/g, '>') // Basic XSS prevention
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/_(.*?)_/g, '<i>$1</i>')
            .replace(/\n/g, '<br>'); // Convert newlines to <br> for preview
        return html;
    }

    function togglePreview() {
        isPreviewMode = !isPreviewMode;
        if(isPreviewMode) {
            const markdownText = noteEditorTextarea.value;
            notePreviewArea.innerHTML = parseMarkdown(markdownText);
            noteEditorTextarea.style.display = 'none';
            notePreviewArea.style.display = 'block';
            toggleNotePreviewBtn.textContent = 'Edit';
        } else {
            noteEditorTextarea.style.display = 'block';
            notePreviewArea.style.display = 'none';
            toggleNotePreviewBtn.textContent = 'Preview';
        }
    }
    toggleNotePreviewBtn.addEventListener('click', togglePreview);
    
    saveNoteBtn.addEventListener('click', async () => {
        if (!currentLoadedNoteName) {
            alert("No note is currently loaded to save.");
            return;
        }
        try {
            const noteToSave = {
                name: currentLoadedNoteName,
                content: noteEditorTextarea.value,
                lastModified: new Date()
            };
            await saveNoteToDB(noteToSave);
            alert(`Note "${currentLoadedNoteName}" saved.`);
        } catch (error) {
            console.error("Error saving note:", error);
            alert("Failed to save note. See console for details.");
        }
    });

    // --- Modal Initialization & Control ---
    window.openNotesModal = async () => {
        if (!notesModal) return;
        await refreshNoteCacheAndRender();

        const lastNote = localStorage.getItem(LS_LAST_OPENED_NOTE);
        if (lastNote) {
            const noteExists = allNotesCache.some(n => n.name === lastNote);
            if (noteExists) {
                await loadNoteIntoEditor(lastNote);
            } else {
                localStorage.removeItem(LS_LAST_OPENED_NOTE);
                switchAccordion(noteManagerContent);
            }
        } else {
            switchAccordion(noteManagerContent);
        }
        notesModal.style.display = 'block';
        noteSearchInput.focus();
    };

    closeModalBtn.addEventListener('click', () => {
        notesModal.style.display = 'none';
    });

    // Close with Escape key (handled by main_app_script.js's global listener)
    // Close on outside click
     notesModal.addEventListener('click', (e) => {
        if (e.target === notesModal) {
            notesModal.style.display = 'none';
        }
    });
});