/**
 * =============================================================================
 * File: quiz-toolbar.js
 * Path: js/quiz/quiz-toolbar.js
 * Project: Learning Dashboard
 *
 * Description:
 * QuizEngine.prototype extensions for the quiz toolbar — shuffle
 * questions, bookmark filter, swipe navigation, attempt history (chart +
 * list, localStorage key: quiz_history_<quizFile>, capped at 20 entries),
 * live score badge, weak-areas-by-category breakdown, study mode, timed
 * countdown mode, and the show-all-answers reveal toggle. Requires
 * quiz-engine.js loaded first (extends its prototype).
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - js/quiz/quiz-engine.js (must load first)
 * =============================================================================
 */
!(function () {
    "use strict";
    ((QuizEngine.prototype._initShuffleBtn = function () {
        if (document.getElementById("quizShuffleBtn")) return;
        const t = document.createElement("button");
        ((t.id = "quizShuffleBtn"),
            (t.className = "quiz-toolbar-btn"),
            t.setAttribute("aria-label", "Shuffle question order"),
            (t.title = "Shuffle questions"),
            (t.innerHTML =
                '<span>🔀</span><span class="toolbar-btn-label">Shuffle</span>'),
            t.addEventListener("click", () => {
                const t = this._answeredCount();
                (t > 0 &&
                    !confirm(
                        `Shuffle will re-order the questions but keep your ${t} answered question(s). Continue?`,
                    )) ||
                    (this.shuffleQuestions(),
                        this.shuffleOptions(),
                        this.renderQuestions(),
                        this._rebuildNavigator(),
                        this._updateAll(),
                        this._saveState(),
                        this._applySearchFilter(),
                        this._showToast("Questions reshuffled!"));
            }),
            this._appendToToolbar(t));
    }),
        (QuizEngine.prototype._initBookmarkFilterBtn = function () {
            if (document.getElementById("quizBookmarkFilterBtn")) return;
            const t = document.createElement("button");
            ((t.id = "quizBookmarkFilterBtn"),
                (t.className = "quiz-toolbar-btn"),
                t.setAttribute("aria-label", "Show bookmarked questions only"),
                (t.title = "Show bookmarked questions"),
                (t.innerHTML =
                    '<span>🔖</span><span class="toolbar-btn-label">Bookmarks</span>'),
                t.addEventListener("click", () => {
                    ((this._bookmarkFilterActive = !this._bookmarkFilterActive),
                        t.classList.toggle("active", this._bookmarkFilterActive),
                        t.setAttribute("aria-pressed", String(this._bookmarkFilterActive)),
                        this._applyBookmarkFilter(),
                        this._announce(
                            this._bookmarkFilterActive
                                ? "Showing bookmarked questions only"
                                : "Showing all questions",
                        ));
                }),
                this._appendToToolbar(t));
        }),
        (QuizEngine.prototype._applyBookmarkFilter = function () {
            this.container.querySelectorAll(".question-card").forEach((t) => {
                const e = parseInt(t.dataset.questionId);
                this._bookmarkFilterActive && !this.state.bookmarks[e]
                    ? t.classList.add("bookmark-hidden")
                    : t.classList.remove("bookmark-hidden");
            });
            let t = this.container.querySelector(".bookmark-empty");
            this._bookmarkFilterActive &&
                0 === Object.keys(this.state.bookmarks).length
                ? t ||
                ((t = document.createElement("div")),
                    (t.className = "bookmark-empty loading"),
                    (t.textContent =
                        "No bookmarked questions yet. Click 🔖 on any question to bookmark it."),
                    this.container.prepend(t))
                : t?.remove();
        }),
        (QuizEngine.prototype._toggleBookmark = function (t) {
            this.state.bookmarks[t]
                ? delete this.state.bookmarks[t]
                : (this.state.bookmarks[t] = !0);
            const e = this.container.querySelector(
                `.question-card[data-question-id="${t}"]`,
            );
            if (e) {
                const n = e.querySelector(".bookmark-btn");
                if (n) {
                    const e = !!this.state.bookmarks[t];
                    (n.classList.toggle("bookmarked", e),
                        n.setAttribute("aria-pressed", String(e)),
                        (n.title = e ? "Remove bookmark" : "Bookmark this question"));
                }
            }
            (this._updateNavigator(),
                this._bookmarkFilterActive && this._applyBookmarkFilter(),
                this._saveState());
        }),
        (QuizEngine.prototype._appendToToolbar = function (t) {
            let e = document.getElementById("quizToolbar");
            if (!e) {
                ((e = document.createElement("div")),
                    (e.id = "quizToolbar"),
                    (e.className = "quiz-toolbar"),
                    e.setAttribute("role", "toolbar"),
                    e.setAttribute("aria-label", "Quiz controls"));
                const t = document.getElementById("quizNavigator");
                if (t) t.before(e);
                else {
                    const t = document.getElementById("quizProgressBar");
                    t
                        ? t.after(e)
                        : this.container.parentNode.insertBefore(e, this.container);
                }
            }
            e.appendChild(t);
        }),
        (QuizEngine.prototype._initSwipe = function () {
            (document.addEventListener(
                "touchstart",
                (t) => {
                    ((this._swipeTouchStartX = t.changedTouches[0].screenX),
                        (this._swipeTouchStartY = t.changedTouches[0].screenY));
                },
                { passive: !0 },
            ),
                document.addEventListener(
                    "touchend",
                    (t) => {
                        const e = t.changedTouches[0].screenX - this._swipeTouchStartX,
                            n = t.changedTouches[0].screenY - this._swipeTouchStartY;
                        if (Math.abs(e) < 50 || Math.abs(n) > Math.abs(e)) return;
                        const i = this.data?.questions;
                        if (!i?.length) return;
                        let s = null,
                            a = 1 / 0;
                        this.container.querySelectorAll(".question-card").forEach((t) => {
                            const e = t.getBoundingClientRect(),
                                n = Math.abs(e.top);
                            n < a && ((a = n), (s = parseInt(t.dataset.questionId)));
                        });
                        const o = i.findIndex((t) => t.id === s);
                        if (-1 === o) return;
                        let r = null;
                        if (
                            (e < 0
                                ? ((r = i
                                    .slice(o + 1)
                                    .find((t) => !this.state.answeredQuestions[t.id])),
                                    r || (r = i.find((t) => !this.state.answeredQuestions[t.id])))
                                : ((r = [...i.slice(0, o)]
                                    .reverse()
                                    .find((t) => !this.state.answeredQuestions[t.id])),
                                    r ||
                                    (r = [...i]
                                        .reverse()
                                        .find((t) => !this.state.answeredQuestions[t.id]))),
                                !r)
                        )
                            return;
                        const l = this.container.querySelector(
                            `.question-card[data-question-id="${r.id}"]`,
                        );
                        l &&
                            (l.scrollIntoView({ behavior: "smooth", block: "start" }),
                                (this._focusedQuestionId = r.id),
                                l.classList.add("swipe-highlight"),
                                setTimeout(() => l.classList.remove("swipe-highlight"), 600));
                    },
                    { passive: !0 },
                ));
        }),
        (QuizEngine.prototype._historyKey = function () {
            return `quiz_history_${this.quizFile}`;
        }),
        (QuizEngine.prototype._recordAttempt = function () {
            const t = this._totalQuestions(),
                e = this._correctCount(),
                n = Math.round((e / t) * 100),
                i = {
                    date: new Date().toISOString(),
                    score: e,
                    total: t,
                    pct: n,
                    timeSeconds: this._elapsedSeconds,
                    passed: n >= 70,
                };
            try {
                const t = localStorage.getItem(this._historyKey()),
                    e = t ? JSON.parse(t) : [];
                (e.push(i),
                    e.length > 20 && e.splice(0, e.length - 20),
                    localStorage.setItem(this._historyKey(), JSON.stringify(e)));
            } catch (t) { }
        }),
        (QuizEngine.prototype._loadHistory = function () {
            try {
                const t = localStorage.getItem(this._historyKey());
                return t ? JSON.parse(t) : [];
            } catch (t) {
                return [];
            }
        }),
        (QuizEngine.prototype._initHistoryBtn = function () {
            const t = this._loadHistory();
            if (0 === t.length) return;
            if (document.getElementById("quizHistoryBtn"))
                return void this._renderHistoryPanel(t);
            const e = document.createElement("button");
            ((e.id = "quizHistoryBtn"),
                (e.className = "quiz-toolbar-btn"),
                e.setAttribute("aria-label", "View attempt history"),
                e.setAttribute("aria-expanded", "false"),
                e.setAttribute("aria-controls", "quizHistoryPanel"),
                (e.title = "Past attempts"),
                (e.innerHTML =
                    '<span>📊</span><span class="toolbar-btn-label">History</span>'),
                e.addEventListener("click", () => {
                    const t = document.getElementById("quizHistoryPanel");
                    if (t) {
                        const n = t.classList.toggle("open");
                        (e.classList.toggle("active", n),
                            e.setAttribute("aria-expanded", String(n)));
                    }
                }),
                this._appendToToolbar(e),
                this._renderHistoryPanel(t));
        }),
        (QuizEngine.prototype._renderHistoryPanel = function (t) {
            const e = document.getElementById("quizHistoryPanel");
            e && e.remove();
            const n = document.createElement("div");
            ((n.id = "quizHistoryPanel"),
                (n.className = "quiz-history-panel"),
                n.setAttribute("role", "region"),
                n.setAttribute("aria-label", "Quiz attempt history"));
            const i = Math.max(...t.map((t) => t.pct)),
                s = Math.round(t.reduce((t, e) => t + e.pct, 0) / t.length),
                a = t.slice(-5);
            n.innerHTML = `\n            <div class="history-header">\n                <span class="history-title">📊 Attempt History</span>\n                <span class="history-meta">${t.length} attempt${t.length > 1 ? "s" : ""} · Best: ${i}% · Avg: ${s}%</span>\n            </div>\n            <div class="history-chart" aria-hidden="true">\n                ${a.map((t) => `\n                    <div class="history-bar-wrap" title="${t.pct}% on ${new Date(t.date).toLocaleDateString()}">\n                        <div class="history-bar ${t.passed ? "bar-pass" : "bar-fail"}"\n                             style="height: ${Math.max(t.pct, 4)}%">\n                        </div>\n                        <span class="history-bar-label">${t.pct}%</span>\n                    </div>\n                `).join("")}\n            </div>\n            <ul class="history-list" role="list" aria-label="Recent attempts">\n                ${[
                ...t,
            ]
                .reverse()
                .slice(0, 10)
                .map(
                    (t, e) =>
                        `\n                    <li class="history-row ${t.passed ? "row-pass" : "row-fail"}"\n                        aria-label="${t.passed ? "Passed" : "Failed"}: ${t.score} of ${t.total}, ${t.pct}%, ${this._formatTime(t.timeSeconds)}">\n                        <span class="history-badge" aria-hidden="true">${t.passed ? "✓" : "✗"}</span>\n                        <span class="history-score">${t.score}/${t.total}</span>\n                        <span class="history-pct">${t.pct}%</span>\n                        <span class="history-time">⏱ ${this._formatTime(t.timeSeconds)}</span>\n                        <span class="history-date">${new Date(t.date).toLocaleDateString(void 0, { month: "short", day: "numeric" })}</span>\n                    </li>\n                `,
                )
                .join("")}\n            </ul>\n        `;
            const o = document.getElementById("quizToolbar");
            o && o.after(n);
        }),
        (QuizEngine.prototype._initScoreBadge = function () {
            if (document.getElementById("quizScoreBadge")) return;
            const t = document.createElement("div");
            ((t.id = "quizScoreBadge"),
                (t.className = "quiz-score-badge"),
                t.setAttribute("aria-live", "polite"),
                t.setAttribute("aria-label", "Current score"),
                (t.innerHTML = `<span id="quizScoreText">0 / ${this._totalQuestions()} ✓</span>`),
                document.body.appendChild(t));
        }),
        (QuizEngine.prototype._updateScoreBadge = function () {
            const t = document.getElementById("quizScoreText");
            if (!t) return;
            const e = this._correctCount(),
                n = this._totalQuestions(),
                i = this._answeredCount();
            t.textContent = `${e} / ${n} ✓`;
            const s = document.getElementById("quizScoreBadge");
            if (s)
                if (0 === i) s.className = "quiz-score-badge";
                else {
                    const t = e / i;
                    (s.classList.remove("score-good", "score-ok", "score-poor"),
                        s.classList.add(
                            t >= 0.8 ? "score-good" : t >= 0.5 ? "score-ok" : "score-poor",
                        ));
                }
        }),
        (QuizEngine.prototype._initWeakAreasBtn = function () {
            if (document.getElementById("quizWeakAreasBtn")) return;
            const t = this.data?.questions?.some((t) => t.category || t.tags?.length);
            if (!t) return;
            const e = document.createElement("button");
            ((e.id = "quizWeakAreasBtn"),
                (e.className = "quiz-toolbar-btn"),
                e.setAttribute("aria-label", "View weak areas by category"),
                e.setAttribute("aria-expanded", "false"),
                e.setAttribute("aria-controls", "quizWeakAreasPanel"),
                (e.title = "Weak areas"),
                (e.innerHTML =
                    '<span aria-hidden="true">📉</span><span class="toolbar-btn-label">Weak areas</span>'),
                e.addEventListener("click", () => {
                    const t = document.getElementById("quizWeakAreasPanel");
                    if (!t) return;
                    const n = t.classList.toggle("open");
                    (e.classList.toggle("active", n),
                        e.setAttribute("aria-expanded", String(n)),
                        n && this._refreshWeakAreasPanel());
                }),
                this._appendToToolbar(e),
                this._renderWeakAreasPanel());
        }),
        (QuizEngine.prototype._getCategoryForQuestion = function (t) {
            return t.category ? t.category : t.tags?.length ? t.tags[0] : "General";
        }),
        (QuizEngine.prototype._renderWeakAreasPanel = function () {
            const t = document.getElementById("quizWeakAreasPanel");
            t && t.remove();
            const e = document.createElement("div");
            ((e.id = "quizWeakAreasPanel"),
                (e.className = "quiz-weak-areas-panel"),
                e.setAttribute("role", "region"),
                e.setAttribute("aria-label", "Weak areas by category"),
                (e.innerHTML =
                    '<div class="weak-areas-body" id="weakAreasBody">\n            <p class="weak-areas-placeholder">Answer at least 3 questions to see category breakdown.</p>\n        </div>'));
            const n = document.getElementById("quizToolbar");
            n && n.after(e);
        }),
        (QuizEngine.prototype._refreshWeakAreasPanel = function () {
            const t = document.getElementById("weakAreasBody");
            if (!t) return;
            const e = Object.keys(this.state.answeredQuestions);
            if (e.length < 3)
                return void (t.innerHTML =
                    '<p class="weak-areas-placeholder">Answer at least 3 questions to see category breakdown.</p>');
            const n = {};
            for (const t of this.data.questions) {
                if (!this.state.answeredQuestions[t.id]) continue;
                const e = this._getCategoryForQuestion(t);
                (n[e] || (n[e] = { correct: 0, total: 0 }),
                    n[e].total++,
                    this._isQuestionCorrect(t.id) && n[e].correct++);
            }
            const i = Object.entries(n)
                .map(([t, e]) => ({
                    cat: t,
                    ...e,
                    errorRate: (e.total - e.correct) / e.total,
                }))
                .sort((t, e) => e.errorRate - t.errorRate),
                s = i
                    .map((t) => {
                        const e = Math.round((t.correct / t.total) * 100),
                            n = e >= 80 ? "strong" : e >= 50 ? "ok" : "weak";
                        return `\n                <div class="weak-area-row" role="listitem">\n                    <div class="weak-area-label">\n                        <span class="weak-area-cat">${t.cat}</span>\n                        <span class="weak-area-stat">${t.correct}/${t.total} correct</span>\n                    </div>\n                    <div class="weak-area-bar-track" aria-hidden="true">\n                        <div class="weak-area-bar-fill wa-${n}" style="width:${e}%"></div>\n                    </div>\n                    <span class="weak-area-pct">${e}%</span>\n                </div>\n            `;
                    })
                    .join("");
            t.innerHTML = `\n            <p class="weak-areas-meta">${e.length} questions answered across ${i.length} categor${1 === i.length ? "y" : "ies"}</p>\n            <div class="weak-area-list" role="list" aria-label="Category scores">\n                ${s}\n            </div>\n        `;
        }),
        (QuizEngine.prototype._initStudyModeBtn = function () {
            if (document.getElementById("quizStudyModeBtn")) return;
            const t = document.createElement("button");
            ((t.id = "quizStudyModeBtn"),
                (t.className = "quiz-toolbar-btn"),
                t.setAttribute("aria-label", "Toggle study mode"),
                t.setAttribute("aria-pressed", String(this._studyMode)),
                (t.title = "Study mode"),
                (t.innerHTML =
                    '<span aria-hidden="true">📖</span><span class="toolbar-btn-label">Study</span>'),
                t.addEventListener("click", () => {
                    if (
                        ((this._studyMode = !this._studyMode),
                            t.classList.toggle("active", this._studyMode),
                            t.setAttribute("aria-pressed", String(this._studyMode)),
                            !this._studyMode && this._answeredCount() > 0)
                    )
                        return confirm(
                            "Exit study mode? This will reset all answers so you can take the quiz properly.",
                        )
                            ? (this._clearSavedState(), void window.location.reload())
                            : ((this._studyMode = !0),
                                t.classList.add("active"),
                                void t.setAttribute("aria-pressed", "true"));
                    (this._saveState(),
                        this.renderQuestions(),
                        this._applyBookmarkFilter(),
                        this._applySearchFilter());
                    const e = this._studyMode
                        ? "Study mode on. Answers can be changed freely."
                        : "Study mode off.";
                    (this._showToast(e), this._announce(e));
                }),
                this._appendToToolbar(t));
        }),
        (QuizEngine.prototype._renderStudyRating = function (t, e) {
            return `\n            <div class="study-rating" role="group" aria-label="Self-rating for question ${t}">\n                <span class="study-rating-label">How did you go?</span>\n                <button class="study-rating-btn ${"got-it" === e ? "rating-active" : ""}"\n                        data-qid="${t}" data-rating="got-it"\n                        aria-pressed="${"got-it" === e}"\n                        aria-label="Got it — I understood this question">✅ Got it</button>\n                <button class="study-rating-btn ${"still-learning" === e ? "rating-active" : ""}"\n                        data-qid="${t}" data-rating="still-learning"\n                        aria-pressed="${"still-learning" === e}"\n                        aria-label="Still learning — I need more practice on this">🔁 Still learning</button>\n            </div>\n        `;
        }),
        (QuizEngine.prototype._setRating = function (t, e) {
            const n = this.state.ratings[t];
            ((this.state.ratings[t] = n === e ? null : e),
                null === this.state.ratings[t] && delete this.state.ratings[t]);
            const i = this.container.querySelector(
                `.question-card[data-question-id="${t}"]`,
            );
            if (i) {
                const e = i.querySelector(".study-rating");
                if (e) {
                    const n = this.state.ratings[t] || null;
                    ((e.outerHTML = this._renderStudyRating(t, n)),
                        i.querySelectorAll(".study-rating-btn").forEach((t) => {
                            t.addEventListener("click", () =>
                                this._setRating(parseInt(t.dataset.qid), t.dataset.rating),
                            );
                        }));
                }
            }
            this._saveState();
        }),
        (QuizEngine.prototype._initShowAllAnswers = function () {
            if (document.getElementById("quizShowAllBtn")) return;
            const t = document.createElement("button");
            ((t.id = "quizShowAllBtn"),
                (t.className = "quiz-toolbar-btn"),
                t.setAttribute("aria-label", "Show all correct answers"),
                t.setAttribute("aria-pressed", "false"),
                (t.title = "Show all answers"),
                (t.innerHTML =
                    '<span aria-hidden="true">👁</span><span class="toolbar-btn-label">Show answers</span>'),
                (this._showAllActive = !1),
                t.addEventListener("click", () => {
                    ((this._showAllActive = !this._showAllActive),
                        t.classList.toggle("active", this._showAllActive),
                        t.setAttribute("aria-pressed", String(this._showAllActive)),
                        (t.querySelector(".toolbar-btn-label").textContent = this
                            ._showAllActive
                            ? "Hide answers"
                            : "Show answers"),
                        t.setAttribute(
                            "aria-label",
                            this._showAllActive
                                ? "Hide all correct answers"
                                : "Show all correct answers",
                        ),
                        this._applyShowAll());
                }),
                this._appendToToolbar(t));
        }),
        (QuizEngine.prototype._applyShowAll = function () {
            for (const t of this.data.questions) {
                if (!!this.state.answeredQuestions[t.id]) continue;
                const e = this.container.querySelector(
                    `.question-card[data-question-id="${CSS.escape(String(t.id))}"]`,
                );
                if (!e) continue;
                const n = e.querySelector(".show-all-reveal");
                if (this._showAllActive) {
                    if (n) continue;
                    const i = t.options.filter((t) => t.isCorrect);
                    if (!i.length) continue;
                    const s = document.createElement("div");
                    ((s.className = "show-all-reveal"),
                        s.setAttribute("aria-label", "Correct answer revealed"),
                        (s.innerHTML = i
                            .map(
                                (t) =>
                                    `\n                    <div class="explanation correct">\n                        <div class="explanation-header">\n                            <span class="explanation-icon" aria-hidden="true">✓</span>\n                            <strong>Correct answer: ${t.text}</strong>\n                        </div>\n                        ${this._renderExplanationInner(t)}\n                    </div>\n                `,
                            )
                            .join("")),
                        e.querySelector(".options-list").after(s));
                } else n?.remove();
            }
        }),
        (QuizEngine.prototype._initTimedMode = function () {
            if (document.getElementById("quizTimedModeBtn")) return;
            ((this._countdownSeconds = 0),
                (this._countdownInterval = null),
                (this._countdownEl = null));
            const t = document.createElement("button");
            ((t.id = "quizTimedModeBtn"),
                (t.className = "quiz-toolbar-btn"),
                t.setAttribute("aria-label", "Enable timed mode"),
                t.setAttribute("aria-expanded", "false"),
                (t.title = "Timed mode"),
                (t.innerHTML =
                    '<span aria-hidden="true">⏳</span><span class="toolbar-btn-label">Timed</span>'));
            const e = document.createElement("div");
            ((e.id = "quizTimedPicker"),
                (e.className = "quiz-timed-picker"),
                (e.hidden = !0),
                e.setAttribute("role", "dialog"),
                e.setAttribute("aria-label", "Choose countdown duration"),
                (e.innerHTML = `\n            <p class="timed-picker-label">Set a countdown timer:</p>\n            <div class="timed-picker-options">\n                ${[5, 10, 15, 20, 30].map((t) => `\n                    <button class="timed-pick-btn" data-minutes="${t}"\n                            aria-label="${t} minutes">${t} min</button>\n                `).join("")}\n            </div>\n            <button class="timed-cancel-btn" aria-label="Cancel timed mode">Cancel</button>\n        `),
                t.addEventListener("click", () => {
                    if (this._countdownInterval) return void this._stopCountdown();
                    const n = !1 === e.hidden;
                    ((e.hidden = n), t.setAttribute("aria-expanded", String(!n)));
                }),
                e.querySelectorAll(".timed-pick-btn").forEach((n) => {
                    n.addEventListener("click", () => {
                        const i = parseInt(n.dataset.minutes);
                        ((e.hidden = !0),
                            t.setAttribute("aria-expanded", "false"),
                            this._startCountdown(60 * i));
                    });
                }),
                e.querySelector(".timed-cancel-btn").addEventListener("click", () => {
                    ((e.hidden = !0), t.setAttribute("aria-expanded", "false"));
                }),
                this._appendToToolbar(t));
            const n = document.getElementById("quizToolbar");
            n
                ? n.after(e)
                : this.container.parentNode.insertBefore(e, this.container);
        }),
        (QuizEngine.prototype._startCountdown = function (t) {
            if (
                ((this._countdownSeconds = t),
                    !document.getElementById("quizCountdown"))
            ) {
                const t = document.getElementById("quizProgressBar"),
                    e = document.createElement("div");
                ((e.id = "quizCountdown"),
                    (e.className = "quiz-countdown"),
                    e.setAttribute("aria-live", "off"),
                    e.setAttribute("aria-label", "Countdown timer"),
                    (e.innerHTML =
                        '<span class="countdown-icon" aria-hidden="true">⏳</span><span class="countdown-value" id="countdownValue"></span>'),
                    t && t.appendChild(e),
                    (this._countdownEl = document.getElementById("countdownValue")));
            }
            this._updateCountdownDisplay();
            const e = document.getElementById("quizTimedModeBtn");
            (e &&
                (e.classList.add("active"),
                    (e.querySelector(".toolbar-btn-label").textContent = "Stop timer"),
                    e.setAttribute("aria-label", "Stop countdown timer")),
                (this._countdownInterval = setInterval(() => {
                    (this._countdownSeconds--,
                        this._updateCountdownDisplay(),
                        60 === this._countdownSeconds &&
                        this._announce("One minute remaining."),
                        30 === this._countdownSeconds &&
                        this._announce("30 seconds remaining."),
                        this._countdownSeconds <= 0 &&
                        (this._stopCountdown(),
                            this._announce("Time is up! Submitting your quiz."),
                            this._forceFinish()));
                }, 1e3)));
        }),
        (QuizEngine.prototype._stopCountdown = function () {
            (clearInterval(this._countdownInterval),
                (this._countdownInterval = null),
                (this._countdownSeconds = 0),
                document.getElementById("quizCountdown")?.remove(),
                (this._countdownEl = null));
            const t = document.getElementById("quizTimedModeBtn");
            t &&
                (t.classList.remove("active"),
                    (t.querySelector(".toolbar-btn-label").textContent = "Timed"),
                    t.setAttribute("aria-label", "Enable timed mode"));
        }),
        (QuizEngine.prototype._updateCountdownDisplay = function () {
            if (
                ((this._countdownEl && this._countdownEl.isConnected) ||
                    (this._countdownEl = document.getElementById("countdownValue")),
                    !this._countdownEl)
            )
                return;
            const t = this._countdownSeconds,
                e = Math.floor(t / 60),
                n = t % 60;
            this._countdownEl.textContent = `${e}:${String(n).padStart(2, "0")}`;
            const i = document.getElementById("quizCountdown");
            i && i.classList.toggle("countdown-urgent", t <= 60);
        }),
        (QuizEngine.prototype._forceFinish = function () {
            (clearInterval(this._timerInterval),
                (this._timerInterval = null),
                this._saveState(),
                this._showScoreSummary());
        }));
})();
QuizEngine.prototype._cycleFlag = function (qid) {
    const current = this.state.flags[qid] || null;
    const next =
        current === null
            ? "confusing"
            : current === "confusing"
                ? "incorrect"
                : null;
    if (next === null) {
        delete this.state.flags[qid];
    } else {
        this.state.flags[qid] = next;
    }
    this.renderSpecificQuestion(qid);
    this._updateNavigator();
    this._saveState();
    const msg =
        next === "confusing"
            ? "Flagged as confusing"
            : next === "incorrect"
                ? "Flagged as incorrect"
                : "Flag removed";
    this._showToast(msg);
    this._announce(msg);
};
