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
const languages_1 = require("../common/languages");
const fastXmlParser = require("fast-xml-parser");
async function createNewProject(context) {
    const dataContents = await vscode.workspace.fs.readDirectory(vscode.Uri.joinPath(context.extensionUri, "data"));
    const availableLanguageCodes = dataContents
        .filter(([, fileType]) => fileType === vscode.FileType.Directory)
        .map(([folderName]) => folderName);
    const projectDetails = await queryProjectDetails(availableLanguageCodes);
    if (!projectDetails) {
        vscode.window.showInformationMessage("Cancelled project creation");
        return;
    }
    const sourceLanguageUri = vscode.Uri.joinPath(context.extensionUri, "data", projectDetails.sourceLanguage.Id);
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
    vscode.window.showInformationMessage("Setting up project...");
    try {
        await createProjectMetadata(projectUri, projectDetails);
        console.log("creating structure...");
        await createProjectStructure(projectUri);
        await populateProjectFiles(projectUri, sourceLanguageUri);
    }
    catch (e) {
        vscode.window.showErrorMessage(`Error: ${e}`);
        return;
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
async function queryProjectDetails(availableLanguageCodes) {
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
    const sourceLanguage = await vscode.window.showQuickPick(languages_1.languages
        .filter((lang) => availableLanguageCodes.includes(lang.Id))
        .map((lang) => ({ ...lang, label: `${lang.Ref_Name} (${lang.Id})` })), {
        placeHolder: "[3/4] Select the source language",
        ignoreFocusOut: true,
        canPickMany: false,
    });
    if (!sourceLanguage) {
        return;
    }
    const targetLanguage = await vscode.window.showQuickPick(languages_1.languages
        .filter((lang) => lang.Id !== sourceLanguage.Id)
        .map((lang) => ({ ...lang, label: `${lang.Ref_Name} (${lang.Id})` })), {
        placeHolder: "[4/4] Select the target language",
        ignoreFocusOut: true,
        canPickMany: false,
    });
    if (!targetLanguage) {
        return;
    }
    return { projectName, userName, sourceLanguage, targetLanguage };
}
async function createProjectMetadata(projectUri, details) {
    const metadata = {
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
        languages: [{ tag: details.targetLanguage.Id }],
        type: {
            flavorType: {
                name: "peripheral",
                flavor: {
                    name: "lexicon",
                },
            },
        },
    };
    console.log("creating metadata...");
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(projectUri, "metadata.json"), Buffer.from(JSON.stringify(metadata, null, 2)));
}
async function createProjectStructure(projectUri) {
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "source", "hebrew"));
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "source", "greek"));
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "target", "hebrew"));
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(projectUri, "files", "target", "greek"));
}
async function populateProjectFiles(projectUri, langUri) {
    console.log("populating project files...");
    const hebrewEntries = await readEntries(vscode.Uri.joinPath(langUri, "hebrew"));
    const greekEntries = await readEntries(vscode.Uri.joinPath(langUri, "greek"));
    try {
        console.log("creating entries...");
        await createEntries(projectUri, "hebrew", hebrewEntries);
        await createEntries(projectUri, "greek", greekEntries);
    }
    catch (e) {
        console.log(`Error: ${e}`);
    }
    console.log("finished populating");
}
async function readEntries(sourceDirectory) {
    const sourceDirContents = await vscode.workspace.fs.readDirectory(sourceDirectory);
    return Promise.all(sourceDirContents
        .filter(([, fileType]) => fileType === vscode.FileType.File)
        .map(([fileName]) => vscode.workspace.fs
        .readFile(vscode.Uri.joinPath(sourceDirectory, fileName))
        .then((fileData) => ({ name: fileName, content: fileData }))));
}
async function createEntries(projectUri, langName, entries) {
    async function stripTranslatableText(entry) {
        const parsedEntry = new fastXmlParser.XMLParser({
            ignoreAttributes: false,
            parseTagValue: false,
            parseAttributeValue: false,
        }).parse(entry);
        console.log(JSON.stringify(parsedEntry, null, 2));
        parsedEntry["Lexicon_Entry"]["Notes"] = "";
        let baseForms = parsedEntry["Lexicon_Entry"]["BaseForms"]["BaseForm"];
        if (!Array.isArray(baseForms)) {
            baseForms = [baseForms];
        }
        for (const baseForm of baseForms) {
            baseForm["PartsOfSpeech"]["PartOfSpeech"] = "";
            let lexMeanings = baseForm["LEXMeanings"]["LEXMeaning"];
            if (!Array.isArray(lexMeanings)) {
                lexMeanings = [lexMeanings];
            }
            for (const lexMeaning of lexMeanings) {
                if (langName === "hebrew") {
                    let lexDomains = lexMeaning["LEXDomains"]["LEXDomain"];
                    if (!Array.isArray(lexDomains)) {
                        lexDomains = [lexDomains];
                    }
                    for (const lexDomain of lexDomains) {
                        lexDomain["#text"] = "";
                    }
                    let lexCoreDomains = lexMeaning["LEXCoreDomains"]["LEXCoreDomain"];
                    if (!Array.isArray(lexCoreDomains)) {
                        lexCoreDomains = [lexCoreDomains];
                    }
                    for (const lexCoreDomain of lexCoreDomains) {
                        lexCoreDomain["#text"] = "";
                    }
                }
                else if (langName === "greek") {
                    if (!Array.isArray(lexMeaning["LEXDomains"]["LEXDomain"])) {
                        lexMeaning["LEXDomains"]["LEXDomain"] = "";
                    }
                    else {
                        lexMeaning["LEXDomains"]["LEXDomain"].fill("");
                    }
                    if (!Array.isArray(lexMeaning["LEXSubDomains"]["LEXSubDomain"])) {
                        lexMeaning["LEXSubDomains"]["LEXSubDomain"] = "";
                    }
                    else {
                        lexMeaning["LEXSubDomains"]["LEXSubDomain"].fill("");
                    }
                }
                let lexSenses = lexMeaning["LEXSenses"]["LEXSense"];
                if (!Array.isArray(lexSenses)) {
                    lexSenses = [lexSenses];
                }
                for (const lexSense of lexSenses) {
                    lexSense["DefinitionShort"] = "";
                    if (!Array.isArray(lexSense["Glosses"]["Gloss"])) {
                        lexSense["Glosses"]["Gloss"] = "";
                    }
                    else {
                        lexSense["Glosses"]["Gloss"].fill("");
                    }
                }
            }
        }
        return Buffer.from(new fastXmlParser.XMLBuilder({
            format: true,
            ignoreAttributes: false,
            suppressEmptyNode: true,
        }).build(parsedEntry));
    }
    console.log(entries.length);
    await Promise.all(entries.map(async (entry) => await Promise.all([
        vscode.workspace.fs.writeFile(vscode.Uri.joinPath(projectUri, "files", "source", langName, entry.name), entry.content),
        vscode.workspace.fs.writeFile(vscode.Uri.joinPath(projectUri, "files", "target", langName, entry.name), await stripTranslatableText(entry.content.toString())),
    ])));
}
//# sourceMappingURL=createNewProject.js.map