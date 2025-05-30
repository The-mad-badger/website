/**
 * 40mm Badge Maker Application
 * Version 1.0
 * 
 * A tool for creating printable 40mm badge templates
 * with customizable text and images.
 */

// Configuration Settings
const CONFIG = {
  MAX_IMAGES: 20, // Changed from 24 to 20 to match the 4x5 grid
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  BADGE_SIZE: 40, // 40mm
  BLEED_SIZE: 44, // 44mm
  DEFAULT_FONT_SIZE: 14,
  DEFAULT_FONT: 'Arial, sans-serif',
  DEFAULT_TEXT_COLOR: '#ffffff',
  DEFAULT_TEXT_SHADOW: true
};

// State Management
const appState = {
  uploadedImages: [],
  currentImageIndex: -1,
  currentBadgeIndex: -1,
  cropper: null,
  isDragging: false,
  isResizing: false,
  currentTextElement: null,
  startX: 0,
  startY: 0,
  startFontSize: 0
};

// DOM Elements
const elements = {
  // Main sections
  dropZone: document.getElementById('dropZone'),
  imageUpload: document.getElementById('imageUpload'),
  uploadPreview: document.getElementById('uploadPreview'),
  badgePlaceholders: document.querySelectorAll('.badge-placeholder'),
  
  // Buttons and controls
  resetBtn: document.getElementById('resetBtn'),
  downloadBtn: document.getElementById('downloadBtn'),
  clearImagesBtn: document.getElementById('clearImagesBtn'),
  
  // Image counter
  imageCounter: document.getElementById('imageCounter'),
  
  // Crop modal elements
  cropModal: document.getElementById('cropModal'),
  cropperImage: document.getElementById('cropperImage'),
  cropBtn: document.getElementById('cropBtn'),
  cancelCropBtn: document.getElementById('cancelCropBtn'),
  closeCropBtn: document.querySelector('.close'),
  
  // Text modal elements
  textModal: document.getElementById('textModal'),
  badgeText: document.getElementById('badgeText'),
  fontFamily: document.getElementById('fontFamily'),
  fontSize: document.getElementById('fontSize'),
  fontSizeValue: document.getElementById('fontSizeValue'),
  textPosition: document.getElementById('textPosition'),
  textColor: document.getElementById('textColor'),
  textShadow: document.getElementById('textShadow'),
  applyTextBtn: document.getElementById('applyTextBtn'),
  cancelTextBtn: document.getElementById('cancelTextBtn'),
  closeTextBtn: document.querySelector('.text-close'),
  
  // Progress overlay
  progressOverlay: document.getElementById('progressOverlay'),
  progressBarFill: document.getElementById('progressBarFill'),
  progressMessage: document.getElementById('progressMessage')
};

/**
 * Initialization Functions
 */

// Initialize the application
function initApp() {
  // Make sure we have DOM elements before proceeding
  if (!elements.dropZone || !elements.imageUpload || !elements.uploadPreview) {
    console.error('Required DOM elements are missing. Check HTML structure and IDs.');
    return;
  }
  
  setupEventListeners();
  initDraggableText();
  console.log('40mm Badge Maker initialized successfully.');
}

// Set up all event listeners
function setupEventListeners() {
  // File upload listeners
  elements.imageUpload.addEventListener('change', handleFileSelection);
  
  // Drag and drop functionality
  elements.dropZone.addEventListener('dragover', handleDragOver);
  elements.dropZone.addEventListener('dragleave', handleDragLeave);
  elements.dropZone.addEventListener('drop', handleDrop);
  
  // Button listeners
  elements.resetBtn.addEventListener('click', resetTemplate);
  elements.clearImagesBtn.addEventListener('click', clearAllImages);
  elements.downloadBtn.addEventListener('click', downloadAsPDF);
  
  // Crop modal listeners
  elements.cropBtn.addEventListener('click', applyCrop);
  elements.cancelCropBtn.addEventListener('click', closeCropModal);
  elements.closeCropBtn.addEventListener('click', closeCropModal);
  
  // Text modal listeners
  elements.applyTextBtn.addEventListener('click', applyText);
  elements.cancelTextBtn.addEventListener('click', closeTextModal);
  elements.closeTextBtn.addEventListener('click', closeTextModal);
  
  // Text editing listeners
  elements.fontSize.addEventListener('input', updateFontSizeDisplay);
  
  // Setup badge placeholders for drag and drop
  setupBadgePlaceholders();
}

