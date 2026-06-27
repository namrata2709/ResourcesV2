/**
 * notes-print.js — Print modal + execute
 * Exposes: window.openPrintModal
 * Depends on: window.showNotification (notes-reader.js, resolved at click-time)
 * File: js/notes-print.js
 */

(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPrintAnswerKey);
    } else {
        initPrintAnswerKey();
    }

    function initPrintAnswerKey() {
        // Intercept Ctrl+P / Cmd+P — redirect to custom modal
        document.addEventListener('keydown', function (e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                openPrintModal();
            }
        });
    }

    function openPrintModal() {
        const existing = document.getElementById('printModal');
        if (existing) existing.remove();

        // Collect ALL h2 sections from .note-content
        const noteContent = document.querySelector('.note-content');
        const allSections = [];
        if (noteContent) {
            noteContent.querySelectorAll('details.collapsible-section').forEach(function (det) {
                const h2 = det.querySelector('h2[id]');
                if (!h2) return;
                const text = h2.textContent.replace(/[⭐☆▶◀]/g, '').trim();
                allSections.push({ id: h2.id, label: text, el: det });
            });
        }

        // Detect which sections are interactive
        const INTERACTIVE_IDS = ['quizContainer', 'checklistContainer', 'glossaryContainer', 'interviewContainer'];
        const interactiveSections = [
            {
                id: 'quizContainer',
                label: '❓ MCQ Quiz',
                subOptions: [
                    { id: 'mcqHighlight', label: 'Highlight correct answers' },
                    { id: 'mcqExplain', label: 'Include explanations' }
                ]
            },
            { id: 'checklistContainer', label: '✅ Checklist' },
            { id: 'glossaryContainer', label: '📖 Glossary' },
            {
                id: 'interviewContainer',
                label: '🎤 Interview Questions',
                subOptions: [
                    { id: 'interviewAnswers', label: 'Include answers' }
                ]
            }
        ].filter(function (s) { return !!document.getElementById(s.id); });

        // Split sections into content vs interactive
        const contentSections = allSections.filter(function (s) {
            return !INTERACTIVE_IDS.some(function (iid) {
                return s.el.querySelector('#' + iid);
            });
        });

        // Build toggle pill HTML
        function tog(dataAttr, dataVal) {
            return '<span class="pm-toggle pm-checked" role="checkbox" aria-checked="true" tabindex="0" '
                + dataAttr + '="' + dataVal + '"></span>';
        }

        // Content rows
        const contentHTML = contentSections.length ? (
            '<div class="pm-group">'
            + '<div class="pm-group-header">'
            + tog('data-group', 'content')
            + '<span class="pm-group-title">📄 Note Content</span>'
            + '</div>'
            + '<div class="pm-group-body" id="pmContentBody">'
            + contentSections.map(function (s) {
                return '<label class="pm-section-label">'
                    + tog('data-section', s.id)
                    + '<span>' + s.label + '</span></label>';
            }).join('')
            + '</div></div>'
        ) : '';

        // Interactive rows
        const interactiveHTML = interactiveSections.length ? (
            '<div class="pm-group">'
            + '<div class="pm-group-header">'
            + tog('data-group', 'interactive')
            + '<span class="pm-group-title">⚙️ Interactive Sections</span>'
            + '</div>'
            + '<div class="pm-group-body" id="pmInteractiveBody">'
            + interactiveSections.map(function (s) {
                const subs = (s.subOptions || []).map(function (sub) {
                    return '<label class="pm-sub-label" data-parent="' + s.id + '">'
                        + tog('data-option', sub.id)
                        + '<span>' + sub.label + '</span></label>';
                }).join('');
                return '<label class="pm-section-label">'
                    + tog('data-section', s.id)
                    + '<span>' + s.label + '</span></label>'
                    + subs;
            }).join('')
            + '</div></div>'
        ) : '';

        // Preset buttons
        const presetBtns = [
            { p: 'all', label: 'All' },
            contentSections.length ? { p: 'content', label: 'Content only' } : null,
            interactiveSections.length ? { p: 'interactive', label: 'Interactive only' } : null,
            { p: 'custom', label: 'Custom' }
        ].filter(Boolean).map(function (b) {
            return '<button class="pm-preset' + (b.p === 'all' ? ' active' : '') + '" data-preset="' + b.p + '">' + b.label + '</button>';
        }).join('');

        // Build modal
        const modal = document.createElement('div');
        modal.id = 'printModal';
        modal.className = 'print-modal-overlay';
        modal.innerHTML =
            '<div class="print-modal">'
            + '<div class="print-modal-header">'
            + '<h2>🖨️ Print Options</h2>'
            + '<button class="print-modal-close" aria-label="Close">✕</button>'
            + '</div>'
            + '<div class="print-modal-body">'
            + '<div class="pm-preset-row">' + presetBtns + '</div>'
            + '<div class="pm-sections">' + contentHTML + interactiveHTML + '</div>'
            + '</div>'
            + '<div class="print-modal-footer">'
            + '<button class="pm-cancel-btn">Cancel</button>'
            + '<button class="pm-print-btn">🖨️ Print</button>'
            + '</div>'
            + '</div>';
        document.body.appendChild(modal);

        // Toggle helpers
        function setTog(el, on) {
            el.setAttribute('aria-checked', on ? 'true' : 'false');
            el.classList.toggle('pm-checked', on);
        }
        function isOn(el) { return el.getAttribute('aria-checked') === 'true'; }

        function syncSubs(sectionId, on) {
            modal.querySelectorAll('.pm-sub-label[data-parent="' + sectionId + '"]').forEach(function (sub) {
                sub.classList.toggle('pm-dim', !on);
                setTog(sub.querySelector('.pm-toggle'), on);
            });
        }

        function syncGroupCB(groupId) {
            const bodyId = groupId === 'content' ? '#pmContentBody' : '#pmInteractiveBody';
            const body = modal.querySelector(bodyId);
            if (!body) return;
            const anyOn = Array.from(body.querySelectorAll('[data-section]')).some(isOn);
            const gcb = modal.querySelector('[data-group="' + groupId + '"]');
            if (gcb) setTog(gcb, anyOn);
        }

        modal.addEventListener('click', function (e) {
            const t = e.target.closest('.pm-toggle');
            if (!t) return;
            const nowOn = !isOn(t);

            if (t.hasAttribute('data-group')) {
                setTog(t, nowOn);
                const bodyId = t.getAttribute('data-group') === 'content' ? '#pmContentBody' : '#pmInteractiveBody';
                const body = modal.querySelector(bodyId);
                if (body) body.querySelectorAll('[data-section]').forEach(function (cb) {
                    setTog(cb, nowOn);
                    syncSubs(cb.getAttribute('data-section'), nowOn);
                });
            } else if (t.hasAttribute('data-section')) {
                setTog(t, nowOn);
                syncSubs(t.getAttribute('data-section'), nowOn);
                const g = t.closest('.pm-group');
                if (g) {
                    const gcb = g.querySelector('[data-group]');
                    if (gcb) syncGroupCB(gcb.getAttribute('data-group'));
                }
            } else if (t.hasAttribute('data-option')) {
                setTog(t, nowOn);
            }

            // Switch to custom on manual change
            modal.querySelectorAll('.pm-preset').forEach(function (b) { b.classList.remove('active'); });
            modal.querySelector('[data-preset="custom"]').classList.add('active');
        });

        modal.addEventListener('keydown', function (e) {
            if ((e.key === ' ' || e.key === 'Enter') && e.target.classList.contains('pm-toggle')) {
                e.preventDefault(); e.target.click();
            }
        });

        function applyPreset(preset) {
            modal.querySelectorAll('.pm-preset').forEach(function (b) { b.classList.remove('active'); });
            modal.querySelector('[data-preset="' + preset + '"]').classList.add('active');

            const onContent = (preset === 'all' || preset === 'content');
            const onInteractive = (preset === 'all' || preset === 'interactive');

            const gcbContent = modal.querySelector('[data-group="content"]');
            const gcbInteractive = modal.querySelector('[data-group="interactive"]');
            const cbContent = modal.querySelector('#pmContentBody');
            const cbInteractive = modal.querySelector('#pmInteractiveBody');

            if (gcbContent) setTog(gcbContent, onContent);
            if (cbContent) cbContent.querySelectorAll('[data-section]').forEach(function (cb) {
                setTog(cb, onContent);
                syncSubs(cb.getAttribute('data-section'), onContent);
            });

            if (gcbInteractive) setTog(gcbInteractive, onInteractive);
            if (cbInteractive) cbInteractive.querySelectorAll('[data-section]').forEach(function (cb) {
                setTog(cb, onInteractive);
                syncSubs(cb.getAttribute('data-section'), onInteractive);
            });
        }

        modal.querySelectorAll('.pm-preset').forEach(function (btn) {
            btn.addEventListener('click', function () { applyPreset(btn.dataset.preset); });
        });

        const closeModal = function () { modal.remove(); };
        modal.querySelector('.print-modal-close').addEventListener('click', closeModal);
        modal.querySelector('.pm-cancel-btn').addEventListener('click', closeModal);
        modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

        modal.querySelector('.pm-print-btn').addEventListener('click', function () {
            const selectedContent = {};
            modal.querySelectorAll('#pmContentBody [data-section]').forEach(function (t) {
                selectedContent[t.getAttribute('data-section')] = isOn(t);
            });

            const selectedInteractive = {};
            modal.querySelectorAll('#pmInteractiveBody [data-section]').forEach(function (t) {
                selectedInteractive[t.getAttribute('data-section')] = isOn(t);
            });

            const opts = {};
            modal.querySelectorAll('[data-option]').forEach(function (t) {
                opts[t.getAttribute('data-option')] = isOn(t);
            });

            closeModal();
            executePrint({
                content: selectedContent,
                interactive: selectedInteractive,
                opts: opts,
                contentSections: contentSections,
                interactiveSections: interactiveSections
            });
        });
    }

    function executePrint(config) {
        const { content, interactive, opts, contentSections, interactiveSections } = config;

        // Resolve the print CSS path relative to current page location
        const printCSSHref = (function () {
            const links = document.querySelectorAll('link[rel="stylesheet"]');
            for (let i = 0; i < links.length; i++) {
                const href = links[i].href;
                if (href.includes('notes.css')) {
                    return href.replace('notes.css', 'notes-print.css');
                }
            }
            console.error('❌ Could not resolve notes-print.css path. Is notes.css loaded?');
            return null;
        })();

        // --- 1. Note header (always) ---
        const noteHeader = document.querySelector('.note-header');
        const headerHTML = noteHeader ? noteHeader.outerHTML : '';

        // --- 2. Content sections ---
        let sectionsHTML = '';

        contentSections.forEach(function (s) {
            if (!content[s.id]) return;
            const clone = s.el.cloneNode(true);

            const h2 = clone.querySelector('summary h2');
            const headingText = h2 ? h2.textContent.replace(/[⭐☆▶◀]/g, '').trim() : '';

            clone.querySelectorAll('button, .bookmark-btn, .copy-code-btn').forEach(function (el) { el.remove(); });

            const sectionContent = clone.querySelector('.section-content');
            const innerHTML = sectionContent ? sectionContent.innerHTML : clone.innerHTML;

            sectionsHTML +=
                '<div class="print-section">'
                + (headingText ? '<h2 class="print-section-heading">' + headingText + '</h2>' : '')
                + '<div class="print-section-body">' + innerHTML + '</div>'
                + '</div>';
        });

        // --- 3. Interactive sections ---
        interactiveSections.forEach(function (s) {
            if (!interactive[s.id]) return;
            const container = document.getElementById(s.id);
            if (!container) return;
            if (container.querySelector('.error-box')) return;
            const wrapper = container.closest('details.collapsible-section') || container;
            const clone = wrapper.cloneNode(true);

            const h2 = clone.querySelector('summary h2');
            const headingText = h2 ? h2.textContent.replace(/[⭐☆▶◀]/g, '').trim() : '';

            clone.querySelectorAll(
                'button, .quiz-navigation, .quiz-nav-btn, .quiz-bottom-navigation, '
                + '.quiz-summary-section, .submit-quiz-btn, .flashcard-navigation, '
                + '.show-answer-btn, .copy-code-btn, .bookmark-btn, .search-container'
            ).forEach(function (el) { el.remove(); });

            clone.querySelectorAll('details').forEach(function (d) { d.setAttribute('open', ''); });

            clone.querySelectorAll('.quiz-slide, .flashcard-slide').forEach(function (slide) {
                slide.style.display = 'block';
                slide.classList.add('active');
            });

            if (s.id === 'quizContainer') {
                clone.querySelectorAll('.quiz-slide').forEach(function (slide) {
                    const correctLetter = slide.dataset.correct;
                    if (!correctLetter) return;

                    slide.querySelectorAll('.quiz-option-card').forEach(function (card) {
                        const letter = card.querySelector('.option-letter');
                        if (letter && letter.textContent.trim() === correctLetter) {
                            card.setAttribute('data-correct', 'true');
                        }
                    });

                    slide.querySelectorAll('.quiz-feedback').forEach(function (fb) {
                        fb.style.display = (opts.mcqHighlight || opts.mcqExplain) ? 'block' : 'none';
                    });

                    slide.querySelectorAll('.explanation-box').forEach(function (box) {
                        box.style.display = opts.mcqExplain ? 'block' : 'none';
                    });
                });
            }

            if (s.id === 'interviewContainer' && !opts.interviewAnswers) {
                clone.querySelectorAll('.answer-side').forEach(function (el) { el.remove(); });
            }

            const sectionContent = clone.querySelector('.section-content');
            const innerHTML = sectionContent ? sectionContent.innerHTML : clone.innerHTML;

            sectionsHTML +=
                '<div class="print-section">'
                + (headingText ? '<h2 class="print-section-heading">' + headingText + '</h2>' : '')
                + '<div class="print-section-body">' + innerHTML + '</div>'
                + '</div>';
        });

        // --- 4. Footer (always) ---
        const noteFooter = document.querySelector('.content-footer');
        const footerHTML = noteFooter ? noteFooter.outerHTML : '';

        // --- 5. Build print page ---
        const printHTML = '<!DOCTYPE html>\n'
            + '<html>\n<head>\n'
            + '<meta charset="UTF-8">\n'
            + '<title>Print — ' + document.title + '</title>\n'
            + '<link rel="stylesheet" href="' + printCSSHref + '">\n'
            + '</head>\n'
            + '<body>\n'
            + '<div class="note-container">\n'
            + headerHTML + '\n'
            + '<div class="note-content">\n'
            + sectionsHTML + '\n'
            + '</div>\n'
            + footerHTML + '\n'
            + '</div>\n'
            + '</body>\n</html>';

        if (!printCSSHref) {
            window.showNotification('Print failed: stylesheet not found.');
            return;
        }

        // --- 6. Open new window ---
        const printWin = window.open('', '_blank', 'width=900,height=700');
        if (!printWin) {
            window.showNotification('Pop-up blocked — please allow pop-ups for this site to print.');
            return;
        }

        printWin.document.open();
        printWin.document.write(printHTML);
        printWin.document.close();

        // Fire print after stylesheet loads
        printWin.onload = function () {
            printWin.focus();
            printWin.print();
            printWin.addEventListener('afterprint', function () {
                printWin.close();
            });
        };

        // Fallback for browsers where onload already fired
        setTimeout(function () {
            if (printWin && !printWin.closed) {
                printWin.focus();
                printWin.print();
                printWin.addEventListener('afterprint', function () {
                    printWin.close();
                });
            }
        }, 1000);
    }

    window.openPrintModal = openPrintModal;

})();