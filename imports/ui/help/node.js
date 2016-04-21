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

  constructor() {
    super();

    _.bindAll(this, 'crumbClick', 'menuClick');
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
    let node = this, items = [], pos = this.props.path.length;

    while (node && node.props.title) {
      let item = node == this?
                  node.props.title :
                  <a onClick={this.crumbClick} data-pos={pos}>
                    { node.props.title }
                  </a>;

      items.unshift(<BreadcrumbItem key={pos--}>{ item }</BreadcrumbItem>);
      node = node.props.parent;
    }

    return <Breadcrumbs>
      { items }
    </Breadcrumbs>;
  }

  renderTOC() {
    let children = this.constructor.children();

    let mapper = (child, index) => {
      return <MenuItem key={index}>
        <a onClick={this.menuClick} data-index={index}>
          { child.defaultProps.title }
        </a>
      </MenuItem>;
    };

    if (children.length > 0) {
      return <Menu isVertical>
        { children.map(mapper) }
      </Menu>;
    }
  }

  crumbClick(ev) {
    let pos = parseInt($(ev.target).data('pos'), 10);
    this.props.updatePath(this.props.path.slice(0, pos));
  }

  menuClick(ev) {
    let index = parseInt($(ev.target).data('index'), 10);
    this.props.updatePath(this.props.path.concat(index));
  }

  static children() {
    return [];
  }
}