/**
 * Image Upload and Management
 */

// Handle file selection via input
function handleFileSelection(e) {
  console.log('File selection triggered', e.target.files);
  handleFiles(e.target.files);
}

// Handle drag over event for drop zone
function handleDragOver(e) {
  e.preventDefault();
  elements.dropZone.classList.add('drag-over');
}

// Handle drag leave event for drop zone
function handleDragLeave() {
  elements.dropZone.classList.remove('drag-over');
}

// Handle drop event for drop zone
function handleDrop(e) {
  e.preventDefault();
  elements.dropZone.classList.remove('drag-over');
  console.log('Files dropped', e.dataTransfer.files);
  handleFiles(e.dataTransfer.files);
}

// Process uploaded files
function handleFiles(files) {
  if (!files || files.length === 0) {
    console.log('No files provided to handleFiles');
    return;
  }
  
  console.log(`Processing ${files.length} files`);
  
  // Check if adding these files would exceed the maximum
  if (appState.uploadedImages.length + files.length > CONFIG.MAX_IMAGES) {
    showNotification(`You can only upload a maximum of ${CONFIG.MAX_IMAGES} images. You currently have ${appState.uploadedImages.length} images.`);
    
    // Process only files up to the maximum limit
    const remainingSlots = CONFIG.MAX_IMAGES - appState.uploadedImages.length;
    if (remainingSlots <= 0) return;
    
    // Create a new FileList with only the allowed number of files
    const allowedFiles = Array.from(files).slice(0, remainingSlots);
    files = allowedFiles;
  }
  
  processFiles(files);
}

// Process each file
function processFiles(files) {
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (!file.type.match('image.*')) {
      showNotification(`File "${file.name}" is not an image. Only image files are supported.`);
      continue;
    }
    
    // Check file size
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      showNotification(`Image "${file.name}" exceeds the 5MB size limit. Please resize and try again.`);
      continue;
    }
    
    readImageFile(file);
  }
}

// Read image file and add to uploaded images
function readImageFile(file) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    // Double-check we haven't exceeded the limit
    if (appState.uploadedImages.length >= CONFIG.MAX_IMAGES) {
      showNotification(`Maximum image limit of ${CONFIG.MAX_IMAGES} reached.`);
      return;
    }
    
    const imageUrl = e.target.result;
    console.log(`File ${file.name} loaded successfully`);
    
    // Add to uploaded images array
    appState.uploadedImages.push({
      original: imageUrl,
      cropped: null,
      name: file.name
    });
    
    // Create preview thumbnail
    createImagePreview(imageUrl, appState.uploadedImages.length - 1);
    
    // Update counter display
    updateImageCounter();
  };
  
  reader.onerror = function() {
    console.error(`Error reading file "${file.name}"`);
    showNotification(`Error reading file "${file.name}". Please try again.`);
  };
  
  reader.readAsDataURL(file);
}

// Create preview thumbnails with drag functionality
function createImagePreview(imageUrl, index) {
  const previewItem = document.createElement('div');
  previewItem.className = 'preview-item';
  previewItem.dataset.index = index;
  previewItem.draggable = true;
  
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = `Uploaded image ${index + 1}`;
  
  previewItem.appendChild(img);
  elements.uploadPreview.appendChild(previewItem);
  
  // Add event listeners
  previewItem.addEventListener('dragstart', handlePreviewDragStart);
  previewItem.addEventListener('dblclick', () => openCropModal(imageUrl, index));
  
  console.log(`Preview created for image at index ${index}`);
}

