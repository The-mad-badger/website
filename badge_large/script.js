/**
 * Badge Maker Application
 * Version 1.0
 * 
 * A tool for creating printable badge templates
 * with customizable text and images.
 */

// Access the jsPDF global from the imported library
const { jsPDF } = window.jspdf;

// Configuration Settings
const CONFIG = {
  MAX_IMAGES: 20,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  BADGE_SIZE: 58, // 58mm
  BLEED_SIZE: 62, // 62mm
  DEFAULT_FONT_SIZE: 18,
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
  setupEventListeners();
  initDraggableText();
  console.log('Badge Maker initialized successfully.');
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
  handleFiles(e.dataTransfer.files);
}

// Process uploaded files
function handleFiles(files) {
  if (!files || files.length === 0) return;
  
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
}

// Handle preview thumbnail drag start
function handlePreviewDragStart(e) {
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
  
  const imageIndex = e.dataTransfer.getData('text/plain');
  if (imageIndex === '') return;
  
  // Get image source
  const imgSrc = appState.uploadedImages[imageIndex].cropped || 
                 appState.uploadedImages[imageIndex].original;
  
  // Get placeholder elements
  const img = placeholder.querySelector('.badge-image');
  const placeholderText = placeholder.querySelector('.placeholder-text');
  
  // Create a temporary image to check dimensions
  const tempImg = new Image();
  tempImg.onload = function() {
    // If image isn't cropped and has non-square aspect ratio, auto-crop
    if (!appState.uploadedImages[imageIndex].cropped && (tempImg.width !== tempImg.height)) {
      // Create a square cropped version automatically
      const squareImg = createSquareCrop(tempImg);
      appState.uploadedImages[imageIndex].cropped = squareImg;
      img.src = squareImg;
    } else {
      img.src = imgSrc;
    }
    
    // Set the image index data attribute
    img.dataset.imageIndex = imageIndex;
    
    // Show the image
    placeholder.classList.add('has-image');
    placeholderText.style.display = 'none';
  };
  
  tempImg.onerror = function() {
    showNotification('Error loading image. Please try again.');
  };
  
  tempImg.src = imgSrc;
}

// Create a square crop of an image automatically
function createSquareCrop(img) {
  // Determine the size for the square crop
  const size = Math.min(img.width, img.height);
  
  // Create a canvas for the square crop
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  
  // Draw the centered square portion
  const ctx = canvas.getContext('2d');
  const offsetX = (img.width - size) / 2;
  const offsetY = (img.height - size) / 2;
  ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, size, size);
  
  // Return the data URL
  return canvas.toDataURL('image/jpeg', 0.92); // Higher quality
}

/**
 * Crop Functionality
 */

// Open crop modal
function openCropModal(imageUrl, imageIndex, badgeIndex = null) {
  // Set current state
  appState.currentImageIndex = imageIndex;
  appState.currentBadgeIndex = badgeIndex;
  
  // Set crop image source
  elements.cropperImage.src = imageUrl;
  
  // Show the modal
  elements.cropModal.style.display = 'block';
  
  // Initialize cropper after image loads
  elements.cropperImage.onload = function() {
    if (appState.cropper) {
      appState.cropper.destroy();
    }
    
    // Create new cropper instance
    appState.cropper = new Cropper(elements.cropperImage, {
      aspectRatio: 1,
      viewMode: 1,
      guides: true,
      autoCropArea: 0.8,
      responsive: true,
      background: true,
      zoomOnWheel: false
    });
  };
}

// Apply crop
function applyCrop() {
  if (!appState.cropper) return;
  
  try {
    // Get cropped canvas
    const croppedCanvas = appState.cropper.getCroppedCanvas({
      width: 600,
      height: 600,
      minWidth: 300,
      minHeight: 300,
      maxWidth: 1200,
      maxHeight: 1200,
      fillColor: '#fff'
    });
    
    if (!croppedCanvas) {
      showNotification('Error cropping image. Please try again.');
      return;
    }
    
    // Get cropped image
    const croppedImage = croppedCanvas.toDataURL('image/jpeg', 0.92);
    
    // Update the uploaded image
    appState.uploadedImages[appState.currentImageIndex].cropped = croppedImage;
    
    // Update the preview
    updatePreviewAfterCrop(croppedImage);
    
    // If a badge is being edited, update it too
    updateBadgeAfterCrop(croppedImage);
    
    // Close the modal
    closeCropModal();
  } catch (error) {
    console.error('Error applying crop:', error);
    showNotification('Error applying crop. Please try again.');
  }
}

