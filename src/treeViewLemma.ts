// This module will create an implementation of the vscode.TreeDataProvider class to provide the data for the word tree view.
// It will also create class Entry which will be an extension of class vscode.TreeItem to represent each word in the tree view.
// The values for the attributes of class entry will be populated from the treeViewHebrewData.json and treeViewGreekData.json files.
// The instances of class entry will be stored in Map object with the key = entry.key and value = entry.

// Import the vscode module from the vscode node module.
import * as vscode from "vscode";
import * as path from "path";

// Define global constants
const wordFilePath: string = `./data/eng/`;
const wordExtension: string = ".XML";
export class LemmaTreeDataProvider implements vscode.TreeDataProvider<Entry> {
  constructor(private context: vscode.ExtensionContext) {
    Entry.entriesMap.clear();
    Entry.initialize(context);
  }
  getTreeItem(element: Entry): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Entry): Thenable<Entry[]> {
    if (!element) {
      // Return root level entries (level 1)
      // Commenting this out is there is a timing issue in that when this is called, the Entry.entriesMap is not yet populated
      // const rootEntries = Array.from(Entry.entriesMap.values()).filter(
      //   (entry) => entry.key.startsWith("1")
      // );

      // This is a temporary solution to return root entries
      const rootEntries = new Array<Entry>();
      rootEntries[0] = new Entry(
        1,
        "1H001",
        "Hebrew",
        vscode.TreeItemCollapsibleState.Collapsed
      );
      rootEntries[1] = new Entry(
        1,
        "1G002",
        "Greek",
        vscode.TreeItemCollapsibleState.Collapsed
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
  public static async initialize(context: vscode.ExtensionContext) {
    Entry.rootPath = context.extensionPath;
    const fs = vscode.workspace.fs;
    const hebrewDataPath = vscode.Uri.file(
      path.join(Entry.rootPath, "data", "local", "treeViewHebrewWordData.json")
    );
    const greekDataPath = vscode.Uri.file(
      path.join(Entry.rootPath, "data", "local", "treeViewGreekWordData.json")
    );
    console.log("hebrewDataPath:", hebrewDataPath);
    console.log("greekDataPath:", greekDataPath);

    await this.readAndProcessFile(hebrewDataPath, "hebrew");
    await this.readAndProcessFile(greekDataPath, "greek");
  }

  private static async readAndProcessFile(
    filePath: vscode.Uri,
    language: string
  ) {
    try {
      const fileContentUint8Array = await vscode.workspace.fs.readFile(
        filePath
      );
      const fileContent = Buffer.from(fileContentUint8Array).toString("utf8");
      const data = JSON.parse(fileContent);
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
                  `file:///${Entry.rootPath}/data/eng/${language}/${item.fileName}${wordExtension}`,
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
