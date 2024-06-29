// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { WordTreeDataProvider, Entry } from "./lemmaTreeView.js";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "lexicon-translation" is now active!'
  );

  // Initialize the data for the tree view
  Entry.initialize()
    .then(() => {
      console.log("Initialization successful");
      // Create an instance of the WordTreeDataProvider
      const wordTreeDataProvider = new WordTreeDataProvider(context);

      // Register the tree data provider with VS Code
      // This is necessary if you have defined a view in your package.json and want to associate this data provider with it
      vscode.window.registerTreeDataProvider(
        "treeView-word",
        wordTreeDataProvider
      );

      // Optionally, create a TreeView instance programmatically if needed for additional control
      // This step might be redundant if you only need to register the data provider for a view defined in package.json
      vscode.window.createTreeView("treeView-word", {
        treeDataProvider: wordTreeDataProvider,
      });
    })
    .catch((error) => {
      console.error("Initialization failed:", error);
      // Handle initialization error
    });

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "lexicon-translation.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage(
        "Hello World from Lexicon Translation!"
      );
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
