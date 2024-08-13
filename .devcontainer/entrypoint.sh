#!/usr/bin/env bash

# Fixup folder permissions on Docker mounts before the vscode
# server stuff gets installed in the container.
sudo chown vscode:vscode /workspaces /home/vscode/.vscode-server

# Sleep forever to keep the container awake.
sleep inf
