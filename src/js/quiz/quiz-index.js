/**
 * Quiz List Manager
 * Handles loading, filtering, sorting, and rendering of the quiz listing page.
 */

(function () {
    'use strict';

    let quizData     = [];
    let filteredData = [];

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        loadQuizList();
    }

    // ── Data ──────────────────────────────────────────────────────────────────

    async function loadQuizList() {
        try {
            const response = await fetch('data/index/quiz-index.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data   = await response.json();
            quizData     = data.Quizzes || [];
            filteredData = [...quizData];

            populateTopicFilter();
            sortQuizzes();
        } catch (error) {
            console.error('Error loading quiz list:', error);
            document.getElementById('quizListContainer').innerHTML = `
                <div class="error">
                    <h2>Error Loading Quizzes</h2>
                    <p>Could not load <code>data/index/quiz-index.json</code>. Please ensure the file exists.</p>
                    <p style="font-size:0.9em;margin-top:1rem;">
                        For local development, run:
                        <code style="background:rgba(0,0,0,0.1);padding:0.2rem 0.5rem;border-radius:4px;">
                            python -m http.server 8000
                        </code>
                    </p>
                </div>
            `;
        }
    }

    // ── Filter controls ───────────────────────────────────────────────────────

    function populateTopicFilter() {
        const topicFilter = document.getElementById('topicFilter');
        const topics      = [...new Set(quizData.map(q => q.topic))].sort();

        topicFilter.innerHTML = '<option value="">All Topics</option>';
        topics.forEach(topic => {
            const opt   = document.createElement('option');
            opt.value   = topic;
            opt.textContent = topic;
            topicFilter.appendChild(opt);
        });
    }

    function filterQuizzes() {
        const searchTerm  = document.getElementById('searchInput').value.toLowerCase();
        const topicFilter = document.getElementById('topicFilter').value;

        filteredData = quizData.filter(quiz => {
            const matchesSearch = quiz.title.toLowerCase().includes(searchTerm) ||
                                  quiz.topic.toLowerCase().includes(searchTerm);
            const matchesTopic  = !topicFilter || quiz.topic === topicFilter;
            return matchesSearch && matchesTopic;
        });

        sortQuizzes();
    }

    function sortQuizzes() {
        const sortValue = document.getElementById('sortSelect').value;

        filteredData.sort((a, b) => {
            switch (sortValue) {
                case 'title-asc':  return a.title.localeCompare(b.title);
                case 'title-desc': return b.title.localeCompare(a.title);
                case 'topic-asc':  return a.topic.localeCompare(b.topic) || a.title.localeCompare(b.title);
                case 'topic-desc': return b.topic.localeCompare(a.topic) || a.title.localeCompare(b.title);
                default:           return 0;
            }
        });

        renderQuizList();
    }

    // ── Render ────────────────────────────────────────────────────────────────

    function renderQuizList() {
        const container = document.getElementById('quizListContainer');

        if (filteredData.length === 0) {
            container.innerHTML = '<div class="loading">No quizzes found matching your criteria.</div>';
            return;
        }

        container.innerHTML = filteredData.map(quiz => `
            <div class="quiz-card"
                 role="button"
                 tabindex="0"
                 onclick="openQuiz('${quiz.file}')"
                 onkeydown="if(event.key==='Enter'||event.key===' ')openQuiz('${quiz.file}')"
                 aria-label="Open quiz: ${quiz.title}">
                <h3>${quiz.title}</h3>
                <p>📚 ${quiz.topic}</p>
            </div>
        `).join('');
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    function openQuiz(filename) {
        window.location.href = `quiz.html?quiz=${encodeURIComponent(filename)}`;
    }

    // Expose to HTML event handlers
    window.filterQuizzes = filterQuizzes;
    window.sortQuizzes   = sortQuizzes;
    window.openQuiz      = openQuiz;

})();
