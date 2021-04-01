"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileProvider = void 0;
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const utils_1 = require("./utils");
class FileProvider {
    constructor(settings, workspacePath, templateFileName, outputFileName) {
        this.settings = settings;
        this.workspacePath = workspacePath;
        this.templateFileName = templateFileName;
        this.outputFileName = outputFileName;
        this.settings = settings;
        this.workspacePath = workspacePath;
        this.vscodeDirectory = path.join(this.workspacePath, ".vscode");
        this.outputPath = path.join(this.vscodeDirectory, outputFileName);
        const deletePattern = `${this.vscodeDirectory}/**`;
        const extDirectory = path.dirname(__dirname);
        const templateDirectory = path.join(extDirectory, "src", "templates");
        this.templatePath = path.join(templateDirectory, templateFileName);
        this.fileWatcherOnDelete = vscode.workspace.createFileSystemWatcher(deletePattern, true, true, false);
        if (!utils_1.pathExists(this.outputPath)) {
            this.createFileData();
        }
        this.fileWatcherOnDelete.onDidDelete(() => {
            this.createFileData();
        });
    }
    createFileData() {
        if (utils_1.pathExists(this.outputPath)) {
            return;
        }
        if (!utils_1.pathExists(this.vscodeDirectory)) {
            fs.mkdirSync(this.vscodeDirectory, { recursive: true });
        }
        this.writeFileData(this.templatePath, this.outputPath);
    }
    updateFileData() {
        this.writeFileData(this.outputPath, this.outputPath);
    }
    writeFileData(inputFilePath, outFilePath) {
        throw new Error("You have to implement the method doSomething!");
    }
}
exports.FileProvider = FileProvider;
//# sourceMappingURL=fileProvider.js.map