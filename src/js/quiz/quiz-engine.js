// @ts-nocheck
class QuizEngine {
    constructor(containerId) {
        this.container  = document.getElementById(containerId);
        this.data       = null;
        this.quizFile   = null;

        this.state = {
            selectedAnswers:   {},
            answeredQuestions: {},
            bookmarks:         {},
            questionOrder:     [],
        };

        this._timerEl           = null;
        this._timerInterval     = null;
        this._elapsedSeconds    = 0;
        this._timerStarted      = false;
        this._bookmarkFilterActive = false;
        this._optionOrder       = {};
        this._swipeTouchStartX  = 0;
        this._swipeTouchStartY  = 0;
        this._searchQuery       = '';
        this._statusFilter      = 'all';
        this._searchDebounce    = null;
        this.state.flags        = {};
        this._studyMode         = false;
        this.state.ratings      = {};
        this._explanationFields = [
            ['Key Points',          'keyPoints'],
            ['Examples',            'examples'],
            ['summary',             'summary'],
            ['Analogy',             'analogy'],
            ['Comparison',          'comparison'],
            ['Key Distinction',     'keyDistinction'],
            ['Common Confusion',    'confusion'],
            ['Identification',      'identification'],
            ['Performance Impact',  'performanceImpact'],
            ['Additional Info',     'additionalInfo'],
        ];
        this._toast       = null;
        this._liveRegion  = null;
    }

    /* ── Toast ── */
    _getToast() {
        if (!this._toast) {
            this._toast = document.createElement('div');
            this._toast.className = 'quiz-toast';
            this._toast.setAttribute('role', 'status');
            document.body.appendChild(this._toast);
        }
        return this._toast;
    }
    _showToast(msg) {
        const t = this._getToast();
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
    }

    /* ── ARIA live region ── */
    _getLiveRegion() {
        if (!this._liveRegion) {
            this._liveRegion = document.createElement('div');
            this._liveRegion.setAttribute('aria-live', 'polite');
            this._liveRegion.setAttribute('aria-atomic', 'true');
            this._liveRegion.className = 'sr-only';
            document.body.appendChild(this._liveRegion);
        }
        return this._liveRegion;
    }
    _announce(msg) {
        const r = this._getLiveRegion();
        r.textContent = '';
        requestAnimationFrame(() => { r.textContent = msg; });
    }

    /* ── localStorage ── */
    _storageKey() { return `quiz_progress_${this.quizFile}`; }

    _saveState() {
        if (!this.quizFile) return;
        try {
            const s = {
                selectedAnswers:   this.state.selectedAnswers,
                answeredQuestions: this.state.answeredQuestions,
                bookmarks:         this.state.bookmarks,
                flags:             this.state.flags,
                ratings:           this.state.ratings,
                questionOrder:     this.data.questions.map(q => q.id),
                optionOrder:       this._optionOrder,
                elapsedSeconds:    this._elapsedSeconds,
                studyMode:         this._studyMode,
                savedAt:           Date.now(),
            };
            localStorage.setItem(this._storageKey(), JSON.stringify(s));
        } catch (e) {}
    }

