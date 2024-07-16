// This module will create an implementation of the vscode.TreeDataProvider class to provide the data for the lemma tree view.
// It will also create class Entry which will be an extension of class vscode.TreeItem to represent each node in the tree view.
// The values for the attributes of class entry will be populated from the treeViewHebrewData.json and treeViewGreekData.json files.
// The instances of class entry will be stored in a Map object with the key = entry.key and value = entry.

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import hebrewDataRaw from "../data/local/treeViewHebrewWordData.json";
import greekDataRaw from "../data/local/treeViewGreekWordData.json";

// Define global constants
const languagePath: string = "data/";
const languageCode: string = "eng";
const wordExtension: string = ".XML";
const hebrewData: HebrewWordData[] = hebrewDataRaw as HebrewWordData[];
const greekData: GreekWordData[] = greekDataRaw as GreekWordData[];
// console.log("hebrewData:", hebrewData);
// console.log("greekData:", greekData);
export class LemmaTreeDataProvider implements vscode.TreeDataProvider<Entry> {
  constructor() {}

  async initialize() {
    await Entry.initialize(); // Ensure Entry is initialized
  }

  getTreeItem(element: Entry): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Entry): Thenable<Entry[]> {
    if (!element) {
      // Return root level entries (level 1)
      const rootEntries = Array.from(Entry.entriesMap.values()).filter(
        (entry) => entry.key.startsWith("1")
      );
      return Promise.resolve(rootEntries);
    } else {
      // Generate parentKey for child entries
      const key = element.key;
      const parentKey =
        (parseInt(element.level.toString()) + 1).toString() + key.substring(1);
      const childKeyPrefix =
        (element.level + 1).toString() + element.key.substring(1);
      const childEntries = Array.from(Entry.entriesMap.values()).filter(
        (entry) => entry.key.startsWith(childKeyPrefix)
      );
      return Promise.resolve(childEntries);
    }
  }
}

export class Entry extends vscode.TreeItem {
  public static entriesMap: Map<string, Entry> = new Map<string, Entry>();
  public static rootPath: string;
  constructor(
    public readonly level: number,
    public readonly key: string,
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.tooltip = `${this.label}`;
  }
  public static async initialize(): Promise<void> {
    // const rootDirectory = vscode.workspace.workspaceFolders
    //   ? vscode.workspace.workspaceFolders[0].uri.fsPath
    //   : null;
    const rootDirectory =
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : null;

    if (rootDirectory === null) {
      vscode.window
        .showErrorMessage(
          "Please add the project root folder to your workspace.",
          "Add Folder"
        )
        .then(async (selection) => {
          if (selection === "Add Folder") {
            await vscode.commands.executeCommand(
              "workbench.action.addRootFolder"
            );
          }
          // else {
          //   // If user cancels, then return
          // }
        });
      return Promise.resolve();
    }

    if (rootDirectory) {
      Entry.rootPath = rootDirectory;

      // Let's ensure that the ${languagePath}${languageCode} directory exists
      const fullPath = path.join(rootDirectory, languagePath, languageCode);
      if (!fs.existsSync(fullPath)) {
        vscode.window
          .showErrorMessage(
            `The required "${languagePath}${languageCode}" directory does not exist under the selected project folder. Please select the correct project folder.`,
            "Select Folder"
          )
          .then(async (selection) => {
            if (selection === "Select Folder") {
              const workspaceFolders = vscode.workspace.workspaceFolders;
              if (workspaceFolders && workspaceFolders.length === 1) {
                // There is exactly one workspace folder, safe to remove
                vscode.workspace.updateWorkspaceFolders(0, 1);
                await vscode.commands.executeCommand(
                  "workbench.action.addRootFolder"
                );
              } else if (!workspaceFolders || workspaceFolders.length === 0) {
                // No workspace folders, directly add a new one
                await vscode.commands.executeCommand(
                  "workbench.action.addRootFolder"
                );
              } else {
                // More than one workspace folder exists. Find the matching folder and remove it
                const targetIndex = workspaceFolders.findIndex(
                  (folder) =>
                    path.resolve(folder.uri.fsPath) ===
                    path.resolve(rootDirectory)
                );
                if (targetIndex !== -1) {
                  // Found the matching folder, remove it
                  vscode.workspace.updateWorkspaceFolders(targetIndex, 1);
                }
                await vscode.commands.executeCommand(
                  "workbench.action.addRootFolder"
                );
              }

              // Remove the 1st workspace folder. Assuming there is only one workspace folder
              vscode.workspace.updateWorkspaceFolders(0, 1);
              await vscode.commands.executeCommand(
                "workbench.action.addRootFolder"
              );
            } else {
              // If user cancels, then return
              return Promise.resolve();
            }
          });
      }
    }

    // Example: Return a promise that resolves when initialization is complete
    return new Promise((resolve) => {
      setTimeout(() => {
        // Populate entriesMap here
        Entry.entriesMap.clear();
        this.readAndProcessFile(hebrewData, "hebrew");
        this.readAndProcessFile(greekData, "greek");
        resolve();
      }, 1000);
    });
  }

  private static async readAndProcessFile(
    data: HebrewWordData[] | GreekWordData[],
    language: string
  ) {
    try {
      for (const item of data) {
        const collapsibleState =
          item.level < 4
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const command =
          item.level === 4
            ? {
                command: "vscode.open",
                title: "Open File",
                arguments: [
                  `file:///${Entry.rootPath}/${languagePath}${languageCode}/${language}/${item.fileName}${wordExtension}`,
                ],
              }
            : undefined;

        const entry = new Entry(
          item.level,
          item.key,
          item.label,
          collapsibleState,
          command
        );
        Entry.entriesMap.set(item.key, entry);
      }
    } catch (error) {
      // TODO: Test this error handling
      console.error(
        `Failed to read or process data file for Lemma Tree View:`,
        error
      );
    }
  }
}
