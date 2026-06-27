/**
 * MCQ Quiz Interactive Features v2.0
 * Loads questions from JSON and renders dynamically
 * File: js/notes-mcq.js
 */

(function () {
    'use strict';

    const pageId = window.NotePageId || document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    let currentQuizQuestion = 1;
    let quizAnswers = {};
    let totalQuizQuestions = 0;
    let quizData = null;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initQuiz);
    } else {
        initQuiz();
    }

    async function initQuiz() {
        const container = document.getElementById('quizContainer');
        if (!container) {
            console.log('ℹ️ No MCQ quiz container found on this page');
            return;
        }

        const jsonSource = container.dataset.mcqSource || 'mcq.json';

        try {
            await loadQuizFromJSON(jsonSource);
            renderQuiz();
            loadQuizState();
            updateQuizDisplay();

            document.addEventListener('keydown', handleQuizKeyboard);

            console.log(`📝 Initialized MCQ quiz with ${totalQuizQuestions} questions from ${jsonSource}`);
        } catch (error) {
            console.error('❌ Error loading quiz:', error);
            container.innerHTML = `
                <div class="error-box">
                    <p><strong>Error loading quiz questions.</strong></p>
                    <p>Could not load ${jsonSource}. Please ensure the file exists in the same directory as this HTML file.</p>
                </div>
            `;
        }
    }

    async function loadQuizFromJSON(jsonFile) {
        const response = await fetch(jsonFile);
        if (!response.ok) {
            throw new Error(`Failed to load ${jsonFile}: ${response.statusText}`);
        }

        quizData = await response.json();
        totalQuizQuestions = quizData.questions.length;

        console.log(`✅ Loaded ${totalQuizQuestions} questions from JSON`);
    }

    function renderQuiz() {
        const container = document.getElementById('quizContainer');
        if (!container || !quizData) return;

        container.innerHTML = '';

        quizData.questions.forEach((q, index) => {
            const slide = createQuizSlide(q, index === 0);
            container.appendChild(slide);
        });

        console.log(`✅ Rendered ${totalQuizQuestions} quiz questions`);
        // ADD after the log:
        window.NotesSearch?.rebuildIndex();
    }

    function createQuizSlide(question, isActive) {
        const slide = document.createElement('div');
        slide.className = `quiz-slide ${isActive ? 'active' : ''}`;
        slide.dataset.question = question.id;
        slide.dataset.correct = question.correctAnswer;
        slide.dataset.difficulty = question.difficulty;

        slide.innerHTML = `
            <div class="quiz-slide-content">
                <div class="question-header">
                    <span class="question-badge">Question ${question.id}</span>
                </div>
                
                <h3 class="question-text">${question.question}</h3>
                
                <div class="quiz-options">
                    ${question.options.map(opt => `
                        <label class="quiz-option-card">
                            <input type="radio" name="q${question.id}" value="${opt.letter}">
                            <div class="option-content">
                                <span class="option-letter">${opt.letter}</span>
                                <span class="option-text">${opt.text}</span>
                            </div>
                        </label>
                    `).join('')}
                </div>
                
                <button onclick="submitQuizAnswer(${question.id})" class="submit-quiz-btn" id="submitBtn${question.id}">
                    Submit Answer
                </button>
                
                <div class="quiz-feedback" id="feedback${question.id}" style="display: none;">
                    <div class="feedback-icon" id="feedbackIcon${question.id}"></div>
                    <div class="feedback-content">
                        <p class="feedback-result" id="feedbackResult${question.id}"></p>
                        <div class="explanation-box" id="explanationBox${question.id}" style="display: none;">
                            <p><strong>Correct Answer:</strong> ${question.correctAnswer}) ${question.options.find(o => o.letter === question.correctAnswer).text}</p>
                            <p><strong>Explanation:</strong> ${question.explanation.correct}</p>
                            <p>${question.explanation.why}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return slide;
    }

    function handleQuizKeyboard(e) {
        if (!document.querySelector('.quiz-carousel-container')) return;

        if (e.key === 'ArrowLeft' && currentQuizQuestion > 1) {
            previousQuestion();
        }

        if (e.key === 'ArrowRight' && currentQuizQuestion < totalQuizQuestions) {
            nextQuestion();
        }
    }

    function updateQuizDisplay() {
        const slides = document.querySelectorAll('.quiz-slide');

        slides.forEach(slide => slide.classList.remove('active'));

        const currentSlide = document.querySelector(`.quiz-slide[data-question="${currentQuizQuestion}"]`);
        if (currentSlide) {
            currentSlide.classList.add('active');
        }

        const counter = document.getElementById('quizCounter');
        if (counter) {
            counter.textContent = `Question ${currentQuizQuestion} of ${totalQuizQuestions}`;
        }

        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        if (prevBtn) prevBtn.disabled = currentQuizQuestion === 1;
        if (nextBtn) nextBtn.disabled = currentQuizQuestion === totalQuizQuestions;

        updateQuizScore();

        // Rebuild bottom navigation for the now-active question (if it has feedback showing)
        updateBottomNavigation(currentQuizQuestion);
    }

    function updateBottomNavigation(questionNum) {
        // Remove bottom nav from ALL slides first (clean slate on every navigation)
        document.querySelectorAll('.quiz-bottom-navigation').forEach(nav => nav.remove());

        const slide = document.querySelector(`.quiz-slide[data-question="${questionNum}"]`);
        if (!slide) return;

        // Only show bottom nav if this question has been attempted (feedback is visible)
        const feedback = document.getElementById(`feedback${questionNum}`);
        if (!feedback || feedback.style.display === 'none' || feedback.style.display === '') return;

        const bottomNav = document.createElement('div');
        bottomNav.className = 'quiz-bottom-navigation';
        feedback.appendChild(bottomNav);

        if (questionNum > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'quiz-bottom-nav-btn';
            prevBtn.textContent = '← Previous Question';
            prevBtn.onclick = previousQuestion;
            bottomNav.appendChild(prevBtn);
        }

        if (questionNum < totalQuizQuestions) {
            const nextBtn = document.createElement('button');
            nextBtn.className = 'quiz-bottom-nav-btn';
            nextBtn.textContent = 'Next Question →';
            nextBtn.onclick = nextQuestion;
            bottomNav.appendChild(nextBtn);
        }
    }

    function nextQuestion() {
        if (currentQuizQuestion < totalQuizQuestions) {
            currentQuizQuestion++;
            updateQuizDisplay();
            saveQuizState();
        }
    }

    function previousQuestion() {
        if (currentQuizQuestion > 1) {
            currentQuizQuestion--;
            updateQuizDisplay();
            saveQuizState();
        }
    }

    function submitQuizAnswer(questionNum) {
        const slide = document.querySelector(`.quiz-slide[data-question="${questionNum}"]`);
        if (!slide) return;

        const correctAnswer = slide.dataset.correct;
        const selectedInput = slide.querySelector('input[type="radio"]:checked');

        if (!selectedInput) {
            alert('Please select an answer before submitting.');
            return;
        }

        const selectedAnswer = selectedInput.value;
        const isCorrect = selectedAnswer === correctAnswer;

        quizAnswers[questionNum] = {
            selected: selectedAnswer,
            correct: correctAnswer,
            isCorrect: isCorrect,
            timestamp: new Date().toISOString()
        };

        const feedback = document.getElementById(`feedback${questionNum}`);
        const feedbackIcon = document.getElementById(`feedbackIcon${questionNum}`);
        const feedbackResult = document.getElementById(`feedbackResult${questionNum}`);
        const submitBtn = document.getElementById(`submitBtn${questionNum}`);

        if (feedback && feedbackIcon && feedbackResult) {
            feedback.style.display = 'block';
            const explanationBox = document.getElementById(`explanationBox${questionNum}`);

            if (isCorrect) {
                feedback.className = 'quiz-feedback correct';
                feedbackIcon.textContent = '✅';
                feedbackResult.textContent = '🎉 Correct! Well done!';
                if (explanationBox) explanationBox.style.display = 'block';
            } else {
                feedback.className = 'quiz-feedback incorrect';
                feedbackIcon.textContent = '❌';
                feedbackResult.textContent = '❌ Incorrect. Try again!';
                if (explanationBox) explanationBox.style.display = 'none';
            }
        }

        if (submitBtn) {
            if (isCorrect) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Answer Submitted ✔';
            } else {
                submitBtn.textContent = 'Try Again';
                submitBtn.style.background = 'var(--warning)';
            }
        }

        if (isCorrect) {
            slide.querySelectorAll('input[type="radio"]').forEach(input => {
                input.disabled = true;
            });
        }

        updateQuizScore();
        saveQuizState();
    }

    function updateQuizScore() {
        const answered = Object.keys(quizAnswers).length;
        const correct = Object.values(quizAnswers).filter(a => a.isCorrect).length;
        const percentage = answered > 0 ? ((correct / answered) * 100).toFixed(1) : 0;

        const scoreDisplay = document.getElementById('quizScoreDisplay');
        if (!scoreDisplay) return;

        scoreDisplay.textContent = `Score: ${correct}/${answered} (${percentage}%)`;

        if (percentage >= 80) {
            scoreDisplay.style.background = 'var(--success-bg)';
            scoreDisplay.style.color = 'var(--success)';
        } else if (percentage >= 60) {
            scoreDisplay.style.background = 'var(--warning-bg)';
            scoreDisplay.style.color = 'var(--warning)';
        } else if (answered > 0) {
            scoreDisplay.style.background = 'var(--error-bg)';
            scoreDisplay.style.color = 'var(--error)';
        }
    }

    function showQuizSummary() {
        const answered = Object.keys(quizAnswers).length;

        if (answered === 0) {
            if (window.showNotification) window.showNotification('Please answer at least one question first.', 'warning');
            return;
        }

        const correct = Object.values(quizAnswers).filter(a => a.isCorrect).length;
        const percentage = ((correct / answered) * 100).toFixed(1);

        let grade, color;
        if (percentage >= 90) { grade = '🏆 OUTSTANDING! Excellent mastery!'; color = 'var(--success)'; }
        else if (percentage >= 80) { grade = '🎉 EXCELLENT! Strong understanding!'; color = 'var(--success)'; }
        else if (percentage >= 70) { grade = '👍 GOOD! Review missed questions.'; color = 'var(--warning)'; }
        else if (percentage >= 60) { grade = '📚 FAIR: More review needed.'; color = 'var(--warning)'; }
        else { grade = '📖 NEEDS IMPROVEMENT: Study more thoroughly.'; color = 'var(--error)'; }

        // Remove any existing summary
        const existing = document.getElementById('quizSummaryInline');
        if (existing) existing.remove();

        const summary = document.createElement('div');
        summary.id = 'quizSummaryInline';
        summary.className = 'quiz-summary-section';
        summary.innerHTML = `
        <h3 style="color:${color}">📊 Quiz Summary</h3>
        <p>Total Questions: <strong>${totalQuizQuestions}</strong></p>
        <p>Questions Answered: <strong>${answered}</strong></p>
        <p>Correct: <strong>${correct}</strong> &nbsp; Incorrect: <strong>${answered - correct}</strong></p>
        <p style="font-size:1.2em;font-weight:700;color:${color}">Score: ${percentage}%</p>
        <p>${grade}</p>
        ${answered < totalQuizQuestions ? `<p style="color:var(--warning)">⚠️ ${totalQuizQuestions - answered} unanswered questions remaining.</p>` : ''}
        <button onclick="document.getElementById('quizSummaryInline').remove()" class="quiz-summary-btn">Close</button>
    `;

        const carousel = document.querySelector('.quiz-carousel-container');
        if (carousel) carousel.after(summary);
    }

    function resetEntireQuiz() {
        const btn = document.querySelector('[onclick="resetEntireQuiz()"]');
        if (!btn || btn.dataset.confirmPending !== 'true') {
            if (btn) {
                btn.dataset.confirmPending = 'true';
                btn.textContent = 'Click again to confirm';
                setTimeout(() => {
                    btn.dataset.confirmPending = 'false';
                    btn.textContent = 'Reset Quiz';
                }, 3000);
            }
            return;
        }
        btn.dataset.confirmPending = 'false';
        btn.textContent = 'Reset Quiz';

        quizAnswers = {};
        currentQuizQuestion = 1;

        const slides = document.querySelectorAll('.quiz-slide');
        slides.forEach(slide => {
            const questionNum = slide.dataset.question;

            const feedback = document.getElementById(`feedback${questionNum}`);
            if (feedback) feedback.style.display = 'none';

            const submitBtn = document.getElementById(`submitBtn${questionNum}`);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Answer';
                submitBtn.style.background = '';
            }

            slide.querySelectorAll('input[type="radio"]').forEach(input => {
                input.disabled = false;
                input.checked = false;
            });
        });

        try {
            localStorage.removeItem(`${pageId}-quiz-state`);
            localStorage.removeItem(`${pageId}-quiz-answers`);
        } catch (e) {
            console.warn('Could not clear quiz state:', e);
        }

        updateQuizDisplay();
        console.log('✅ Quiz reset complete');
    }

    function saveQuizState() {
        try {
            localStorage.setItem(`${pageId}-quiz-state`, JSON.stringify({
                currentQuestion: currentQuizQuestion,
                lastUpdated: new Date().toISOString()
            }));
            localStorage.setItem(`${pageId}-quiz-answers`, JSON.stringify(quizAnswers));
        } catch (e) {
            console.warn('Could not save quiz state:', e);
        }
    }

    function loadQuizState() {
        try {
            const stateStr = localStorage.getItem(`${pageId}-quiz-state`);
            const oldKey = `${pageId}-quizs`;
            const newKey = `${pageId}-quiz-answers`;
            if (localStorage.getItem(oldKey) && !localStorage.getItem(newKey)) {
                localStorage.setItem(newKey, localStorage.getItem(oldKey));
                localStorage.removeItem(oldKey);
            }
            const answersStr = localStorage.getItem(newKey);

            if (stateStr) {
                const state = JSON.parse(stateStr);
                currentQuizQuestion = state.currentQuestion || 1;
            }

            if (answersStr) {
                quizAnswers = JSON.parse(answersStr);

                Object.keys(quizAnswers).forEach(questionNum => {
                    const slide = document.querySelector(`.quiz-slide[data-question="${questionNum}"]`);
                    if (!slide) return;

                    const answer = quizAnswers[questionNum];

                    const radio = slide.querySelector(`input[value="${answer.selected}"]`);
                    if (radio) {
                        radio.checked = true;
                        if (answer.isCorrect) radio.disabled = true;
                    }

                    const submitBtn = document.getElementById(`submitBtn${questionNum}`);
                    if (submitBtn) {
                        if (answer.isCorrect) {
                            submitBtn.disabled = true;
                            submitBtn.textContent = 'Answer Submitted ✔';
                        } else {
                            submitBtn.textContent = 'Try Again';
                            submitBtn.style.background = 'var(--warning)';
                        }
                    }

                    const feedbackIcon = document.getElementById(`feedbackIcon${questionNum}`);
                    const feedbackResult = document.getElementById(`feedbackResult${questionNum}`);
                    const feedback = document.getElementById(`feedback${questionNum}`);
                    if (feedback) {
                        feedback.style.display = 'block';
                        feedback.className = answer.isCorrect ? 'quiz-feedback correct' : 'quiz-feedback incorrect';
                    }
                    if (feedbackIcon) feedbackIcon.textContent = answer.isCorrect ? '✅' : '❌';
                    if (feedbackResult) feedbackResult.textContent = answer.isCorrect ? '🎉 Correct! Well done!' : '❌ Incorrect. Try again!';

                    const explanationBox = document.getElementById(`explanationBox${questionNum}`);
                    if (explanationBox) explanationBox.style.display = answer.isCorrect ? 'block' : 'none';
                });
            }
        } catch (e) {
            console.warn('Could not load quiz state:', e);
        }
    }

    // Expose functions to global scope
    window.nextQuestion = nextQuestion;
    window.previousQuestion = previousQuestion;
    window.submitQuizAnswer = submitQuizAnswer;
    window.showQuizSummary = showQuizSummary;
    window.resetEntireQuiz = resetEntireQuiz;

    console.log('🚀 MCQ quiz module loaded successfully');

})();