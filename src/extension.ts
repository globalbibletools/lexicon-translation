// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { LemmaTreeDataProvider } from "./treeViewLemma.js";
import createNewProject from "./commands/createNewProject.js";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "lexicon-translation" is now active!'
  );

  context.subscriptions.push(vscode.commands.registerCommand(
    "gbt-project-management.createNewProject",
    () => createNewProject(context)
  ));

  const lemmaTreeDataProvider = new LemmaTreeDataProvider();
  await lemmaTreeDataProvider.initialize(); // Wait for initialization
  const lemmaTreeView = vscode.window.createTreeView("lexicon-translation.treeView-lemma", { treeDataProvider: lemmaTreeDataProvider, showCollapseAll: true });
  context.subscriptions.push(lemmaTreeView);
}

// This method is called when your extension is deactivated
export function deactivate() {}