// Handle preview thumbnail drag start
function handlePreviewDragStart(e) {
  console.log('Drag start', e.target.dataset.index);
  e.dataTransfer.setData('text/plain', e.target.dataset.index);
  e.target.classList.add('dragging');
  
  // Add dragend event listener
  e.target.addEventListener('dragend', function onDragEnd() {
    e.target.classList.remove('dragging');
    e.target.removeEventListener('dragend', onDragEnd);
  }, { once: true });
}

// Update the image counter display
function updateImageCounter() {
  if (elements.imageCounter) {
    elements.imageCounter.textContent = `${appState.uploadedImages.length}/${CONFIG.MAX_IMAGES} images uploaded`;
    
    // Change color when approaching the limit
    if (appState.uploadedImages.length >= CONFIG.MAX_IMAGES) {
      elements.imageCounter.style.color = '#ff0000'; // Red
    } else if (appState.uploadedImages.length >= CONFIG.MAX_IMAGES * 0.8) {
      elements.imageCounter.style.color = '#ff9900'; // Orange
    } else {
      elements.imageCounter.style.color = '#4CAF50'; // Green
    }
  }
}

/**
 * Badge Management
 */

// Setup badge placeholders for drag and drop
function setupBadgePlaceholders() {
  elements.badgePlaceholders.forEach((placeholder, index) => {
    // Get related elements
    const wrapper = placeholder.closest('.badge-wrapper');
    const textBtn = wrapper.querySelector('.add-text-btn');
    const cropBtn = wrapper.querySelector('.crop-btn');
    
    // Setup text button click
    textBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (placeholder.classList.contains('has-image')) {
        openTextModal(placeholder);
      } else {
        showNotification('Please add an image to this badge first');
      }
    });
    
    // Setup crop button click
    cropBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (placeholder.classList.contains('has-image')) {
        const img = placeholder.querySelector('.badge-image');
        const imageIndex = img.dataset.imageIndex;
        const imageUrl = appState.uploadedImages[imageIndex].original;
        openCropModal(imageUrl, imageIndex, placeholder.dataset.index);
      } else {
        showNotification('Please add an image to this badge first');
      }
    });
    
    // Setup drag and drop for badge
    placeholder.addEventListener('dragover', (e) => {
      e.preventDefault();
      placeholder.classList.add('drag-over');
    });
    
    placeholder.addEventListener('dragleave', () => {
      placeholder.classList.remove('drag-over');
    });
    
    placeholder.addEventListener('drop', (e) => handleBadgeDrop(e, placeholder));
  });
}

// Handle badge drop event
function handleBadgeDrop(e, placeholder) {
  e.preventDefault();
  placeholder.classList.remove('drag-over');
  
  // Get the dragged image index
  const imageIndex = e.dataTransfer.getData('text/plain');
  console.log('Badge drop with image index:', imageIndex);
  
  if (!imageIndex) {
    console.log('No image index found in drop data');
    return;
  }
  
  // Update the badge with the dropped image
  updateBadgeWithImage(placeholder, parseInt(imageIndex));
}

// Update badge with the selected image
function updateBadgeWithImage(placeholder, imageIndex) {
  if (imageIndex >= 0 && imageIndex < appState.uploadedImages.length) {
    const badgeImage = placeholder.querySelector('.badge-image');
    const placeholderText = placeholder.querySelector('.placeholder-text');
    
    // Set image source
    const imageData = appState.uploadedImages[imageIndex];
    badgeImage.src = imageData.cropped || imageData.original;
    badgeImage.dataset.imageIndex = imageIndex;
    
    // Update badge appearance
    placeholder.classList.add('has-image');
    placeholderText.style.display = 'none';
    
    console.log(`Badge updated with image at index ${imageIndex}`);
    showNotification('Image added to badge!');
  }
}

/**
 * Badge Template Management
 */

