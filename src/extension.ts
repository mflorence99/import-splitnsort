import { Disposable } from 'vscode';
import { ExtensionContext } from 'vscode';
import { Parser } from './parser';
import { TextDocumentWillSaveEvent } from 'vscode';
import { TextEdit } from 'vscode';

import { commands } from 'vscode';
import { window } from 'vscode';
import { workspace } from 'vscode';

/**
 * import-splitnsort contract
 */

export function activate(context: ExtensionContext) {
  const disposable = commands.registerCommand('extension.import-splitnsort', splitAndSort);
  context.subscriptions.push(disposable);
  onSave();
  workspace.onDidChangeConfiguration(() => onSave());
}

export function deactivate() { }

// private functions

let subscription: Disposable;

function onSave() {
  const config = workspace.getConfiguration('import-splitnsort');
  if (config.get<boolean>('on-save')) {
    if (!subscription)
      subscription = workspace.onWillSaveTextDocument(splitAndSortOnSave);
  }
  else {
    if (subscription) {
      subscription.dispose();
      subscription = null;
    }
  }
}

// @see https://github.com/mflorence99/import-splitnsort/issues/2

function splitAndSort() {
  const editor = window.activeTextEditor;
  if (editor.document.languageId === 'typescript') {
    Parser.makeEdits(editor.document.getText())
      .then((edits: TextEdit[]) => {
        if (edits.length > 0) {
          const range = edits[0].range;
          const imports = edits[0].newText;
          editor.edit(edit => edit.replace(range, imports));
        }
      });
  }
}

function splitAndSortOnSave(event: TextDocumentWillSaveEvent) {
  if (event.document.languageId === 'typescript')
    event.waitUntil(Parser.makeEdits(event.document.getText()));
}
