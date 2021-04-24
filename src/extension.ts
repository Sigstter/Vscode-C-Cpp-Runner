import * as vscode from 'vscode';

import { folderHandler } from './handler/folderHandler';
import { modeHandler } from './handler/modeHandler';
import { taskHandler } from './handler/taskHandler';
import {
  updateBuildStatus,
  updateCleanStatus,
  updateDebugStatus,
  updateFolderStatus,
  updateModeStatus,
  updateRunStatus,
} from './items/statusBarItems';
import { LaunchProvider } from './provider/launchProvider';
import { PropertiesProvider } from './provider/propertiesProvider';
import { SettingsProvider } from './provider/settingsProvider';
import { TaskProvider } from './provider/taskProvider';
import { foldersInDir, noCmakeFileFound } from './utils/fileUtils';
import * as logger from './utils/logger';
import { Architectures, Builds, Tasks } from './utils/types';
import {
  createStatusBarItem,
  disposeItem,
  getLoggingState,
  setContextValue,
  updateLoggingState,
} from './utils/vscodeUtils';

const PROPERTIES_TEMPLATE = 'properties_template.json';
const PROPERTIES_FILE = 'c_cpp_properties.json';
const LAUNCH_TEMPLATE = 'launch_template.json';
const LAUNCH_FILE = 'launch.json';

let folderContextMenuDisposable: vscode.Disposable;
let taskProviderDisposable: vscode.Disposable;
let commandHandlerDisposable: vscode.Disposable;
let toggleStatusBarDisposable: vscode.Disposable;
let commandFolderDisposable: vscode.Disposable;
let commandModeDisposable: vscode.Disposable;
let commandBuildDisposable: vscode.Disposable;
let commandRunDisposable: vscode.Disposable;
let commandDebugDisposable: vscode.Disposable;
let commandCleanDisposable: vscode.Disposable;

let settingsProvider: SettingsProvider;
let launchProvider: LaunchProvider;
let propertiesProvider: PropertiesProvider;
let taskProvider: TaskProvider;

let folderStatusBar: vscode.StatusBarItem;
let modeStatusBar: vscode.StatusBarItem;
let buildStatusBar: vscode.StatusBarItem;
let runStatusBar: vscode.StatusBarItem;
let debugStatusBar: vscode.StatusBarItem;
let cleanStatusBar: vscode.StatusBarItem;

let workspaceFolder: string | undefined;
let activeFolder: string | undefined;
let buildMode: Builds = Builds.debug;
let architectureMode: Architectures = Architectures.x64;
let errorMessage: Thenable<string | undefined> | undefined;
let showStatusBarItems: boolean = false;
let loggingActive: boolean = getLoggingState();

export let extensionContext: vscode.ExtensionContext | undefined;
export let extensionContextState: vscode.Memento | undefined;

export function activate(context: vscode.ExtensionContext) {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    const infoMessage = `Empty Workspace opened.`;
    logger.log(loggingActive, infoMessage);

    return;
  }

  extensionContext = context;
  extensionContextState = context.workspaceState;
  setContextValue('C_Cpp_Runner:activatedExtension', true);

  updateLoggingState();

  showStatusBarItems = noCmakeFileFound();
  if (!showStatusBarItems) {
    const infoMessage = `CMake Project found. Deactivating extension.`;
    logger.log(loggingActive, infoMessage);
  }

  initFolderStatusBar(context);
  initModeStatusBar(context);
  initBuildStatusBar(context);
  initRunStatusBar(context);
  initDebugStatusBar(context);
  initCleanStatusBar(context);

  initWorkspaceProvider();
  initWorkspaceDisposables(context);
}

export function deactivate() {
  setContextValue('C_Cpp_Runner:activatedExtension', false);

  disposeItem(folderContextMenuDisposable);
  disposeItem(taskProviderDisposable);
  disposeItem(commandHandlerDisposable);
  disposeItem(toggleStatusBarDisposable);
  disposeItem(folderStatusBar);
  disposeItem(modeStatusBar);
  disposeItem(buildStatusBar);
  disposeItem(runStatusBar);
  disposeItem(debugStatusBar);
  disposeItem(cleanStatusBar);
  disposeItem(commandFolderDisposable);
  disposeItem(commandModeDisposable);
  disposeItem(commandBuildDisposable);
  disposeItem(commandRunDisposable);
  disposeItem(commandDebugDisposable);
  disposeItem(commandCleanDisposable);
}

