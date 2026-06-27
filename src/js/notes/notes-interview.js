/**
 * Interview Questions Interactive Features v1.0
 * Loads questions from JSON and renders dynamically
 * File: js/notes-interview.js
 */

(function () {
    'use strict';

    const pageId = window.NotePageId || document.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    let currentInterviewQuestion = 1;
    let totalInterviewQuestions = 0;
    let interviewData = null;
    let viewedAnswers = {};

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initInterview);
    } else {
        initInterview();
    }

    async function initInterview() {
        const container = document.getElementById('interviewContainer');
        if (!container) {
            console.log('ℹ️ No interview questions container found on this page');
            return;
        }

        const jsonSource = container.dataset.interviewSource || 'json/interview.json';

        try {
            await loadInterviewFromJSON(jsonSource);
            renderInterview();
            loadInterviewState();
            updateInterviewDisplay();

            const flashcardDeck = document.querySelector('.flashcard-deck');
            if (flashcardDeck) {
                document.addEventListener('keydown', handleInterviewKeyboard);
            }

            console.log(`🎤 Initialized interview questions with ${totalInterviewQuestions} questions from ${jsonSource}`);
        } catch (error) {
            console.error('❌ Error loading interview questions:', error);
            container.innerHTML = `
                <div class="error-box">
                    <p><strong>Error loading interview questions.</strong></p>
                    <p>Could not load ${jsonSource}. Please ensure the file exists in the same directory as this HTML file.</p>
                </div>
            `;
        }
    }

    async function loadInterviewFromJSON(jsonFile) {
        const response = await fetch(jsonFile);
        if (!response.ok) {
            throw new Error(`Failed to load ${jsonFile}: ${response.statusText}`);
        }

        interviewData = await response.json();
        totalInterviewQuestions = interviewData.questions.length;

        console.log(`✅ Loaded ${totalInterviewQuestions} interview questions from JSON`);
    }

    function renderInterview() {
        const container = document.getElementById('interviewContainer');
        if (!container || !interviewData) return;

        container.innerHTML = '';

        interviewData.questions.forEach((q, index) => {
            const slide = createInterviewSlide(q, index === 0);
            container.appendChild(slide);
        });

        console.log(`✅ Rendered ${totalInterviewQuestions} interview questions`);
        // ADD after the log:
        window.NotesSearch?.rebuildIndex();
    }

    function createInterviewSlide(question, isActive) {
        const slide = document.createElement('div');
        slide.className = `flashcard-slide ${isActive ? 'active' : ''}`;
        slide.dataset.questionId = question.id;
        slide.dataset.difficulty = question.difficulty;
        slide.dataset.category = question.category;

        slide.innerHTML = `
            <div class="flashcard-content">
                <div class="question-side">
                    <h4>Question ${question.id}</h4>
                    <p>${question.question}</p>
                </div>
                <button class="show-answer-btn" id="answerBtn${question.id}">
                    Show Answer
                </button>
                <div class="answer-side" id="answer${question.id}" style="display: none;">
                    <h4>Answer</h4>
                    <p>${question.answer}</p>
                </div>
            </div>
        `;
        slide.querySelector(`#answerBtn${question.id}`)
         .addEventListener('click', function() { toggleInterviewAnswer(question.id); });

        return slide;
    }

    function handleInterviewKeyboard(e) {
        if (e.key === 'ArrowLeft' && currentInterviewQuestion > 1) {
            previousInterviewQuestion();
        }

        if (e.key === 'ArrowRight' && currentInterviewQuestion < totalInterviewQuestions) {
            nextInterviewQuestion();
        }

        if (e.code === 'Space') {
            e.preventDefault();
            const currentSlide = document.querySelector('.flashcard-slide.active');
            if (currentSlide) {
                const questionId = currentSlide.dataset.questionId;
                toggleInterviewAnswer(parseInt(questionId));
            }
        }
    }

    function updateInterviewDisplay() {
        const slides = document.querySelectorAll('.flashcard-slide');

        slides.forEach(slide => {
            slide.classList.remove('active');
            slide.style.display = 'none';
        });

        const currentSlide = slides[currentInterviewQuestion - 1];
        if (currentSlide) {
            currentSlide.classList.add('active');
            currentSlide.style.display = 'block';
        }

        const counter = document.getElementById('interviewCounter');
        if (counter) {
            counter.textContent = `${currentInterviewQuestion} / ${totalInterviewQuestions}`;
        }

        const prevBtn = document.getElementById('prevInterviewBtn');
        const nextBtn = document.getElementById('nextInterviewBtn');

        if (prevBtn) prevBtn.disabled = currentInterviewQuestion === 1;
        if (nextBtn) nextBtn.disabled = currentInterviewQuestion === totalInterviewQuestions;

        updateInterviewProgress();
    }

    function updateInterviewProgress() {
        const viewed = Object.keys(viewedAnswers).length;
        const percentage = totalInterviewQuestions > 0
            ? ((viewed / totalInterviewQuestions) * 100).toFixed(1)
            : 0;

        const progressDisplay = document.getElementById('interviewProgress');
        if (progressDisplay) {
            progressDisplay.textContent = `Progress: ${viewed}/${totalInterviewQuestions} (${percentage}%)`;
        }
    }

    function nextInterviewQuestion() {
        if (currentInterviewQuestion < totalInterviewQuestions) {
            currentInterviewQuestion++;
            updateInterviewDisplay();
            saveInterviewState();
        }
    }

    function previousInterviewQuestion() {
        if (currentInterviewQuestion > 1) {
            currentInterviewQuestion--;
            updateInterviewDisplay();
            saveInterviewState();
        }
    }

    function toggleInterviewAnswer(questionId) {
        const answer = document.getElementById(`answer${questionId}`);
        const button = document.getElementById(`answerBtn${questionId}`);

        if (!answer || !button) return;

        if (answer.style.display === 'none' || answer.style.display === '') {
            answer.style.display = 'block';
            button.textContent = 'Hide Answer';
            viewedAnswers[questionId] = true;
            updateInterviewProgress();
            saveInterviewState();
        } else {
            answer.style.display = 'none';
            button.textContent = 'Show Answer';
        }
    }

    function resetInterviewProgress() {
        if (!confirm('Reset interview progress? This will hide all answers and reset your progress.')) {
            return;
        }

        viewedAnswers = {};
        currentInterviewQuestion = 1;

        const slides = document.querySelectorAll('.flashcard-slide');
        slides.forEach(slide => {
            const questionId = slide.dataset.questionId;
            const answer = document.getElementById(`answer${questionId}`);
            const button = document.getElementById(`answerBtn${questionId}`);

            if (answer) answer.style.display = 'none';
            if (button) button.textContent = 'Show Answer';
        });

        try {
            localStorage.removeItem(`${pageId}-interview-state`);
            localStorage.removeItem(`${pageId}-interview-viewed`);
        } catch (e) {
            console.warn('Could not clear interview state:', e);
        }

        updateInterviewDisplay();
        console.log('✅ Interview progress reset complete');
    }

    function saveInterviewState() {
        try {
            localStorage.setItem(`${pageId}-interview-state`, JSON.stringify({
                v: 1,
                currentQuestion: currentInterviewQuestion,
                lastUpdated: new Date().toISOString()
            }));
            localStorage.setItem(`${pageId}-interview-viewed`, JSON.stringify({ v: 1, data: viewedAnswers }));
        } catch (e) {
            console.warn('Could not save interview state:', e);
        }
    }

    function loadInterviewState() {
        try {
            const stateStr = localStorage.getItem(`${pageId}-interview-state`);
            const viewedStr = localStorage.getItem(`${pageId}-interview-viewed`);

            if (stateStr) {
                const state = JSON.parse(stateStr);
                if (!state.v) {
                    localStorage.removeItem(`${pageId}-interview-state`);
                } else {
                    currentInterviewQuestion = state.currentQuestion || 1;
                }
            }
            if (viewedStr) {
                const parsed = JSON.parse(viewedStr);
                if (!parsed.v) {
                    localStorage.removeItem(`${pageId}-interview-viewed`);
                } else {
                    viewedAnswers = parsed.data;
                    Object.keys(viewedAnswers).forEach(questionId => {
                        const answer = document.getElementById(`answer${questionId}`);
                        const button = document.getElementById(`answerBtn${questionId}`);

                        if (answer && viewedAnswers[questionId]) {
                            answer.style.display = 'block';
                            if (button) button.textContent = 'Hide Answer';
                        }
                    });
                }
            }

        } catch (e) {
            console.warn('Could not load interview state:', e);
        }
    }

    // Expose functions to global scope
    window.nextInterviewQuestion = nextInterviewQuestion;
    window.previousInterviewQuestion = previousInterviewQuestion;
    window.toggleInterviewAnswer = toggleInterviewAnswer;
    window.resetInterviewProgress = resetInterviewProgress;

    console.log('🚀 Interview questions module loaded successfully');

})();