// Update preview after crop
function updatePreviewAfterCrop(croppedImage) {
  const previewItem = document.querySelector(`.preview-item[data-index="${appState.currentImageIndex}"]`);
  if (previewItem) {
    previewItem.querySelector('img').src = croppedImage;
  }
}

// Update badge after crop
function updateBadgeAfterCrop(croppedImage) {
  if (appState.currentBadgeIndex !== null) {
    const badge = document.querySelector(`.badge-placeholder[data-index="${appState.currentBadgeIndex}"]`);
    if (badge) {
      const img = badge.querySelector('.badge-image');
      img.src = croppedImage;
      
      // Ensure badge is marked as having an image
      badge.classList.add('has-image');
      badge.querySelector('.placeholder-text').style.display = 'none';
    }
  }
}

// Close crop modal
function closeCropModal() {
  if (appState.cropper) {
    appState.cropper.destroy();
    appState.cropper = null;
  }
  
  elements.cropModal.style.display = 'none';
  elements.cropperImage.src = '';
}

/**
 * Text Functionality
 */

// Open text modal
function openTextModal(placeholder) {
  appState.currentBadgeIndex = placeholder.dataset.index;
  const textElement = placeholder.querySelector('.badge-text');
  
  // Get current text properties
  const currentText = textElement.textContent || '';
  const currentFont = textElement.style.fontFamily || CONFIG.DEFAULT_FONT;
  const currentColor = textElement.style.color || CONFIG.DEFAULT_TEXT_COLOR;
  
  let currentSize = textElement.style.fontSize;
  currentSize = currentSize ? parseInt(currentSize) : CONFIG.DEFAULT_FONT_SIZE;
  
  // Set text shadow checkbox
  const hasShadow = textElement.style.textShadow && 
                    textElement.style.textShadow !== 'none';
  
  // Determine current position
  let currentPosition = 'middle';
  if (textElement.style.top === '10%') {
    currentPosition = 'top';
  } else if (textElement.style.bottom === '10%') {
    currentPosition = 'bottom';
  } else if (textElement.style.top && textElement.style.top !== 'auto') {
    currentPosition = 'custom';
  }
  
  // Set values in modal
  elements.badgeText.value = currentText;
  elements.fontFamily.value = currentFont;
  elements.fontSize.value = currentSize;
  elements.fontSizeValue.textContent = `${currentSize}px`;
  elements.textColor.value = currentColor;
  elements.textPosition.value = currentPosition;
  elements.textShadow.checked = hasShadow;
  
  // Show the modal
  elements.textModal.style.display = 'block';
  elements.badgeText.focus();
}

// Update font size display when slider changes
function updateFontSizeDisplay() {
  elements.fontSizeValue.textContent = `${elements.fontSize.value}px`;
}

// Apply text to badge
function applyText() {
  const text = elements.badgeText.value.trim();
  const fontFamily = elements.fontFamily.value;
  const fontSize = elements.fontSize.value;
  const textColor = elements.textColor.value;
  const textPosition = elements.textPosition.value;
  const addTextShadow = elements.textShadow.checked;
  
  // Get the badge
  const badge = document.querySelector(`.badge-placeholder[data-index="${appState.currentBadgeIndex}"]`);
  if (!badge) return;
  
  const textElement = badge.querySelector('.badge-text');
  
  // Set text content and styling
  textElement.textContent = text;
  textElement.style.fontFamily = fontFamily;
  textElement.style.fontSize = `${fontSize}px`;
  textElement.style.color = textColor;
  
  // Set text shadow
  if (addTextShadow) {
    textElement.style.textShadow = '0px 0px 3px black, 0px 0px 5px black';
  } else {
    textElement.style.textShadow = 'none';
  }
  
  // Set position based on dropdown
  setTextPosition(textElement, textPosition);
  
  // Add draggable class
  textElement.classList.add('draggable-text');
  
  // Close the modal
  closeTextModal();
  
  // Update draggable text
  initDraggableText();
}

