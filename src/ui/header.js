import React, { Component } from 'react';

export default class Header extends Component {
  shouldComponentUpdate(nextProps) {
    return this.props.viewMode != nextProps.viewMode ||
            this.props.editMode != nextProps.editMode;
  }

  render() {
    return <TopBar>
      <TopBarLeft>
        <Menu isDropdown data-dropdown-menu>
          <MenuText>Start</MenuText>
          <MenuItem>
            <a>View</a>
            <Menu>
              { this.viewItem('graphics') }
              { this.viewItem('text') }
              { this.viewItem('split') }
              { this.viewItem('help') }
            </Menu>
          </MenuItem>
          <MenuItem>
            <a>Edit</a>
            <Menu>
              { this.editItem('blocks') }
              { this.editItem('source') }
            </Menu>
          </MenuItem>
        </Menu>
      </TopBarLeft>
      <TopBarRight className="text-right">
        <Button onClick={this.props.runProgram}>Run</Button>
      </TopBarRight>
    </TopBar>;
  }

  viewItem(mode) {
    return <MenuItem isActive={this.props.viewMode == mode}>
      <a onClick={() => this.props.updateViewMode(mode)}>
        { mode.charAt(0).toUpperCase() + mode.substr(1) }
      </a>
    </MenuItem>;
  }

  editItem(mode) {
    return <MenuItem isActive={this.props.editMode == mode}>
      <a onClick={() => this.props.updateEditMode(mode)}>
        { mode.charAt(0).toUpperCase() + mode.substr(1) }
      </a>
    </MenuItem>;
  }
}