// Reset the badge template
function resetTemplate() {
  if (!confirm('Are you sure you want to reset the template? This will remove all images and text from the badges.')) {
    return;
  }
  
  elements.badgePlaceholders.forEach(placeholder => {
    // Reset image
    placeholder.classList.remove('has-image');
    const img = placeholder.querySelector('.badge-image');
    img.src = '';
    img.removeAttribute('data-image-index');
    placeholder.querySelector('.placeholder-text').style.display = 'block';
    
    // Reset text
    const textElement = placeholder.querySelector('.badge-text');
    textElement.textContent = '';
    textElement.style = '';
    textElement.classList.remove('position-top', 'position-middle', 'position-bottom');
    
    // Remove resize handle if present
    const resizeHandle = textElement.querySelector('.resize-handle');
    if (resizeHandle) {
      resizeHandle.remove();
    }
  });
  
  showNotification('Template has been reset.');
}

// Clear all uploaded images
function clearAllImages() {
  if (!confirm('Are you sure you want to clear all uploaded images? This will also remove images from the badges.')) {
    return;
  }
  
  // Clear the uploaded images array
  appState.uploadedImages = [];
  
  // Clear the preview area
  elements.uploadPreview.innerHTML = '';
  
  // Reset all badges that have images
  elements.badgePlaceholders.forEach(placeholder => {
    placeholder.classList.remove('has-image');
    const img = placeholder.querySelector('.badge-image');
    img.src = '';
    img.removeAttribute('data-image-index');
    placeholder.querySelector('.placeholder-text').style.display = 'block';
    
    // Also clear text when clearing images
    const textElement = placeholder.querySelector('.badge-text');
    textElement.textContent = '';
    textElement.style = '';
    
    // Remove resize handle if present
    const resizeHandle = textElement.querySelector('.resize-handle');
    if (resizeHandle) {
      resizeHandle.remove();
    }
  });
  
  // Update the counter
  updateImageCounter();
  
  showNotification('All images have been cleared.');
}

/**
 * PDF Export
 */

// Download the badge template as PDF
function downloadAsPDF() {
  // Check if jsPDF is available
  if (typeof window.jspdf === 'undefined') {
    showNotification('PDF generation library is not available. Please check your internet connection.');
    return;
  }

  // Get jsPDF
  const { jsPDF } = window.jspdf;
  
  // Show progress overlay
  showProgress('Preparing PDF...', 10);
  
  setTimeout(() => {
    try {
      // Temporarily hide elements for PDF generation
      const elementsToHide = hideElementsForPDF();
      
      showProgress('Creating PDF...', 40);
      
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Use html2canvas to capture the template
      html2canvas(document.getElementById('badgeTemplate')).then(canvas => {
        showProgress('Generating PDF...', 70);
        
        // Convert canvas to image
        const imgData = canvas.toDataURL('image/png');
        
        // Add the image to the PDF (A4 is 210x297mm)
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        
        showProgress('Finishing...', 90);
        
        // Save the PDF
        pdf.save('40mm-badge-template.pdf');
        
        // Restore hidden elements
        restoreElementsAfterPDF(elementsToHide);
        
        // Hide progress overlay
        hideProgress();
        
        showNotification('PDF downloaded successfully!');
      }).catch(error => {
        console.error('Error creating PDF:', error);
        hideProgress();
        showNotification('Error creating PDF. Please try again.');
        
        // Restore hidden elements
        restoreElementsAfterPDF(elementsToHide);
      });
    } catch (error) {
      console.error('Error creating PDF:', error);
      hideProgress();
      showNotification('Error creating PDF. Please try again.');
    }
  }, 100);
}

