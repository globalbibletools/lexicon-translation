import * as vscode from "vscode";
import { Language, languages } from "../common/languages";
import fs from "node:fs/promises";

interface ProjectDetails {
  projectName: string;
  userName: string;
  sourceLanguage: Language;
  targetLanguage: Language;
}

interface Entry {
  name: string;
  content: Uint8Array;
}

export default async function createNewProject(
  context: vscode.ExtensionContext
) {
  const dataContents = await vscode.workspace.fs.readDirectory(
    vscode.Uri.joinPath(context.extensionUri, "data")
  );
  const availableLanguageCodes = dataContents
    .filter(([, fileType]) => fileType === vscode.FileType.Directory)
    .map(([folderName]) => folderName);

  const projectDetails = await queryProjectDetails(availableLanguageCodes);
  if (!projectDetails) {
    vscode.window.showInformationMessage("Cancelled project creation");
    return;
  }

  const sourceLanguageUri = vscode.Uri.joinPath(
    context.extensionUri,
    "data",
    projectDetails.sourceLanguage.Id
  );
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

  vscode.window.showInformationMessage("Setting up project... Please wait");
  try {
    await createProjectMetadata(projectUri, projectDetails);
    await createProjectStructure(projectUri);
    await populateProjectFiles(projectUri, sourceLanguageUri);
  } catch (e) {
    vscode.window.showErrorMessage(`Error: ${e}`);
    return;
  }

  if (!vscode.workspace.getWorkspaceFolder(projectUri)) {
    const shouldOpenProject = await vscode.window.showInformationMessage(
      "Success! Project created! Would you like to open this project?",
      "Yes",
      "No"
    );

    if (shouldOpenProject === "Yes") {
      await vscode.commands.executeCommand("vscode.openFolder", projectUri);
    }
  } else {
    await vscode.window.showInformationMessage("Success! Project created!");
  }
}

async function queryProjectDetails(
  availableLanguageCodes: string[]
): Promise<ProjectDetails | undefined> {
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

  const sourceLanguage = await vscode.window.showQuickPick(
    languages
      .filter((lang) => availableLanguageCodes.includes(lang.Id))
      .map((lang) => ({ ...lang, label: `${lang.Ref_Name} (${lang.Id})` })),
    {
      placeHolder: "[3/4] Select the source language",
      ignoreFocusOut: true,
      canPickMany: false,
    }
  );
  if (!sourceLanguage) {
    return;
  }

  const targetLanguage = await vscode.window.showQuickPick(
    languages
      .filter((lang) => lang.Id !== sourceLanguage.Id)
      .map((lang) => ({ ...lang, label: `${lang.Ref_Name} (${lang.Id})` })),
    {
      placeHolder: "[4/4] Select the target language",
      ignoreFocusOut: true,
      canPickMany: false,
    }
  );
  if (!targetLanguage) {
    return;
  }
  return { projectName, userName, sourceLanguage, targetLanguage };
}

async function createProjectMetadata(
  projectUri: vscode.Uri,
  details: ProjectDetails
) {
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
  await vscode.workspace.fs.writeFile(
    vscode.Uri.joinPath(projectUri, "metadata.json"),
    Buffer.from(JSON.stringify(metadata, null, 2))
  );
}

async function createProjectStructure(projectUri: vscode.Uri) {
  await vscode.workspace.fs.createDirectory(
    vscode.Uri.joinPath(projectUri, "files", "source")
  );
  await vscode.workspace.fs.createDirectory(
    vscode.Uri.joinPath(projectUri, "files", "target")
  );
}

async function populateProjectFiles(
  projectUri: vscode.Uri,
  langUri: vscode.Uri
) {
  await Promise.all([
    fs.cp(
      langUri.fsPath,
      vscode.Uri.joinPath(projectUri, "files", "source").fsPath,
      { recursive: true }
    ),
    fs.cp(
      langUri.fsPath,
      vscode.Uri.joinPath(projectUri, "files", "target").fsPath,
      { recursive: true }
    ),
  ]);
}
