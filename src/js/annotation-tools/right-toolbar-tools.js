// Created wavesurfer instance from audio-player.js
import { wavesurfer } from '../audio-player.js';
import {
  jamsFile,
  addMarkerAtTime,
  renderAnnotations,
  createAnnotationsList,
  selectedAnnotationData,
  updateMarkerDisplayWithColorizedRegions,
} from '../audio-player/render-annotations.js';

import {
  showChordEditorHTMLWithCategories,
  showChordEditorHTMLWithoutCategories,
} from '../components/render_show-chord-editor.js';

import { createTooltipsChordEditor } from '../components/tooltips.js';

import { settingsMenuFollowPlayback } from '../audio-player/follow-playback.js';

import { MARKER_LABEL_SPAN_COLOR, TABLE_SELECTION_COLOR } from '../config.js';

import { variations, accidentals } from '../components/mappings.js';

import {
  areObjectsEqual,
  stripHtmlTags,
  renderModalMessage,
  renderModalPrompt,
} from '../components/utilities.js';

import {
  toolbarStates,
  disableAnnotationListAndDeleteAnnotation,
  disableSaveChordsAndCancelEditing,
  createChordEditor,
  /* Elements */
  //  Center controls
  annotationList,
  deleteAnnotationBtn,
  // Right controls & related Edit Mode Controls(Editing)
  editChordBtn,
  saveChordsBtn,
  cancelEditingBtn,
  //  --Chord Editor table controls--
  modalChordEditor,
  chordEditor,
  tableElements,
  applyBtn,
  cancelBtn,
} from '../annotation-tools.js';

/* UI variables/states */

let lastSelectedMarker;

let chord = {
  current: {
    root: '',
    accidental: '',
    variation: '',
  },
  new: {
    root: '',
    accidental: '',
    variation: '',
  },
};

// - Annotation tools (toolbar)

/**
 * [Edit chord] allows modifying the selected chord (marker) by popping up a modal table with chord roots,variations and accidentals
 */
export function setupEditChordEvents() {
  // Edit selected chord onPressingEditChordButton (enables button)
  wavesurfer.on('marker-click', enableEditChordButtonFunction);
  wavesurfer.on('seek', disableEditChordButtonFunction);
  editChordBtn.addEventListener('click', showChordEditor);

  // /* Chord Editor Modal related events: */
  chordEditor.addEventListener('click', event => {
    // Proceed if click is on el with class Root, Accidental or Variation
    if (event.target.tagName !== 'TD' && event.target.tagName !== 'TEXT') {
      return;
    }

    // A loop to find the closest element with a class
    let closestElementWithClass = event.target;
    while (
      closestElementWithClass &&
      closestElementWithClass.className === ''
    ) {
      closestElementWithClass = closestElementWithClass.parentElement;
    }
    const selection = closestElementWithClass;
    const component = closestElementWithClass.className;

    select(selection, component);
    editChord();
    // Also colorize background of new selected chord for better usability
    lastSelectedMarker.elChordSymbolSpan.classList.add('span-chord-highlight');
  });

  // cancel click
  cancelBtn.addEventListener('click', () => {
    editChord(true);
    closeModal();
  });

  // apply click
  applyBtn.addEventListener('click', () => {
    disableAnnotationListAndDeleteAnnotation();
    closeModal();
  });
}

/**
 *  [Save chords] Save chords stores changes made either as separate or replaced annotation (except original annotation)
 */
export function setupSaveChordsEvent() {
  saveChordsBtn.addEventListener('click', saveChords);
}

/**
 *  [Cancel] Cancel reverts back without altering.
 */
export function setupCancelEditingEvent() {
  cancelEditingBtn.addEventListener('click', cancelEditingChords);
}

export function setupSettingsMenu() {
  const playerSettingsMenu = document.querySelector('#player-settings-menu');
  const settingsModal = document.querySelector('#settingsModal');

  let rotateRight = true;

  playerSettingsMenu.addEventListener('click', function () {
    if (rotateRight) {
      playerSettingsMenu.classList.remove('rotate-left');
      playerSettingsMenu.classList.add('rotate-right');
      settingsModal.style.display = 'block';
    } else {
      playerSettingsMenu.classList.remove('rotate-right');
      playerSettingsMenu.classList.add('rotate-left');
      settingsModal.style.display = 'none';
    }
    rotateRight = !rotateRight;
  });

  settingsMenuChordEditorCategories();
  settingsMenuFollowPlayback();
}

