/**
 * =============================================================================
 * File: notes-glossary.js
 * Path: js/notes/notes-glossary.js
 * Project: Learning Dashboard
 *
 * Description:
 * Glossary table renderer for note pages (#glossaryContainer). Loads
 * term/definition/example entries from JSON and renders them as a
 * 3-column table. Read-only — no interactive state, no localStorage.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - window.NotesSearch (notes-search.js, optional — rebuildIndex() call)
 * =============================================================================
 */

(function () {
    'use strict';

    let glossaryData = null;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGlossary);
    } else {
        initGlossary();
    }

    async function initGlossary() {
        const container = document.getElementById('glossaryContainer');
        if (!container) {
            console.log('ℹ️ No glossary container found on this page');
            return;
        }

        const jsonSource = container.dataset.glossarySource || 'json/glossary.json';

        try {
            await loadGlossaryFromJSON(jsonSource);
            renderGlossary();

            console.log(`✅ Initialized glossary with ${glossaryData.terms.length} terms from ${jsonSource}`);
        } catch (error) {
            console.error('❌ Error loading glossary:', error);
            container.innerHTML = `
                <div class="error-box">
                    <p><strong>Error loading glossary terms.</strong></p>
                    <p>Could not load ${jsonSource}. Please ensure the file exists in the same directory as this HTML file.</p>
                </div>
            `;
        }
    }

    async function loadGlossaryFromJSON(jsonFile) {
        const response = await fetch(jsonFile);
        if (!response.ok) {
            throw new Error(`Failed to load ${jsonFile}: ${response.statusText}`);
        }

        glossaryData = await response.json();

        if (!glossaryData.terms || glossaryData.terms.length === 0) {
            throw new Error('No terms found in glossary JSON');
        }

        console.log(`✅ Loaded ${glossaryData.terms.length} terms from JSON`);
    }

    function renderGlossary() {
        const container = document.getElementById('glossaryContainer');
        if (!container || !glossaryData) return;

        // Sort terms alphabetically by term name
        const terms = glossaryData.terms;

        // Create table
        const table = document.createElement('table');

        // Create table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Term</th>
                <th>Simple Definition</th>
                <th>Real-Life Example</th>
            </tr>
        `;
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');

        terms.forEach(term => {
            const row = document.createElement('tr');

            // Term column
            const termCell = document.createElement('td');
            const termStrong = document.createElement('strong');
            termStrong.textContent = term.term;
            termCell.appendChild(termStrong);
            row.appendChild(termCell);

            // Definition column
            const defCell = document.createElement('td');
            defCell.textContent = term.definition;
            row.appendChild(defCell);

            // Example column
            const exampleCell = document.createElement('td');
            exampleCell.textContent = term.example;
            row.appendChild(exampleCell);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        container.appendChild(table);

        console.log(`✅ Rendered ${terms.length} glossary terms in alphabetical order`);
        // ADD after the log:
        window.NotesSearch?.rebuildIndex();
    }


    console.log('🚀 Glossary module loaded successfully');

})();