// Hide elements for PDF export
function hideElementsForPDF() {
  const elementsToRestore = [];
  
  // Hide the controls
  const controls = document.querySelectorAll('.badge-controls');
  controls.forEach(control => {
    elementsToRestore.push({
      element: control,
      display: control.style.display
    });
    control.style.display = 'none';
  });
  
  // Hide guide lines
  const guideLines = document.querySelectorAll('.badge-design-area');
  guideLines.forEach(line => {
    elementsToRestore.push({
      element: line,
      display: line.style.display
    });
    line.style.display = 'none';
  });
  
  // Hide "Drop image here" text
  const dropTexts = document.querySelectorAll('.badge-placeholder .placeholder-text');
  dropTexts.forEach(text => {
    elementsToRestore.push({
      element: text,
      display: text.style.display
    });
    text.style.display = 'none';
  });
  
  // Remove borders and backgrounds from badges
  const badges = document.querySelectorAll('.badge-placeholder');
  badges.forEach(badge => {
    elementsToRestore.push({
      element: badge,
      border: badge.style.border,
      background: badge.style.backgroundColor
    });
    badge.style.border = 'none';
    badge.style.backgroundColor = 'transparent';
    
    // Add a class to override pseudo-elements
    badge.classList.add('pdf-export-mode');
  });
  
  // Add a temporary style tag to override pseudo-elements
  const styleTag = document.createElement('style');
  styleTag.id = 'pdf-export-style';
  styleTag.innerHTML = `
    .pdf-export-mode::after {
      display: none !important;
      border: none !important;
      content: none !important;
    }
  `;
  document.head.appendChild(styleTag);
  elementsToRestore.push({ element: styleTag });
  
  return elementsToRestore;
}

// Restore elements after PDF generation
function restoreElementsAfterPDF(elementsToRestore) {
  elementsToRestore.forEach(item => {
    if (item.element.id === 'pdf-export-style') {
      item.element.remove();
      return;
    }
    
    if (item.border !== undefined) {
      item.element.style.border = item.border;
      item.element.style.backgroundColor = item.background;
      item.element.classList.remove('pdf-export-mode');
    } else if (item.display !== undefined) {
      item.element.style.display = item.display;
    }
  });
}

/**
 * Modal Functionality
 */

// Crop modal functions
function openCropModal(imageUrl, imageIndex, badgeIndex = null) {
  // Reset cropper if it exists
  if (appState.cropper) {
    appState.cropper.destroy();
    appState.cropper = null;
  }
  
  // Set current indices
  appState.currentImageIndex = imageIndex;
  appState.currentBadgeIndex = badgeIndex;
  
  // Set image source
  elements.cropperImage.src = imageUrl;
  
  // Show the modal
  elements.cropModal.style.display = 'block';
  
  // Initialize cropper when image is loaded
  elements.cropperImage.onload = function() {
    appState.cropper = new Cropper(elements.cropperImage, {
      aspectRatio: 1,
      viewMode: 1,
      guides: true,
      center: true,
      highlight: false,
      dragMode: 'move',
      cropBoxMovable: true,
      cropBoxResizable: true,
      minCropBoxWidth: 100,
      minCropBoxHeight: 100,
      ready: function() {
        // Auto-size the crop box to fill the image with aspect ratio maintained
        const imageData = appState.cropper.getImageData();
        const size = Math.min(imageData.width, imageData.height);
        
        appState.cropper.setCropBoxData({
          left: (imageData.width - size) / 2,
          top: (imageData.height - size) / 2,
          width: size,
          height: size
        });
      }
    });
  };
}

function closeCropModal() {
  elements.cropModal.style.display = 'none';
  
  if (appState.cropper) {
    appState.cropper.destroy();
    appState.cropper = null;
  }
}

function applyCrop() {
  if (!appState.cropper) return;
  
  try {
    // Get cropped canvas
    const canvas = appState.cropper.getCroppedCanvas({
      width: 600,   // High resolution for print quality
      height: 600,
      fillColor: '#fff',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });
    
    if (!canvas) {
      showNotification('Error creating cropped image. Please try again.');
      return;
    }
    
    // Get cropped image as data URL
    const croppedImage = canvas.toDataURL('image/png');
    
    // Save the cropped version in our uploaded images array
    appState.uploadedImages[appState.currentImageIndex].cropped = croppedImage;
    
    // Update badge if we came from a badge
    if (appState.currentBadgeIndex !== null) {
      const placeholder = document.querySelector(`.badge-placeholder[data-index="${appState.currentBadgeIndex}"]`);
      if (placeholder) {
        updateBadgeWithImage(placeholder, appState.currentImageIndex);
      }
    }
    
    // Update preview thumbnail
    const previewItem = document.querySelector(`.preview-item[data-index="${appState.currentImageIndex}"]`);
    if (previewItem) {
      const img = previewItem.querySelector('img');
      img.src = croppedImage;
    }
    
    closeCropModal();
    showNotification('Image cropped successfully!');
  } catch (error) {
    console.error('Error applying crop:', error);
    showNotification('Error cropping image. Please try again.');
  }
}