function initWorkspaceProvider() {
  if (!workspaceFolder) {
    return;
  }

  if (!settingsProvider) {
    settingsProvider = new SettingsProvider(workspaceFolder);
  }

  if (!propertiesProvider) {
    propertiesProvider = new PropertiesProvider(
      settingsProvider,
      workspaceFolder,
      PROPERTIES_TEMPLATE,
      PROPERTIES_FILE,
    );
  }

  if (!activeFolder) {
    return;
  }

  if (!launchProvider) {
    launchProvider = new LaunchProvider(
      settingsProvider,
      workspaceFolder,
      activeFolder,
      LAUNCH_TEMPLATE,
      LAUNCH_FILE,
    );
  }

  if (!taskProvider) {
    taskProvider = new TaskProvider(
      settingsProvider,
      workspaceFolder,
      activeFolder,
      buildMode,
      architectureMode,
    );
  }
}

function initWorkspaceDisposables(context: vscode.ExtensionContext) {
  taskProviderDisposable = vscode.tasks.registerTaskProvider(
    'C_Cpp_Runner',
    taskProvider,
  );
  commandHandlerDisposable = vscode.commands.registerCommand(
    'C_Cpp_Runner.tasks',
    () => tasksCallback(),
  );
  toggleStatusBarDisposable = vscode.commands.registerCommand(
    'C_Cpp_Runner.toggleStatusBar',
    () => toggleStatusBarCallback(),
  );
  folderContextMenuDisposable = vscode.commands.registerCommand(
    'C_Cpp_Runner.folderContextMenu',
    async (clickedUriItem: vscode.Uri, selectedUriItems: vscode.Uri[]) =>
      contextMenuCallback(clickedUriItem, selectedUriItems),
  );

  context.subscriptions.push(taskProviderDisposable);
  context.subscriptions.push(commandHandlerDisposable);
  context.subscriptions.push(toggleStatusBarDisposable);
  context.subscriptions.push(folderContextMenuDisposable);

  vscode.workspace.onDidChangeConfiguration(() => {
    const infoMessage = `Configuration change.`;
    logger.log(loggingActive, infoMessage);

    settingsProvider.getSettings();
    taskProvider.getTasks();
    propertiesProvider.updateFileContent();
    launchProvider.updateFileContent();
    updateLoggingState();
  });

  vscode.workspace.onDidRenameFiles((e: vscode.FileRenameEvent) => {
    if (e.files.length === 1) {
      const oldName = e.files[0].oldUri.fsPath;
      const newName = e.files[0].newUri.fsPath;

      const infoMessage = `Renaming: ${oldName} -> ${newName}.`;
      logger.log(loggingActive, infoMessage);

      if (oldName === workspaceFolder) {
        workspaceFolder = newName;
        updateFolderData();
      } else if (oldName === activeFolder) {
        activeFolder = newName;
        updateFolderData();
      }
    }
  });

  vscode.workspace.onDidDeleteFiles((e: vscode.FileDeleteEvent) => {
    if (e.files.length >= 0) {
      const oldName = e.files[0].fsPath;

      const infoMessage = `Deleting: ${oldName}.`;
      logger.log(loggingActive, infoMessage);

      if (oldName === workspaceFolder) {
        workspaceFolder = undefined;
        updateFolderData();
        updateFolderStatus(folderStatusBar, taskProvider, showStatusBarItems);
      } else if (oldName === activeFolder) {
        activeFolder = undefined;
        updateFolderData();
        updateFolderStatus(folderStatusBar, taskProvider, showStatusBarItems);
      }
    }
  });
}

function toggleStatusBarItems() {
  if (showStatusBarItems) {
    folderStatusBar.show();
    modeStatusBar.show();
    buildStatusBar.show();
    runStatusBar.show();
    debugStatusBar.show();
    cleanStatusBar.show();
  } else {
    folderStatusBar.hide();
    modeStatusBar.hide();
    buildStatusBar.hide();
    runStatusBar.hide();
    debugStatusBar.hide();
    cleanStatusBar.hide();
  }
}

// STATUS BAR CALLBACKS

async function folderCallback() {
  const ret = await folderHandler();
  if (ret && ret.activeFolder && ret.workspaceFolder) {
    activeFolder = ret.activeFolder;
    workspaceFolder = ret.workspaceFolder;

    updateFolderData();
  } else {
    const infoMessage = `Folder callback aborted.`;
    logger.log(loggingActive, infoMessage);
  }
}

async function modeCallback() {
  const ret = await modeHandler(settingsProvider);
  if (ret && ret.pickedArchitecture && ret.pickedMode) {
    buildMode = ret.pickedMode;
    architectureMode = ret.pickedArchitecture;
    if (taskProvider) {
      taskProvider.updateModeData(buildMode, architectureMode);
    }
    updateModeStatus(
      modeStatusBar,
      showStatusBarItems,
      activeFolder,
      buildMode,
      architectureMode,
    );
  } else {
    const infoMessage = `Mode callback aborted.`;
    logger.log(loggingActive, infoMessage);
  }
}

