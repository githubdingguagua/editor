
/**
 * @fileoverview Class for creating a live IDE text editor
 * @author ssmaameri@gmail.com (Sami El Maameri)
 */

/**
 * Class for a single editor.
 * @param {string} the element id the editor will be created inside.
 * @constructor
 */
var CodeEditor = function(elementId, opts){

  /** @type {string} the elementId the CodeEditor is initialised inside */
  this.elementId = elementId;

  /** @type {HTMLElement} the element the CodeEditor is initialised inside */
  this.element = document.getElementById(elementId);

  /** @type {CodeFlask} the CodeFlask instance */
  this.flask = null;

  /** @type {array} the languages to appear in the select options list */
  this.languages = [
    {
      value:'python',
      text:'Python',
      extension:'.py'
    },
    {
      value:'javascript',
      text:'JavaScript',
      extension:'.js'

    },
    {
      value:'arduino',
      text:'Arduino',
      extension:'.ino'
    },
    {
      value:'blockly',
      text:'Blockly',
      language:'python',
      extension:'.py',
      readOnly:true
    }
  ];

  /** @type {string} the language syntax used in the editor */
  this.language = 'python';

  /** @type {object} stores the code input into the editor for the different languages */
  this.code = {};

  /** @type {string} unique id for this CodeEditor instance */
  this.id = this.generateUUID();

  /** @type {string} listeners subscribed to this instances events */
  this.listeners_ = [];

  /** @type {number} the last scroll to coordinate in the editor, so
   *    we can scroll back to it when the user re-shows the editor. */
  this.scrollTop = null;


  this.appendEditorHTMLToElement();
  this.initCodeFlask();
  this.addListeners();

  // hide the buttons
  if(opts.hideButtons){
    this.element.querySelector('.editor-buttons').style.display = 'none';
  }

};

/**
 * Getter for the selected language
 * @return {string} the selected language
 */
CodeEditor.prototype.getSelectedLanguage = function(){
  return this.language;
};


/**
 * Get the language items data atrributes from CodeEditor.prototype.langauges.
 * @param {string} language
 */
CodeEditor.prototype.getLanguageAttributes = function(language){
  return this.languages.filter(function(item){
    return item.value === language;
  })[0]
};

/**
 * Instantiates an instance of the CodeFlask object on a DOM element.
 */
CodeEditor.prototype.initCodeFlask = function(){
  this.flask = new CodeFlask;
  this.refreshEditor(this.language);
};

/**
 * Add the editor HTML to the editor element
 */
CodeEditor.prototype.appendEditorHTMLToElement = function(){
  this.element.innerHTML = this.getHTMLScaffold();
};

/**
 * Generate unique string to use as the editor element id.
 * @return {string} unique id
 */
CodeEditor.prototype.generateUUID = function() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Add listener for select menu
 */
CodeEditor.prototype.addListeners = function(){

  // on change select listener
  this.element.querySelector('.editor_language_select').addEventListener("change", function(){
    this.onChangeLanguageSelect();
  }.bind(this));

  // push button click listener
  this.element.addEventListener("click", function(){
    this.handleEditorClick();
  }.bind(this));

  // push button click listener
  document.querySelector('.editor_tab_header .glyphicon[data-type="push"]').addEventListener("click", function(){
    this.pushCode();
  }.bind(this));

  // save button click listener
  document.querySelector('.editor_tab_header .glyphicon[data-type="save"]').addEventListener("click", function(){
    this.toggleSavePopover();
  }.bind(this));

  // form submit listener
  document.querySelector('.save-popover-div form').addEventListener("submit", function(){
    event.preventDefault();
    this.handleSaveSubmit();
  }.bind(this));

};

/**
 * Create the HTML content for the editor
 * @return {string} the HTML content
 */
CodeEditor.prototype.getHTMLScaffold = function(){
  return (
    '<div class="code-editor">' +
    '<div class="editor_tab_header">' +
    '  <span>Language</span>' +
    '  <select  class="editor_language_select" class="form-control">' +
         this.generateHTMLForLanguageSelectOptions() +
    '  </select>' +
    '  <div class="editor-buttons">' +
    '    <span class="glyphicon glyphicon-circle-arrow-up" data-type="push"></span>' +
    '    <span class="glyphicon glyphicon-save" data-type="save"></span>' +
    '  </div>' +
    '</div>' +
    this.getHTMLSaveOverlay() +
    '<div id="code-wrapper-' + this.id + '" class="tab-pane code-editor-wrapper"></div>' +
    '</div>'
  );
};

