"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
async function activate(context) {
    vscode.commands.registerCommand("gbt-project-management.createNewProject", createNewProject);
}
const sampleLanguages = [
    { tag: "eng", label: "English (eng)" },
    { tag: "spa", label: "Spanish (spa)" },
];
const dataRepoUrl = "https://api.github.com/repos/globalbibletools/semantic-dictionary/contents/data";
async function createNewProject() {
    const dataRequest = await fetch(dataRepoUrl);
    const data = await dataRequest.json();
    // const data = sampleLanguages.map(({ tag }) => ({ name: tag, url: "" }));
    const availableLanguageCodes = data.map((folder) => folder.name);
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
    const sourceLanguage = await vscode.window.showQuickPick(sampleLanguages.filter((lang) => availableLanguageCodes.includes(lang.tag)), {
        placeHolder: "[3/4] Select the source language",
        ignoreFocusOut: true,
        canPickMany: false,
    });
    if (!sourceLanguage) {
        vscode.window.showInformationMessage("Cancelled project creation");
        return;
    }
    const targetLanguage = await vscode.window.showQuickPick(sampleLanguages.filter((lang) => lang.tag !== sourceLanguage.tag), {
        placeHolder: "[4/4] Select the target language",
        ignoreFocusOut: true,
        canPickMany: false,
    });
    if (!targetLanguage) {
        vscode.window.showInformationMessage("Cancelled project creation");
        return;
    }
    const projectUri = (await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: "Choose Project Folder",
    }))?.[0];
    if (!projectUri) {
        vscode.window.showInformationMessage("Cancelled project creation");
        return;
    }
    const directoryEntries = await vscode.workspace.fs.readDirectory(projectUri);
    if (directoryEntries.length > 0) {
        const answer = await vscode.window.showWarningMessage("This folder is not empty. Some files may be overwritten or deleted. Are you sure you want to hold the project here?", "Yes", "Cancel");
        if (answer !== "Yes") {
            vscode.window.showInformationMessage("Cancelled project creation");
            return;
        }
    }
    try {
        await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(projectUri, "metadata.json"), new Uint8Array());
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "source", "hebrew"));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "source", "greek"));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "target", "hebrew"));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "target", "greek"));
    }
    catch (e) {
        vscode.window.showErrorMessage(`Error: ${e}`);
        return;
    }
    const dummyContent = "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxv\nbmU9InllcyI/Pgo8TGV4aWNvbl9FbnRyeSBJZD0iMDAwMDAxMDAwMDAwMDAw\nIiBMZW1tYT0izrEiIFZlcnNpb249IjAiIEhhc0FyYW1haWM9ImZhbHNlIiBJ\nbkxYWD0iZmFsc2UiIEFscGhhUG9zPSLOsSI+CiAgPFN0cm9uZ0NvZGVzLz4K\nICA8QXV0aG9ycy8+CiAgPEFsdGVybmF0ZUxlbW1hcy8+CiAgPE1haW5MaW5r\ncy8+CiAgPE5vdGVzLz4KICA8Q29udHJpYnV0b3JOb3RlLz4KICA8QmFzZUZv\ncm1zPgogICAgPEJhc2VGb3JtIElkPSIwMDAwMDEwMDEwMDAwMDAiPgogICAg\nICA8UGFydHNPZlNwZWVjaD4KICAgICAgICA8UGFydE9mU3BlZWNoPm5vdW4t\nbmFtZSwgbi48L1BhcnRPZlNwZWVjaD4KICAgICAgPC9QYXJ0c09mU3BlZWNo\nPgogICAgICA8SW5mbGVjdGlvbnM+CiAgICAgICAgPEluZmxlY3Rpb24gTGVt\nbWE9Is6xIiBCYXNlRm9ybUluZGV4PSIxIj4KICAgICAgICAgIDxGb3JtLz4K\nICAgICAgICAgIDxSZWFsaXphdGlvbnMvPgogICAgICAgICAgPENvbW1lbnRz\nPgogICAgICAgICAgICA8Q29tbWVudCBMYW5ndWFnZUNvZGU9ImVuIj4KICAg\nICAgICAgICAgICA8TWVhbmluZz5pbmRlY2xpbmFibGU8L01lYW5pbmc+CiAg\nICAgICAgICAgIDwvQ29tbWVudD4KICAgICAgICAgICAgPENvbW1lbnQgTGFu\nZ3VhZ2VDb2RlPSJ6aFQiPgogICAgICAgICAgICAgIDxNZWFuaW5nPueEoeiq\nnuWwvuiuiuWMljwvTWVhbmluZz4KICAgICAgICAgICAgPC9Db21tZW50Pgog\nICAgICAgICAgPC9Db21tZW50cz4KICAgICAgICA8L0luZmxlY3Rpb24+CiAg\nICAgIDwvSW5mbGVjdGlvbnM+CiAgICAgIDxCYXNlRm9ybUxpbmtzLz4KICAg\nICAgPExFWE1lYW5pbmdzPgogICAgICAgIDxMRVhNZWFuaW5nIElkPSIwMDAw\nMDEwMDEwMDEwMDAiIElzQmlibGljYWxUZXJtPSJZIiBFbnRyeUNvZGU9IjYw\nLjQ2IiBJbmRlbnQ9IjAiPgogICAgICAgICAgPExFWERvbWFpbnM+CiAgICAg\nICAgICAgIDxMRVhEb21haW4+TnVtYmVyPC9MRVhEb21haW4+CiAgICAgICAg\nICA8L0xFWERvbWFpbnM+CiAgICAgICAgICA8TEVYU3ViRG9tYWlucz4KICAg\nICAgICAgICAgPExFWFN1YkRvbWFpbj5GaXJzdCwgU2Vjb25kLCBUaGlyZCwg\nRXRjLiBbT3JkaW5hbHNdPC9MRVhTdWJEb21haW4+CiAgICAgICAgICA8L0xF\nWFN1YkRvbWFpbnM+CiAgICAgICAgICA8TEVYU2Vuc2VzPgogICAgICAgICAg\nICA8TEVYU2Vuc2UgTGFuZ3VhZ2VDb2RlPSJlbiIgTGFzdEVkaXRlZD0iMjAy\nMS0wNS0yNCAxMzowNjowOSIgTGFzdEVkaXRlZEJ5PSIiPgogICAgICAgICAg\nICAgIDxEZWZpbml0aW9uTG9uZy8+CiAgICAgICAgICAgICAgPERlZmluaXRp\nb25TaG9ydD5maXJzdCBpbiBhIHNlcmllcyBpbnZvbHZpbmcgdGltZSwgc3Bh\nY2UsIG9yIHNldDwvRGVmaW5pdGlvblNob3J0PgogICAgICAgICAgICAgIDxH\nbG9zc2VzPgogICAgICAgICAgICAgICAgPEdsb3NzPmZpcnN0PC9HbG9zcz4K\nICAgICAgICAgICAgICA8L0dsb3NzZXM+CiAgICAgICAgICAgICAgPENvbW1l\nbnRzPk9jY3VycmluZyBvbmx5IGluIHRpdGxlcyBvZiBOVCB3cml0aW5nczog\nz4DPgeG9uM+CIM6azr/Pgc65zr3OuOG9t86/z4XPgiDOsSDigJhGaXJzdCBM\nZXR0ZXIgdG8gdGhlIENvcmludGhpYW5z4oCZOyDhvLjPieG9sc69zr3Ov8+F\nIM6xIOKAmEZpcnN0IEVwaXN0bGUgb2YgSm9obi7igJk8L0NvbW1lbnRzPgog\nICAgICAgICAgICA8L0xFWFNlbnNlPgogICAgICAgICAgPC9MRVhTZW5zZXM+\nCiAgICAgICAgICA8TEVYUmVmZXJlbmNlcz4KICAgICAgICAgICAgPExFWFJl\nZmVyZW5jZT4wNDYwMDEwMDAwMDAwMDwvTEVYUmVmZXJlbmNlPgogICAgICAg\nICAgICA8TEVYUmVmZXJlbmNlPjA1MjAwMTAwMDAwMDAwPC9MRVhSZWZlcmVu\nY2U+CiAgICAgICAgICAgIDxMRVhSZWZlcmVuY2U+MDU0MDAxMDAwMDAwMDA8\nL0xFWFJlZmVyZW5jZT4KICAgICAgICAgICAgPExFWFJlZmVyZW5jZT4wNjAw\nMDEwMDAwMDAwMDwvTEVYUmVmZXJlbmNlPgogICAgICAgICAgICA8TEVYUmVm\nZXJlbmNlPjA2MjAwMTAwMDAwMDAwPC9MRVhSZWZlcmVuY2U+CiAgICAgICAg\nICA8L0xFWFJlZmVyZW5jZXM+CiAgICAgICAgICA8TEVYVmlkZW9zLz4KICAg\nICAgICA8L0xFWE1lYW5pbmc+CiAgICAgIDwvTEVYTWVhbmluZ3M+CiAgICA8\nL0Jhc2VGb3JtPgogIDwvQmFzZUZvcm1zPgo8L0xleGljb25fRW50cnk+\n";
    const sourceLanguageData = (await (await fetch(data.find((folder) => folder.name === sourceLanguage.tag)?.url ?? "")).json());
    const hebrewData = (await (await fetch(sourceLanguageData.find((folder) => folder.name === "hebrew").url)).json());
    const greekData = (await (await fetch(sourceLanguageData.find((folder) => folder.name === "greek").url)).json());
    console.log(hebrewData[0].url);
    const hebrewEntries = await Promise.all(hebrewData
        .slice(0, 1)
        .map((file) => fetch(file.url).then((response) => response.json())));
    console.log(hebrewEntries);
    // vscode.window.showInformationMessage("Fetching greek entries...");
    const greekEntries = await Promise.all(greekData
        .slice(0, 1)
        .map((file) => fetch(file.url).then((response) => response.json())));
    try {
        const sourceHebrewUri = vscode.Uri.joinPath(projectUri, "files", "source", "hebrew");
        const targetHebrewUri = vscode.Uri.joinPath(projectUri, "files", "target", "hebrew");
        vscode.workspace.fs.writeFile(vscode.Uri.joinPath(sourceHebrewUri, hebrewEntries[0].name), Buffer.from(hebrewEntries[0].content, "base64"));
        await Promise.all(hebrewEntries.flatMap((entry) => [
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(sourceHebrewUri, entry.name), Buffer.from(entry.content, "base64")),
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(targetHebrewUri, entry.name), new Uint8Array()),
        ]));
        const sourceGreekUri = vscode.Uri.joinPath(projectUri, "files", "source", "greek");
        const targetGreekUri = vscode.Uri.joinPath(projectUri, "files", "target", "greek");
        vscode.workspace.fs.writeFile(vscode.Uri.joinPath(sourceGreekUri, greekEntries[0].name), Buffer.from(greekEntries[0].content, "base64"));
        await Promise.all(greekEntries.flatMap((entry) => [
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(sourceGreekUri, entry.name), Buffer.from(entry.content, "base64")),
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(targetGreekUri, entry.name), new Uint8Array()),
        ]));
    }
    catch (e) {
        console.log(`Error: ${e}`);
    }
    if (!vscode.workspace.getWorkspaceFolder(projectUri)) {
        const shouldOpenProject = await vscode.window.showInformationMessage("Success! Project created! Would you like to open this project?", "Yes", "No");
        if (shouldOpenProject === "Yes") {
            await vscode.commands.executeCommand("vscode.openFolder", projectUri);
        }
    }
    else {
        await vscode.window.showInformationMessage("Success! Project created!");
    }
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map