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
exports.default = createNewProject;
const vscode = __importStar(require("vscode"));
const sampleLanguages = [
    { tag: "eng", label: "English (eng)" },
    { tag: "spa", label: "Spanish (spa)" },
];
const dataRepoUrl = "https://api.github.com/repos/globalbibletools/semantic-dictionary/contents/data";
async function createNewProject() {
    const data = await fetch(dataRepoUrl).then((res) => res.json());
    const availableLanguageCodes = data.map((folder) => folder.name);
    const projectDetails = await getProjectDetails(availableLanguageCodes);
    if (!projectDetails) {
        vscode.window.showInformationMessage("Cancelled project creation");
        return;
    }
    const { projectName, userName, sourceLanguage, targetLanguage } = projectDetails;
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
        await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(projectUri, "metadata.json"), buildMetadata({ projectName, userName, sourceLanguage, targetLanguage }));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "source", "hebrew"));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "source", "greek"));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "target", "hebrew"));
        await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "target", "greek"));
    }
    catch (e) {
        vscode.window.showErrorMessage(`Error: ${e}`);
        return;
    }
    const sourceLanguageData = await fetch(data.find((folder) => folder.name === sourceLanguage.tag)?.url ?? "").then((res) => res.json());
    await populateFiles(projectUri, sourceLanguageData);
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
async function getProjectDetails(availableLanguageCodes) {
    const projectName = await vscode.window.showInputBox({
        prompt: "[1/4] Enter the project name",
        ignoreFocusOut: true,
    });
    if (!projectName) {
        return;
    }
    const userName = await vscode.window.showInputBox({
        prompt: "[2/4] Enter your username",
        ignoreFocusOut: true,
    });
    if (!userName) {
        return;
    }
    const sourceLanguage = await vscode.window.showQuickPick(sampleLanguages.filter((lang) => availableLanguageCodes.includes(lang.tag)), {
        placeHolder: "[3/4] Select the source language",
        ignoreFocusOut: true,
        canPickMany: false,
    });
    if (!sourceLanguage) {
        return;
    }
    const targetLanguage = await vscode.window.showQuickPick(sampleLanguages.filter((lang) => lang.tag !== sourceLanguage.tag), {
        placeHolder: "[4/4] Select the target language",
        ignoreFocusOut: true,
        canPickMany: false,
    });
    if (!targetLanguage) {
        return;
    }
    return { projectName, userName, sourceLanguage, targetLanguage };
}
async function populateFiles(projectUri, sourceLanguageData) {
    const hebrewData = await fetch(sourceLanguageData.find((folder) => folder.name === "hebrew").url).then((res) => res.json());
    const greekData = await fetch(sourceLanguageData.find((folder) => folder.name === "greek").url).then((res) => res.json());
    const hebrewEntries = await Promise.all(hebrewData
        .slice(0, 1)
        .map((file) => fetch(file.url).then((res) => res.json())));
    const greekEntries = await Promise.all(greekData
        .slice(0, 1)
        .map((file) => fetch(file.url).then((res) => res.json())));
    try {
        await Promise.all(hebrewEntries.flatMap((entry) => [
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.Uri.joinPath(projectUri, "files", "source", "hebrew"), entry.name), Buffer.from(entry.content, "base64")),
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.Uri.joinPath(projectUri, "files", "target", "hebrew"), entry.name), new Uint8Array()),
        ]));
        await Promise.all(greekEntries.flatMap((entry) => [
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.Uri.joinPath(projectUri, "files", "source", "greek"), entry.name), Buffer.from(entry.content, "base64")),
            vscode.workspace.fs.writeFile(vscode.Uri.joinPath(vscode.Uri.joinPath(projectUri, "files", "target", "greek"), entry.name), new Uint8Array()),
        ]));
    }
    catch (e) {
        console.log(`Error: ${e}`);
    }
}
function buildMetadata(details) {
    return Buffer.from(JSON.stringify({
        format: "scripture burrito",
        projectName: details.projectName,
        meta: {
            dateCreated: new Date().toISOString(),
            generator: {
                userName: details.userName,
            },
            defaultLocale: "en",
            normalization: "NFC",
        },
        identification: { name: { en: details.projectName } },
        languages: [{ tag: details.targetLanguage.tag }],
        type: {
            flavorType: {
                name: "peripheral",
                flavor: {
                    name: "lexicon",
                },
            },
        },
    }, null, 2));
}
//# sourceMappingURL=createNewProject.js.map