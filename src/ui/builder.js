import React, { useEffect, useRef } from 'react';

import { makeBlocklyBuilder } from '../lang/builder';
import Blockly from 'blockly';

import toolbox from './toolbox.xml';

export default function Builder({ setParser }) {
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    const blockly = Blockly.inject(ref.current, {
      toolbox,
      collapse: true,
      comments: true,
      disable: true,
      readOnly: false,
      scrollbars: true,
      trashcan: true,
      media: './blockly/media/',
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

    setParser((/* parser */) => {
      return () => {
        return makeBlocklyBuilder().fromWorkspace(Blockly.getMainWorkspace());
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