/**
 * Create the HTML content for save overlay
 * @return {string} the HTML content
 */
CodeEditor.prototype.getHTMLSaveOverlay = function(){
  return (
    '<div class="save-popover-div hide">' +
    '<form class="form-inline">' +
    '<div class="form-group">' +
    '  <div class="input-group">' +
    '    <input type="text" class="form-control" placeholder="Save as ...">' +
    '    <span class="input-group-btn">' +
    '      <button class="btn btn-default" type="submit"><span class="glyphicon glyphicon-floppy-save save-code"></span></button>' +
    '    </span>' +
    '  </div>' +
    '</div></form></div>'
  )
}

/**
 * Create the HTML for the options in the langauge select menu.
 * @return {string} the HTML content
 */
CodeEditor.prototype.generateHTMLForLanguageSelectOptions = function(){
  return this.languages.map(function(language){
    return '<option value="' + language.value + '">' + language.text + '</option>'
  }).join('');
}

/**
 * Listener for the select menu to change the language in the editor
 */
CodeEditor.prototype.onChangeLanguageSelect = function(){
  // get the language selected from the select menu
  var language = event.target.value;
  this.changeLanguage(language);
};

/**
 * Update the syntax highlighting used in the editor
 */
CodeEditor.prototype.changeLanguage = function(language){
  this.language = language;

  this.refreshEditor(language);
  this.updatePushButtonStatus(language);
  this.fireChangeListener({
    type:'LANGUAGE_SELECTED',
    value:language
  });

};

/**
 * Refresh the editor
 * @param {string} languuage
 */
CodeEditor.prototype.refreshEditor = function(language){
  if(!language){
    language = this.language || 'python';
  }

  var languageAttributes = this.getLanguageAttributes(language)

  // update the editor to use syntax highlighting for the selected language
  this.flask.run('#code-wrapper-' + this.id, {
    // first check if the language definition has a specific language syntax definition that is different than
    // its name ( e.g. blockly => python).
    language: languageAttributes.language || language
  });

  // add previous code to editor
  var oldCode = this.code[language] || "";
  this.flask.update(oldCode);

  // add update listener callback
  this.flask.onUpdate(function(code){
    this.code[language] = code;
    this.fireChangeListener({type:'CODE_UPDATED'});
  }.bind(this));

  this.makeReadOnly(languageAttributes.readOnly);

  // add handler to listen for and update scroll position
  // needs to be added on every refresh, as the textarea element is regenerated every time.
  document.querySelector('.code-editor-wrapper textarea').addEventListener("scroll", function(event){
    this.scrollTop = event.target.scrollTop;
  }.bind(this));

};

/**
 * Scroll the editor to the last scrolled to position. Used when loading the editor
 *   back into view.
 */
CodeEditor.prototype.scrollToLastPosition = function() {
  document.querySelector('.code-editor-wrapper textarea').scroll(0, this.scrollTop);
};

/**
 * Make the editor text area readonly
 * @param {boolean} True to make the editor textarea read only
 */
CodeEditor.prototype.makeReadOnly = function(readOnly){
  var textInput = this.element.querySelector('.code-editor-wrapper textarea');
  textInput.readOnly = readOnly;
};

/**
 * Set the status of the push button based on the selected language
 * @param {string} the editor language
 */
CodeEditor.prototype.updatePushButtonStatus = function(language){

  // disable is true if the selected language is not python
  var disable = language !== 'python';
  this.disablePushButton(disable);
};

/**
 * Add code to the CodeEditor.prototype.code object, where the code is
 *   store for the different languages
 * @param {string} the code
 * @param {language} the language
 */
CodeEditor.prototype.addCodeToEditor = function(code, language){
  this.code[language] = code;
};

/**
 * Push the code to the board
 */
CodeEditor.prototype.pushCode = function(){
  if(this.language !== 'python') return;

  var code = this.element.querySelector('#code-wrapper-' + this.id + ' textarea').value;
  if(Kalebr && Kalebr.Console){
    Kalebr.Console.upload(code);
  }
};

