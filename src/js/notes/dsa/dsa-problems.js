/**
 * dsa-problems.js — Loads problems.json, renders LeetCode problems table.
 * File: js/notes/dsa/dsa-problems.js
 */

(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProblems);
    } else {
        initProblems();
    }

    async function initProblems() {
        const container = document.getElementById('problemsContainer');
        if (!container) {
            console.log('ℹ️ No problems container on this page');
            return;
        }

        const jsonSource = container.dataset.problemsSource || 'json/problems.json';

        try {
            const response = await fetch(jsonSource);
            if (!response.ok) throw new Error(`Failed to load ${jsonSource}`);
            const data = await response.json();

            renderProblems(container, data.problems || []);
            console.log(`✅ Rendered ${data.problems.length} LeetCode problems`);
            window.NotesSearch?.rebuildIndex();
        } catch (error) {
            console.error('❌ Error loading problems:', error);
            container.innerHTML = `
                <div class="error-box">
                    <p><strong>Error loading problems.</strong></p>
                    <p>Could not load ${jsonSource}.</p>
                </div>
            `;
        }
    }

    function renderProblems(container, problems) {
        const table = document.createElement('table');

        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>#</th>
                <th>Problem</th>
                <th>Difficulty</th>
                <th>Pattern</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        problems.forEach(p => {
            const row = document.createElement('tr');

            const numCell = document.createElement('td');
            numCell.textContent = p.number || '';
            row.appendChild(numCell);

            const titleCell = document.createElement('td');
            const link = document.createElement('a');
            link.href = p.url;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = p.title;
            titleCell.appendChild(link);
            row.appendChild(titleCell);

            const diffCell = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = `badge-${p.diff}`;
            badge.textContent = p.diff.charAt(0).toUpperCase() + p.diff.slice(1);
            diffCell.appendChild(badge);
            row.appendChild(diffCell);

            const patternCell = document.createElement('td');
            patternCell.textContent = p.pattern;
            row.appendChild(patternCell);

            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        container.innerHTML = '';
        container.appendChild(table);
    }

    console.log('🚀 DSA problems module loaded');

})();