function buildCallback() {
  if (
    !taskProvider ||
    !taskProvider.tasks ||
    !taskProvider.workspaceFolder ||
    !taskProvider.activeFolder
  ) {
    const infoMessage = `buildCallback: No Folder or Tasks defined.`;
    logger.log(loggingActive, infoMessage);

    return;
  }

  taskProvider.getTasks();

  const projectFolder = taskProvider.getProjectFolder();
  taskProvider.tasks.forEach(async (task) => {
    if (task.name.includes(Tasks.build)) {
      if (
        task.execution &&
        task.execution instanceof vscode.ShellExecution &&
        task.execution.commandLine
      ) {
        task.execution.commandLine = task.execution.commandLine.replace(
          'FILE_DIR',
          projectFolder,
        );
      }
      await vscode.tasks.executeTask(task);
    }
  });
}

function runCallback() {
  if (
    !taskProvider ||
    !taskProvider.tasks ||
    !taskProvider.workspaceFolder ||
    !taskProvider.activeFolder
  ) {
    const infoMessage = `runCallback: No Folder or Tasks defined.`;
    logger.log(loggingActive, infoMessage);

    return;
  }

  taskProvider.getTasks();

  const projectFolder = taskProvider.getProjectFolder();
  taskProvider.tasks.forEach(async (task) => {
    if (task.name.includes(Tasks.run)) {
      if (
        task.execution &&
        task.execution instanceof vscode.ShellExecution &&
        task.execution.commandLine
      ) {
        task.execution.commandLine = task.execution.commandLine.replace(
          'FILE_DIR',
          projectFolder,
        );
      }
      await vscode.tasks.executeTask(task);
    }
  });
}

async function debugCallback() {
  if (!activeFolder || !workspaceFolder) {
    const infoMessage = `debugCallback: No Workspace or Folder picked.`;
    logger.log(loggingActive, infoMessage);

    return;
  }

  taskProvider.runDebugTask();
}

function cleanCallback() {
  if (
    !taskProvider ||
    !taskProvider.tasks ||
    !taskProvider.workspaceFolder ||
    !taskProvider.activeFolder
  ) {
    const infoMessage = `cleanCallback: No Folder or Tasks defined.`;
    logger.log(loggingActive, infoMessage);

    return;
  }

  taskProvider.getTasks();

  const projectFolder = taskProvider.getProjectFolder();
  taskProvider.tasks.forEach(async (task) => {
    if (task.name.includes(Tasks.clean)) {
      if (
        task.execution &&
        task.execution instanceof vscode.ShellExecution &&
        task.execution.commandLine
      ) {
        task.execution.commandLine = task.execution.commandLine.replace(
          'FILE_DIR',
          projectFolder,
        );
      }
      await vscode.tasks.executeTask(task);
    }
  });
}

function tasksCallback() {
  let showErrorMessage = false;

  if (!showStatusBarItems) {
    showStatusBarItems = true;
    toggleStatusBarItems();
  } else {
    if (!errorMessage) {
      showErrorMessage = true;
    }
  }

  if (!workspaceFolder) {
    if (showErrorMessage) {
      errorMessage = vscode.window.showErrorMessage(
        'You have to select a folder first.',
      );
      errorMessage.then(() => (errorMessage = undefined));
    }
  } else {
    errorMessage = undefined;

    if (taskProvider) {
      taskProvider.getTasks();
      taskHandler(taskProvider);
    }
  }
}

function toggleStatusBarCallback() {
  showStatusBarItems = !showStatusBarItems;
  toggleStatusBarItems();
}

function contextMenuCallback(
  clickedUriItem: vscode.Uri,
  selectedUriItems: vscode.Uri[],
) {
  if (selectedUriItems.length > 1) {
    return;
  }

  const workspaceItem = vscode.workspace.getWorkspaceFolder(clickedUriItem);

  if (!workspaceItem) {
    return;
  }

  activeFolder = clickedUriItem.fsPath;
  workspaceFolder = workspaceItem.uri.fsPath;
  updateFolderData();
}

