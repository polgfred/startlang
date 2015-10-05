'use strict';

import $ from 'jquery';

import ace from 'brace';
import 'brace/theme/textmate';
import { default as StartMode } from '../brace_start/start_mode';

import Blockly from '../blockly_start';

import { parse } from '../lang/parser';
import { createInterpreter } from '../lang/interpreter';
import { createBuilder } from '../lang/builder';
import { createRuntime } from '../lang/graphics';

let mode = (location.search.match('mode=(.*)') || [])[1];
let getRoot;

if (mode == 'blocks') {
  Blockly.inject('editor', {
    toolbox: $('#toolbox')[0],
    collapse: true,
    comments: true,
    disable: true,
    readOnly: false,
    scrollbars: true,
    trashcan: true,
    media: './blockly-media/',
    grid: {
      spacing: 25,
      length: 3,
      colour: '#ccc',
      snap: true
    },
    zoom: {
      enabled: true,
      controls: true,
      wheel: true,
      maxScale: 2,
      minScale: .1,
      scaleSpeed: 1.1
    }
  });

  let ws = Blockly.getMainWorkspace();

  getRoot = () => createBuilder().fromWorkspace(ws);

  // make the workspace persist
  $(window).on('load', () => {
    let xml = localStorage['savedBlocks'] ?
                Blockly.Xml.textToDom(localStorage['savedBlocks']) :
                $('#new_workspace')[0];

    Blockly.Xml.domToWorkspace(ws, xml);
  });

  $(window).on('unload', () => {
    localStorage['savedBlocks'] = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(ws));
  });
} else {
  let editor = ace.edit('editor');

  editor.$blockScrolling = Infinity;
  editor.setTheme('ace/theme/textmate');
  editor.setShowFoldWidgets(false);
  editor.getSession().setTabSize(2);
  editor.getSession().setUseSoftTabs(true);
  editor.getSession().setMode(new StartMode());

  getRoot = () => parse(editor.getValue() + '\n');

  // make the workspace persist
  $(window).on('load', () => {
    if (localStorage['savedSource']) {
      editor.setValue(localStorage['savedSource'], -1);
    }
  });

  $(window).on('unload', () => {
    localStorage['savedSource'] = editor.getValue();
  });
}

// initialize the display
createRuntime();

// hook up the run button
$('#runner').click(() => {
  // wipe stuff clean and make a fresh program context
  console.clear();
  // termapi.clear();
  // execute the code in the buffer
  let root = getRoot(),
      ctx = createRuntime(),
      interp = createInterpreter(root, ctx);

  console.log(root);

  interp.on('error', (err) => {
    console.error('[ERROR]: ' + err.message);
    $('#runner').prop('disabled', false);
  });

  interp.on('end', () => {
    ctx.updateDisplay();
    console.log('[END]');
    $('#runner').prop('disabled', false);
  });

  $('#runner').prop('disabled', true);
  interp.run();
});
