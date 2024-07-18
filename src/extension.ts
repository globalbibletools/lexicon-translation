import * as vscode from "vscode";
import createNewProject from "./commands/createNewProject";

export async function activate(context: vscode.ExtensionContext) {
  vscode.commands.registerCommand(
    "gbt-project-management.createNewProject",
    () => createNewProject(context)
  );
}
