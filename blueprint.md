<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notes App</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1>Simple Notes</h1>

        <div class="note-form">
            <textarea id="note-content" placeholder="Enter your note here..."></textarea>
            <button id="save-note">Save Note</button>
        </div>

        <div class="note-list" id="note-list">
            <!-- Notes will be loaded here -->
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
```

```css
body {
    font-family: sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f4f4f4;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    background-color: #fff;
    padding: 20px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.note-form {
    margin-bottom: 20px;
}

.note-form textarea {
    width: 100%;
    padding: 10px;
    margin-bottom: 10px;
    border: 1px solid #ddd;
    resize: vertical;
}

.note-form button {
    padding: 10px 15px;
    background-color: #5cb85c;
    color: white;
    border: none;
    cursor: pointer;
}

.note-list {
    border-top: 1px solid #ddd;
    padding-top: 20px;
}

.note-item {
    background-color: #e9e9e9;
    padding: 15px;
    margin-bottom: 10px;
    border-radius: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.note-content {
    flex-grow: 1;
    margin-right: 10px;
}

.note-actions button {
    padding: 5px 10px;
    margin-left: 5px;
    cursor: pointer;
    border: none;
}

.edit-button {
    background-color: #f0ad4e;
    color: white;
}

.delete-button {
    background-color: #d9534f;
    color: white;
}
```

```javascript
document.addEventListener('DOMContentLoaded', () => {
    const noteContentInput = document.getElementById('note-content');
    const saveNoteButton = document.getElementById('save-note');
    const noteListContainer = document.getElementById('note-list');

    // Load notes from localStorage on page load
    loadNotes();

    saveNoteButton.addEventListener('click', saveNote);
    noteListContainer.addEventListener('click', handleNoteActions);

    function saveNote() {
        const content = noteContentInput.value.trim();
        if (content) {
            const notes = getNotes();
            const newNote = {
                id: Date.now(), // Simple timestamp as ID
                content: content,
                timestamp: new Date().toLocaleString()
            };
            notes.push(newNote);
            saveNotes(notes);
            displayNotes();
            noteContentInput.value = '';
        }
    }

    function loadNotes() {
        displayNotes();
    }

    function getNotes() {
        const notesString = localStorage.getItem('notes');
        return notesString ? JSON.parse(notesString) : [];
    }

    function saveNotes(notes) {
        localStorage.setItem('notes', JSON.stringify(notes));
    }

    function displayNotes() {
        const notes = getNotes();
        noteListContainer.innerHTML = ''; // Clear existing notes

        if (notes.length === 0) {
            noteListContainer.innerHTML = '<p>No notes yet. Start writing!</p>';
            return;
        }

        notes.forEach(note => {
            const noteItem = document.createElement('div');
            noteItem.classList.add('note-item');
            noteItem.setAttribute('data-id', note.id);

            noteItem.innerHTML = `
                <div class="note-content">
                    <p>${note.content}</p>
                    <small>${note.timestamp}</small>
                </div>
                <div class="note-actions">
                    <button class="edit-button">Edit</button>
                    <button class="delete-button">Delete</button>
                </div>
            `;
            noteListContainer.appendChild(noteItem);
        });
    }

    function handleNoteActions(event) {
        const target = event.target;
        const noteItem = target.closest('.note-item');

        if (!noteItem) return;

        const noteId = parseInt(noteItem.getAttribute('data-id'));

        if (target.classList.contains('delete-button')) {
            deleteNote(noteId);
        } else if (target.classList.contains('edit-button')) {
            editNote(noteId);
        }
    }

    function deleteNote(id) {
        let notes = getNotes();
        notes = notes.filter(note => note.id !== id);
        saveNotes(notes);
        displayNotes();
    }

    function editNote(id) {
        let notes = getNotes();
        const noteToEdit = notes.find(note => note.id === id);

        if (noteToEdit) {
            // Simple edit implementation: Populate the form with the note content
            noteContentInput.value = noteToEdit.content;

            // Remove the note from the list temporarily
            notes = notes.filter(note => note.id !== id);
            saveNotes(notes);
            displayNotes();

            // The user will then edit the content in the textarea and click save
            // The save function will create a new note with a new ID.
            // A more robust solution would involve updating the existing note's content.
            // For simplicity, this example adds a new note after editing.
            // You might want to add a flag or a different save button for editing.
        }
    }
});