function settingsMenuChordEditorCategories() {
  const chordCategoriesMenu = document.querySelector('#chord-categories-menu');

  let chordCategories = false;

  chordCategoriesMenu.addEventListener('click', e => {
    if (e.target.closest('#onChordCategories')) {
      chordCategories = true;
    } else if (e.target.closest('#offChordCategories')) {
      chordCategories = false;
    }

    if (chordCategories) {
      createChordEditor(showChordEditorHTMLWithCategories);
    } else {
      createChordEditor(showChordEditorHTMLWithoutCategories);
    }

    createTooltipsChordEditor();
    setupEditChordEvents();
  });
}

// -
function editChord(cancel = false) {
  // revertChord: is the marker that is now being edited
  const revertChord = _mapChordSymbolToText(chord.current);

  // selectedChord returns the label in marker.mirLabel format
  const selectedChord = _mapChordSymbolToText(chord.new);

  // remove the selected marker because ...
  const lastSelectedMarkerTime = lastSelectedMarker.time;
  wavesurfer.markers.remove(lastSelectedMarker);

  // ... a later one will replace him with:
  // selectedChord or on Cancel revertChord
  const label = cancel ? revertChord : selectedChord;

  // all markers draggable EXCEPT first marker (at time 0.0)
  const draggable = lastSelectedMarkerTime === 0.0 ? false : true;

  const newSelectedMarker = addMarkerAtTime(
    lastSelectedMarkerTime,
    label,
    'replaced',
    draggable
  );

  // Colorizing again the span (label element font color NOT BACKGROUND)
  _setMarkerSpanColor(
    newSelectedMarker,
    lastSelectedMarker,
    MARKER_LABEL_SPAN_COLOR
  );

  // Update lastSelectedMarker with the new one
  lastSelectedMarker = newSelectedMarker;

  updateMarkerDisplayWithColorizedRegions();
}

function saveChords() {
  let message;
  let index = annotationList.selectedIndex;

  const selectedAnnotation = jamsFile.annotations[index];
  const currDataSource = selectedAnnotation.annotation_metadata.data_source;

  // Disable replace button on first (show original) annotation
  const replacePromptBtn = document.getElementById('replacePrompt');
  if (currDataSource === 'program') {
    message = `Do you want to <span class="text-success">save</span> <span class="text-warning">${annotationList.value}</span> as a separate annotation? 🤷‍♂️`;
    replacePromptBtn.classList.add('d-none');
  } else {
    replacePromptBtn.classList.remove('d-none');
    message = `Do you want to <span class="text-primary">replace</span> the existing annotation<br><span class="text-warning">${annotationList.value}</span> or <span class="text-success">save</span> it as a separate annotation? 🤷‍♂️`;
  }

  renderModalPrompt(message, jamsFile)
    .then(choice => {
      const newAnnotation = _createNewAnnotation();

      // this needs to be before updateMarkerDisplayWithColorizedRegions so visualizations are rendered correctly
      disableSaveChordsAndCancelEditing();

      console.log(newAnnotation);
      if (choice === 'replace') {
        // Replace existing annotation
        wavesurfer.clearMarkers();
        jamsFile.annotations[index] = newAnnotation;
        renderAnnotations(selectedAnnotationData(jamsFile));
      } else if (choice === 'save') {
        // Save as separate annotation
        jamsFile.annotations.push(newAnnotation);
        index = annotationList.length;
        updateMarkerDisplayWithColorizedRegions(true);
      }

      // In the annotation list include information about modification date! TODO
      createAnnotationsList(jamsFile);
      annotationList.selectedIndex = index;

      // reset delete button if any new annotation was created
      deleteAnnotationBtn.classList.remove('disabled');
    })
    .catch(() => {
      // User canceled
      console.log('catch renderModalPrompt executed (User canceled)');
    });
}

