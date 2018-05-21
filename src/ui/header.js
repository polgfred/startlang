import React, {
  Component,
  Children,
} from 'react';

import autobind from 'autobind-decorator';

import AppBar from '@material-ui/core/AppBar'
import Button from '@material-ui/core/Button'
import Menu from '@material-ui/core/Menu'
import MenuItem from '@material-ui/core/MenuItem'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'

class SettingsMenu extends Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
      anchorEl: null,
    };
  }

  @autobind
  openMenu(ev) {
    this.setState({
      open: true,
      anchorEl: ev.currentTarget,
    });
  }

  @autobind
  closeMenu() {
    this.setState({
      open: false,
      anchorEl: null,
    });
  }

  @autobind
  updateMode(value) {
    this.props.updateMode(value);
    this.closeMenu();
  }

  render() {
    let {
      option,
      mode,
      choices,
    } = this.props;

    let {
      open,
      anchorEl,
    } = this.state;

    return (
      <>
        <Button
          onClick={ this.openMenu }>
          { option }
        </Button>
        <Menu
          open={ open }
          anchorEl={ anchorEl }
          onClose={ this.closeMenu }>
          {
            choices.map(value => (
              <MenuItem
                key={`menu-item-${option}-${value}`}
                selected={ mode == value }
                onClick={ () => this.updateMode(value) }>
                { value.charAt(0).toUpperCase() + value.substr(1) }
              </MenuItem>
            ))
          }
        </Menu>
      </>
    );
  }
}

export default class Header extends Component {
  shouldComponentUpdate(nextProps) {
    let {
      viewMode,
      editMode,
    } = this.props;

    return (
      viewMode != nextProps.viewMode
      || editMode != nextProps.editMode
    );
  }

  render() {
    let {
      viewMode,
      editMode,
      updateViewMode,
      updateEditMode,
      runProgram,
    } = this.props;

    return (
      <AppBar position="static">
        <Toolbar>
          <Typography variant="title">
            Start
          </Typography>
          <SettingsMenu
            option="view"
            mode={ viewMode }
            updateMode={ updateViewMode }
            choices={[
              'graphics',
              'text',
              'split',
              'help',
            ]}
          />
          <SettingsMenu
            option="edit"
            mode={ editMode }
            updateMode={ updateEditMode }
            choices={[
              'blocks',
              'source',
            ]}
          />
          <Button onClick={ runProgram }>
            Run
          </Button>
        </Toolbar>
      </AppBar>
    );
  }
}
