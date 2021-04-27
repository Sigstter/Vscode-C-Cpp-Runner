import * as path from 'path';
import * as vscode from 'vscode';

import { TaskProvider } from '../provider/taskProvider';
import { Architectures, Builds } from '../utils/types';
import { replaceBackslashes } from '../utils/fileUtils';

export function updateFolderStatus(
  status: vscode.StatusBarItem | undefined,
  taskProvider: TaskProvider | undefined,
  showStatusBarItems: boolean,
) {
  if (!status) return;

  if (
    taskProvider &&
    taskProvider.workspaceFolder &&
    taskProvider.activeFolder
  ) {
    const workspaceFolder = taskProvider.workspaceFolder;
    const workspaceName = path.basename(workspaceFolder);
    let text = taskProvider.activeFolder.replace(
      workspaceFolder,
      workspaceName,
    );
    text = replaceBackslashes(text);
    status.color = '';
    status.text = `$(folder-active) ${text}`;
  } else {
    status.color = '#ffff00';
    status.text = '$(alert) Select folder.';
  }

  if (showStatusBarItems) {
    status.show();
  } else {
    status.hide();
  }
}

export function updateModeStatus(
  status: vscode.StatusBarItem | undefined,
  showStatusBarItems: boolean,
  activeFolder: string | undefined,
  buildMode: Builds,
  architectureMode: Architectures,
) {
  if (!status) return;

  status.text = `$(tools) ${buildMode} - ${architectureMode}`;
  toggleShow(status, showStatusBarItems, activeFolder);
}

export function updateBuildStatus(
  status: vscode.StatusBarItem | undefined,
  showStatusBarItems: boolean,
  activeFolder: string | undefined,
) {
  if (!status) return;

  status.text = `$(gear)`;
  toggleShow(status, showStatusBarItems, activeFolder);
}

export function updateRunStatus(
  status: vscode.StatusBarItem | undefined,
  showStatusBarItems: boolean,
  activeFolder: string | undefined,
) {
  if (!status) return;

  status.text = `$(play)`;
  toggleShow(status, showStatusBarItems, activeFolder);
}

export function updateDebugStatus(
  status: vscode.StatusBarItem | undefined,
  showStatusBarItems: boolean,
  activeFolder: string | undefined,
) {
  if (!status) return;

  status.text = `$(bug)`;
  toggleShow(status, showStatusBarItems, activeFolder);
}

export function updateCleanStatus(
  status: vscode.StatusBarItem | undefined,
  showStatusBarItems: boolean,
  activeFolder: string | undefined,
) {
  if (!status) return;

  status.text = `$(trash)`;
  toggleShow(status, showStatusBarItems, activeFolder);
}

function toggleShow(
  status: vscode.StatusBarItem,
  showStatusBarItems: boolean,
  activeFolder: string | undefined,
) {
  if (showStatusBarItems && activeFolder) {
    status.show();
  } else {
    status.hide();
  }
}