// Set text position based on dropdown selection
function setTextPosition(textElement, position) {
  // Remove all position classes
  textElement.classList.remove('position-top', 'position-middle', 'position-bottom');
  
  // Set position
  if (position === 'top') {
    textElement.style.top = '10%';
    textElement.style.left = '50%';
    textElement.style.bottom = 'auto';
    textElement.classList.add('position-top');
  } else if (position === 'middle') {
    textElement.style.top = '50%';
    textElement.style.left = '50%';
    textElement.style.bottom = 'auto';
    textElement.classList.add('position-middle');
  } else if (position === 'bottom') {
    textElement.style.top = 'auto';
    textElement.style.bottom = '10%';
    textElement.style.left = '50%';
    textElement.classList.add('position-bottom');
  }
  
  // Center horizontally with transform
  textElement.style.transform = 'translateX(-50%)';
}

// Close text modal
function closeTextModal() {
  elements.textModal.style.display = 'none';
}

/**
 * Text Dragging and Resizing
 */

// Initialize draggable text elements
function initDraggableText() {
  // Get all text elements
  const textElements = document.querySelectorAll('.badge-text');
  
  // Remove existing event listeners to prevent duplicates
  textElements.forEach(textElement => {
    textElement.removeEventListener('mousedown', handleTextMouseDown);
    textElement.removeEventListener('touchstart', handleTextTouchStart);
    
    // Add new listeners
    textElement.addEventListener('mousedown', handleTextMouseDown);
    textElement.addEventListener('touchstart', handleTextTouchStart, { passive: false });
    
    // Make sure we have a resize handle
    if (!textElement.querySelector('.resize-handle')) {
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      textElement.appendChild(resizeHandle);
      
      resizeHandle.addEventListener('mousedown', handleResizeMouseDown);
      resizeHandle.addEventListener('touchstart', handleResizeTouchStart, { passive: false });
    }
  });
  
  // Remove global event listeners to prevent duplicates
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('touchmove', handleTouchMove);
  document.removeEventListener('touchend', handleTouchEnd);
  
  // Add global event listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);
}

// Handle text mousedown event
function handleTextMouseDown(e) {
  // Check if we clicked the resize handle (ignore for drag)
  if (e.target.classList.contains('resize-handle')) {
    return;
  }
  
  e.preventDefault();
  e.stopPropagation();
  
  appState.isDragging = true;
  appState.currentTextElement = this;
  
  // Get initial position
  appState.startX = e.clientX;
  appState.startY = e.clientY;
  
  // Get current position with fallbacks
  const currentLeft = parseFloat(appState.currentTextElement.style.left) || 50;
  const currentTop = appState.currentTextElement.style.top || 
                    (appState.currentTextElement.style.bottom ? 
                     (100 - parseFloat(appState.currentTextElement.style.bottom)) : 50);
  
  // Store for delta calculation
  appState.currentTextElement.dataset.startLeft = currentLeft;
  appState.currentTextElement.dataset.startTop = currentTop;
  
  // Add active class for visual feedback
  appState.currentTextElement.classList.add('text-dragging');
}

// Handle text touchstart event
function handleTextTouchStart(e) {
  // Check if we touched the resize handle
  if (e.target.classList.contains('resize-handle')) {
    return;
  }
  
  e.preventDefault();
  e.stopPropagation();
  
  appState.isDragging = true;
  appState.currentTextElement = this;
  
  // Get initial position from first touch point
  const touch = e.touches[0];
  appState.startX = touch.clientX;
  appState.startY = touch.clientY;
  
  // Get current position
  const currentLeft = parseFloat(appState.currentTextElement.style.left) || 50;
  const currentTop = appState.currentTextElement.style.top || 
                    (appState.currentTextElement.style.bottom ? 
                     (100 - parseFloat(appState.currentTextElement.style.bottom)) : 50);
  
  // Store for delta calculation
  appState.currentTextElement.dataset.startLeft = currentLeft;
  appState.currentTextElement.dataset.startTop = currentTop;
  
  // Add active class
  appState.currentTextElement.classList.add('text-dragging');
}