// Text modal functions
function openTextModal(placeholder) {
  // Set current badge index
  appState.currentBadgeIndex = placeholder.dataset.index;
  
  // Get existing text if any
  const textElement = placeholder.querySelector('.badge-text');
  const existingText = textElement.textContent.trim();
  if (existingText) {
    elements.badgeText.value = existingText;
    
    // Get existing styles if applied
    const computedStyle = window.getComputedStyle(textElement);
    elements.fontFamily.value = computedStyle.fontFamily || CONFIG.DEFAULT_FONT;
    elements.fontSize.value = parseInt(computedStyle.fontSize) || CONFIG.DEFAULT_FONT_SIZE;
    elements.fontSizeValue.textContent = `${elements.fontSize.value}px`;
    elements.textColor.value = rgbToHex(computedStyle.color) || CONFIG.DEFAULT_TEXT_COLOR;
    
    // Determine position
    if (textElement.classList.contains('position-top')) {
      elements.textPosition.value = 'top';
    } else if (textElement.classList.contains('position-middle')) {
      elements.textPosition.value = 'middle';
    } else {
      elements.textPosition.value = 'custom';
    }
    
    // Determine shadow
    elements.textShadow.checked = computedStyle.textShadow !== 'none';
  } else {
    // Reset to defaults
    resetTextModalFields();
  }
  
  // Show the modal
  elements.textModal.style.display = 'block';
}

function closeTextModal() {
  elements.textModal.style.display = 'none';
  resetTextModalFields();
}

function resetTextModalFields() {
  elements.badgeText.value = '';
  elements.fontFamily.value = CONFIG.DEFAULT_FONT;
  elements.fontSize.value = CONFIG.DEFAULT_FONT_SIZE;
  elements.fontSizeValue.textContent = `${CONFIG.DEFAULT_FONT_SIZE}px`;
  elements.textPosition.value = 'top';
  elements.textColor.value = CONFIG.DEFAULT_TEXT_COLOR;
  elements.textShadow.checked = CONFIG.DEFAULT_TEXT_SHADOW;
}

function updateFontSizeDisplay() {
  elements.fontSizeValue.textContent = `${elements.fontSize.value}px`;
}

function applyText() {
  const text = elements.badgeText.value.trim();
  if (!text) {
    showNotification('Please enter some text for the badge.');
    return;
  }
  
  const placeholder = document.querySelector(`.badge-placeholder[data-index="${appState.currentBadgeIndex}"]`);
  if (!placeholder) return;
  
  const textElement = placeholder.querySelector('.badge-text');
  
  // Set text content
  textElement.textContent = text;
  
  // Apply font and color styles
  textElement.style.fontFamily = elements.fontFamily.value;
  textElement.style.fontSize = `${elements.fontSize.value}px`;
  textElement.style.color = elements.textColor.value;
  
  // Apply text shadow if checked
  if (elements.textShadow.checked) {
    textElement.style.textShadow = '0px 0px 3px black, 0px 0px 5px black';
  } else {
    textElement.style.textShadow = 'none';
  }
  
  // Position text
  textElement.classList.remove('position-top', 'position-middle');
  if (elements.textPosition.value === 'top') {
    textElement.classList.add('position-top');
    textElement.style.top = '15%';
    textElement.style.left = '50%';
  } else if (elements.textPosition.value === 'middle') {
    textElement.classList.add('position-middle');
    textElement.style.top = '50%';
    textElement.style.left = '50%';
    textElement.style.transform = 'translate(-50%, -50%)';
  }
  
  // Add resize handle if not present
  if (!textElement.querySelector('.resize-handle')) {
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    textElement.appendChild(resizeHandle);
  }
  
  closeTextModal();
  showNotification('Text added to badge!');
}

