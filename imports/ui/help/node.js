'use strict';

import { $ } from 'meteor/jquery';

import React from 'react';

import {
  Breadcrumbs, BreadcrumbItem, Menu, MenuItem
} from 'react-foundation';

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
        { this.renderTOC() }
      </div>;
    } else {
      // forward to child node
      let children = this.constructor.children();

      return React.createElement(children[path[level]], {
        parent: this,
        path: path,
        level: level + 1,
        updatePath: this.props.updatePath
      });
    }
  }

  renderBody() {
    return null;
  }

  renderCrumbs() {
    let pos = this.props.path.length,
        node = this,
        items = [];

    while (node) {
      let path = this.props.path.slice(0, pos),
          link = node == this ?
                   node.props.title :
                   <a onClick={() => this.props.updatePath(path)}>
                     { node.props.title }
                   </a>,
          item = <BreadcrumbItem key={pos--}>
                   { link }
                 </BreadcrumbItem>;

      items.unshift(item);
      node = node.props.parent;
    }

    return <Breadcrumbs>
      { items }
    </Breadcrumbs>;
  }

  renderTOC() {
    let children = this.constructor.children(),
        items = [];

    for (let index = 0; index < children.length; ++index) {
      let path = this.props.path.concat(index),
          item = <MenuItem key={index}>
                   <a onClick={() => this.props.updatePath(path)}>
                     { children[index].defaultProps.title }
                   </a>
                 </MenuItem>;

      items.push(item);
    }

    if (children.length > 0) {
      return <Menu isVertical>
        { items }
      </Menu>;
    }
  }

  static children() {
    return [];
  }
}
