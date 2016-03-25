'use strict';

import React from 'react';

import { PageHeader } from 'react-bootstrap';

import CBase from './base';

export default class CHelp extends CBase {
  render() {
    return <div className="start-help">
      <PageHeader>The Start Programming Language</PageHeader>

      <h3>Introduction</h3>
      <p>
        Lorem ipsum.
      </p>

      <h3>Data </h3>
      <p>
        Lorem ipsum.
      </p>

      <h3>Text</h3>
      <p>
        Lorem ipsum.
      </p>

      <h3>Graphics</h3>
      <p>
        Lorem ipsum.
      </p>
    </div>;
  }
}
