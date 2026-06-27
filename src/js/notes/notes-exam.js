/**
 * notes-exam.js — Exam highlight mode (complete-notes pages only)
 * Exposes: window.cycleExamMode, window.setExamMode,
 *          window.getExamHighlightStats, window.exportExamHighlights
 * Depends on: window.showNotification (notes-reader.js, resolved at click-time)
 * File: js/notes-exam.js
 */

(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExamMode);
    } else {
        initExamMode();
    }

    function initExamMode() {
        // Only runs on complete-notes pages
        const isCompleteNotes = document.body.classList.contains('complete-notes');
        if (!isCompleteNotes) {
            console.log('ℹ️ Overview notes - Exam mode skipped');
            return;
        }

        const sentenceHighlights = document.querySelectorAll('.exam-highlight-sentence').length;
        const termHighlights = document.querySelectorAll('.exam-highlight-term').length;
        console.log(`📚 Found ${sentenceHighlights + termHighlights} exam highlights`);

        // Restore saved mode
        const savedMode = localStorage.getItem('examMode') || 'none';
        setExamMode(savedMode);

        // Keyboard shortcut: Alt+E
        document.addEventListener('keydown', function (e) {
            if (e.altKey && e.key.toLowerCase() === 'e') {
                e.preventDefault();
                cycleExamMode();
            }
        });

        console.log(`📚 Exam mode initialized: ${savedMode} (Press Alt+E to toggle)`);
    }

    function cycleExamMode() {
        const currentMode = document.body.className.match(/exam-mode-(\w+)/)?.[1] || 'none';
        const nextMode = currentMode === 'none' ? 'highlight'
            : currentMode === 'highlight' ? 'test'
                : 'none';

        setExamMode(nextMode);
        localStorage.setItem('examMode', nextMode);

        setTimeout(() => {
            const mode = document.body.className.match(/exam-mode-(\w+)/)?.[1] || 'none';
            window.showNotification(`Exam mode: ${mode.toUpperCase()} (saved)`);
        }, 100);

        console.log(`🔄 Exam mode changed: ${currentMode} → ${nextMode}`);
    }

    function setExamMode(mode) {
        const body = document.body;
        body.classList.remove('exam-mode-none', 'exam-mode-highlight', 'exam-mode-test');
        body.classList.add(`exam-mode-${mode}`);
        logModeDetails(mode);
    }

    function logModeDetails(mode) {
        const sentenceHighlights = document.querySelectorAll('.exam-highlight-sentence').length;
        const termHighlights = document.querySelectorAll('.exam-highlight-term').length;

        const modeDescriptions = {
            'none': 'Normal reading mode - No highlights visible',
            'highlight': `Showing ${sentenceHighlights} sentence highlights + ${termHighlights} term highlights in yellow`,
            'test': `Fill-in-blank mode - ${sentenceHighlights} sentences visible (context), ${termHighlights} terms hidden (hover to reveal)`
        };

        console.log(`📖 ${modeDescriptions[mode]}`);
    }

    function getHighlightStats() {
        const sentenceHighlights = document.querySelectorAll('.exam-highlight-sentence');
        const termHighlights = document.querySelectorAll('.exam-highlight-term');

        return {
            sentences: sentenceHighlights.length,
            terms: termHighlights.length,
            total: sentenceHighlights.length + termHighlights.length,
            sentenceElements: sentenceHighlights,
            termElements: termHighlights
        };
    }

    function exportExamHighlights() {
        const sentenceHighlights = document.querySelectorAll('.exam-highlight-sentence');
        const termHighlights = document.querySelectorAll('.exam-highlight-term');

        let content = '# Exam Highlights\n\n';
        content += `Generated: ${new Date().toLocaleString()}\n`;
        content += `Page: ${document.title}\n\n`;

        content += '## Key Sentences\n\n';
        sentenceHighlights.forEach(function (highlight, i) {
            content += `${i + 1}. ${highlight.textContent.trim()}\n\n`;
        });

        content += '\n## Key Terms\n\n';
        const terms = Array.from(termHighlights).map(h => h.textContent.trim());
        const uniqueTerms = [...new Set(terms)];
        uniqueTerms.forEach(function (term, i) {
            content += `${i + 1}. ${term}\n`;
        });

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-highlights.txt';
        a.click();
        URL.revokeObjectURL(url);

        window.showNotification('Highlights exported!');
    }

    // All window exposures
    window.cycleExamMode          = cycleExamMode;
    window.setExamMode            = setExamMode;
    window.getExamHighlightStats  = getHighlightStats;
    window.exportExamHighlights   = exportExamHighlights;

})();