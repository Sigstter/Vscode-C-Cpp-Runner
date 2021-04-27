import * as path from 'path';
import * as vscode from 'vscode';

import {
  Architectures,
  Builds,
  JsonConfiguration,
  JsonInnerTask,
  JsonTask,
  Languages,
  Task,
  Tasks,
} from '../utils/types';
import {
  getLanguage,
  readJsonFile,
  replaceBackslashes,
} from '../utils/fileUtils';
import { SettingsProvider } from './settingsProvider';
import { getLaunchConfigIndex } from '../utils/vscodeUtils';
import { extensionPath } from '../extension';

export class TaskProvider implements vscode.TaskProvider {
  private readonly _tasksFile: string;
  private readonly _makefileFile: string;
  public tasks: Task[] | undefined;

  constructor(
    private readonly _settingsProvider: SettingsProvider,
    private _workspaceFolder: string | undefined,
    private _pickedFolder: string | undefined,
    private _buildMode: Builds,
    private _architectureMode: Architectures,
  ) {
    const templateDirectory = path.join(
      extensionPath ? extensionPath : '',
      'templates',
    );
    this._tasksFile = path.join(templateDirectory, 'tasks_template.json');
    this._makefileFile = path.join(templateDirectory, 'Makefile');

    this.getTasks();
  }

  public async resolveTask(task: Task) {
    return task;
  }

  public provideTasks() {
    return this.getTasks();
  }

  public getTasks() {
    if (!this.activeFolder) return [];

    const language = getLanguage(this.activeFolder);

    this.setTasksDefinition(language);

    if (!this.tasks) return [];

    return this.tasks;
  }

  private setTasksDefinition(language: Languages) {
    const taskType = 'shell';
    const configJson: JsonTask = readJsonFile(this._tasksFile);

    if (!configJson) {
      return [];
    }

    this.tasks = [];

    for (const taskJson of configJson.tasks) {
      if (taskJson.type !== taskType) {
        continue;
      }
      if (taskJson.options) {
        if (taskJson.options.hide) {
          continue;
        }
      }

      this.updateTaskBasedOnSettings(taskJson, language);

      const shellCommand = `${taskJson.command} ${taskJson.args.join(' ')}`;

      const definition = {
        type: taskType,
        task: taskJson.label,
      };
      const problemMatcher = '$gcc';
      const scope = vscode.TaskScope.Workspace;
      const execution = new vscode.ShellExecution(shellCommand);
      const task = new Task(
        definition,
        scope,
        taskJson.label,
        'C_Cpp_Runner',
        execution,
        problemMatcher,
      );
      this.tasks.push(task);
    }

    this.addDebugTask();

    return this.tasks;
  }

