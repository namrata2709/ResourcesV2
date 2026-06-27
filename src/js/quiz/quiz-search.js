// @ts-nocheck
!function () {
    'use strict';

    QuizEngine.prototype._initSearchFilter = function () {
        if (document.getElementById('quizSearchFilter')) return;

        const wrap = document.createElement('div');
        wrap.id = 'quizSearchFilter';
        wrap.className = 'quiz-search-filter';
        wrap.setAttribute('role', 'search');
        wrap.setAttribute('aria-label', 'Filter questions');
        wrap.innerHTML = `
            <div class="search-input-wrap">
                <span class="search-icon" aria-hidden="true">🔍</span>
                <input type="search"
                       id="quizSearchInput"
                       class="quiz-search-input"
                       placeholder="Search questions…"
                       aria-label="Search questions by keyword"
                       autocomplete="off"
                       spellcheck="false">
                <button class="search-clear-btn" id="quizSearchClear"
                        aria-label="Clear search" hidden>✕</button>
            </div>
            <select id="quizStatusFilter" class="quiz-status-select" aria-label="Filter by answer status">
                <option value="all">All questions</option>
                <option value="unanswered">Unanswered</option>
                <option value="correct">Correct</option>
                <option value="incorrect">Incorrect</option>
                <option value="flagged">Flagged</option>
            </select>
            <span class="search-count" id="quizSearchCount" aria-live="polite" aria-atomic="true"></span>
        `;
        this.container.parentNode.insertBefore(wrap, this.container);

        const input  = wrap.querySelector('#quizSearchInput');
        const select = wrap.querySelector('#quizStatusFilter');
        const clear  = wrap.querySelector('#quizSearchClear');

        input.addEventListener('input', () => {
            this._searchQuery = input.value.trim().toLowerCase();
            clear.hidden = !this._searchQuery;
            clearTimeout(this._searchDebounce);
            this._searchDebounce = setTimeout(() => this._applySearchFilter(), 200);
        });

        clear.addEventListener('click', () => {
            input.value = '';
            this._searchQuery = '';
            clear.hidden = true;
            this._applySearchFilter();
            input.focus();
        });

        select.addEventListener('change', () => {
            this._statusFilter = select.value;
            this._applySearchFilter();
        });
    };

    QuizEngine.prototype._applySearchFilter = function () {
        const cards = this.container.querySelectorAll('.question-card');
        const total = cards.length;
        let visible = 0;

        cards.forEach(card => {
            const qid = parseInt(card.dataset.questionId);
            const q   = this.data?.questions?.find(q => q.id === qid);
            if (!q) return;

            let matchesSearch = true;
            if (this._searchQuery) {
                const text = [q.question, ...q.options.map(o => o.text)].join(' ').toLowerCase();
                matchesSearch = text.includes(this._searchQuery);
            }

            let matchesStatus = true;
            const answered  = !!this.state.answeredQuestions[qid];
            const correct   = answered && this._isQuestionCorrect(qid);
            const flagged   = !!this.state.flags[qid];

            switch (this._statusFilter) {
                case 'unanswered': matchesStatus = !answered; break;
                case 'correct':    matchesStatus = correct;   break;
                case 'incorrect':  matchesStatus = answered && !correct; break;
                case 'flagged':    matchesStatus = flagged;   break;
            }

            const show = matchesSearch && matchesStatus;
            card.classList.toggle('search-hidden', !show);
            if (show) visible++;
        });

        const counter = document.getElementById('quizSearchCount');
        if (counter) {
            counter.textContent = (this._searchQuery || this._statusFilter !== 'all')
                ? `${visible} of ${total} question${total !== 1 ? 's' : ''}`
                : '';
        }
    };

}();