function cancelEditingChords() {
  const message = `You are about to cancel editing.<br> Any unsaved changes will be <span class="text-warning">discarded.</span> <br><br><span class="text-info">Are you sure?</span> 🤷‍♂️`;

  console.log('before modal render!');
  renderModalMessage(message)
    .then(() => {
      // User confirmed
      wavesurfer.clearMarkers();
      // This needs to be before (for similar reason as stated in saveChords)
      disableSaveChordsAndCancelEditing();
      renderAnnotations(selectedAnnotationData(jamsFile));
    })
    .catch(() => {
      // User canceled
    });
}

function _createNewAnnotation() {
  const [annotatorName, annotationDataSource, annotationDescription] =
    _extractModalPromptFields();

  const newAnnotation = {
    annotation_metadata: {
      curator: {
        name: `${annotatorName}`,
        email: '',
      },
      annotator: {},
      version: '',
      corpus: '',
      annotation_tools: `ChordFinder`,
      annotation_rules: '',
      validation: '',
      data_source: `${annotationDataSource}`,
    },
    namespace: 'chord',
    data: '',
    sandbox: {
      description: `${annotationDescription}`,
    },
    time: 0,
    duration: null,
  };

  // Create the annotations.data
  let annotationsData = [];
  wavesurfer.markers.markers.forEach(marker => {
    const obs = {
      time: marker.time,
      duration: marker.duration,
      value: marker.mirLabel,
      confidence: null,
    };
    annotationsData.push(obs);
  });

  // Assign annotationsData value to the newAnnotation obj
  newAnnotation.data = annotationsData;

  return newAnnotation;
}

function _extractModalPromptFields() {
  const annotatorNameInput = document.getElementById('annotatorName');
  const annotationDataSourceInput = document.getElementById(
    'annotationDataSource'
  );
  const annotationDescriptionInput = document.getElementById(
    'annotationDescription'
  );

  const annotationDataSource = annotationDataSourceInput.value;
  const annotationDescription = annotationDescriptionInput.value;
  // ..setting some default values in cases of blank text input forms
  const annotatorName =
    annotatorNameInput.value !== '' ? annotatorNameInput.value : 'Anonymous';

  return [annotatorName, annotationDataSource, annotationDescription];
}

// -
function enableEditChordButtonFunction(selMarker) {
  console.log('selected marker:', selMarker);
  console.log(selMarker.el._tippy);
  //  NOTE: marker-click event only trigger on span element click!

  // Color selected marker ONLY
  _setMarkerSpanColor(selMarker, lastSelectedMarker, MARKER_LABEL_SPAN_COLOR);

  lastSelectedMarker = selMarker;
  console.log(lastSelectedMarker, '🤷‍♂️🤷‍♂️🤷‍♂️');

  // Enable the editChordBtn
  editChordBtn.classList.remove('disabled');
}

function disableEditChordButtonFunction() {
  editChordBtn.classList.add('disabled');
  if (lastSelectedMarker !== undefined) {
    _setMarkerSpanColor(lastSelectedMarker, lastSelectedMarker, '');
  }
}

function _setMarkerSpanColor(selMarker, lastSelectedMarker, color) {
  const symbolSpan = selMarker.elChordSymbolSpan;
  symbolSpan.style.color = color;

  if (lastSelectedMarker !== undefined) {
    if (selMarker !== lastSelectedMarker) {
      const lastSymbolSpan = lastSelectedMarker.elChordSymbolSpan;
      symbolSpan.style.color = color;
      lastSymbolSpan.style.color = '';
    }
  } else {
    // first case scenario
    symbolSpan.style.color = color;
  }
}

// - Modal Chord Editor
function showChordEditor() {
  // Set the flag to indicate that the modal is active
  toolbarStates.IS_MODAL_TABLE_ACTIVE = true;

  console.log(lastSelectedMarker, '🌍🌍🌍');
  chord.current.root = stripHtmlTags(lastSelectedMarker.symbolParts.root); // (removing <strong></strong>)
  chord.current.accidental = lastSelectedMarker.symbolParts.accidental;
  chord.current.variation = lastSelectedMarker.symbolParts.variation;

  console.log(chord.current);
  console.log(lastSelectedMarker.symbolParts.root);
  // Open chord editor indicating the last selected chord
  _colorizeTableSelections(chord.current);

  modalChordEditor.style.display = 'block';
  applyBtn.style.visibility = 'hidden';
}

