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

  getChildren(element?: Entry): Entry[] {
    if (!element) {
      // Return root level entries (level 1)
      const rootEntries = Array.from(Entry.entriesMap.values()).filter(
        (entry) => entry.key.startsWith("1")
      );
      return rootEntries;
    } else {
      const parentKey =
        (element.level + 1).toString() + element.key.substring(1);
      const childEntries = Array.from(Entry.entriesMap.values()).filter(
        (entry) => entry.key.startsWith(parentKey)
      );
      return childEntries;
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
    // Need to reset Entry because this is called if the workspace folder changes
    Entry.entriesMap.clear();
    Entry.rootPath = "";

    // If no workspace folder found, return an empty promise
    if (
      !vscode.workspace.workspaceFolders ||
      vscode.workspace.workspaceFolders.length === 0
    ) {
      return Promise.resolve();
    }

    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const hebrewPath = path.join(
      workspaceFolder,
      `${languagePath}${languageCode}/hebrew`
    );
    const greekPath = path.join(
      workspaceFolder,
      `${languagePath}${languageCode}/greek`
    );

    const hebrewExists = fs.existsSync(hebrewPath);
    const greekExists = fs.existsSync(greekPath);

    // If either folder does not exist, return an empty promise
    if (!hebrewExists || !greekExists) {
      return Promise.resolve();
    }

    // Both folders exist, proceed with file processing
    return new Promise((resolve) => {
      setTimeout(() => {
        // Setup Entry static variables
        Entry.rootPath = workspaceFolder;
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
