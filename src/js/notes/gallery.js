/**
 * =============================================================================
 * File: gallery.js
 * Path: js/notes/gallery.js
 * Project: Learning Dashboard
 *
 * Description:
 * Image Gallery Manager for images.html. Reads ?folder=<topic|all> from
 * the URL, loads data/index/notes-index.json, and renders either a
 * single folder's images or every image across every folder. Handles
 * grid/list view toggle (persisted to localStorage), search filtering,
 * lightbox with keyboard navigation, and per-image download.
 *
 * Author: Namrata Mulwani
 * Created: —
 * Last Updated: 2026-06-30
 *
 * Dependencies:
 * - window.SiteConfig, window.callNavigation (js/shared/site-config.js)
 * - data/index/notes-index.json
 * =============================================================================
 */

(function () {
    'use strict';

    // Get folder from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const folderParam = urlParams.get('folder');

    // Gallery state
    let allImages = [];
    let currentImageIndex = 0;
    let filteredImages = [];
    let currentFolderInfo = null;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        showLoading();
        loadImages();
        setupKeyboardNavigation();
        callNavigation(['Home', 'Notes', folderParam ? capitalizeFirstLetter(folderParam) + ' Images Gallery' : 'All Folders']);
    }

    function capitalizeFirstLetter(str) {
        if (!str) return ''; // Handle empty strings safely
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Show loading state
    function showLoading() {
        const gallery = document.getElementById('gallery');
        gallery.innerHTML = `
            <div class="loading" style="grid-column: 1/-1;">
                <div class="loading-spinner"></div>
                <p class="loading-text">Loading images...</p>
            </div>
        `;
    }

    // Show error state
    function showError(message) {
        const gallery = document.getElementById('gallery');
        const errorState = document.getElementById('errorState');

        gallery.classList.add('hidden');
        errorState.classList.remove('hidden');

        console.error('Gallery Error:', message);
    }

    // Show empty state
    function showEmptyState() {
        const gallery = document.getElementById('gallery');
        const emptyState = document.getElementById('emptyState');

        gallery.classList.add('hidden');
        emptyState.classList.remove('hidden');
    }

    // Hide empty state
    function hideEmptyState() {
        const gallery = document.getElementById('gallery');
        const emptyState = document.getElementById('emptyState');

        gallery.classList.remove('hidden');
        emptyState.classList.add('hidden');
    }

    // Update gallery stats
    function updateGalleryStats(folderName, imageCount, dateInfo) {
        const imageCountEl = document.getElementById('imageCount');
        const folderNameEl = document.getElementById('folderName');
        const dateInfoEl = document.getElementById('dateInfo');
        const breadcrumbFolder = document.getElementById('breadcrumbFolder');

        if (imageCountEl) {
            imageCountEl.textContent = `${imageCount} image${imageCount !== 1 ? 's' : ''}`;
        }

        if (folderNameEl) {
            folderNameEl.textContent = folderName || 'All Folders';
        }

        if (dateInfoEl) {
            dateInfoEl.textContent = dateInfo || 'Various Dates';
        }

        if (breadcrumbFolder) {
            breadcrumbFolder.textContent = folderName || 'Images Gallery';
        }

        // Update page title
        document.title = `${folderName || 'Images Gallery'} - Learning Dashboard`;
    }

    // Load images from notes-index.json
    async function loadImages() {
        try {
            const response = await fetch(window.SiteConfig.dataPath('index/notes-index.json'));

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (folderParam === 'all') {
                // Load all images from all folders

                let totalImages = 0;
                data.notes.forEach(note => {
                    if (note.hasImages && note.images) {
                        note.images.forEach(img => {
                            allImages.push({
                                name: img.name,
                                file: window.SiteConfig.dataPath(`notes/${note.folder}/images/${img.file}`),
                                folder: note.title,
                                date: note.date || 'Unknown'
                            });
                            totalImages++;
                        });
                    }
                });

                updateGalleryStats('All Folders', totalImages, 'Various Dates');

            } else {
                // Load images from specific folder
                const note = data.notes.find(n => n.folder === folderParam);

                if (!note) {
                    throw new Error(`Folder "${folderParam}" not found`);
                }

                if (note && note.hasImages && note.images) {

                    allImages = note.images.map(img => ({
                        name: img.name,
                        file: window.SiteConfig.dataPath(`notes/${note.folder}/images/${img.file}`),
                        folder: note.title,
                        date: note.date || 'Unknown'
                    }));

                    currentFolderInfo = {
                        name: note.title,
                        date: note.date || 'Unknown',
                        count: allImages.length
                    };

                    updateGalleryStats(note.title, allImages.length, note.date || 'Unknown');
                } else {
                    // No images in this folder
                    updateGalleryStats(note.title || folderParam, 0, note.date || 'Unknown');
                }
            }

            filteredImages = [...allImages];
            loadGallery();

        } catch (error) {
            console.error('Error loading images:', error);
            showError(error.message);
        }
    }

    // Render gallery
    function loadGallery() {
        
        const gallery = document.getElementById('gallery');
        gallery.innerHTML = '';
        if (filteredImages.length === 0) {
            showEmptyState();
            updateGalleryStats(
                currentFolderInfo?.name || 'All Folders',
                0,
                currentFolderInfo?.date || 'Various Dates'
            );
            return;
        }

        hideEmptyState();

        gallery.innerHTML = filteredImages.map((img, index) => `
            <div class="image-card" onclick="openLightbox(${index})" tabindex="0" role="button" aria-label="View ${img.name}">
                <div class="image-wrapper">
                    <img 
                        src="${img.file}" 
                        alt="${img.name}" 
                        loading="lazy"
                        onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'image-error\\'><div class=\\'image-error-icon\\'>📷</div>Image not found</div>';"
                    >
                </div>
                <div class="image-info">
                    <div class="image-name">${img.name}</div>
                    <div class="image-meta">
                        <div class="meta-item">📁 ${img.folder}</div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add keyboard support for image cards
        const cards = gallery.querySelectorAll('.image-card');
        cards.forEach((card, index) => {
            card.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openLightbox(index);
                }
            });
        });

        // Update stats
        updateGalleryStats(
            currentFolderInfo?.name || 'All Folders',
            filteredImages.length,
            currentFolderInfo?.date || 'Various Dates'
        );
    }

    // Filter images by search term
    function filterImages() {
        const search = document.getElementById('searchBox').value.toLowerCase();

        if (!search) {
            filteredImages = [...allImages];
        } else {
            filteredImages = allImages.filter(img =>
                img.name.toLowerCase().includes(search) ||
                img.folder.toLowerCase().includes(search) ||
                img.file.toLowerCase().includes(search)
            );
        }

        loadGallery();
    }

    // Set view mode (grid or list)
    function setView(view, button) {
        const gallery = document.getElementById('gallery');
        const buttons = document.querySelectorAll('.view-btn');

        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        if (view === 'list') {
            gallery.classList.add('list-view');
        } else {
            gallery.classList.remove('list-view');
        }

        // Save preference to localStorage
        try {
            localStorage.setItem('galleryView', view);
        } catch (e) {
            console.warn('Could not save view preference:', e);
        }
    }

    // Load saved view preference
    function loadViewPreference() {
        try {
            const savedView = localStorage.getItem('galleryView');
            if (savedView === 'list') {
                const listButton = document.querySelector('.view-btn[title="List View"]');
                if (listButton) {
                    setView('list', listButton);
                }
            }
        } catch (e) {
            console.warn('Could not load view preference:', e);
        }
    }

    // Open lightbox
    function openLightbox(index) {
        if (filteredImages.length === 0) return;

        currentImageIndex = index;
        const img = filteredImages[index];

        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxName = document.getElementById('lightboxName');
        const lightboxCounter = document.getElementById('lightboxCounter');
        const lightbox = document.getElementById('lightbox');

        lightboxImage.src = img.file;
        lightboxImage.alt = img.name;
        lightboxName.textContent = img.name;
        lightboxCounter.textContent = `${index + 1} of ${filteredImages.length}`;
        lightbox.classList.add('active');

        // Update navigation buttons state
        updateNavigationButtons();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    // Close lightbox
    function closeLightbox(event) {
        if (!event || event.target.id === 'lightbox' || event.target.classList.contains('lightbox-close')) {
            const lightbox = document.getElementById('lightbox');
            lightbox.classList.remove('active');

            // Restore body scroll
            document.body.style.overflow = '';
        }
    }

    // Navigate between images
    function navigateImage(direction) {
        if (filteredImages.length === 0) return;

        currentImageIndex += direction;

        // Wrap around
        if (currentImageIndex < 0) {
            currentImageIndex = filteredImages.length - 1;
        }
        if (currentImageIndex >= filteredImages.length) {
            currentImageIndex = 0;
        }

        const img = filteredImages[currentImageIndex];
        const lightboxImage = document.getElementById('lightboxImage');
        const lightboxName = document.getElementById('lightboxName');
        const lightboxCounter = document.getElementById('lightboxCounter');

        lightboxImage.src = img.file;
        lightboxImage.alt = img.name;
        lightboxName.textContent = img.name;
        lightboxCounter.textContent = `${currentImageIndex + 1} of ${filteredImages.length}`;

        // Update navigation buttons state
        updateNavigationButtons();
    }

    // Update navigation button states (disable when at start/end)
    function updateNavigationButtons() {
        const prevBtn = document.querySelector('.lightbox-prev');
        const nextBtn = document.querySelector('.lightbox-next');

        if (!prevBtn || !nextBtn) return;

        // For single image, disable both buttons
        if (filteredImages.length <= 1) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        } else {
            prevBtn.disabled = false;
            nextBtn.disabled = false;
        }
    }

    // Download current image
    function downloadImage() {
        if (filteredImages.length === 0) return;

        const img = filteredImages[currentImageIndex];
        const link = document.createElement('a');
        link.href = img.file;
        link.download = img.file.split('/').pop();
        link.click();
    }

    // Setup keyboard navigation
    function setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            const lightbox = document.getElementById('lightbox');
            if (lightbox.classList.contains('active')) {
                switch (e.key) {
                    case 'Escape':
                        closeLightbox();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        navigateImage(-1);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        navigateImage(1);
                        break;
                }
            }
        });

        // Load view preference after keyboard setup
        loadViewPreference();
    }

    // Expose functions to global scope for HTML event handlers
    window.filterImages = filterImages;
    window.setView = setView;
    window.openLightbox = openLightbox;
    window.closeLightbox = closeLightbox;
    window.navigateImage = navigateImage;
    window.downloadImage = downloadImage;

    console.log('🖼️ Gallery.js v2.0 loaded successfully');
})();