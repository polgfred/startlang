import React, {
  Component,
  createRef,
} from 'react';

import { SBuilder } from '../lang/builder';
import Blockly from '../blockly';

import toolbox from './toolbox.xml';

export default class Builder extends Component {
  constructor(props) {
    super(props);

    this.editorRef = createRef();
  }

  shouldComponentUpdate(nextProps) {
    return false;
  }

  render() {
    return (
      <div
        ref={ this.editorRef }
        className="start-builder"
        style={{
          height: '100%'
        }}
      />
    );
  }

  componentDidMount() {
    this.blockly = Blockly.inject(this.editorRef.current, {
      toolbox,
      collapse: true,
      comments: true,
      disable: true,
      readOnly: false,
      scrollbars: true,
      trashcan: true,
      media: './dist/blockly/media/',
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
        minScale: 0.5,
        scaleSpeed: 1.1
      }
    });
  }

  componentWillUnmount() {
    this.blockly.dispose();
  }

  getRoot() {
    return new SBuilder().fromWorkspace(Blockly.getMainWorkspace());
  }
}