/**
 * Utility Functions
 */

// Progress bar functions
function showProgress(message, percentage) {
  elements.progressOverlay.style.display = 'flex';
  elements.progressMessage.textContent = message;
  elements.progressBarFill.style.width = `${percentage}%`;
}

function hideProgress() {
  elements.progressOverlay.style.display = 'none';
}

// Notification function
function showNotification(message) {
  // Create notification element if it doesn't exist
  let notification = document.querySelector('.notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.className = 'notification';
    document.body.appendChild(notification);
  }
  
  // Update message and show
  notification.textContent = message;
  notification.style.display = 'block';
  
  // Auto hide after 3 seconds
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

// Utility function to convert RGB to HEX
function rgbToHex(rgb) {
  if (!rgb || rgb === 'none' || !rgb.includes('rgb')) return CONFIG.DEFAULT_TEXT_COLOR;
  
  // Extract RGB values
  const rgbArray = rgb.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (!rgbArray) return CONFIG.DEFAULT_TEXT_COLOR;
  
  // Convert to hex
  return '#' + ('0' + parseInt(rgbArray[1], 10).toString(16)).slice(-2) +
         ('0' + parseInt(rgbArray[2], 10).toString(16)).slice(-2) +
         ('0' + parseInt(rgbArray[3], 10).toString(16)).slice(-2);
}

/**
 * Draggable Text Functionality
 */

// Add draggable text functionality
function initDraggableText() {
  document.addEventListener('mousedown', handleTextMouseDown);
  document.addEventListener('mousemove', handleTextMouseMove);
  document.addEventListener('mouseup', handleTextMouseUp);
  document.addEventListener('touchstart', handleTextTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTextTouchMove, { passive: false });
  document.addEventListener('touchend', handleTextTouchEnd);
}

function handleTextMouseDown(e) {
  const target = e.target;
  
  // Check if we're clicking a text element
  if (target.classList.contains('badge-text')) {
    e.preventDefault();
    appState.isDragging = true;
    appState.currentTextElement = target;
    appState.startX = e.clientX;
    appState.startY = e.clientY;
    target.classList.add('text-dragging');
    
    // Save the initial position
    const rect = target.getBoundingClientRect();
    appState.initialLeft = rect.left;
    appState.initialTop = rect.top;
  }
  // Check if we're clicking the resize handle
  else if (target.classList.contains('resize-handle')) {
    e.preventDefault();
    e.stopPropagation();
    appState.isResizing = true;
    appState.currentTextElement = target.parentElement;
    appState.startY = e.clientY;
    appState.startFontSize = parseInt(window.getComputedStyle(appState.currentTextElement).fontSize);
    appState.currentTextElement.classList.add('text-resizing');
  }
}

function handleTextMouseMove(e) {
  if (appState.isDragging && appState.currentTextElement) {
    e.preventDefault();
    
    // Calculate the difference
    const dx = e.clientX - appState.startX;
    const dy = e.clientY - appState.startY;
    
    // Get the parent badge placeholder
    const badge = appState.currentTextElement.closest('.badge-placeholder');
    const badgeRect = badge.getBoundingClientRect();
    
    // Calculate new position relative to the badge
    let newLeft = ((appState.initialLeft + dx) - badgeRect.left) / badgeRect.width * 100;
    let newTop = ((appState.initialTop + dy) - badgeRect.top) / badgeRect.height * 100;
    
    // Keep within badge boundaries (5% margin)
    newLeft = Math.max(5, Math.min(95, newLeft));
    newTop = Math.max(5, Math.min(95, newTop));
    
    // Update position
    appState.currentTextElement.style.left = `${newLeft}%`;
    appState.currentTextElement.style.top = `${newTop}%`;
    
    // Ensure transform is set for proper centering
    appState.currentTextElement.style.transform = 'translateX(-50%)';
    
    // Remove position classes since it's now custom positioned
    appState.currentTextElement.classList.remove('position-top', 'position-middle');
  }
  else if (appState.isResizing && appState.currentTextElement) {
    e.preventDefault();
    
    // Calculate font size change
    const dy = e.clientY - appState.startY;
    
    // Adjust font size (negative dy means dragging up, which should increase size)
    let newSize = appState.startFontSize - (dy / 3);
    
    // Limit size range
    newSize = Math.max(8, Math.min(36, newSize));
    
    // Apply new font size
    appState.currentTextElement.style.fontSize = `${newSize}px`;
  }
}

function handleTextMouseUp() {
  if (appState.isDragging || appState.isResizing) {
    if (appState.currentTextElement) {
      appState.currentTextElement.classList.remove('text-dragging', 'text-resizing');
    }
    
    appState.isDragging = false;
    appState.isResizing = false;
    appState.currentTextElement = null;
  }
}

// Touch event handlers
function handleTextTouchStart(e) {
  if (e.touches.length !== 1) return;
  
  const touch = e.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  
  if (target.classList.contains('badge-text')) {
    e.preventDefault();
    appState.isDragging = true;
    appState.currentTextElement = target;
    appState.startX = touch.clientX;
    appState.startY = touch.clientY;
    target.classList.add('text-dragging');
    
    // Save the initial position
    const rect = target.getBoundingClientRect();
    appState.initialLeft = rect.left;
    appState.initialTop = rect.top;
  }
  else if (target.classList.contains('resize-handle')) {
    e.preventDefault();
    appState.isResizing = true;
    appState.currentTextElement = target.parentElement;
    appState.startY = touch.clientY;
    appState.startFontSize = parseInt(window.getComputedStyle(appState.currentTextElement).fontSize);
    appState.currentTextElement.classList.add('text-resizing');
  }
}

function handleTextTouchMove(e) {
  if (e.touches.length !== 1) return;
  
  const touch = e.touches[0];
  
  if (appState.isDragging && appState.currentTextElement) {
    e.preventDefault();
    
    // Calculate the difference
    const dx = touch.clientX - appState.startX;
    const dy = touch.clientY - appState.startY;
    
    // Get the parent badge placeholder
    const badge = appState.currentTextElement.closest('.badge-placeholder');
    const badgeRect = badge.getBoundingClientRect();
    
    // Calculate new position relative to the badge
    let newLeft = ((appState.initialLeft + dx) - badgeRect.left) / badgeRect.width * 100;
    let newTop = ((appState.initialTop + dy) - badgeRect.top) / badgeRect.height * 100;
    
    // Keep within badge boundaries (5% margin)
    newLeft = Math.max(5, Math.min(95, newLeft));
    newTop = Math.max(5, Math.min(95, newTop));
    
    // Update position
    appState.currentTextElement.style.left = `${newLeft}%`;
    appState.currentTextElement.style.top = `${newTop}%`;
    
    // Ensure transform is set for proper centering
    appState.currentTextElement.style.transform = 'translateX(-50%)';
    
    // Remove position classes since it's now custom positioned
    appState.currentTextElement.classList.remove('position-top', 'position-middle');
  }
  else if (appState.isResizing && appState.currentTextElement) {
    e.preventDefault();
    
    // Calculate font size change
    const dy = touch.clientY - appState.startY;
    
    // Adjust font size (negative dy means dragging up, which should increase size)
    let newSize = appState.startFontSize - (dy / 3);
    
    // Limit size range
    newSize = Math.max(8, Math.min(36, newSize));
    
    // Apply new font size
    appState.currentTextElement.style.fontSize = `${newSize}px`;
  }
}

function handleTextTouchEnd() {
  if (appState.isDragging || appState.isResizing) {
    if (appState.currentTextElement) {
      appState.currentTextElement.classList.remove('text-dragging', 'text-resizing');
    }
    
    appState.isDragging = false;
    appState.isResizing = false;
    appState.currentTextElement = null;
  }
}

// Initialize the app once the DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}