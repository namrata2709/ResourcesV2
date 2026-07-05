/**
 * =============================================================================
 * File: quiz-page.js
 * Path: js/quiz/quiz-page.js
 * Project: Learning Dashboard
 *
 * Description:
 * Bootloader for quiz.html. Reads ?quiz= from the URL into
 * window.QuizPageFile, then loads quiz-engine.js, quiz-toolbar.js,
 * quiz-print.js, quiz-search.js, and quiz-export.js in order (each
 * attaches QuizEngine.prototype methods, so load order matters — engine
 * must load first). Shows an error + hides the loader if no ?quiz= param
 * is present.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - window.callNavigation (js/shared/site-config.js)
 * - js/quiz/quiz-engine.js, quiz-toolbar.js, quiz-print.js,
 *   quiz-search.js, quiz-export.js
 * =============================================================================
 */

(function () {
    'use strict';

    window.QuizPageFile = new URLSearchParams(window.location.search).get('quiz') || null;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        try {
            loadScripts();
            callNavigation(["Home", "Quizzes", QuizPageFile]);
            console.log('✅ quiz-page.js initialized');
        } catch (error) {
            console.error('❌ Error in quiz-page.js:', error);
        }
    }

    function loadScripts() {
        if (!window.QuizPageFile) {
            showError();
            hideLoader();
            return;
        }

        const scripts = [
            'js/quiz/quiz-engine.js',
            'js/quiz/quiz-toolbar.js',
            'js/quiz/quiz-print.js',
            'js/quiz/quiz-search.js',
            'js/quiz/quiz-export.js',
        ];

        scripts.forEach(src => {
            const script   = document.createElement('script');
            script.src     = src;
            script.async   = false;
            script.onload  = () => console.log(`✅ Loaded: ${src.split('/').pop()}`);
            script.onerror = () => console.warn(`⚠️ Failed to load: ${src}`);
            document.body.appendChild(script);
        });

        console.log('📚 Loading quiz modules...');
    }

    function showError() {
        const container = document.getElementById('questionsContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="error">
                <h2>No quiz specified</h2>
                <p>Please select a quiz from the list.</p>
                <a href="quiz-index.html" class="back-btn" style="margin-top:1rem;display:inline-block;">
                    ← Go to Quiz List
                </a>
            </div>
        `;
    }

    function hideLoader() {
        const loader = document.getElementById('pageLoader');
        if (loader) loader.classList.add('hidden');
    }

})();