// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  vscode.commands.registerCommand(
    "gbt-project-management.createNewProject",
    createNewProject
  );
}

const sampleLanguages = [
  { tag: "eng", refName: "English" },
  { tag: "spa", refName: "Spanish" },
];
async function createNewProject() {
  const projectName = await vscode.window.showInputBox({
    prompt: "[1/4] Enter the project name",
    ignoreFocusOut: true,
  });
  if (!projectName) {
    vscode.window.showInformationMessage("Cancelled project creation");
    return;
  }

  const username = await vscode.window.showInputBox({
    prompt: "[2/4] Enter your username",
    ignoreFocusOut: true,
  });
  if (!username) {
    vscode.window.showInformationMessage("Cancelled project creation");
    return;
  }

  const sourceLanguage = await vscode.window.showQuickPick(
    sampleLanguages.map((lang) => `${lang.refName} (${lang.tag})`),
    {
      placeHolder: "[3/4] Select the source language",
      ignoreFocusOut: true,
      canPickMany: false,
    }
  );
  if (!sourceLanguage) {
    vscode.window.showInformationMessage("Cancelled project creation");
    return;
  }

  const targetLanguage = await vscode.window.showQuickPick(
    sampleLanguages.map((lang) => `${lang.refName} (${lang.tag})`),
    {
      placeHolder: "[4/4] Select the target language",
      ignoreFocusOut: true,
      canPickMany: false,
    }
  );
  if (!targetLanguage) {
    vscode.window.showInformationMessage("Cancelled project creation");
    return;
  }

  const projectUri = (
    await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      openLabel: "Choose Project Folder",
    })
  )?.[0];
  if (!projectUri) {
    vscode.window.showInformationMessage("Cancelled project creation");
    return;
  }

  const directoryEntries = await vscode.workspace.fs.readDirectory(projectUri);

  if (directoryEntries.length > 0) {
    const answer = await vscode.window.showWarningMessage(
      "This folder is not empty. Some files may be overwritten or deleted. Are you sure you want to hold the project here?",
      "Yes",
      "Cancel"
    );
    if (answer !== "Yes") {
      vscode.window.showInformationMessage("Cancelled project creation");
      return;
    }
  }

  try {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(projectUri, "metadata.json"),
      new Uint8Array()
    );
    await vscode.workspace.fs.createDirectory(
      vscode.Uri.joinPath(projectUri, "files", "source", "hebrew")
    );
    await vscode.workspace.fs.createDirectory(
      vscode.Uri.joinPath(projectUri, "files", "source", "greek")
    );
    await vscode.workspace.fs.createDirectory(
      vscode.Uri.joinPath(projectUri, "files", "target", "hebrew")
    );
    await vscode.workspace.fs.createDirectory(
      vscode.Uri.joinPath(projectUri, "files", "target", "greek")
    );
  } catch (e) {
    vscode.window.showErrorMessage(`Error: ${e}`);
    return;
  }

  const shouldOpenProject = await vscode.window.showInformationMessage(
    "Success! Project created! Would you like to open this project?",
    "Yes",
    "No"
  );

  if (shouldOpenProject === "Yes") {
    await vscode.commands.executeCommand("vscode.openFolder", projectUri);
  }
}

// This method is called when your extension is deactivated
export function deactivate() {}
