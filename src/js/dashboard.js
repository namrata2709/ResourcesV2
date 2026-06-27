/**
 * Dashboard Manager
 * Fetches data/index/dashboard-cards.json and renders one card per entry.
 * Cards can be subject entry-points (AWS, DSA, ...) or standalone modules
 * that cut across subjects (Quiz). Adding a new card later requires only
 * a new entry in data/index/dashboard-cards.json — no HTML changes.
 * File: js/dashboard.js
 */

(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        loadCards();
    }

    async function loadCards() {
        const grid = document.getElementById('modulesGrid');
        if (!grid) return;

        try {
            const response = await fetch('data/index/dashboard-cards.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const cards = data.cards || [];

            if (cards.length === 0) {
                grid.innerHTML = `<div class="loading">No dashboard cards configured yet.</div>`;
                return;
            }

            renderCards(cards);
        } catch (error) {
            console.error('Error loading dashboard cards:', error);
            grid.innerHTML = `
                <div class="error">
                    <h2>Error Loading Dashboard</h2>
                    <p>Could not load data/index/dashboard-cards.json. Please ensure the file exists.</p>
                </div>
            `;
        }
    }

    function renderCards(cards) {
        const grid = document.getElementById('modulesGrid');

        grid.innerHTML = cards.map(card => `
            <a href="${card.url}" class="module-card">
                <div class="module-icon">${card.icon || '📘'}</div>
                <h2>${card.label}</h2>
                <p>${card.description || ''}</p>
                <span class="module-badge">${card.type === 'standalone' ? 'All Subjects' : 'Subject'}</span>
            </a>
        `).join('');
    }

    // Expose for potential reuse (e.g. future card-switcher elsewhere)
    window.DashboardCards = { loadCards };

})();
