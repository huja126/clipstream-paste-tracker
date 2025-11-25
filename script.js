class PasteTracker {
    constructor() {
        this.pastes = [];
        this.initElements();
        this.loadFromStorage();
        this.bindEvents();
        this.updateUI();
        this.updatePasteButtonState(); // Initialize paste button state
    }

    initElements() {
        this.pasteInput = document.getElementById('pasteInput');
        this.pasteBtn = document.getElementById('pasteBtn');
        this.copyAllBtn = document.getElementById('copyAllBtn');
        this.pasteCount = document.getElementById('pasteCount');
        this.pastesList = document.getElementById('pastesList');
        this.emptyState = document.getElementById('emptyState');
        this.toast = document.getElementById('toast');
    }

    bindEvents() {
        // Handle paste events
        this.pasteInput.addEventListener('paste', (e) => {
            setTimeout(() => this.handlePaste(), 100);
        });

        // Handle manual paste with Ctrl+V
        this.pasteInput.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                setTimeout(() => this.handlePaste(), 100);
            }
        });

        // Handle input changes to enable/disable paste button
        this.pasteInput.addEventListener('input', () => {
            this.updatePasteButtonState();
        });

        // Paste button
        this.pasteBtn.addEventListener('click', () => this.handlePaste());

        // Copy all button
        this.copyAllBtn.addEventListener('click', () => this.copyAll());

        // Handle clicks on pastes list (for delete buttons)
        this.pastesList.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn')) {
                const deleteBtn = e.target.closest('.delete-btn');
                const pasteId = deleteBtn.dataset.id;
                this.deletePaste(pasteId);
            }
        });
    }

    handlePaste() {
        const content = this.pasteInput.value.trim();
        
        if (content) {
            this.addPaste(content);
            this.pasteInput.value = ''; // Clear the input
            this.updatePasteButtonState(); // Update button state after clearing
        }
    }

    updatePasteButtonState() {
        const content = this.pasteInput.value.trim();
        this.pasteBtn.disabled = !content;
    }

    addPaste(content) {
        const paste = {
            id: Date.now().toString(),
            content: content,
            timestamp: new Date().toISOString()
        };

        this.pastes.unshift(paste); // Add to beginning for chronological order
        this.saveToStorage();
        this.updateUI();
        this.showToast('Paste added successfully!');
    }

    deletePaste(id) {
        this.pastes = this.pastes.filter(paste => paste.id !== id);
        this.saveToStorage();
        this.updateUI();
        this.showToast('Paste deleted');
    }

    copyAll() {
        if (this.pastes.length === 0) return;

        // Only include the paste content, separated by newlines
        const allContent = this.pastes.map(paste => paste.content).join('\n');

        navigator.clipboard.writeText(allContent).then(() => {
            this.showToast(`Copied ${this.pastes.length} pastes to clipboard!`);
        }).catch(err => {
            console.error('Failed to copy to clipboard:', err);
            this.showToast('Failed to copy to clipboard', 'error');
        });
    }

    updateUI() {
        // Update counter
        this.pasteCount.textContent = this.pastes.length;
        
        // Update copy all button state
        this.copyAllBtn.disabled = this.pastes.length === 0;
        
        // Update empty state and list
        if (this.pastes.length === 0) {
            this.emptyState.classList.remove('hidden');
            this.renderEmptyState();
        } else {
            this.emptyState.classList.add('hidden');
            this.renderPastes();
        }
    }

    renderEmptyState() {
        this.pastesList.innerHTML = `
            <div class="empty-state" id="emptyState">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
                </svg>
                <p>No pastes yet</p>
                <p class="empty-subtitle">Start pasting text or links above</p>
            </div>
        `;
    }

    renderPastes() {
        const pastesHTML = this.pastes.map((paste, index) => {
            const timestamp = this.formatTimestamp(paste.timestamp);
            const preview = this.truncateText(paste.content, 100);
            
            return `
                <div class="paste-item" data-id="${paste.id}">
                    <div class="paste-content">
                        <div class="paste-text">${this.escapeHtml(paste.content)}</div>
                        <div class="paste-timestamp">${timestamp}</div>
                    </div>
                    <button class="delete-btn" data-id="${paste.id}" title="Delete paste">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"></polyline>
                            <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2H14a2,2,0,0,1,2,2V6"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        this.pastesList.innerHTML = pastesHTML;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatTimestamp(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'success') {
        this.toast.textContent = message;
        this.toast.className = `toast ${type}`;
        
        // Force reflow to restart animation
        this.toast.offsetHeight;
        
        this.toast.classList.add('show');

        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }

    saveToStorage() {
        try {
            localStorage.setItem('clipstream_pastes', JSON.stringify(this.pastes));
        } catch (err) {
            console.warn('Could not save to localStorage:', err);
        }
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('clipstream_pastes');
            if (stored) {
                this.pastes = JSON.parse(stored);
            }
        } catch (err) {
            console.warn('Could not load from localStorage:', err);
            this.pastes = [];
        }
    }

    // Public method to clear all pastes
    clearAll() {
        this.pastes = [];
        this.saveToStorage();
        this.updateUI();
        this.showToast('All pastes cleared');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pasteTracker = new PasteTracker();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + A: Select all content in input
        if ((e.ctrlKey || e.metaKey) && e.key === 'a' && document.activeElement === document.getElementById('pasteInput')) {
            e.stopPropagation();
        }
        
        // Ctrl/Cmd + Shift + C: Copy all (when not in input)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C' && document.activeElement !== document.getElementById('pasteInput')) {
            e.preventDefault();
            window.pasteTracker.copyAll();
        }
        
        // Escape: Clear input
        if (e.key === 'Escape' && document.activeElement === document.getElementById('pasteInput')) {
            document.getElementById('pasteInput').value = '';
        }
    });
});

// Add some useful utility functions for potential future features
window.ClipstreamUtils = {
    // Export pastes as JSON
    exportPastes: () => {
        const data = JSON.stringify(window.pasteTracker.pastes, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clipstream-pastes-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // Import pastes from JSON file
    importPastes: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const pastes = JSON.parse(e.target.result);
                    if (Array.isArray(pastes)) {
                        window.pasteTracker.pastes = pastes;
                        window.pasteTracker.saveToStorage();
                        window.pasteTracker.updateUI();
                        resolve(pastes.length);
                    } else {
                        reject(new Error('Invalid file format'));
                    }
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
};
