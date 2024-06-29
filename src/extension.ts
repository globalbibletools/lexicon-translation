// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { LemmaTreeDataProvider } from "./treeViewLemma.js";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "lexicon-translation" is now active!'
  );

  // Register the TreeDataProvider
  const lemmaTreeDataProvider = new LemmaTreeDataProvider(context);
  vscode.window.registerTreeDataProvider(
    "lexicon-translation.treeView-lemma",
    lemmaTreeDataProvider
  );

  // Register the command to open a file
  let disposable = vscode.commands.registerCommand(
    "extension.openFile",
    (filePath) => {
      vscode.workspace.openTextDocument(filePath).then((doc) => {
        vscode.window.showTextDocument(doc);
      });
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
