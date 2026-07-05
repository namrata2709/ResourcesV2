/**
 * =============================================================================
 * File: quiz-print.js
 * Path: js/quiz/quiz-print.js
 * Project: Learning Dashboard
 *
 * Description:
 * Print-format picker for quiz.html — modal with 4 modes (question paper,
 * answer key, correct answers + reasons, full answer guide). Temporarily
 * mutates the live DOM per the chosen mode (relabels options, hides/shows
 * explanations) before window.print(), then restores it from a snapshot
 * afterward. Wires the .print-button click listener on DOMContentLoaded.
 * Requires quiz-engine.js loaded first (extends its prototype).
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - js/quiz/quiz-engine.js (must load first)
 * =============================================================================
 */
!function () {
    'use strict';

    /* ── Print button DOMContentLoaded listener ── */
    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.querySelector('.print-button');
        if (btn) {
            btn.addEventListener('click', () => {
                const picker = document.getElementById('quizPrintPicker');
                if (picker) {
                    picker.hidden = !picker.hidden;
                    if (!picker.hidden) picker.querySelector('.print-pick-btn')?.focus();
                } else {
                    window.print();
                }
            });
        }
    });

}();

/* ── Prototype methods (attached after QuizEngine is defined) ── */

QuizEngine.prototype._initPrintPicker = function () {
    if (document.getElementById('quizPrintPicker')) return;

    const picker = document.createElement('div');
    picker.id = 'quizPrintPicker';
    picker.className = 'quiz-print-picker';
    picker.hidden = true;
    picker.setAttribute('role', 'dialog');
    picker.setAttribute('aria-modal', 'true');
    picker.setAttribute('aria-label', 'Choose print format');

    const modes = [
        {
            value: 'question-paper',
            icon:  '📄',
            label: 'Question paper',
            desc:  'Questions and options only — nothing selected, no answers shown. Use for blank tests.',
        },
        {
            value: 'answer-key',
            icon:  '✅',
            label: 'Answer key',
            desc:  'Correct option(s) highlighted in green. No explanations.',
        },
        {
            value: 'answer-reasons',
            icon:  '💡',
            label: 'Correct answers + reasons',
            desc:  'Correct option(s) highlighted with full explanation. Wrong options shown but not explained.',
        },
        {
            value: 'full-explanations',
            icon:  '📚',
            label: 'Full answer guide',
            desc:  'Correct options highlighted. Explanation shown for every option — right and wrong.',
        },
    ];

    picker.innerHTML = `
        <div class="print-picker-backdrop"></div>
        <div class="print-picker-panel" role="document">
            <div class="print-picker-header">
                <h2 class="print-picker-title">🖨️ Print format</h2>
                <button class="print-picker-close" aria-label="Close print options">✕</button>
            </div>
            <p class="print-picker-subtitle">Choose what to include in your printout:</p>
            <div class="print-picker-options">
                ${modes.map(m => `
                    <button class="print-pick-btn" data-mode="${m.value}"
                            aria-label="${m.label}: ${m.desc}">
                        <span class="pick-icon" aria-hidden="true">${m.icon}</span>
                        <span class="pick-body">
                            <span class="pick-label">${m.label}</span>
                            <span class="pick-desc">${m.desc}</span>
                        </span>
                    </button>
                `).join('')}
            </div>
            <button class="print-picker-cancel">Cancel</button>
        </div>
    `;

    document.body.appendChild(picker);

    const close = () => { picker.hidden = true; };
    picker.querySelector('.print-picker-close').addEventListener('click', close);
    picker.querySelector('.print-picker-cancel').addEventListener('click', close);
    picker.querySelector('.print-picker-backdrop').addEventListener('click', close);
    picker.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    picker.querySelectorAll('.print-pick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            close();
            const mode     = btn.dataset.mode;
            const snapshot = this._preparePrintDOM(mode);
            document.body.setAttribute('data-print-mode', mode);
            window.print();
            setTimeout(() => {
                document.body.removeAttribute('data-print-mode');
                this._restorePrintDOM(snapshot);
            }, 1200);
        });
    });
};

QuizEngine.prototype._preparePrintDOM = function (mode) {
    const snapshot = [];
    const letters  = ['A', 'B', 'C', 'D', 'E', 'F'];

    this.container.querySelectorAll('.options-list').forEach(list => {
        let currentEntry = null;
        let optIdx = 0;

        Array.from(list.children).forEach(child => {
            if (child.classList.contains('option')) {
                const icon      = child.querySelector('.option-icon');
                const isCorrect = child.dataset.isCorrect === 'true';
                const letter    = letters[optIdx] ?? String(optIdx + 1);
                optIdx++;

                currentEntry = { el: child, className: child.className, iconHTML: icon ? icon.innerHTML : null, hiddenExps: [] };
                snapshot.push(currentEntry);

                if (mode === 'question-paper') {
                    child.className = 'option';
                    if (icon) icon.innerHTML = letter;
                } else {
                    child.className = isCorrect ? 'option correct' : 'option';
                    if (icon) icon.innerHTML = isCorrect ? '✓' : letter;
                }

            } else if (child.classList.contains('explanation') && currentEntry) {
                const isCorrectExp = child.classList.contains('correct');
                let shouldHide = false;

                if (mode === 'question-paper' || mode === 'answer-key') {
                    shouldHide = true;
                } else if (mode === 'answer-reasons') {
                    shouldHide = !isCorrectExp;
                }
                // full-explanations: never hide

                if (shouldHide) {
                    child.style.display = 'none';
                    currentEntry.hiddenExps.push(child);
                }
            }
        });
    });

    return snapshot;
};

QuizEngine.prototype._restorePrintDOM = function (snapshot) {
    for (const entry of snapshot) {
        entry.el.className = entry.className;
        const icon = entry.el.querySelector('.option-icon');
        if (icon && entry.iconHTML !== null) icon.innerHTML = entry.iconHTML;
        for (const exp of entry.hiddenExps) exp.style.display = '';
    }
};
