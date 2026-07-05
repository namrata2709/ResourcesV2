/**
 * =============================================================================
 * File: dashboard.js
 * Path: js/dashboard.js
 * Project: Learning Dashboard
 *
 * Description:
 * Dashboard home (index.html) card renderer. Fetches
 * data/index/dashboard-cards.json and renders one card per entry — cards
 * can be subject entry-points (AWS, DSA) or standalone cross-subject
 * modules (Quiz). Adding a future subject is a JSON-only change, no
 * HTML/JS edits required. Stays at js/ root deliberately, not under
 * js/shared/ — it's a dashboard-page-only singleton with no siblings.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - window.SiteConfig (js/shared/site-config.js)
 * - data/index/dashboard-cards.json
 * =============================================================================
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
            const response = await fetch(window.SiteConfig.dataPath('index/dashboard-cards.json'));
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
