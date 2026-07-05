/**
 * =============================================================================
 * File: dsa-contest.js
 * Path: js/notes/dsa/dsa-contest.js
 * Project: Learning Dashboard
 *
 * Description:
 * Loads contest.json and renders the contest-problems list
 * (#contestContainer) — platform/title, difficulty badge, pattern, link.
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContest);
    } else {
        initContest();
    }

    async function initContest() {
        const container = document.getElementById('contestContainer');
        if (!container) {
            console.log('ℹ️ No contest container on this page');
            return;
        }

        const jsonSource = container.dataset.contestSource || 'json/contest.json';

        try {
            const response = await fetch(jsonSource);
            if (!response.ok) throw new Error(`Failed to load ${jsonSource}`);
            const data = await response.json();

            renderContest(container, data.problems || []);
            console.log(`✅ Rendered ${data.problems.length} contest problems`);
            window.NotesSearch?.rebuildIndex();
        } catch (error) {
            console.error('❌ Error loading contest problems:', error);
            container.innerHTML = `
                <div class="error-box">
                    <p><strong>Error loading contest problems.</strong></p>
                    <p>Could not load ${jsonSource}.</p>
                </div>
            `;
        }
    }

    function renderContest(container, problems) {
        container.innerHTML = '';

        problems.forEach(p => {
            const card = document.createElement('div');
            card.className = 'interview-question';

            const diffClass = `badge-${p.diff}`;

            card.innerHTML = `
                <strong>${p.platform} — ${p.title}</strong>
                &middot; <span class="${diffClass}">${capitalize(p.diff)}</span><br>
                <span class="contest-pattern">Pattern: ${p.pattern}</span><br>
                <a href="${p.url}" target="_blank" rel="noopener">Open problem &#8599;</a>
            `;

            container.appendChild(card);
        });
    }

    function capitalize(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    console.log('🚀 DSA contest module loaded');

})();
