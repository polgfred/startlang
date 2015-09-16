'use strict';

import $ from 'jquery';

import ace from 'brace';
import 'brace/theme/textmate';
import { default as StartMode } from '../brace_start/start_mode';

import Blockly from '../blockly_wrapper';

import { parse } from '../lang/parser';
import { createInterpreter } from '../lang/interpreter';
import { createBuilder } from '../lang/builder';
import { createRuntime } from '../lang/graphics';

// Blockly.inject('editor', {
//   toolbox: $('#toolbox')[0],
//   collapse: true,
//   comments: true,
//   disable: true,
//   readOnly: false,
//   scrollbars: true,
//   trashcan: true,
//   grid: {
//     spacing: 25,
//     length: 3,
//     colour: '#ccc',
//     snap: true
//   },
//   zoom: {
//     enabled: true,
//     controls: true,
//     wheel: true,
//     maxScale: 2,
//     minScale: .1,
//     scaleSpeed: 1.1
//   }
// });

const editor = ace.edit('editor');
editor.setTheme('ace/theme/textmate');
editor.setShowFoldWidgets(false);
editor.getSession().setTabSize(2);
editor.getSession().setUseSoftTabs(true);
editor.getSession().setMode(new StartMode());

let ctx = createRuntime();

// hook up the run button
$('#runner').click(() => {
  // wipe stuff clean and make a fresh program context
  ctx = global.ctx = createRuntime();
  console.clear();
  // termapi.clear();
  // execute the code in the buffer
  let //root = createBuilder().fromWorkspace(Blockly.getMainWorkspace()),
      root = parse(editor.getSession().getDocument().getAllLines().join('\n')),
      interp = createInterpreter(root, ctx);
  console.log(root);
  interp.on('error', (err) => {
    console.error('[ERROR]: ' + err.message);
  });
  interp.on('end', () => {
    console.log('[END]');
  });
  interp.run();
});

// make the workspace persist

// $(window).on('unload', function() {
//   localStorage['save'] = Blockly.Xml.domToText(Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace()));
// });
//
// window.restore = function() {
//   let ws = Blockly.getMainWorkspace();
//   ws.clear();
//   Blockly.Xml.domToWorkspace(ws, Blockly.Xml.textToDom(localStorage['save']));
// };
//
// $(window).on('load', function() {
//   Blockly.Xml.domToWorkspace(Blockly.getMainWorkspace(), $('#new_workspace')[0]);
// });
