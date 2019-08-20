import React, { Component } from 'react';

// these require more porting from foundation
class Empty extends Component {
  render() {
    return null;
  }
};
const Breadcrumbs = Empty;
const BreadcrumbItem = Empty;
const Menu = Empty;
const MenuItem = Empty;

export default class Node extends Component {
  static children() {
    return [];
  }

  render() {
    let { path, updatePath, title, level } = this.props;

    if (level === path.length) {
      // render this node
      return <div className="start-help-node">
        { this.renderCrumbs() }
        <h1>{ title }</h1>
        { this.renderBody() }
        { this.renderTOC() }
      </div>;
    } else {
      // forward to child node
      let children = this.constructor.children();

      return React.createElement(children[path[level]], {
        parent: this,
        level: level + 1,
        path,
        updatePath
      });
    }
  }

  renderBody() {
    return null;
  }

  renderCrumbs() {
    let { path, updatePath } = this.props,
        pos = path.length,
        node = this,
        items = [];

    while (node) {
      let next = path.slice(0, pos),
          link = node === this ?
                   node.props.title :
                   <a onClick={() => updatePath(next)}>
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
    let { path, updatePath } = this.props,
        children = this.constructor.children(),
        items = [];

    if (children.length > 0) {
      for (let index = 0; index < children.length; ++index) {
        let next = path.concat(index),
            item = <MenuItem key={index}>
                     <a onClick={() => updatePath(next)}>
                       { children[index].defaultProps.title }
                     </a>
                   </MenuItem>;

        items.push(item);
      }

      return <Menu isVertical>
        { items }
      </Menu>;
    }
  }
}
