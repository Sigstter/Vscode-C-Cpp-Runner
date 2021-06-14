import * as vscode from 'vscode';
import * as assert from 'assert';

import { activateCppExtension } from '../testHelper';

suite('startup tests', function () {
  suiteSetup(async function () {
    let extension = activateCppExtension();
    // let document = await vscode.workspace.openTextDocument({
    //   language: 'cpp',
    //   content: 'int main() { return 0; }',
    // });
    // let textEitor = await vscode.window.showTextDocument(document);

    assert.notStrictEqual(extension, undefined);
    // assert.notStrictEqual(document, undefined);
    // assert.notStrictEqual(textEitor, undefined);
  });

  suiteTeardown(async function () {});

  test('Check default configuration', () => {
    // let rootUri: vscode.Uri | undefined;
    // if (
    //   vscode.workspace.workspaceFolders &&
    //   vscode.workspace.workspaceFolders.length > 0
    // ) {
    //   rootUri = vscode.workspace.workspaceFolders[0].uri;
    // }
    // assert.notStrictEqual(rootUri, undefined, 'Root Uri is not defined');
  });
});