/**
 * Handle the save form submit
 */
CodeEditor.prototype.handleSaveSubmit = function(){
  var fileName = this.element.querySelector('.save-popover-div input').value;
  if (fileName === '') {
    Kalebr.alertError('Please name the project before savings!');
  } else {
    this.saveCode(fileName);
    this.toggleSavePopover();
  }
}

/**
 * Download the editor code in the correct file format
 * @param {string} the fileName
 */
CodeEditor.prototype.saveCode = function(fileName){
  var code = this.element.querySelector('#code-wrapper-' + this.id + ' textarea').value;

  var extension = this.languages[this.language].extension

  var blob = new Blob([code], { type: "text/plain;charset=utf-8" });
  // the saveAs function from FileSaver.js
  saveAs(blob, fileName + extension[this.language]);
};

/**
 * Update push button styling to show it is disabled
 * @param {Boolean} true to disable the button, false otherwise
 */
CodeEditor.prototype.disablePushButton = function(disable){
  var pushButton = this.element.querySelector('[data-type="push"]');
  if(disable){
    pushButton.classList.add('disabled-button');
  } else {
    pushButton.classList.remove('disabled-button');
  }
};

/**
 * Toggle to show/hide the save popover
 */
CodeEditor.prototype.toggleSavePopover = function() {
  var popover = this.element.querySelector('.save-popover-div');
  popover.classList.toggle("hide");
};

/**
 * Handle a click on the editor. Used to hide the save popover
 */
CodeEditor.prototype.handleEditorClick = function(){
  var el = event.target;

  var clickedOnSavePopover = Boolean(el.closest('.save-popover-div'));
  var clickedOnSaveIcon = el.dataset.type === 'save';

  if(!clickedOnSavePopover && !clickedOnSaveIcon){
    this.element.querySelector('.save-popover-div').classList.add('hide');
  }
};

/**
 * Generate the state of the code editor as an xml node
 * @return {HTMLElement} the xml node
 */
CodeEditor.prototype.getStateAsXml = function(){
    var oParser = new DOMParser();
    return oParser.parseFromString(this.getStateAsXmlString(), "text/xml");
};

/**
 * Generate the state of the code editor as an xml string
 * @return {string} xml string
 */
CodeEditor.prototype.getStateAsXmlString = function(){
  var nodes = this.languages.map(function(language) {

    // no need to save the blockly editor code, as that is already saved
    // as the blockly code from the blocks workspace
    if(language.value === 'blockly') return;

    var code = this.code[language.value] || '';
    return '<language value="' + language.value + '" >' + code + '</language>';
  }.bind(this));

  return  '<editor>' + nodes.join("") + '</editor>';
};

/**
 * Load the editor state from an XML element
 * @param {XMLElement} the xml element
 */
CodeEditor.prototype.loadStateFromXml = function(xml) {
  // var xml = xmlDoc.documentElement;
  var languages = xml.getElementsByTagName("language");

  for (var i = 0; i < languages.length; i++) {
    var element = languages[i];
    var language = element.getAttribute('value');
    var code = element.innerHTML;
    this.code[language] = code;
  }

  this.refreshEditor();

};

/**
 * Load the editor state from an XML element string
 * @param {string} the xml element
 */
CodeEditor.prototype.loadStateFromXmlString = function(xmlString){
  var xmlDoc = new DOMParser().parseFromString(xmlString, 'text/xml');
  this.loadStateFromXml(xmlDoc);
};

/**
 * Clear the code in the editor
 */
CodeEditor.prototype.clear = function(){
  this.code = {};
  this.refreshEditor();
};

/**
 * Fire a change event.
 * @param {object} Event to fire.
 */
CodeEditor.prototype.fireChangeListener = function(event) {
  // Copy listeners in case a listener attaches/detaches itself.
  var currentListeners = this.listeners_.slice();
  for (var i = 0, func; func = currentListeners[i]; i++) {
    func(event);
  }
};

/**
 * Add a listener to the list of listeners to be fired on an event change.
 * @param {function} the function to fire on the event
 * @return {function}
 */
CodeEditor.prototype.addChangeListener = function(func) {
  this.listeners_.push(func);
  return func;
};

