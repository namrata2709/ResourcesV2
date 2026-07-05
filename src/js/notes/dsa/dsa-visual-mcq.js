/**
 * =============================================================================
 * File: dsa-visual-mcq.js
 * Path: js/notes/dsa/dsa-visual-mcq.js
 * Project: Learning Dashboard
 *
 * Description:
 * Loads visual-mcq.json and renders all 4 visual question types
 * (fillblank, trace, output, spotbug) as a quiz-slide carousel
 * (#visualMcqContainer). Handles answer selection, feedback,
 * prev/next navigation, progress tracking, and reset — state persisted
 * to localStorage (key: <pageId>-visual-mcq).
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - window.NotePageId (set by notes-page-core.js before this loads)
 * - window.announceToScreenReader (notes-accessibility.js, optional)
 * - window.NotesSearch (notes-search.js, optional — rebuildIndex() call)
 * =============================================================================
 */

(function () {
    'use strict';

    const pageId = window.NotePageId || document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    let questions       = [];
    let currentQuestion = 1;
    let totalQuestions  = 0;
    let answeredState   = {};

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVisualMcq);
    } else {
        initVisualMcq();
    }

    async function initVisualMcq() {
        const container = document.getElementById('visualMcqContainer');
        if (!container) {
            console.log('ℹ️ No visual MCQ container on this page');
            return;
        }

        const jsonSource = container.dataset.visualMcqSource || 'json/visual-mcq.json';

        try {
            const response = await fetch(jsonSource);
            if (!response.ok) throw new Error(`Failed to load ${jsonSource}`);
            const data = await response.json();

            questions      = data.questions || [];
            totalQuestions = questions.length;

            renderAllSlides(container);
            loadState();
            updateDisplay();

            bindNavButtons();

            console.log(`✅ Visual MCQ initialized: ${totalQuestions} questions`);
            window.NotesSearch?.rebuildIndex();
        } catch (error) {
            console.error('❌ Error loading visual MCQ:', error);
            container.innerHTML = `
                <div class="error-box">
                    <p><strong>Error loading visual questions.</strong></p>
                    <p>Could not load ${jsonSource}.</p>
                </div>
            `;
        }
    }

    // ── Render ────────────────────────────────────────

    function renderAllSlides(container) {
        container.innerHTML = '';
        questions.forEach((q, i) => {
            const slide = createSlide(q, i === 0);
            container.appendChild(slide);
        });
    }

    function createSlide(q, isActive) {
        const slide = document.createElement('div');
        slide.className = `quiz-slide${isActive ? ' active' : ''}`;
        slide.dataset.questionId = q.id;
        slide.dataset.type = q.type;

        const header = document.createElement('div');
        header.className = 'question-header';
        header.innerHTML = `
            <span class="question-badge">${typeLabel(q.type)} &middot; ${capitalize(q.difficulty)}</span>
        `;
        slide.appendChild(header);

        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = q.question;
        slide.appendChild(questionText);

        // Code block — for fillblank, output, spotbug
        if (q.code) {
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            code.className = 'language-python';
            code.textContent = q.code;
            pre.appendChild(code);
            slide.appendChild(pre);
        }

        // Image — for trace type
        if (q.image) {
            const img = document.createElement('img');
            img.src = q.image;
            img.alt = `Visual trace — ${q.question}`;
            img.style.maxWidth = '100%';
            img.style.borderRadius = '8px';
            img.style.margin = '12px 0';
            slide.appendChild(img);
        }

        // Options
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'quiz-options';

        const letters = ['A', 'B', 'C', 'D'];
        q.options.forEach((opt, i) => {
            const card = document.createElement('div');
            card.className = 'quiz-option-card';
            card.dataset.index = i;
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');

            card.innerHTML = `
                <div class="option-content">
                    <span class="option-letter">${letters[i]}</span>
                    <span class="option-text">${opt}</span>
                </div>
            `;

            card.addEventListener('click', () => handleAnswer(q.id, i, card, slide));
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleAnswer(q.id, i, card, slide);
                }
            });

            optionsDiv.appendChild(card);
        });
        slide.appendChild(optionsDiv);

        // Feedback box
        const feedback = document.createElement('div');
        feedback.className = 'quiz-feedback';
        feedback.id = `visual-feedback-${q.id}`;
        feedback.style.display = 'none';
        slide.appendChild(feedback);

        return slide;
    }

    // ── Answer handling ───────────────────────────────

    function handleAnswer(questionId, selectedIdx, cardEl, slide) {
        if (answeredState[questionId]) return; // already answered

        const q = questions.find(q => q.id === questionId);
        if (!q) return;

        answeredState[questionId] = selectedIdx;
        saveState();

        const isCorrect = selectedIdx === q.correct;

        // Mark all options
        slide.querySelectorAll('.quiz-option-card').forEach((c, i) => {
            if (i === q.correct) c.classList.add('correct-answer');
            if (i === selectedIdx && !isCorrect) c.classList.add('wrong-answer');
        });

        // Show feedback
        const feedback = slide.querySelector(`#visual-feedback-${questionId}`);
        if (feedback) {
            feedback.style.display = 'block';
            feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
            feedback.innerHTML = `
                <div class="feedback-result">${isCorrect ? '✓ Correct' : '✗ Incorrect'}</div>
                <div class="explanation-box">${q.explanation}</div>
            `;
        }

        if (window.announceToScreenReader) {
            window.announceToScreenReader(isCorrect ? 'Correct!' : 'Incorrect.');
        }
    }

    // ── Navigation ────────────────────────────────────

    function bindNavButtons() {
        const prevBtn = document.getElementById('visualPrevBtn');
        const nextBtn = document.getElementById('visualNextBtn');
        if (prevBtn) prevBtn.addEventListener('click', () => navigate(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => navigate(1));
    }

    function navigate(dir) {
        const next = currentQuestion + dir;
        if (next < 1 || next > totalQuestions) return;
        currentQuestion = next;
        updateDisplay();
        saveState();
    }

    function updateDisplay() {
        const slides = document.querySelectorAll('#visualMcqContainer .quiz-slide');

        slides.forEach((slide, i) => {
            const isActive = i === currentQuestion - 1;
            slide.classList.toggle('active', isActive);
            slide.style.display = isActive ? 'block' : 'none';
        });

        // Restore answered state for current slide
        const q = questions[currentQuestion - 1];
        if (q && answeredState[q.id] !== undefined) {
            const slide = slides[currentQuestion - 1];
            if (slide) {
                const selected = answeredState[q.id];
                const cards = slide.querySelectorAll('.quiz-option-card');
                cards.forEach((c, i) => {
                    if (i === q.correct) c.classList.add('correct-answer');
                    if (i === selected && selected !== q.correct) c.classList.add('wrong-answer');
                });
                const feedback = slide.querySelector(`#visual-feedback-${q.id}`);
                if (feedback && feedback.innerHTML === '') {
                    const isCorrect = selected === q.correct;
                    feedback.style.display = 'block';
                    feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
                    feedback.innerHTML = `
                        <div class="feedback-result">${isCorrect ? '✓ Correct' : '✗ Incorrect'}</div>
                        <div class="explanation-box">${q.explanation}</div>
                    `;
                }
            }
        }

        const prevBtn = document.getElementById('visualPrevBtn');
        const nextBtn = document.getElementById('visualNextBtn');
        if (prevBtn) prevBtn.disabled = (currentQuestion === 1);
        if (nextBtn) nextBtn.disabled = (currentQuestion === totalQuestions);

        updateProgress();
    }

    function updateProgress() {
        const answered = Object.keys(answeredState).length;
        const correct = Object.entries(answeredState).filter(([qid, selected]) => {
            const q = questions.find(q => q.id === Number(qid));
            return q && selected === q.correct;
        }).length;

        const counter = document.getElementById('visualMcqCounter');
        if (counter) counter.textContent = `Question ${currentQuestion} of ${totalQuestions}`;

        const progress = document.getElementById('visualMcqProgress');
        if (progress) {
            const pct = totalQuestions > 0 ? Math.round((answered / totalQuestions) * 100) : 0;
            progress.textContent = `Answered: ${answered}/${totalQuestions} | Correct: ${correct}/${answered || 0} (${pct}% complete)`;
        }
    }

    // ── Reset ─────────────────────────────────────────

    function resetVisualMcq() {
        const btn = document.querySelector('[onclick="resetVisualMcq()"]');
        if (!btn || btn.dataset.confirmPending !== 'true') {
            if (btn) {
                btn.dataset.confirmPending = 'true';
                btn.textContent = 'Click again to confirm';
                setTimeout(() => {
                    btn.dataset.confirmPending = 'false';
                    btn.textContent = 'Reset Progress';
                }, 3000);
            }
            return;
        }
        btn.dataset.confirmPending = 'false';
        btn.textContent = 'Reset Progress';

        answeredState = {};
        currentQuestion = 1;

        document.querySelectorAll('#visualMcqContainer .quiz-option-card').forEach(c => {
            c.classList.remove('correct-answer', 'wrong-answer');
        });
        document.querySelectorAll('#visualMcqContainer .quiz-feedback').forEach(f => {
            f.style.display = 'none';
            f.innerHTML = '';
        });

        try {
            localStorage.removeItem(`${pageId}-visual-mcq`);
        } catch (e) {
            console.warn('Could not clear visual MCQ state:', e);
        }

        updateDisplay();
        console.log('✅ Visual MCQ reset complete');
    }

    window.resetVisualMcq = resetVisualMcq;

    // ── Persistence ───────────────────────────────────

    function saveState() {
        try {
            localStorage.setItem(`${pageId}-visual-mcq`, JSON.stringify({
                v: 1,
                current: currentQuestion,
                answered: answeredState
            }));
        } catch (e) {
            console.warn('Could not save visual MCQ state:', e);
        }
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(`${pageId}-visual-mcq`);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!parsed.v) return;
            currentQuestion = parsed.current || 1;
            answeredState   = parsed.answered || {};
        } catch (e) {
            console.warn('Could not load visual MCQ state:', e);
        }
    }

    // ── Helpers ───────────────────────────────────────

    function typeLabel(type) {
        return {
            fillblank: 'Fill the Blank',
            trace:     'Trace',
            output:    'Output Prediction',
            spotbug:   'Spot the Bug'
        }[type] || type;
    }

    function capitalize(s) {
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    }

    console.log('🚀 DSA visual MCQ module loaded');

})();