// Handle resize mousedown
function handleResizeMouseDown(e) {
  e.preventDefault();
  e.stopPropagation();
  
  appState.isResizing = true;
  appState.currentTextElement = this.parentElement;
  
  // Get initial position
  appState.startX = e.clientX;
  appState.startY = e.clientY;
  
  // Get current font size
  appState.startFontSize = parseInt(window.getComputedStyle(appState.currentTextElement).fontSize);
  
  // Add active class
  appState.currentTextElement.classList.add('text-resizing');
}

// Handle resize touchstart
function handleResizeTouchStart(e) {
  e.preventDefault();
  e.stopPropagation();
  
  appState.isResizing = true;
  appState.currentTextElement = this.parentElement;
  
  // Get initial position
  const touch = e.touches[0];
  appState.startX = touch.clientX;
  appState.startY = touch.clientY;
  
  // Get current font size
  appState.startFontSize = parseInt(window.getComputedStyle(appState.currentTextElement).fontSize);
  
  // Add active class
  appState.currentTextElement.classList.add('text-resizing');
}

// Handle mouse move for dragging and resizing
function handleMouseMove(e) {
  if (!appState.isDragging && !appState.isResizing) return;
  
  if (appState.isDragging && appState.currentTextElement) {
    const deltaX = e.clientX - appState.startX;
    const deltaY = e.clientY - appState.startY;
    
    // Calculate new position percentages relative to badge
    const badgePlaceholder = appState.currentTextElement.closest('.badge-placeholder');
    const badgeWidth = badgePlaceholder.offsetWidth;
    const badgeHeight = badgePlaceholder.offsetHeight;
    
    // Get the saved start positions
    const startLeft = parseFloat(appState.currentTextElement.dataset.startLeft);
    const startTop = parseFloat(appState.currentTextElement.dataset.startTop);
    
    // Calculate percentage delta
    const percentDeltaX = (deltaX / badgeWidth) * 100;
    const percentDeltaY = (deltaY / badgeHeight) * 100;
    
    // Apply new position with limits to keep within badge
    const newLeft = Math.max(5, Math.min(95, startLeft + percentDeltaX));
    const newTop = Math.max(5, Math.min(95, startTop + percentDeltaY));
    
    // Set explicit position properties
    appState.currentTextElement.style.left = newLeft + '%';
    appState.currentTextElement.style.top = newTop + '%';
    appState.currentTextElement.style.bottom = 'auto'; // Clear bottom position
    appState.currentTextElement.style.transform = 'translateX(-50%)'; // Keep horizontal centering
    
    // Remove positioning classes that might interfere
    appState.currentTextElement.classList.remove('position-top', 'position-middle', 'position-bottom');
  }
  
  if (appState.isResizing && appState.currentTextElement) {
    const deltaY = e.clientY - appState.startY;
    const sizeDelta = Math.round(deltaY / 10);
    
    // Apply new font size with limits
    const newSize = Math.max(8, Math.min(72, appState.startFontSize - sizeDelta)); // Invert direction
    appState.currentTextElement.style.fontSize = newSize + 'px';
    
    // Update the resize handle position
    updateResizeHandlePosition(appState.currentTextElement);
  }
}