    _loadSavedState() {
        if (!this.quizFile) return null;
        try {
            const raw = localStorage.getItem(this._storageKey());
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    _clearSavedState() {
        if (!this.quizFile) return;
        try { localStorage.removeItem(this._storageKey()); } catch (e) {}
    }

    _showResumeBanner(saved) {
        const answered = Object.keys(saved.answeredQuestions).length;
        const total    = this.data.questions.length;
        const timeStr  = this._formatTime(saved.elapsedSeconds || 0);
        const dateStr  = new Date(saved.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        const banner = document.createElement('div');
        banner.id = 'quizResumeBanner';
        banner.className = 'quiz-resume-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Quiz progress saved');
        banner.innerHTML = `
            <div class="resume-info">
                <span class="resume-icon" aria-hidden="true">💾</span>
                <div class="resume-text">
                    <strong>Progress saved</strong>
                    <span>${answered} / ${total} answered · ${timeStr} · ${dateStr}</span>
                </div>
            </div>
            <div class="resume-actions">
                <button class="resume-btn resume-continue" id="resumeContinueBtn"
                        aria-label="Resume quiz from ${answered} of ${total} answered">Resume</button>
                <button class="resume-btn resume-fresh" id="resumeFreshBtn"
                        aria-label="Discard saved progress and start fresh">Start fresh</button>
            </div>
        `;
        this.container.parentNode.insertBefore(banner, this.container);

        return new Promise(resolve => {
            document.getElementById('resumeContinueBtn').addEventListener('click', () => { banner.remove(); resolve(true); });
            document.getElementById('resumeFreshBtn').addEventListener('click', () => { this._clearSavedState(); banner.remove(); resolve(false); });
        });
    }

    /* ── Timer ── */
    _formatTime(secs) {
        return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
    }

    _startTimer() {
        if (this._timerInterval) return;
        const el = document.getElementById('quizTimer');
        if (el) delete el.dataset.idle;
        this._timerInterval = setInterval(() => {
            this._elapsedSeconds++;
            this._updateTimerDisplay();
            if (this._elapsedSeconds % 10 === 0) this._saveState();
        }, 1000);
        document.removeEventListener('visibilitychange', this._handleVisibility);
        document.addEventListener('visibilitychange', this._handleVisibility);
    }

    _handleVisibility = () => {
        if (document.hidden) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
        } else {
            this._startTimer();
        }
    };

    _updateTimerDisplay() {
        if (!this._timerEl || !this._timerEl.isConnected) {
            this._timerEl = document.getElementById('timerValue');
        }
        if (this._timerEl) this._timerEl.textContent = this._formatTime(this._elapsedSeconds);
    }

    _initTimer() {
        const existing = document.getElementById('quizTimer');
        if (existing) {
            this._timerEl = document.getElementById('timerValue') ?? existing.querySelector('.timer-value');
            return;
        }
        const el = document.createElement('div');
        el.id = 'quizTimer';
        el.className = 'quiz-timer';
        el.setAttribute('aria-label', 'Time elapsed');
        el.innerHTML = '<span class="timer-icon" aria-hidden="true">⏱</span><span class="timer-value" id="timerValue">0:00</span>';
        el.dataset.idle = '';
        const bar = document.getElementById('quizProgressBar');
        if (bar) {
            bar.appendChild(el);
        } else {
            const anchor = document.getElementById('quizNavigator') ?? this.container ?? document.body;
            anchor.parentNode ? anchor.parentNode.insertBefore(el, anchor) : document.body.appendChild(el);
        }
        this._timerEl = document.getElementById('timerValue');
    }

    /* ── Theme guard ── */
    _applyThemeGuard() {
        try {
            const t = localStorage.getItem('theme');
            const root = document.documentElement;
            if (t && !root.getAttribute('data-theme')) root.setAttribute('data-theme', t);
        } catch (e) {}
    }

    /* ── Load from JSON ── */
    async loadFromJSON(url) {
        this._applyThemeGuard();
        const m = url.match(/\/([^/]+)\.json$/);
        this.quizFile = m ? m[1] : url;

        try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`Failed to load: ${url}`);
            this.data = await resp.json();

            const saved = this._loadSavedState();
            let resumed = false;

            if (saved && Object.keys(saved.answeredQuestions || {}).length > 0) {
                const loader = document.getElementById('pageLoader');
                if (loader) loader.classList.add('hidden');
                resumed = await this._showResumeBanner(saved);
            }

            if (resumed) {
                const byId = {};
                this.data.questions.forEach(q => { byId[q.id] = q; });
                const ordered = saved.questionOrder.map(id => byId[id]).filter(Boolean);
                const seen = new Set(saved.questionOrder);
                this.data.questions.forEach(q => { if (!seen.has(q.id)) ordered.push(q); });
                this.data.questions = ordered;
                this.data.questions.forEach((q, i) => { q.displayNumber = i + 1; });

                this.state.selectedAnswers   = saved.selectedAnswers   || {};
                this.state.answeredQuestions = saved.answeredQuestions  || {};
                this.state.bookmarks         = saved.bookmarks          || {};
                this.state.flags             = saved.flags              || {};
                this.state.ratings           = saved.ratings            || {};
                this._optionOrder            = saved.optionOrder        || {};
                this._elapsedSeconds         = saved.elapsedSeconds     || 0;
                this._studyMode              = saved.studyMode          || false;
            } else {
                this.shuffleQuestions();
                this.shuffleOptions();
            }

            this.renderQuestions();
            this._initProgressBar();
            this._initTimer();
            this._initNavigator();
            this._initScoreBadge();
            this._initShuffleBtn();
            this._initBookmarkFilterBtn();
            this._initKeyboardNav();
            this._initSwipe();
            this._initHistoryBtn();
            this._initSearchFilter();
            this._initWeakAreasBtn();
            this._initStudyModeBtn();
            this._initShowAllAnswers();
            this._initTimedMode();
            this._initPrintPicker();
            this._updateAll();

            if (this._studyMode) {
                const btn = document.getElementById('quizStudyModeBtn');
                if (btn) { btn.classList.add('active'); btn.setAttribute('aria-pressed', 'true'); }
            }

            if (resumed && this._elapsedSeconds > 0) {
                this._updateTimerDisplay();
                if (this._answeredCount() < this._totalQuestions()) {
                    this._startTimer();
                    this._timerStarted = true;
                }
            }

            this._applyBookmarkFilter();
            const loader = document.getElementById('pageLoader');
            if (loader) loader.classList.add('hidden');

        } catch (e) {
            this.container.innerHTML = `
                <div class="quiz-error-state">
                    <div class="quiz-error-icon" aria-hidden="true">⚠️</div>
                    <h2 class="quiz-error-title">Failed to load quiz</h2>
                    <p class="quiz-error-file">Could not fetch <code>${url}</code></p>
                    <p class="quiz-error-detail">${e.message || 'Network error or file not found.'}</p>
                    <div class="quiz-error-tip">
                        <strong>💡 Running locally?</strong> GitHub Pages won't serve files opened directly from disk.
                        Start a local server instead:<br>
                        <code>npx serve .</code> &nbsp;or&nbsp; <code>python -m http.server 8080</code>
                    </div>
                    <a href="quiz-index.html" class="quiz-error-back">← Back to Quiz List</a>
                </div>
            `;
            const loader = document.getElementById('pageLoader');
            if (loader) loader.classList.add('hidden');
        }
    }

    /* ── Shuffle questions ── */
    shuffleQuestions() {
        if (!this.data?.questions) return;
        const qs = this.data.questions;
        for (let i = qs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [qs[i], qs[j]] = [qs[j], qs[i]];
        }
        qs.forEach((q, i) => { q.displayNumber = i + 1; });
    }

    /* ── Shuffle options (P4-1) ── */
    shuffleOptions() {
        if (!this.data?.questions) return;
        this._optionOrder = {};
        for (const q of this.data.questions) {
            const ids = q.options.map(o => o.id);
            for (let i = ids.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [ids[i], ids[j]] = [ids[j], ids[i]];
            }
            this._optionOrder[q.id] = ids;
        }
    }

    /* ── Get options in (shuffled) display order ── */
    _getOrderedOptions(question) {
        const order = this._optionOrder[question.id];
        if (!order) return question.options;
        return order.map(id => question.options.find(o => o.id === id)).filter(Boolean);
    }

    /* ── Rebuild navigator after shuffle ── */
    _rebuildNavigator() {
        const existing = document.getElementById('quizNavigator');
        if (existing) existing.remove();
        const hint = document.querySelector('.swipe-hint');
        if (hint) hint.remove();
        this._initNavigator();
    }

    /* ── Keyboard nav ── */
    _initKeyboardNav() {
        this._focusedQuestionId = null;
        this.container.addEventListener('focusin', e => {
            const card = e.target.closest('.question-card');
            if (card) this._focusedQuestionId = parseInt(card.dataset.questionId);
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') { document.activeElement?.classList.contains('option') && document.activeElement.blur(); return; }
            const tag = document.activeElement?.tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            const map = { '1': 0, '2': 1, '3': 2, '4': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3, 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
            if (!(e.key in map)) return;

            if (this._focusedQuestionId === null) {
                const q = this.data?.questions?.find(q => !this.state.answeredQuestions[q.id]);
                if (!q) return;
                this._focusedQuestionId = q.id;
            }
            const question = this.data?.questions?.find(q => q.id === this._focusedQuestionId);
            if (!question) return;

            const idx = map[e.key];
            const opt = this._getOrderedOptions(question)[idx];
            if (!opt) return;
            e.preventDefault();
            this.selectOption(question.id, opt.id, true === question.multiSelect);
            const card = this.container.querySelector(`.question-card[data-question-id="${question.id}"]`);
            card?.querySelectorAll('.option')[idx]?.focus();
        });
    }

    /* ── Score helpers ── */
    _totalQuestions()  { return this.data?.questions?.length ?? 0; }
    _answeredCount()   { return Object.keys(this.state.answeredQuestions).length; }

    _isQuestionCorrect(qid) {
        const q = this.data.questions.find(q => q.id === qid);
        if (!q) return false;
        const selected = this.state.selectedAnswers[qid];
        const correct  = q.options.filter(o => o.isCorrect).map(o => o.id);
        if (q.multiSelect) {
            return Array.isArray(selected) && correct.length === selected.length && correct.every(id => selected.includes(id));
        }
        return correct.includes(selected);
    }

    _correctCount() {
        return Object.keys(this.state.answeredQuestions).filter(id => this._isQuestionCorrect(parseInt(id))).length;
    }

    /* ── Progress bar ── */
    _initProgressBar() {
        if (document.getElementById('quizProgressBar')) return;
        const bar = document.createElement('div');
        bar.id = 'quizProgressBar';
        bar.className = 'quiz-progress-bar';
        bar.innerHTML = `
            <div class="quiz-progress-track">
                <div class="quiz-progress-fill" id="quizProgressFill"
                     role="progressbar" aria-valuemin="0"
                     aria-valuemax="${this._totalQuestions()}"
                     aria-valuenow="0"></div>
            </div>
            <span class="quiz-progress-label" id="quizProgressLabel">0 / ${this._totalQuestions()} answered</span>
        `;
        this.container.parentNode.insertBefore(bar, this.container);
    }

    _updateProgressBar() {
        const fill  = document.getElementById('quizProgressFill');
        const label = document.getElementById('quizProgressLabel');
        if (!fill || !label) return;
        const answered = this._answeredCount();
        const total    = this._totalQuestions();
        const pct      = total > 0 ? (answered / total) * 100 : 0;
        fill.style.width = `${pct}%`;
        label.textContent = `${answered} / ${total} answered`;
        fill.setAttribute('aria-valuenow', answered);
    }

    /* ── Navigator ── */
    _initNavigator() {
        if (document.getElementById('quizNavigator')) return;
        const nav = document.createElement('nav');
        nav.id = 'quizNavigator';
        nav.className = 'quiz-navigator';
        nav.setAttribute('aria-label', 'Question navigation');
        nav.innerHTML = this.data.questions.map((q, i) => `
            <button class="quiz-nav-dot"
                    data-qid="${q.id}"
                    aria-label="Question ${i + 1}"
                    title="Question ${i + 1}">
                ${i + 1}
            </button>
        `).join('');

        const bar = document.getElementById('quizProgressBar');
        if (bar) bar.after(nav);
        else this.container.parentNode.insertBefore(nav, this.container);

        const hint = document.createElement('div');
        hint.className = 'swipe-hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = '← swipe to navigate →';
        nav.after(hint);

        nav.addEventListener('click', e => {
            const dot = e.target.closest('.quiz-nav-dot');
            if (!dot) return;
            const card = this.container.querySelector(`.question-card[data-question-id="${dot.dataset.qid}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                card.classList.add('nav-highlight');
                setTimeout(() => card.classList.remove('nav-highlight'), 800);
                this._focusedQuestionId = parseInt(dot.dataset.qid);
            }
        });
    }

    /* ── Update navigator dots (with flag state) ── */
    _updateNavigator() {
        const nav = document.getElementById('quizNavigator');
        if (!nav) return;
        nav.querySelectorAll('.quiz-nav-dot').forEach(btn => {
            const qid = parseInt(btn.dataset.qid);
            btn.classList.remove('answered-correct', 'answered-wrong', 'unanswered', 'bookmarked', 'flagged-confusing', 'flagged-incorrect');
            if (this.state.answeredQuestions[qid]) {
                btn.classList.add(this._isQuestionCorrect(qid) ? 'answered-correct' : 'answered-wrong');
            } else {
                btn.classList.add('unanswered');
            }
            if (this.state.bookmarks[qid]) btn.classList.add('bookmarked');
            const flag = this.state.flags[qid];
            if (flag) btn.classList.add('flagged-' + flag);
        });
    }

    /* ── Update all indicators ── */
    _updateAll(changedQuestionId = null) {
        this._updateProgressBar();
        this._updateNavigator();
        this._updateScoreBadge();

        if (changedQuestionId !== null) {
            this._updateQuestionBadge(changedQuestionId);
            this._addNextButton(changedQuestionId);
        }

        if (this._showAllActive) this._applyShowAll();

        if (this._answeredCount() === this._totalQuestions() && this._totalQuestions() > 0 && !this._studyMode) {
            clearInterval(this._timerInterval);
            this._timerInterval = null;
            this._saveState();
            setTimeout(() => this._showScoreSummary(), 400);
        }
    }

    /* ── Score summary ── */
    _showScoreSummary() {
        if (document.getElementById('quizSummary')) return;
        const total   = this._totalQuestions();
        const correct = this._correctCount();
        const pct     = Math.round((correct / total) * 100);
        const passed  = pct >= 70;
        const timeStr = this._formatTime(this._elapsedSeconds);

        const summary = document.createElement('div');
        summary.id = 'quizSummary';
        summary.className = 'quiz-summary ' + (passed ? 'summary-pass' : 'summary-fail');
        summary.setAttribute('role', 'region');
        summary.setAttribute('aria-label', 'Quiz results');
        summary.innerHTML = `
            <div class="summary-icon">${passed ? '🎉' : '📚'}</div>
            <h2 class="summary-title">${passed ? 'Well done!' : 'Keep practising!'}</h2>
            <div class="summary-score">${correct} / ${total}</div>
            <div class="summary-pct">${pct}%</div>
            <div class="summary-time">⏱ Time: ${timeStr}</div>
            <div class="summary-bar-wrap">
                <div class="summary-bar-fill" style="width: ${pct}%"></div>
            </div>
            <p class="summary-message">
                ${passed
                    ? `You passed with ${pct}%. ${total - correct > 0 ? `Review the ${total - correct} missed question${total - correct > 1 ? 's' : ''}.` : 'Perfect score!'}`
                    : `You scored ${pct}%. You need 70% to pass. Review the explanations and try again.`}
            </p>
            <button class="summary-retry-btn" id="summaryRetryBtn">🔄 Retry Quiz</button>
        `;
        this.container.appendChild(summary);
        setTimeout(() => summary.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);

        this._recordAttempt();
        this._initHistoryBtn();
        this._injectExportButtons(summary);

        document.getElementById('summaryRetryBtn').addEventListener('click', () => {
            this._clearSavedState();
            window.location.reload();
        });

        this._announce(`Quiz complete. ${correct} out of ${total}, ${pct} percent. ${passed ? 'Passed.' : 'Not passed.'} Time: ${timeStr}.`);
    }

    /* ── Question result badge ── */
    _updateQuestionBadge(qid) {
        const card = this.container.querySelector(`.question-card[data-question-id="${qid}"]`);
        if (!card) return;
        card.querySelector('.question-result-badge')?.remove();
        if (!this.state.answeredQuestions[qid]) return;
        const correct = this._isQuestionCorrect(qid);
        const badge = document.createElement('div');
        badge.className = 'question-result-badge ' + (correct ? 'badge-correct' : 'badge-wrong');
        badge.textContent = correct ? '✓' : '✗';
        badge.setAttribute('aria-label', correct ? 'Correct' : 'Incorrect');
        card.querySelector('.question-header').appendChild(badge);
    }

    /* ── Next button ── */
    _addNextButton(qid) {
        const card = this.container.querySelector(`.question-card[data-question-id="${qid}"]`);
        if (!card) return;
        card.querySelector('.quiz-next-btn')?.remove();
        const qs   = this.data.questions;
        const idx  = qs.findIndex(q => q.id === qid);
        const next = qs.slice(idx + 1).find(q => !this.state.answeredQuestions[q.id]);
        if (!next) return;
        const btn = document.createElement('button');
        btn.className = 'quiz-next-btn';
        btn.textContent = 'Next question →';
        btn.setAttribute('aria-label', `Go to question ${next.displayNumber}`);
        btn.addEventListener('click', () => {
            const nextCard = this.container.querySelector(`.question-card[data-question-id="${next.id}"]`);
            if (nextCard) {
                nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                nextCard.querySelector('.option')?.focus();
                this._focusedQuestionId = next.id;
            }
        });
        card.appendChild(btn);
    }

    /* ── Reset single question ── */
    _resetQuestion(questionId) {
        delete this.state.selectedAnswers[questionId];
        delete this.state.answeredQuestions[questionId];
        delete this.state.ratings[questionId];

        const summary = document.getElementById('quizSummary');
        if (summary) summary.remove();

        const card = this.container.querySelector(`.question-card[data-question-id="${CSS.escape(String(questionId))}"]`);
        if (card) {
            card.querySelector('.question-result-badge')?.remove();
            card.querySelector('.quiz-next-btn')?.remove();
        }

        this.renderSpecificQuestion(questionId);
        this._updateAll(questionId);
        this._saveState();
        this._announce(`Question ${questionId} reset. Select a new answer.`);
    }

    /* ── Render ── */
    renderQuestions() {
        if (this.data?.questions?.length) {
            this.container.innerHTML = this.data.questions.map(q => this.renderQuestion(q)).join('');
            this.attachEventListeners();
            if (this._bookmarkFilterActive) this._applyBookmarkFilter();
        } else {
            this.container.innerHTML = '<div class="loading">No questions available.</div>';
        }
    }

    renderQuestion(q) {
        const isMulti    = true === q.multiSelect;
        const selected   = this.state.selectedAnswers[q.id];
        const num        = q.displayNumber ?? q.id;
        const bookmarked = !!this.state.bookmarks[q.id];
        const flag       = this.state.flags[q.id] || null;
        const flagIcon   = flag === 'confusing' ? '🚩' : flag === 'incorrect' ? '⛳' : '🚩';
        const flagLabel  = flag === 'confusing' ? 'Flagged as confusing' : flag === 'incorrect' ? 'Flagged as incorrect' : 'Flag this question';

        let multiHint = '';
        if (isMulti) {
            const count = q.options?.filter(o => o.isCorrect).length ?? 2;
            multiHint = `<small class="multi-select-hint">(Select ${['', 'ONE', 'TWO', 'THREE', 'FOUR'][count] ?? count})</small>`;
        }

        const role    = isMulti ? 'group' : 'radiogroup';
        const answered = !!this.state.answeredQuestions[q.id];
        const rating   = this.state.ratings[q.id] || null;
        const studyRating = this._studyMode && answered ? this._renderStudyRating(q.id, rating) : '';
        const diff     = q.difficulty ?? null;
        const diffBadge = diff ? `<span class="difficulty-badge diff-${diff.toLowerCase()}" aria-label="Difficulty: ${diff}">${diff}</span>` : '';

        return `
            <div class="question-card${flag ? ' flagged-' + flag : ''}" data-question-id="${q.id}">
                <div class="question-header">
                    <div class="question-number"
                         role="heading" aria-level="3"
                         aria-label="Question ${num}"
                         aria-hidden="true">${num}</div>
                    <div class="question-text" id="question-label-${q.id}">
                        ${q.question}${multiHint ? `<br>${multiHint}` : ''}
                        ${diffBadge}
                    </div>
                    <button class="bookmark-btn ${bookmarked ? 'bookmarked' : ''}"
                            data-qid="${q.id}"
                            aria-pressed="${bookmarked}"
                            aria-label="Bookmark question ${num}"
                            title="${bookmarked ? 'Remove bookmark' : 'Bookmark this question'}">🔖</button>
                    <button class="flag-btn ${flag ? 'flagged flag-' + flag : ''}"
                            data-qid="${q.id}"
                            aria-pressed="${flag ? 'true' : 'false'}"
                            aria-label="${flagLabel} ${num}"
                            title="${flagLabel}">${flagIcon}</button>
                </div>
                <div class="options-list"
                     role="${role}"
                     aria-labelledby="question-label-${q.id}">
                    ${this._getOrderedOptions(q).map((opt, idx) => this.renderOption(q.id, opt, isMulti, selected, idx)).join('')}
                </div>
                ${studyRating}
                ${answered && !this._studyMode ? `
                    <div class="question-reset-wrap">
                        <button class="question-reset-btn" data-qid="${q.id}"
                                aria-label="Reset question ${num} — clear your answer">
                            ↺ Reset answer
                        </button>
                    </div>` : ''}
            </div>
        `;
    }

    renderOption(qid, opt, isMulti, selected, idx) {
        const isSelected   = isMulti ? (Array.isArray(selected) && selected.includes(opt.id)) : selected === opt.id;
        const answered     = !!this.state.answeredQuestions[qid];
        const curSelected  = this.state.selectedAnswers[qid];
        const correctCount = this._getCorrectCount(qid);
        const maxReached   = isMulti && Array.isArray(curSelected) && curSelected.length >= correctCount && !isSelected;
        const locked       = !isMulti && answered && !this._studyMode;
        const disabled     = maxReached || locked;

        let cls = 'option';
        if (isSelected) cls += opt.isCorrect ? ' correct' : ' incorrect';
        if (maxReached) cls += ' max-reached';
        if (locked && !isSelected) cls += ' locked';

        let icon = ['A', 'B', 'C', 'D', 'E', 'F'][idx] ?? String(idx + 1);
        if (isSelected) icon = opt.isCorrect ? '✓' : '✗';

        const role     = isMulti ? 'checkbox' : 'radio';
        const checked  = isSelected ? 'true' : 'false';
        const ariaDisabled = disabled ? 'true' : 'false';

        return `
            <div class="${cls}"
                 data-question-id="${qid}"
                 data-option-id="${opt.id}"
                 data-is-correct="${opt.isCorrect}"
                 data-multi-select="${isMulti}"
                 data-option-index="${idx}"
                 role="${role}"
                 aria-checked="${checked}"
                 aria-disabled="${ariaDisabled}"
                 tabindex="${disabled ? '-1' : '0'}">
                <div class="option-icon" aria-hidden="true">${icon}</div>
                <div class="option-text">${opt.text}</div>
            </div>
            ${isSelected ? this.renderExplanation(opt) : ''}
            ${!isSelected && opt.isCorrect ? `<div class="explanation correct print-only" data-print-explanation="correct">${this._renderExplanationInner(opt)}</div>` : ''}
            ${isSelected || opt.isCorrect ? '' : `<div class="explanation incorrect print-only" data-print-explanation="incorrect">${this._renderExplanationInner(opt)}</div>`}
        `;
    }

    renderExplanation(opt) {
        const exp = opt.explanation;
        if (!exp) return '';
        return `<div class="${opt.isCorrect ? 'explanation correct' : 'explanation incorrect'}">
            <div class="explanation-text"><strong>${opt.isCorrect ? '✓ Why this is correct:' : '✗ Why this is incorrect:'}</strong><br>${exp.why || ''}</div>
            ${this._renderExplanationInner(opt)}
        </div>`;
    }

    _renderExplanationInner(opt) {
        const exp = opt.explanation;
        if (!exp) return '';

        const known = new Set(this._explanationFields.map(([, k]) => k));
        known.add('learnMore'); known.add('summary'); known.add('why');

        let html = '';
        for (const [label, key] of this._explanationFields) {
            const val = exp[key];
            if (!val) continue;
            if (Array.isArray(val) && val.length > 0) {
                html += `<div class="explanation-text"><strong>${label}:</strong>
                    <ul style="margin:0.5rem 0 0 1.5rem;">${val.map(v => `<li>${v}</li>`).join('')}</ul>
                </div>`;
            } else if (typeof val === 'string' && val.trim()) {
                html += `<div class="explanation-text"><strong>${label}:</strong> ${key === 'comparison' ? val.replace(/\n/g, '<br>') : val}</div>`;
            }
        }

        for (const [key, val] of Object.entries(exp)) {
            if (known.has(key) || !val) continue;
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
            if (Array.isArray(val) && val.length > 0) {
                html += `<div class="explanation-text"><strong>${label}:</strong>
                    <ul style="margin:0.5rem 0 0 1.5rem;">${val.map(v => `<li>${v}</li>`).join('')}</ul>
                </div>`;
            } else if (typeof val === 'string' && val.trim()) {
                html += `<div class="explanation-text"><strong>${label}:</strong> ${val}</div>`;
            }
        }

        if (exp.learnMore?.length > 0) {
            html += '<div class="learn-more-links" style="margin-top:0.75rem;">';
            for (const link of exp.learnMore) {
                html += `<a href="${link.url}" target="_blank" rel="noopener noreferrer"
                            class="learn-more"
                            tabindex="0">${link.title} →</a><br>`;
            }
            html += '</div>';
        }
        return html;
    }

    /* ── Event listeners ── */
    attachEventListeners() {
        this.container.querySelectorAll('.option').forEach(el => {
            el.addEventListener('click', () => this._handleOptionClick(el));
            el.addEventListener('keydown', e => {
                if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this._handleOptionClick(el); }
            });
        });
        this.container.querySelectorAll('.bookmark-btn').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); this._toggleBookmark(parseInt(btn.dataset.qid)); });
        });
        this.container.querySelectorAll('.flag-btn').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); this._cycleFlag(parseInt(btn.dataset.qid)); });
        });
        this.container.querySelectorAll('.study-rating-btn').forEach(btn => {
            btn.addEventListener('click', () => this._setRating(parseInt(btn.dataset.qid), btn.dataset.rating));
        });
        this.container.querySelectorAll('.question-reset-btn').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); this._resetQuestion(parseInt(btn.dataset.qid)); });
        });
    }

    _handleOptionClick(el) {
        const qid   = parseInt(el.dataset.questionId);
        const optId = el.dataset.optionId;
        const multi = el.dataset.multiSelect === 'true';
        this._focusedQuestionId = qid;
        this.selectOption(qid, optId, multi);
    }

    selectOption(qid, optId, isMulti) {
        if (!this._timerStarted) { this._timerStarted = true; this._startTimer(); }

        if (isMulti) {
            if (!this.state.selectedAnswers[qid]) this.state.selectedAnswers[qid] = [];
            const arr  = this.state.selectedAnswers[qid];
            const idx  = arr.indexOf(optId);
            const need = this._getCorrectCount(qid);
            if (idx > -1) {
                arr.splice(idx, 1);
                delete this.state.answeredQuestions[qid];
            } else {
                if (arr.length >= need) {
                    const labels = ['', 'one', 'two', 'three', 'four'];
                    return this._showToast(`You can only select ${labels[need] ?? need} answer${need > 1 ? 's' : ''} for this question.`);
                }
                arr.push(optId);
                if (arr.length === need) this.state.answeredQuestions[qid] = true;
            }
        } else {
            this.state.selectedAnswers[qid]   = optId;
            this.state.answeredQuestions[qid] = true;
        }

        this.renderSpecificQuestion(qid);

        if (this.state.answeredQuestions[qid]) {
            const correct = this._isQuestionCorrect(qid);
            const q = this.data.questions.find(q => q.id === qid);
            this._announce(correct ? `Question ${q.displayNumber}: Correct!` : `Question ${q.displayNumber}: Incorrect. See the explanation below.`);
        }

        this._updateAll(qid);
        this._saveState();
    }

    _getCorrectCount(qid) {
        const q = this.data?.questions?.find(q => q.id === qid);
        return q?.options ? q.options.filter(o => o.isCorrect).length : 1;
    }

    renderSpecificQuestion(qid) {
        const q = this.data.questions.find(q => q.id === qid);
        if (!q) return;
        const old = this.container.querySelector(`.question-card[data-question-id="${CSS.escape(String(qid))}"]`);
        if (!old) return;

        const tmp = document.createElement('div');
        tmp.innerHTML = this.renderQuestion(q);
        const fresh = tmp.firstElementChild;
        old.replaceWith(fresh);

        fresh.querySelectorAll('.option').forEach(el => {
            el.addEventListener('click', () => this._handleOptionClick(el));
            el.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this._handleOptionClick(el); } });
        });
        const bm = fresh.querySelector('.bookmark-btn');
        if (bm) bm.addEventListener('click', e => { e.stopPropagation(); this._toggleBookmark(parseInt(bm.dataset.qid)); });
        const fl = fresh.querySelector('.flag-btn');
        if (fl) fl.addEventListener('click', e => { e.stopPropagation(); this._cycleFlag(parseInt(fl.dataset.qid)); });
        fresh.querySelectorAll('.study-rating-btn').forEach(btn => {
            btn.addEventListener('click', () => this._setRating(parseInt(btn.dataset.qid), btn.dataset.rating));
        });
        const rb = fresh.querySelector('.question-reset-btn');
        if (rb) rb.addEventListener('click', e => { e.stopPropagation(); this._resetQuestion(parseInt(rb.dataset.qid)); });
    }
}

window.QuizEngine = QuizEngine;

!function () {
    'use strict';
    const file = window.QuizPageFile;

    function init() {
        const engine = new QuizEngine('questionsContainer');
        const origLoad = engine.loadFromJSON.bind(engine);
        engine.loadFromJSON = async function (url) {
            await origLoad(url);
            const title = engine.data?.title;
            if (title) {
                const titleEl  = document.getElementById('pageTitle');
                const crumbEl  = document.querySelector('nav.breadcrumb li[aria-current="page"]');
                if (titleEl) titleEl.textContent = `📝 ${title}`;
                if (crumbEl) crumbEl.textContent = title;
                document.title = `${title} - Learning Dashboard`;
            }
        };
        engine.loadFromJSON(`data/quiz/${file}.json`);
    }

    if (file) {
        document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
    }
}();
