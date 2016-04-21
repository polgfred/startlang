'use strict';

import React from 'react';

import { Breadcrumbs, BreadcrumbItem } from 'react-foundation';

import Base from '../base';

export default class Node extends Base {
  static get defaultProps() {
    return {
      title: null
    };
  }

  render() {
    let { parent, path, level = 0 } = this.props;

    if (level == path.length) {
      // render this node
      return <div className="start-help-node">
        { this.renderCrumbs() }
        <h1>{ this.props.title }</h1>
        { this.renderBody() }
      </div>;
    } else {
      // forward to child node
      let children = this.constructor.children();

      return React.createElement(children[path[level]], {
        parent: this,
        path: path,
        level: level + 1
      });
    }
  }

  renderCrumbs() {
    let node = this, items = [], i = 0;

    while (node && node.props.title) {
      items.unshift(<BreadcrumbItem key={i++}>{ node.props.title }</BreadcrumbItem>);
      node = node.props.parent;
    }

    return <Breadcrumbs>
      { items }
    </Breadcrumbs>;
  }

  renderBody() {
    return null;
  }

  static children() {
    return [];
  }
}
