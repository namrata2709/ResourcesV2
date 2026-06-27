/**
 * Checklist Interactive Features v1.0
 * Loads checklist items from JSON and renders dynamically
 * File: js/notes-checklist.js
 */

(function () {
    'use strict';

    // Generate unique page ID from document title
    const pageId = window.NotePageId || document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    let checklistData = null;
    let checklistState = {};

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initChecklist);
    } else {
        initChecklist();
    }

    async function initChecklist() {
        const container = document.getElementById('checklistContainer');
        if (!container) {
            console.log('ℹ️ No checklist container found on this page');
            return;
        }

        const jsonSource = container.dataset.checklistSource || 'json/checklist.json';

        try {
            await loadChecklistFromJSON(jsonSource);
            renderChecklist();
            loadChecklistState();
            updateChecklistProgress();

            console.log(`✅ Initialized checklist with ${getTotalItems()} items from ${jsonSource}`);
        } catch (error) {
            console.error('❌ Error loading checklist:', error);
            container.innerHTML = `
                <div class="error-box">
                    <p><strong>Error loading checklist items.</strong></p>
                    <p>Could not load ${jsonSource}. Please ensure the file exists in the same directory as this HTML file.</p>
                </div>
            `;
        }
    }

    async function loadChecklistFromJSON(jsonFile) {
        const response = await fetch(jsonFile);
        if (!response.ok) {
            throw new Error(`Failed to load ${jsonFile}: ${response.statusText}`);
        }

        checklistData = await response.json();

        if (!checklistData.categories || checklistData.categories.length === 0) {
            throw new Error('No categories found in checklist JSON');
        }

        console.log(`✅ Loaded ${checklistData.categories.length} categories from JSON`);
    }

    function renderChecklist() {
        const container = document.getElementById('checklistContainer');
        if (!container || !checklistData) return;

        container.innerHTML = '';

        checklistData.categories.forEach(category => {
            const categoryElement = createChecklistCategory(category);
            container.appendChild(categoryElement);
        });

        // Add event listeners to all checkboxes
        const checkboxes = container.querySelectorAll('.checklist-item');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handleCheckboxChange);
        });

        console.log(`✅ Rendered ${getTotalItems()} checklist items`);
        // ADD after the log:
        window.NotesSearch?.rebuildIndex();
    }

    function createChecklistCategory(category) {
        const section = document.createElement('div');
        section.className = 'checklist-category';

        const title = document.createElement('h3');
        title.textContent = category.title;
        section.appendChild(title);

        const table = document.createElement('table');
        table.className = 'checklist-table';

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th style="width: 60px;">Status</th>
                <th>Checkpoint</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        category.items.forEach(item => {
            const row = document.createElement('tr');

            const statusCell = document.createElement('td');
            statusCell.className = 'text-center';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'checklist-item';
            checkbox.dataset.key = item.id;
            checkbox.id = `check-${item.id}`;

            statusCell.appendChild(checkbox);
            row.appendChild(statusCell);

            const textCell = document.createElement('td');

            const label = document.createElement('label');
            label.htmlFor = `check-${item.id}`;
            label.textContent = item.text;

            textCell.appendChild(label);
            row.appendChild(textCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        section.appendChild(table);

        return section;
    }

    function handleCheckboxChange(event) {
        const checkbox = event.target;
        const key = checkbox.dataset.key;

        checklistState[key] = checkbox.checked;
        saveChecklistState();
        updateChecklistProgress();
    }

    function updateChecklistProgress() {
        const totalItems = getTotalItems();
        const checkedItems = getCheckedCount();
        const percentage = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

        const progressText = document.getElementById('checklistProgress');
        const progressFill = document.getElementById('progressFill');

        if (progressText) {
            progressText.textContent = `${checkedItems}/${totalItems}`;
        }

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
            progressFill.textContent = `${percentage}%`;
        }


    }

    function getTotalItems() {
        if (!checklistData || !checklistData.categories) return 0;

        return checklistData.categories.reduce((total, category) => {
            return total + (category.items ? category.items.length : 0);
        }, 0);
    }

    function getCheckedCount() {
        return Object.values(checklistState).filter(checked => checked === true).length;
    }

    function saveChecklistState() {
        try {
            localStorage.setItem(`${pageId}-checklist-state`, JSON.stringify({ v: 1, data: checklistState }));
        } catch (e) {
            console.warn('Could not save checklist state:', e);
        }
    }

    function loadChecklistState() {
        try {
            const savedState = localStorage.getItem(`${pageId}-checklist-state`);
            if (savedState) {
                const parsed = JSON.parse(savedState);
                if (!parsed.v) {
                    localStorage.removeItem(`${pageId}-checklist-state`);
                    return;
                }
                checklistState = parsed.data;
                updateChecklistProgress();
                // Apply saved state to checkboxes
                Object.keys(checklistState).forEach(key => {
                    const checkbox = document.getElementById(`check-${key}`);
                    if (checkbox) {
                        checkbox.checked = checklistState[key];
                    }
                });

            }
        } catch (e) {
            console.warn('Could not load checklist state:', e);
        }
    }

    function resetChecklist() {
        const btn = document.querySelector('[onclick="resetChecklist()"]');
        if (!btn || btn.dataset.confirmPending !== 'true') {
            if (btn) {
                btn.dataset.confirmPending = 'true';
                btn.textContent = 'Click again to confirm';
                setTimeout(() => {
                    btn.dataset.confirmPending = 'false';
                    btn.textContent = 'Reset Checklist';
                }, 3000);
            }
            return;
        }
        btn.dataset.confirmPending = 'false';
        btn.textContent = 'Reset Checklist';

        // Clear state
        checklistState = {};

        // Uncheck all checkboxes
        const checkboxes = document.querySelectorAll('.checklist-item');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // Clear localStorage
        try {
            localStorage.removeItem(`${pageId}-checklist-state`);
        } catch (e) {
            console.warn('Could not clear checklist storage:', e);
        }

        updateChecklistProgress();
        console.log('✅ Checklist reset complete');
    }

    // Expose reset function to global scope
    window.resetChecklist = resetChecklist;

    console.log('🚀 Checklist module loaded successfully');

})();