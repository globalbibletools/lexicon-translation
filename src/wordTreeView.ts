// This module will create an implementation of the vscode.TreeDataProvider class to provide the data for the word tree view.
// It will also create class Entry which will be an extension of class vscode.TreeItem to represent each word in the tree view.
// The values for the attributes of class entry will be populated from the treeViewHebrewData.json and treeViewGreekData.json files.
// The instances of class entry will be stored in Map object with the key = entry.key and value = entry.

// Import the vscode module from the vscode node module.
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

// Define global constants
// Assuming you want to use the first workspace folder if multiple are opened
const workspaceFolder = vscode.workspace.workspaceFolders
  ? vscode.workspace.workspaceFolders[0].uri.fsPath
  : "";

const jsonFilePath: string = `${workspaceFolder}/data/local/`;
const wordFilePath: string = `${workspaceFolder}/data/eng/`;
const wordExtension: string = ".XML";
export class WordTreeDataProvider implements vscode.TreeDataProvider<Entry> {
  constructor(private context: vscode.ExtensionContext) {}

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
      // const key = element.key;
      // const parentKey = (parseInt(element.level.toString()) + 1).toString() + key.substring(1);
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
  public static async initialize() {
    const hebrewDataPath = path.join(jsonFilePath, "treeViewHebrewData.json");
    const greekDataPath = path.join(jsonFilePath, "treeViewGreekData.json");
    await this.readAndProcessFile(hebrewDataPath, "hebrew");
    await this.readAndProcessFile(greekDataPath, "greek");
  }

  private static async readAndProcessFile(filePath: string, language: string) {
    try {
      const data = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
      for (const item of data) {
        const collapsibleState =
          item.level < 4
            ? vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None;
        const command =
          item.level === 4
            ? {
                command: "extension.openFile",
                title: "Open File",
                arguments: [
                  `${wordFilePath}${language}/${item.fileName}.${wordExtension}`,
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
      console.error(`Failed to read or process file ${filePath}:`, error);
    }
  }
}
