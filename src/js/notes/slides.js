/**
 * YouTube Video Slides JavaScript
 * Handles slide navigation and animations
 * File: js/video-slides.js
 */

(function() {
    'use strict';

    // State
    let currentSlide = 0;
    let totalSlides = 0;
    let currentAnimationIndex = 0;
    let slides = [];
    let animationItems = [];

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        slides = Array.from(document.querySelectorAll('.slide'));
        totalSlides = slides.length;

        if (totalSlides === 0) {
            console.error('No slides found!');
            return;
        }

        // Update slide counter
        updateSlideCounter();

        // Show first slide
        showSlide(0);

        // Setup keyboard controls
        document.addEventListener('keydown', handleKeyPress);

        // Setup progress bar
        updateProgressBar();

        console.log(`✅ Initialized ${totalSlides} slides`);
    }

    // ============================================
    // NAVIGATION
    // ============================================

    function handleKeyPress(e) {
        switch(e.key) {
            case 'Enter':
            case 'ArrowRight':
            case ' ': // Spacebar
                e.preventDefault();
                nextAction();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                previousSlide();
                break;
            case 'Home':
                e.preventDefault();
                goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                goToSlide(totalSlides - 1);
                break;
            case 'Escape':
                e.preventDefault();
                toggleFullscreen();
                break;
        }
    }

    function nextAction() {
        // Check if there are more animations on current slide
        if (currentAnimationIndex < animationItems.length) {
            showNextAnimation();
        } else {
            // Move to next slide
            nextSlide();
        }
    }

    function nextSlide() {
        if (currentSlide < totalSlides - 1) {
            goToSlide(currentSlide + 1);
        }
    }

    function previousSlide() {
        if (currentSlide > 0) {
            goToSlide(currentSlide - 1);
        }
    }

    function goToSlide(index) {
        if (index < 0 || index >= totalSlides) return;

        // Hide current slide
        slides[currentSlide].classList.remove('active');

        // Update current slide
        currentSlide = index;

        // Show new slide
        showSlide(currentSlide);

        // Update UI
        updateSlideCounter();
        updateProgressBar();
    }

    function showSlide(index) {
        const slide = slides[index];
        slide.classList.add('active');

        // Reset and prepare animations
        currentAnimationIndex = 0;
        animationItems = Array.from(slide.querySelectorAll('.animate-item'))
            .sort((a, b) => {
                const orderA = parseInt(a.dataset.order || '0');
                const orderB = parseInt(b.dataset.order || '0');
                return orderA - orderB;
            });

        // Hide all animation items initially
        animationItems.forEach(item => {
            item.classList.remove('visible');
        });

        // Show first animation automatically
        if (animationItems.length > 0) {
            setTimeout(() => showNextAnimation(), 100);
        }
    }

    // ============================================
    // ANIMATIONS
    // ============================================

    function showNextAnimation() {
        if (currentAnimationIndex < animationItems.length) {
            const item = animationItems[currentAnimationIndex];
            item.classList.add('visible');
            currentAnimationIndex++;
        }
    }

    function showAllAnimations() {
        animationItems.forEach(item => {
            item.classList.add('visible');
        });
        currentAnimationIndex = animationItems.length;
    }

    // ============================================
    // UI UPDATES
    // ============================================

    function updateSlideCounter() {
        const currentSpan = document.getElementById('currentSlide');
        const totalSpan = document.getElementById('totalSlides');

        if (currentSpan) currentSpan.textContent = currentSlide + 1;
        if (totalSpan) totalSpan.textContent = totalSlides;
    }

    function updateProgressBar() {
        const progressFill = document.querySelector('.progress-bar-fill');
        if (progressFill) {
            const progress = ((currentSlide + 1) / totalSlides) * 100;
            progressFill.style.width = `${progress}%`;
        }
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    // Jump to specific slide (for development/testing)
    window.goToSlide = goToSlide;

    // Show all animations at once (for screenshots)
    window.showAllAnimations = showAllAnimations;

    // Expose navigation functions globally
    window.nextSlide = nextSlide;
    window.previousSlide = previousSlide;

    console.log('🚀 Video slides loaded successfully');
    console.log('📌 Controls: Enter/→/Space = Next | ← = Previous | Esc = Fullscreen');

})();