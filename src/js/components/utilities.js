import { toolbarStates } from '../annotation-tools';

export function renderModalMessage(message) {
  return new Promise((resolve, reject) => {
    // Set the flag to indicate that the modal is active
    toolbarStates.IS_MODAL_TABLE_ACTIVE = true;

    const confirmationModal = document.getElementById('confirmationModal');
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.innerHTML = message;

    const confirmDeleteBtn = document.getElementById('confirmDelete');
    const cancelDeleteBtn = document.getElementById('cancelDelete');

    confirmDeleteBtn.addEventListener('click', function () {
      resolve(); // Resolve the promise
      confirmationModal.classList.remove('show');
      confirmationModal.style.display = 'none';
      toolbarStates.IS_MODAL_TABLE_ACTIVE = false;
    });

    cancelDeleteBtn.addEventListener('click', function () {
      reject(); // Reject the promise
      confirmationModal.classList.remove('show');
      confirmationModal.style.display = 'none';
      toolbarStates.IS_MODAL_TABLE_ACTIVE = false;
    });

    // Display the modal after attaching the event listeners
    confirmationModal.classList.add('show');
    confirmationModal.style.display = 'block';
  });
}

export function renderModalPrompt(message, jamsFile) {
  return new Promise((resolve, reject) => {
    // Set the flag to indicate that the modal is active
    toolbarStates.IS_MODAL_TABLE_ACTIVE = true;

    const modalPrompt = document.getElementById('modalPrompt');
    const modalPromptMessage = modalPrompt.querySelector('#modalPromptMessage');
    modalPromptMessage.innerHTML = message;

    modalPrompt.classList.add('show');
    modalPrompt.style.display = 'block';

    const savePromptBtn = modalPrompt.querySelector('#savePrompt');
    const replacePromptBtn = modalPrompt.querySelector('#replacePrompt');
    const closeModalPromptBtn = modalPrompt.querySelector('#closePrompt');

    _updateModalPromptForms(jamsFile);

    savePromptBtn.addEventListener('click', function () {
      resolve('save'); // Resolve the promise with the value 'save'
      modalPrompt.classList.remove('show');
      modalPrompt.style.display = 'none';
      toolbarStates.IS_MODAL_TABLE_ACTIVE = false;
    });

    replacePromptBtn.addEventListener('click', function () {
      resolve('replace'); // Resolve the promise with the value 'replace'
      modalPrompt.classList.remove('show');
      modalPrompt.style.display = 'none';
      toolbarStates.IS_MODAL_TABLE_ACTIVE = false;
    });

    closeModalPromptBtn.addEventListener('click', function () {
      reject(); // Reject the promise
      modalPrompt.classList.remove('show');
      modalPrompt.style.display = 'none';
      toolbarStates.IS_MODAL_TABLE_ACTIVE = false;
    });
  });
}

function _updateModalPromptForms(jamsFile) {
  // Updating form fields with respective
  const annotatorNameInput = document.getElementById('annotatorName');
  const annotationDataSourceInput = document.getElementById(
    'annotationDataSource'
  );
  const annotationDescriptionInput = document.getElementById(
    'annotationDescription'
  );
  const annotationList = document.getElementById('annotation-list');

  // Currently selected/ displayed JAMS annotation
  const selected = jamsFile.annotations[annotationList.selectedIndex];

  annotatorNameInput.value = selected.annotation_metadata.curator.name;

  let dataSourceListSelected;
  if (selected.annotation_metadata.data_source === 'program') {
    dataSourceListSelected = 'user';
  } else {
    dataSourceListSelected = selected.annotation_metadata.data_source;
  }
  annotationDataSourceInput.value = dataSourceListSelected;

  annotationDescriptionInput.value = selected.sandbox.description;

  // check whether annotationDescriptionInput is empty or not
  if (annotationDescriptionInput.textContent.trim() === '') {
    annotationDescriptionInput.classList.add('placeholder-text');
  } else {
    annotationDescriptionInput.classList.remove('placeholder-text');
  }
}
//////
export function loadFile(input) {
  // In case of not using a URL as a param and waiting for click or drag event
  if (input === undefined) {
    return; // Exit the function if the parameter is undefined
  }

  let file;
  let fileUrl;

  if (input instanceof File) {
    // handle select event
    file = input;
  } else if (input.dataTransfer) {
    // handle drop event
    file = input.dataTransfer.files[0];
  }

  if (file) {
    fileUrl = URL.createObjectURL(file);
  } else {
    fileUrl = input;
  }

  return [fileUrl, file];
}