  private updateTaskBasedOnSettings(
    taskJson: JsonInnerTask,
    language: Languages,
  ) {
    if (!this.workspaceFolder || !this.activeFolder) {
      return;
    }

    const settings = this._settingsProvider;
    const activeFolder = this.activeFolder;
    const workspaceFolder = this.workspaceFolder;
    const folder = activeFolder.replace(
      workspaceFolder,
      path.basename(workspaceFolder),
    );
    taskJson.label = taskJson.label.replace(
      taskJson.label.split(': ')[1],
      folder,
    );
    taskJson.label = replaceBackslashes(taskJson.label);
    taskJson.command = settings.makePath;
    taskJson.args[1] = `--file=${this._makefileFile}`;
    // Makefile arguments that hold single values
    taskJson.args.push(`COMPILATION_MODE=${this.buildMode}`);
    taskJson.args.push(`EXECUTABLE_NAME=out${this.buildMode}`);
    taskJson.args.push(`LANGUAGE_MODE=${language}`);
    const cleanTask = taskJson.label.includes(Tasks.clean);
    const runTask = taskJson.label.includes(Tasks.run);
    if (!cleanTask && !runTask) {
      if (language === Languages.c) {
        taskJson.args.push(`C_COMPILER=${settings.cCompilerPath}`);
        if (settings.cStandard) {
          taskJson.args.push(`C_STANDARD=${settings.cStandard}`);
        }
      } else {
        taskJson.args.push(`CPP_COMPILER=${settings.cppCompilerPath}`);
        if (settings.cppStandard) {
          taskJson.args.push(`CPP_STANDARD=${settings.cppStandard}`);
        }
      }
      taskJson.args.push(`ENABLE_WARNINGS=${+settings.enableWarnings}`);
      taskJson.args.push(`WARNINGS_AS_ERRORS=${+settings.warningsAsError}`);
      const architectureStr =
        this.architectureMode === Architectures.x64 ? '64' : '32';
      if (architectureStr) {
        taskJson.args.push(`ARCHITECTURE=${architectureStr}`);
      }
      // Makefile arguments that can hold multiple values
      if (settings.warnings) {
        taskJson.args.push(`WARNINGS="${settings.warnings}"`);
      }
      if (settings.compilerArgs) {
        taskJson.args.push(`COMPILER_ARGS="${settings.compilerArgs}"`);
      }
      if (settings.linkerArgs) {
        taskJson.args.push(`LINKER_ARGS="${settings.linkerArgs}"`);
      }
      if (settings.includePaths) {
        taskJson.args.push(`INCLUDE_PATHS="${settings.includePaths}"`);
      }
    }
  }

  public updateModeData(buildMode: Builds, architectureMode: Architectures) {
    this.buildMode = buildMode;
    this.architectureMode = architectureMode;
  }

  public updatFolderData(
    workspaceFolder: string | undefined,
    activeFolder: string | undefined,
  ) {
    this.workspaceFolder = workspaceFolder;
    this.activeFolder = activeFolder;
  }

  public getProjectFolder() {
    if (this.activeFolder) {
      return this.activeFolder;
    }

    if (this.workspaceFolder) {
      return this.workspaceFolder;
    }

    return undefined;
  }

  private addDebugTask() {
    if (!this.tasks) {
      return;
    }
    if (!this.workspaceFolder || !this.activeFolder) {
      return;
    }

    const folder = this.activeFolder.replace(
      this.workspaceFolder,
      path.basename(this.workspaceFolder),
    );
    let label = `Debug: ${this.activeFolder}`;
    label = label.replace(label.split(': ')[1], folder);
    label = replaceBackslashes(label);
    const definition = {
      type: 'shell',
      task: label,
    };
    const problemMatcher = '$gcc';
    const scope = vscode.TaskScope.Workspace;

    const task = new Task(
      definition,
      scope,
      label,
      'C_Cpp_Runner',
      undefined,
      problemMatcher,
    );

    this.tasks.push(task);
  }

  public async runDebugTask() {
    if (!this.workspaceFolder) {
      return;
    }

    const uriWorkspaceFolder = vscode.Uri.file(this.workspaceFolder);
    const folder = vscode.workspace.getWorkspaceFolder(uriWorkspaceFolder);
    const configJson: JsonConfiguration | undefined = readJsonFile(
      path.join(this.workspaceFolder, '.vscode', 'launch.json'),
    );

    if (!configJson) {
      return;
    }

    const configName = 'C/C++ Runner: Debug Session';
    const configIdx = getLaunchConfigIndex(configJson, configName);

    await vscode.debug.startDebugging(
      folder,
      configJson.configurations[configIdx],
    );
  }

  public get architectureMode() {
    return this._architectureMode;
  }

  public set architectureMode(value: Architectures) {
    this._architectureMode = value;
  }

  public get buildMode() {
    return this._buildMode;
  }

  public set buildMode(value: Builds) {
    this._buildMode = value;
  }

  public get activeFolder() {
    return this._pickedFolder;
  }

  public set activeFolder(value: string | undefined) {
    this._pickedFolder = value;
  }

  public get workspaceFolder() {
    return this._workspaceFolder;
  }

  public set workspaceFolder(value: string | undefined) {
    this._workspaceFolder = value;
  }
}