function updateFolderData() {
  initWorkspaceProvider();

  if (taskProvider) {
    taskProvider.updatFolderData(workspaceFolder, activeFolder);
    if (buildMode && architectureMode) {
      taskProvider.updateModeData(buildMode, architectureMode);
    }
  }

  if (workspaceFolder && activeFolder) {
    settingsProvider.updatFolderData(workspaceFolder);
    settingsProvider.checkCompilers();

    if (propertiesProvider) {
      propertiesProvider.updatFolderData(workspaceFolder);
    }
    if (launchProvider) {
      launchProvider.updatFolderData(workspaceFolder, activeFolder);
      launchProvider.updateFileContent();
    }
  }

  updateFolderStatus(folderStatusBar, taskProvider, showStatusBarItems);
  updateModeStatus(
    modeStatusBar,
    showStatusBarItems,
    activeFolder,
    buildMode,
    architectureMode,
  );
  updateBuildStatus(buildStatusBar, showStatusBarItems, activeFolder);
  updateRunStatus(runStatusBar, showStatusBarItems, activeFolder);
  updateCleanStatus(cleanStatusBar, showStatusBarItems, activeFolder);
  updateDebugStatus(debugStatusBar, showStatusBarItems, activeFolder);
}

// INIT STATUS BAR

function initFolderStatusBar(context: vscode.ExtensionContext) {
  folderStatusBar = createStatusBarItem();
  context.subscriptions.push(folderStatusBar);

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    if (workspaceFolders.length === 1) {
      const workspaceFolderFs = workspaceFolders[0].uri.fsPath;
      const folders = foldersInDir(workspaceFolderFs);
      if (folders.length === 0) {
        workspaceFolder = workspaceFolderFs;
        activeFolder = workspaceFolderFs;
        updateFolderData();
      } else {
        updateFolderStatus(folderStatusBar, taskProvider, showStatusBarItems);
      }
    } else {
      updateFolderStatus(folderStatusBar, taskProvider, showStatusBarItems);
    }
  }

  commandFolderDisposable = vscode.commands.registerCommand(
    'C_Cpp_Runner.init',
    () => folderCallback(),
  );
  folderStatusBar.command = 'C_Cpp_Runner.init';
  context.subscriptions.push(commandFolderDisposable);
}

function initModeStatusBar(context: vscode.ExtensionContext) {
  modeStatusBar = createStatusBarItem();
  context.subscriptions.push(modeStatusBar);
  updateModeStatus(
    modeStatusBar,
    showStatusBarItems,
    activeFolder,
    buildMode,
    architectureMode,
  );

  commandModeDisposable = vscode.commands.registerCommand(
    'C_Cpp_Runner.mode',
    () => modeCallback(),
  );
  modeStatusBar.command = 'C_Cpp_Runner.mode';
  context.subscriptions.push(commandModeDisposable);
}

function initBuildStatusBar(context: vscode.ExtensionContext) {
  buildStatusBar = createStatusBarItem();
  context.subscriptions.push(buildStatusBar);
  updateBuildStatus(buildStatusBar, showStatusBarItems, activeFolder);

  commandBuildDisposable = vscode.commands.registerCommand(
    'C_Cpp_Runner.build',
    () => buildCallback(),
  );
  buildStatusBar.command = 'C_Cpp_Runner.build';
  context.subscriptions.push(commandBuildDisposable);
}

function initRunStatusBar(context: vscode.ExtensionContext) {
  runStatusBar = createStatusBarItem();
  context.subscriptions.push(runStatusBar);
  updateRunStatus(runStatusBar, showStatusBarItems, activeFolder);

  commandRunDisposable = vscode.commands.registerCommand(
    'C_Cpp_Runner.run',
    () => runCallback(),
  );
  runStatusBar.command = 'C_Cpp_Runner.run';
  context.subscriptions.push(commandRunDisposable);
}

function initDebugStatusBar(context: vscode.ExtensionContext) {
  debugStatusBar = createStatusBarItem();
  context.subscriptions.push(debugStatusBar);
  updateDebugStatus(debugStatusBar, showStatusBarItems, activeFolder);

  commandDebugDisposable = vscode.commands.registerCommand(
    'C_Cpp_Runner.debug',
    () => debugCallback(),
  );
  debugStatusBar.command = 'C_Cpp_Runner.debug';
  context.subscriptions.push(commandDebugDisposable);
}

function initCleanStatusBar(context: vscode.ExtensionContext) {
  cleanStatusBar = createStatusBarItem();
  context.subscriptions.push(cleanStatusBar);
  updateCleanStatus(cleanStatusBar, showStatusBarItems, activeFolder);

  commandCleanDisposable = vscode.commands.registerCommand(
    'C_Cpp_Runner.clean',
    () => cleanCallback(),
  );
  cleanStatusBar.command = 'C_Cpp_Runner.clean';
  context.subscriptions.push(commandCleanDisposable);
}