export function dragDropHandlers(
  selector,
  triggerAction,
  cssStyleClass,
  fileType
) {
  let leaveTimeout;
  let isDraggingOver = false;

  const elem = document.querySelector(selector);
  // Add effect on file drag and drop
  const addEffect = elem => elem.classList.add(cssStyleClass);
  const removeEffect = elem => elem.classList.remove(cssStyleClass);

  const textElem = document.querySelector('.drag-text');
  textElem.style.display = 'none';

  const handleDrag = event => {
    event.preventDefault();
    event.stopPropagation();
    isDraggingOver = true;
    clearTimeout(leaveTimeout);
    addEffect(elem);
    textElem.style.display = 'block';
  };
  const handleDragLeave = () => {
    leaveTimeout = setTimeout(() => {
      if (isDraggingOver) {
        removeEffect(elem);
        textElem.style.display = 'none';
      }
    }, 150);
  };

  const handleDrop = event => {
    event.preventDefault();
    event.stopPropagation();
    clearTimeout(leaveTimeout);
    isDraggingOver = false;
    removeEffect(elem);
    textElem.style.display = 'none';

    const defaultFileTypes = [
      'audio/opus',
      'audio/flac',
      'audio/webm',
      'audio/weba',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
      'audio/ogg',
      'audio/amr',
      'audio/midi',
      'audio/aiff',
      'audio/x-ms-wma',
      'audio/basic',
      'audio/aac',
    ];

    const allowedFileTypes = fileType ? fileType : defaultFileTypes;

    const files = event.dataTransfer.files;
    const validFiles = Array.from(files).filter(file =>
      allowedFileTypes.includes(file.type)
    );

    if (validFiles.length > 0) {
      triggerAction(validFiles[0]);
    }
  };

  elem.addEventListener('dragenter', handleDrag);
  elem.addEventListener('dragover', handleDrag);

  elem.addEventListener('dragleave', handleDragLeave);
  elem.addEventListener('drop', handleDrop);
}

export function fileSelectHandlers(
  selector,
  triggerAction,
  fileType = 'audio/*'
) {
  const elem = document.querySelector(selector);

  // Create an input element
  const createInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    // input.accept = 'audio/*';
    input.accept = fileType;
    input.style.display = 'none';
    return input;
  };

  // Function to handle file selection
  const handleFileSelect = () => {
    const input = createInput();
    input.addEventListener('change', e => {
      triggerAction(e.target.files[0]);
    });
    input.click();
  };

  elem.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    handleFileSelect(event);
  });
}

/**
 * Formats time in minutes, seconds and deciseconds to display the value on time-ruler-btn while audio is playing
 *
 * e.g. 169.2 seconds will become 2:49.1 (2min, 49seconds and 1 decisecond)
 */
export function formatTime(seconds) {
  seconds = Number(seconds);
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const deciseconds = Math.floor((seconds % 1) * 10); // Extract deciseconds
  const wholeSeconds = Math.floor(seconds); // Extract whole seconds

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(wholeSeconds).padStart(2, '0');

  return `${paddedMinutes}:${paddedSeconds}.${deciseconds}`;
}

// Function to download the JAMS file
export function downloadJAMS(jamsFile) {
  const fileData = JSON.stringify(jamsFile, null, 2);

  // Create a blob with the file data
  const blob = new Blob([fileData], { type: 'application/json' });

  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element to trigger the download
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = 'modified_annotations.jams';

  // Trigger the download
  downloadLink.click();

  // Clean up the URL and anchor element
  URL.revokeObjectURL(url);
  downloadLink.remove();
}

export function createToggle(selector) {
  const toggleOnIcon = document.querySelector(`${selector} .fa-toggle-on`);
  const toggleOffIcon = document.querySelector(`${selector}  .fa-toggle-off`);
  toggleOnIcon.classList.toggle('d-none');
  toggleOffIcon.classList.toggle('d-none');

  // When toggle off is invisible (=toggle on is up) then toggle is on (True)
  const state = toggleOffIcon.classList.contains('d-none');

  return [state, toggleOnIcon, toggleOffIcon];
}

export function resetToggle(selector) {
  const toggleOnIcon = document.querySelector(`${selector} .fa-toggle-on`);
  const toggleOffIcon = document.querySelector(`${selector}  .fa-toggle-off`);

  // Set to initial state.
  toggleOnIcon.classList.add('d-none');
  toggleOffIcon.classList.remove('d-none');
}

export function areObjectsEqual(obj1, obj2) {
  const obj1Keys = Object.keys(obj1);
  const obj2Keys = Object.keys(obj2);

  if (obj1Keys.length !== obj2Keys.length) {
    return false;
  }

  for (let key of obj1Keys) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

export function assignInputFieldEvents(selector, options) {
  const box = selector.querySelector('.box');
  const next = selector.querySelector('.next');
  const prev = selector.querySelector('.prev');

  box.innerText = options.default;
  options.current = options.default;

  next.addEventListener('click', () => {
    let currentValue = parseFloat(box.innerText);
    if (currentValue < options.max) {
      currentValue += options.step;
      box.innerText = currentValue.toFixed(2);
      options.current = box.innerText;
    }
  });

  prev.addEventListener('click', () => {
    let currentValue = parseFloat(box.innerText);
    if (currentValue > options.min) {
      currentValue -= options.step;
      box.innerText = currentValue.toFixed(2);
      options.current = box.innerText;
    }
  });
}

/**
 * Removes HTML tags from a string.
 *
 * @param {string} str - The input string containing HTML tags.
 * @returns {string} - The string with HTML tags removed.
 */
export function stripHtmlTags(str) {
  return str.replace(/<[^>]+>/g, '');
}