function select(selection, component) {
  // console.log('selected table element:', selection);
  // console.log('last selected marker:', lastSelectedMarker);

  _updateChordVariable(selection, component);
  _colorizeTableSelections(chord.new);

  // Show Apply button if the current chord is different from the new one
  if (!areObjectsEqual(chord.new, chord.current)) {
    applyBtn.style.visibility = 'visible';
  } else {
    applyBtn.style.visibility = 'hidden';
  }
}

function closeModal() {
  modalChordEditor.style.display = 'none';
  toolbarStates.IS_MODAL_TABLE_ACTIVE = false;
}

/**
 * Colorizes table elements based on matching values from the `chordParts` object.
 * If an element's `innerHTML` matches any of the non-empty values in `chord.new.root`, `chord.new.accidental`, or `chord.new.variation`, the element is colored (according to config.js TABLE_SELECTION_COLOR).
 * Otherwise, the color of the element is reset to an empty string.
 */
function _colorizeTableSelections(chordParts) {
  tableElements.forEach(element => {
    const matchingChordPart = Object.values(chordParts).find(chordPart => {
      return chordPart !== '' && element.innerHTML.trim() === chordPart;
    });

    if (matchingChordPart) {
      element.style.color = TABLE_SELECTION_COLOR;
    } else {
      element.style.color = ''; // Reset color if no match is found
    }
  });
}

function _updateChordVariable(selection, component) {
  // Selected text in inner HTML format
  const selectedHTMLtext = selection.innerHTML.trim();

  // Checking conditions on trimmed like text with innerText & replace
  const selectedText = selection.innerText;
  // const trimmedVariation = chord.new.variation.replace(/<[^>]+>/g, '');
  const trimmedVariation = stripHtmlTags(chord.new.variation);

  // Condition to uncheck all other cases except 'N.C.' & '??'
  if (selectedText === '??' || selectedText === 'N.C.') {
    chord.new.root = '';
    chord.new.accidental = '';
    chord.new.variation = selectedHTMLtext;
  } else {
    // Condition to uncheck N.C. or ?? when not selected
    if (trimmedVariation === '??' || trimmedVariation === 'N.C.') {
      chord.new.variation = '';
    } else {
      chord.new.variation = chord.new.variation;
    }
    // Otherwise assigning selections component
    chord.new[component] = selectedHTMLtext;
    // those 2 cases handles errors after '??' 'N.C.' for required fields
    chord.new.root = chord.new.root === '' ? 'C' : chord.new.root;
    chord.new.variation =
      chord.new.variation === '' ? '(M)' : chord.new.variation;
  }
}

function _mapChordSymbolToText(encodedChord) {
  let foundRootNote;
  let foundAccidental;

  // 1) Find shorthand according to the font mapping
  let foundShorthand;
  const matchingShorthand = variations.find(mappingEl => {
    return mappingEl.encoded === encodedChord.variation;
  });
  if (matchingShorthand) {
    // in the case of maj assign '' otherwise the encoded font
    foundShorthand = matchingShorthand.shorthand || '';
  }

  let column = ':';
  if (foundShorthand === 'N' || foundShorthand === 'X') {
    foundRootNote = '';
    foundAccidental = '';
    column = '';
  } else {
    // 1) Displayed root is same as root from MIREX format
    foundRootNote = encodedChord.root;

    // 2)Displayed accidental according to the font mapping
    foundAccidental;
    const matchingAccidental = accidentals.find(
      mappingEl => mappingEl.encoded === encodedChord.accidental
    );
    if (matchingAccidental) {
      foundAccidental = matchingAccidental.simplified || '';
    }
  }
  const mirLabel = `${foundRootNote}${foundAccidental}${column}${foundShorthand}`;

  return mirLabel;
}
