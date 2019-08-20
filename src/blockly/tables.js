import Blockly from 'blockly';

Blockly.Blocks['tables_create_empty'] = {
  init() {
    this.appendDummyInput().appendField(Blockly.Msg.TABLES_CREATE_EMPTY_TITLE);
    this.setOutput(true, 'Map');
    this.setColour(Blockly.Msg.TABLES_HUE);
    this.setTooltip(Blockly.Msg.TABLES_CREATE_EMPTY_TOOLTIP);
    this.setHelpUrl(Blockly.Msg.TABLES_CREATE_EMPTY_HELPURL);
  },
};

Blockly.Blocks['tables_create_with'] = {
  init() {
    this.savedKeys = [];
    this.setHelpUrl(Blockly.Msg.TABLES_CREATE_WITH_HELPURL);
    this.setColour(Blockly.Msg.TABLES_HUE);
    this.itemCount_ = 3;
    this.updateShape_();
    this.setOutput(true, 'Map');
    this.setMutator(new Blockly.Mutator(['tables_create_with_item']));
    this.setTooltip(Blockly.Msg.TABLES_CREATE_WITH_TOOLTIP);
  },
  mutationToDom() {
    const container = document.createElement('mutation');
    container.setAttribute('items', this.itemCount_);
    return container;
  },
  domToMutation(xmlElement) {
    this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10);
    this.updateShape_();
  },
  decompose(workspace) {
    const containerBlock = workspace.newBlock('tables_create_with_container');
    containerBlock.initSvg();
    let connection = containerBlock.getInput('STACK').connection;
    for (let i = 0; i < this.itemCount_; i++) {
      const itemBlock = workspace.newBlock('tables_create_with_item');
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  compose(containerBlock) {
    let itemBlock = containerBlock.getInputTargetBlock('STACK');
    // Count number of inputs.
    const connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
    // Reconnect any child blocks.
    for (let i = 0; i < this.itemCount_; i++) {
      if (connections[i]) {
        this.getInput(`VALUE${i}`).connection.connect(connections[i]);
      }
    }
  },
  saveConnections(containerBlock) {
    let itemBlock = containerBlock.getInputTargetBlock('STACK');
    let i = 0;
    while (itemBlock) {
      const input = this.getInput(`VALUE${i}`);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock =
        itemBlock.nextConnection && itemBlock.nextConnection.targetBlock();
    }
  },
  updateShape_() {
    // Delete everything, but save off key values first.
    if (this.getInput('EMPTY')) {
      this.removeInput('EMPTY');
    } else {
      let i = 0;
      while (this.getInput(`VALUE${i}`)) {
        this.savedKeys[i] = this.getFieldValue(`KEY${i}`);
        this.removeInput(`VALUE${i}`);
        i++;
      }
    }
    // Rebuild block.
    if (this.itemCount_ === 0) {
      this.appendDummyInput('EMPTY').appendField(
        Blockly.Msg.TABLES_CREATE_EMPTY_TITLE
      );
    } else {
      for (let i = 0; i < this.itemCount_; i++) {
        const input = this.appendValueInput(`VALUE${i}`).setAlign(
          Blockly.ALIGN_RIGHT
        );
        if (i === 0) {
          input.appendField(Blockly.Msg.TABLES_CREATE_WITH_INPUT_WITH);
        }
        input
          .appendField(Blockly.Msg.TABLES_CREATE_WITH_INPUT_KEY)
          .appendField(
            new Blockly.FieldTextInput(this.savedKeys[i] || `key${i + 1}`),
            `KEY${i}`
          )
          .appendField(Blockly.Msg.TABLES_CREATE_WITH_INPUT_AS);
      }
    }
  },
};

Blockly.Blocks['tables_create_with_container'] = {
  init() {
    this.setColour(Blockly.Msg.TABLES_HUE);
    this.appendDummyInput().appendField(
      Blockly.Msg.TABLES_CREATE_WITH_CONTAINER_TITLE_ADD
    );
    this.appendStatementInput('STACK');
    this.setTooltip(Blockly.Msg.TABLES_CREATE_WITH_CONTAINER_TOOLTIP);
    this.contextMenu = false;
  },
};

Blockly.Blocks['tables_create_with_item'] = {
  init() {
    this.setColour(Blockly.Msg.TABLES_HUE);
    this.appendDummyInput().appendField(
      Blockly.Msg.TABLES_CREATE_WITH_ITEM_TITLE
    );
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.TABLES_CREATE_WITH_ITEM_TOOLTIP);
    this.contextMenu = false;
  },
};

