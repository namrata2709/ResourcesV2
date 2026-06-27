/**
 * Touch Gestures & Swipe Navigation v1.0
 * Adds swipe support for quiz carousel and interview flashcards
 * File: js/notes-touch.js
 */

(function() {
    'use strict';
    
    // Touch state
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    let touchStartTime = 0;
    
    // Configuration
    const SWIPE_THRESHOLD = 50;  // Minimum distance for swipe (pixels)
    const SWIPE_VELOCITY = 0.3;   // Minimum velocity (pixels/ms)
    const MAX_VERTICAL_DEVIATION = 100;  // Max Y movement for horizontal swipe
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSwipeGestures);
    } else {
        initSwipeGestures();
    }
    
    function initSwipeGestures() {
        // Only initialize on touch devices
        if (!('ontouchstart' in window)) {
            console.log('ℹ️ Not a touch device, skipping swipe gestures');
            return;
        }
        
        try {
            // MCQ Carousel
            const quizContainer = document.querySelector('.quiz-carousel-container');
            if (quizContainer) {
                addSwipeListeners(quizContainer, handleQuizSwipe);
                console.log('✅ Quiz swipe gestures enabled');
            }
            
            // Interview Flashcards
            const flashcardDeck = document.querySelector('.flashcard-deck');
            if (flashcardDeck) {
                addSwipeListeners(flashcardDeck, handleFlashcardSwipe);
                console.log('✅ Flashcard swipe gestures enabled');
            }
            
            // Add haptic feedback support
            if ('vibrate' in navigator) {
                console.log('✅ Haptic feedback available');
            }
            
        } catch (error) {
            console.error('❌ Error initializing swipe gestures:', error);
        }
    }
    
    function addSwipeListeners(element, callback) {
        // Touch start
        element.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            touchStartTime = Date.now();
        }, { passive: true });
        
        // Touch move - provide visual feedback
        element.addEventListener('touchmove', function(e) {
            const currentX = e.changedTouches[0].screenX;
            const deltaX = currentX - touchStartX;
            
            // Visual feedback - slight movement
            if (Math.abs(deltaX) > 10) {
                element.style.transform = `translateX(${deltaX * 0.1}px)`;
            }
        }, { passive: true });
        
        // Touch end
        element.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            
            // Reset visual feedback
            element.style.transform = '';
            
            // Process swipe
            const result = processSwipe();
            if (result) {
                callback(result.direction);
                
                // Haptic feedback
                triggerHaptic();
                
                // Mark as swiped (removes hint)
                element.classList.add('swiped');
            }
        }, { passive: true });
        
        // Touch cancel
        element.addEventListener('touchcancel', function() {
            element.style.transform = '';
        }, { passive: true });
    }
    
    function processSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;
        
        // Calculate velocity
        const velocity = Math.abs(deltaX) / deltaTime;
        
        // Check if it's a horizontal swipe
        if (Math.abs(deltaY) > MAX_VERTICAL_DEVIATION) {
            return null;  // Too much vertical movement
        }
        
        // Check if swipe meets threshold
        if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
            return null;  // Not far enough
        }
        
        // Check velocity (optional - for fast swipes)
        if (velocity < SWIPE_VELOCITY && Math.abs(deltaX) < SWIPE_THRESHOLD * 2) {
            return null;  // Too slow and not far enough
        }
        
        // Determine direction
        const direction = deltaX > 0 ? 'right' : 'left';
        
        return {
            direction: direction,
            distance: Math.abs(deltaX),
            velocity: velocity
        };
    }
    
    function handleQuizSwipe(direction) {
        if (direction === 'left') {
            // Swipe left = Next question
            const nextBtn = document.getElementById('nextBtn');
            if (nextBtn && !nextBtn.disabled) {
                nextBtn.click();
                console.log('➡️ Swiped to next question');
            }
        } else {
            // Swipe right = Previous question
            const prevBtn = document.getElementById('prevBtn');
            if (prevBtn && !prevBtn.disabled) {
                prevBtn.click();
                console.log('⬅️ Swiped to previous question');
            }
        }
    }
    
    function handleFlashcardSwipe(direction) {
        if (direction === 'left') {
            // Swipe left = Next flashcard
            const nextBtn = document.getElementById('nextInterviewBtn');
            if (nextBtn && !nextBtn.disabled) {
                nextBtn.click();
                console.log('➡️ Swiped to next flashcard');
            }
        } else {
            // Swipe right = Previous flashcard
            const prevBtn = document.getElementById('prevInterviewBtn');
            if (prevBtn && !prevBtn.disabled) {
                prevBtn.click();
                console.log('⬅️ Swiped to previous flashcard');
            }
        }
    }
    
    function triggerHaptic() {
        if ('vibrate' in navigator) {
            // Light haptic feedback (10ms)
            navigator.vibrate(10);
        }
    }
    
    // Export for testing
    window.SwipeGestures = {
        version: '1.0.0',
        isEnabled: 'ontouchstart' in window
    };
    
    console.log('📱 Touch gestures module loaded');
})();