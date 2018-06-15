import { commands } from 'vscode';
import { Disposable } from 'vscode';
import { ExtensionContext } from 'vscode';
import { Parser } from './parser';
import { TextDocumentWillSaveEvent } from 'vscode';
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

async function splitAndSort() {
  const parser = new Parser(window.activeTextEditor.document.getText());
  await parser.parse();
  const imports = parser.produce();
  if (imports.length === 0)
    return;
  else return window.activeTextEditor.edit(edit => edit.replace(parser.range, imports));
}

async function splitAndSortOnSave(event: TextDocumentWillSaveEvent) {
  const parser = new Parser(event.document.getText());
  await parser.parse();
  const imports = parser.produce();
  if (imports.length > 0) {
    const edits = window.activeTextEditor.edit(edit => edit.replace(parser.range, imports));
    event.waitUntil(edits);
  }
}
