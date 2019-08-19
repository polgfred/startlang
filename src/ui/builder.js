import React, { useEffect, useRef } from 'react';

import { SBuilder } from '../lang/builder';
import Blockly from '../blockly';

import toolbox from './toolbox.xml';

export default function Builder({ setParser }) {
  const ref = useRef();

  useEffect(() => {
    const blockly = Blockly.inject(ref.current, {
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
        snap: true,
      },
      zoom: {
        enabled: true,
        controls: true,
        wheel: false,
        maxScale: 2,
        minScale: 0.5,
        scaleSpeed: 1.1,
      },
    });

    setParser(() => {
      return () => {
        return new SBuilder().fromWorkspace(Blockly.getMainWorkspace());
      };
    });

    return () => {
      blockly.dispose();
    };
  }, [setParser]);

  return (
    <div
      ref={ref}
      className="start-builder"
      style={{
        height: '100%',
      }}
    />
  );
}
