'use strict';

import React from 'react';

import {
  TopBar, TopBarLeft, TopBarRight,
  Button, Menu, MenuItem
} from 'react-foundation';

import Base from './base';

export default class Header extends Base {
  shouldComponentUpdate(nextProps) {
    return this.props.viewMode != nextProps.viewMode ||
            this.props.editMode != nextProps.editMode;
  }

  render() {
    return <TopBar>
      <TopBarLeft>
        <Menu isDropdown data-dropdown-menu="start-view-menu">
          <MenuItem>
            <a>View</a>
            <Menu isVertical>
              <MenuItem isActive={this.props.viewMode == 'graphics'}>
                <a onClick={this.props.updateViewMode} data-viewmode="graphics">Graphics</a>
              </MenuItem>
              <MenuItem isActive={this.props.viewMode == 'text'}>
                <a onClick={this.props.updateViewMode} data-viewmode="text">Text</a>
              </MenuItem>
              <MenuItem isActive={this.props.viewMode == 'split'}>
                <a onClick={this.props.updateViewMode} data-viewmode="split">Split</a>
              </MenuItem>
              <MenuItem isActive={this.props.viewMode == 'help'}>
                <a onClick={this.props.updateViewMode} data-viewmode="help">Help</a>
              </MenuItem>
            </Menu>
          </MenuItem>
        </Menu>
      </TopBarLeft>
      <TopBarLeft>
        <Menu isDropdown data-dropdown-menu="start-edit-menu">
          <MenuItem>
            <a>Edit</a>
            <Menu>
              <MenuItem isActive={this.props.editMode == 'blocks'}>
                <a onClick={this.props.updateEditMode} data-editmode="blocks">Blocks</a>
              </MenuItem>
              <MenuItem isActive={this.props.editMode == 'source'}>
                <a onClick={this.props.updateEditMode} data-editmode="source">Source</a>
              </MenuItem>
            </Menu>
          </MenuItem>
        </Menu>
      </TopBarLeft>
      <TopBarRight>
        <Button onClick={this.props.runProgram}>Run</Button>
      </TopBarRight>
    </TopBar>
  }
}
