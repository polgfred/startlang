'use strict';

import React from 'react';
import ReactDOM from 'react-dom';

import Blockly from '../blockly_start';

import { parse } from '../lang/parser.pegjs';
import { createInterpreter } from '../lang/interpreter';
import { createBuilder } from '../lang/builder';
import { createRuntime } from '../lang/graphics';

import CApp from './comp/app';

let mode = (location.search.match('mode=(.*)') || [])[1];

Meteor.startup(() => {
  ReactDOM.render(<CApp />, $('.start-wrapper')[0]);
});

/*
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
      wheel: false,
      maxScale: 2,
      minScale: 0.1,
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
  ///let editor = ace.edit('editor');
  //editor.$blockScrolling = Infinity;
  //editor.setTheme('ace/theme/textmate');
  //editor.setShowFoldWidgets(false);
  //editor.getSession().setTabSize(2);
  //editor.getSession().setUseSoftTabs(true);
  //editor.getSession().setMode(new StartMode());

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
  let interp = createInterpreter();
  interp.root = getRoot();
  interp.runtime = createRuntime();

  $('#runner').prop('disabled', true);

  interp.run().then(() => {
    $('#runner').prop('disabled', false);
  }).catch((err) => {
    console.error(err.message);
    console.error(err.stack);
    $('#runner').prop('disabled', false);
  });
});

*/
