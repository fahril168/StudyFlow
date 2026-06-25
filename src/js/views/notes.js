import { stateManager } from '../state.js';

export async function renderNotes(container) {
  const notes = await stateManager.getNotes();
  const colors = [
    { code: '#fef08a', name: 'yellow' },
    { code: '#bbf7d0', name: 'green' },
    { code: '#bfdbfe', name: 'blue' },
    { code: '#fbcfe8', name: 'pink' },
    { code: '#fed7aa', name: 'orange' }
  ];

  const html = `
    <div class="notes-page-container">
      <div class="notes-grid" id="notes-grid-container">
        <!-- Add Note Card -->
        <div class="add-note-card" id="page-add-note-btn">
          <i data-lucide="plus-circle"></i>
          <span>Catatan Baru</span>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  const notesContainer = container.querySelector('#notes-grid-container');

  const renderNoteCards = (noteList) => {
    // Remove existing note cards, keep the add button
    const existingCards = notesContainer.querySelectorAll('.note-card-full');
    existingCards.forEach(c => c.remove());

    noteList.forEach(note => {
      const cardHtml = `
        <div class="note-card-full" data-note-id="${note.id}" style="background-color: ${note.color};">
          <textarea class="note-textarea-full" data-note-id="${note.id}" placeholder="Tulis sesuatu...">${note.content || ''}</textarea>
          <div class="note-footer-full">
            <div class="note-colors-full">
              ${colors.map(col => `
                <div class="color-dot-full ${note.color === col.code ? 'active' : ''}" data-note-id="${note.id}" data-color="${col.code}" style="background-color: ${col.code};"></div>
              `).join('')}
            </div>
            <button class="delete-note-btn-full" data-note-id="${note.id}" title="Hapus catatan">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `;
      // Insert before the add button
      notesContainer.insertAdjacentHTML('afterbegin', cardHtml);
    });

    lucide.createIcons();
    bindNoteEvents();
  };

  const bindNoteEvents = () => {
    // Auto-save on blur
    notesContainer.querySelectorAll('.note-textarea-full').forEach(ta => {
      // Unbind previous
      ta.onblur = null;
      ta.onblur = async () => {
        const noteId = ta.getAttribute('data-note-id');
        const content = ta.value.trim();
        await stateManager.updateNote(noteId, { content });
      };
    });

    // Change color
    notesContainer.querySelectorAll('.color-dot-full').forEach(dot => {
      dot.onclick = async () => {
        const noteId = dot.getAttribute('data-note-id');
        const color = dot.getAttribute('data-color');
        
        const noteCard = notesContainer.querySelector(`.note-card-full[data-note-id="${noteId}"]`);
        if (noteCard) {
          noteCard.style.backgroundColor = color;
          noteCard.querySelectorAll('.color-dot-full').forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
        }

        await stateManager.updateNote(noteId, { color });
      };
    });

    // Delete note
    notesContainer.querySelectorAll('.delete-note-btn-full').forEach(btn => {
      btn.onclick = async () => {
        const noteId = btn.getAttribute('data-note-id');
        if (confirm('Apakah Anda yakin ingin menghapus catatan ini?')) {
          await stateManager.deleteNote(noteId);
          // Re-render notes
          const updatedNotes = await stateManager.getNotes();
          renderNoteCards(updatedNotes);
        }
      };
    });
  };

  // Render initial notes
  renderNoteCards(notes);

  // Add new note event
  const addBtn = container.querySelector('#page-add-note-btn');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      const newNote = await stateManager.addNote({
        content: '',
        color: '#fef08a' // Default yellow
      });
      if (newNote) {
        const updatedNotes = await stateManager.getNotes();
        renderNoteCards(updatedNotes);
        
        // Focus the newly created textarea
        setTimeout(() => {
          const newTa = notesContainer.querySelector(`.note-textarea-full[data-note-id="${newNote.id}"]`);
          if (newTa) newTa.focus();
        }, 100);
      }
    });
  }
}
