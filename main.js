document.addEventListener('DOMContentLoaded', () => {
    const noteInput = document.getElementById('noteInput');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const notesDisplay = document.getElementById('notesDisplay');

    // Load existing notes
    displayNotes();

    saveNoteBtn.addEventListener('click', () => {
        const noteText = noteInput.value.trim();
        if (noteText) {
            const notes = getNotes();
            notes.push(noteText);
            saveNotes(notes);
            noteInput.value = '';
            displayNotes();
        }
    });

    function getNotes() {
        return JSON.parse(localStorage.getItem('notes')) || [];
    }

    function saveNotes(notes) {
        localStorage.setItem('notes', JSON.stringify(notes));
    }

    function displayNotes() {
        const notes = getNotes();
        notesDisplay.innerHTML = '';
        notes.forEach((note, index) => {
            const noteElement = document.createElement('div');
            noteElement.classList.add('note');
            noteElement.textContent = note;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.addEventListener('click', () => {
                deleteNote(index);
            });

            noteElement.appendChild(deleteBtn);
            notesDisplay.appendChild(noteElement);
        });
    }

    function deleteNote(index) {
        const notes = getNotes();
        notes.splice(index, 1);
        saveNotes(notes);
        displayNotes();
    }
});