// Handle touch move for dragging and resizing
function handleTouchMove(e) {
  if (!appState.isDragging && !appState.isResizing) return;
  
  e.preventDefault(); // Prevent scrolling
  
  const touch = e.touches[0];
  
  if (appState.isDragging && appState.currentTextElement) {
    const deltaX = touch.clientX - appState.startX;
    const deltaY = touch.clientY - appState.startY;
    
    // Calculate new position percentages
    const badgePlaceholder = appState.currentTextElement.closest('.badge-placeholder');
    const badgeWidth = badgePlaceholder.offsetWidth;
    const badgeHeight = badgePlaceholder.offsetHeight;
    
    // Get the saved start positions
    const startLeft = parseFloat(appState.currentTextElement.dataset.startLeft);
    const startTop = parseFloat(appState.currentTextElement.dataset.startTop);
    
    // Calculate percentage delta
    const percentDeltaX = (deltaX / badgeWidth) * 100;
    const percentDeltaY = (deltaY / badgeHeight) * 100;
    
    // Apply new position with limits
    const newLeft = Math.max(5, Math.min(95, startLeft + percentDeltaX));
    const newTop = Math.max(5, Math.min(95, startTop + percentDeltaY));
    
    // Set position properties
    appState.currentTextElement.style.left = newLeft + '%';
    appState.currentTextElement.style.top = newTop + '%';
    appState.currentTextElement.style.bottom = 'auto';
    appState.currentTextElement.style.transform = 'translateX(-50%)';
    
    // Remove positioning classes
    appState.currentTextElement.classList.remove('position-top', 'position-middle', 'position-bottom');
  }
  
  if (appState.isResizing && appState.currentTextElement) {
    const deltaY = touch.clientY - appState.startY;
    const sizeDelta = Math.round(deltaY / 10);
    
    // Apply new font size with limits
    const newSize = Math.max(8, Math.min(72, appState.startFontSize - sizeDelta)); // Invert direction
    appState.currentTextElement.style.fontSize = newSize + 'px';
    
    // Update the resize handle position
    updateResizeHandlePosition(appState.currentTextElement);
  }
}

// Update resize handle position
function updateResizeHandlePosition(textElement) {
  const resizeHandle = textElement.querySelector('.resize-handle');
  if (resizeHandle) {
    // Ensure the handle stays visible and properly positioned
    resizeHandle.style.display = 'block';
  }
}

// Handle mouse up for dragging and resizing
function handleMouseUp() {
  if (appState.currentTextElement) {
    appState.currentTextElement.classList.remove('text-dragging', 'text-resizing');
  }
  appState.isDragging = false;
  appState.isResizing = false;
  appState.currentTextElement = null;
}

// Handle touch end for dragging and resizing
function handleTouchEnd() {
  if (appState.currentTextElement) {
    appState.currentTextElement.classList.remove('text-dragging', 'text-resizing');
  }
  appState.isDragging = false;
  appState.isResizing = false;
  appState.currentTextElement = null;
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
        pdf.save('badge-template.pdf');
        
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

// Restore elements after PDF export
function restoreElementsAfterPDF(elementsToRestore) {
  elementsToRestore.forEach(item => {
    if (item.element.id === 'pdf-export-style') {
      item.element.remove();
      return;
    }
    
    if (item.display !== undefined) {
      item.element.style.display = item.display;
    }
    
    if (item.border !== undefined) {
      item.element.style.border = item.border;
    }
    
    if (item.background !== undefined) {
      item.element.style.backgroundColor = item.background;
    }
    
    // Remove the temporary class if it's a badge
    if (item.element.classList.contains('pdf-export-mode')) {
      item.element.classList.remove('pdf-export-mode');
    }
  });
}

/**
 * UI Utilities
 */

// Show notification
function showNotification(message, duration = 3000) {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    document.body.appendChild(notification);
    
    // Add styles if not already in CSS
    if (!document.getElementById('notification-style')) {
      const style = document.createElement('style');
      style.id = 'notification-style';
      style.innerHTML = `
        .notification {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 12px 24px;
          border-radius: 5px;
          z-index: 1000;
          display: none;
          animation: fadeInUp 0.3s ease;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Update message and show notification
  notification.textContent = message;
  notification.style.display = 'block';
  
  // Hide after duration
  setTimeout(() => {
    notification.style.display = 'none';
  }, duration);
}

// Show progress overlay
function showProgress(message, percent) {
  elements.progressMessage.textContent = message || 'Processing...';
  elements.progressBarFill.style.width = `${percent}%`;
  elements.progressOverlay.style.display = 'flex';
}

// Hide progress overlay
function hideProgress() {
  elements.progressOverlay.style.display = 'none';
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);