Blockly.Blocks['tables_size'] = {
  init() {
    this.jsonInit({
      message0: Blockly.Msg.TABLES_SIZE_TITLE,
      args0: [
        {
          type: 'input_value',
          name: 'VALUE',
          check: ['Map'],
        },
      ],
      output: 'Number',
      colour: Blockly.Msg.TABLES_HUE,
      tooltip: Blockly.Msg.TABLES_SIZE_TOOLTIP,
      helpUrl: Blockly.Msg.TABLES_SIZE_HELPURL,
    });
  },
};

Blockly.Blocks['tables_isEmpty'] = {
  init() {
    this.jsonInit({
      message0: Blockly.Msg.TABLES_ISEMPTY_TITLE,
      args0: [
        {
          type: 'input_value',
          name: 'VALUE',
          check: ['Map'],
        },
      ],
      output: 'Boolean',
      colour: Blockly.Msg.TABLES_HUE,
      tooltip: Blockly.Msg.TABLES_ISEMPTY_TOOLTIP,
      helpUrl: Blockly.Msg.TABLES_ISEMPTY_HELPURL,
    });
  },
};

Blockly.Blocks['tables_getIndex'] = {
  init() {
    const MODE = [
      [Blockly.Msg.TABLES_GET_INDEX_GET, 'GET'],
      [Blockly.Msg.TABLES_GET_INDEX_GET_REMOVE, 'GET_REMOVE'],
      [Blockly.Msg.TABLES_GET_INDEX_REMOVE, 'REMOVE'],
    ];
    this.setHelpUrl(Blockly.Msg.TABLES_GET_INDEX_HELPURL);
    this.setColour(Blockly.Msg.TABLES_HUE);
    const modeMenu = new Blockly.FieldDropdown(MODE, value => {
      this.updateStatement_(value === 'REMOVE');
    });
    this.appendValueInput('VALUE')
      .setCheck('Map')
      .appendField(Blockly.Msg.TABLES_GET_INDEX_INPUT_IN_TABLE);
    this.appendDummyInput().appendField(modeMenu, 'MODE');
    this.appendValueInput('AT').setCheck('String');
    if (Blockly.Msg.TABLES_GET_INDEX_TAIL) {
      this.appendDummyInput('TAIL').appendField(
        Blockly.Msg.TABLES_GET_INDEX_TAIL
      );
    }
    this.setInputsInline(true);
    this.setOutput(true);
    this.setTooltip(() => {
      const mode = this.getFieldValue('MODE');
      return Blockly.Msg[`TABLES_GET_INDEX_TOOLTIP_${mode}`];
    });
  },
  mutationToDom() {
    const container = document.createElement('mutation');
    const isStatement = !this.outputConnection;
    container.setAttribute('statement', isStatement);
    return container;
  },
  domToMutation(xmlElement) {
    const isStatement = xmlElement.getAttribute('statement') === 'true';
    this.updateStatement_(isStatement);
  },
  updateStatement_(newStatement) {
    const oldStatement = !this.outputConnection;
    if (newStatement !== oldStatement) {
      this.unplug(true, true);
      if (newStatement) {
        this.setOutput(false);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
      } else {
        this.setPreviousStatement(false);
        this.setNextStatement(false);
        this.setOutput(true);
      }
    }
  },
};

Blockly.Blocks['tables_setIndex'] = {
  init() {
    this.setHelpUrl(Blockly.Msg.TABLES_SET_INDEX_HELPURL);
    this.setColour(Blockly.Msg.TABLES_HUE);
    this.appendValueInput('TABLE')
      .setCheck('Map')
      .appendField(Blockly.Msg.TABLES_SET_INDEX_INPUT_IN_TABLE);
    this.appendDummyInput().appendField('set');
    this.appendValueInput('AT').setCheck('String');
    this.appendValueInput('TO').appendField(
      Blockly.Msg.TABLES_SET_INDEX_INPUT_TO
    );
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.TABLES_SET_INDEX_TOOLTIP);
  },
};

Blockly.Blocks['tables_keys'] = {
  init() {
    this.jsonInit({
      message0: Blockly.Msg.TABLES_KEYS_TITLE,
      args0: [
        {
          type: 'input_value',
          name: 'VALUE',
          check: ['Map'],
        },
      ],
      output: 'Array',
      colour: Blockly.Msg.TABLES_HUE,
      tooltip: Blockly.Msg.TABLES_KEYS_TOOLTIP,
      helpUrl: Blockly.Msg.TABLES_KEYS_HELPURL,
    });
  },
};
