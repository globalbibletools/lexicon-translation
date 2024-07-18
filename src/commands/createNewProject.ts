import * as vscode from "vscode";

interface Language {
  tag: string;
  label: string;
}
interface ProjectDetails {
  projectName: string;
  userName: string;
  sourceLanguage: Language;
  targetLanguage: Language;
}

const sampleLanguages: Language[] = [
  { tag: "eng", label: "English (eng)" },
  { tag: "spa", label: "Spanish (spa)" },
];

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
    projectDetails.sourceLanguage.tag
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

  try {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(projectUri, "metadata.json"),
      buildMetadata(projectDetails)
    );
    await createProjectStructure(projectUri);
    await populateProjectFiles(sourceLanguageUri, projectUri);
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
    sampleLanguages.filter((lang) => availableLanguageCodes.includes(lang.tag)),
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
    sampleLanguages.filter((lang) => lang.tag !== sourceLanguage.tag),
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

async function createProjectStructure(projectUri: vscode.Uri) {
  await vscode.workspace.fs.createDirectory(
    vscode.Uri.joinPath(projectUri, "files", "common")
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
}

async function populateProjectFiles(
  langUri: vscode.Uri,
  projectUri: vscode.Uri
) {
  const hebrewEntries: any = await readEntries(
    vscode.Uri.joinPath(langUri, "hebrew")
  );
  const greekEntries: any = await readEntries(
    vscode.Uri.joinPath(langUri, "greek")
  );
  // const allEntries = [...hebrewEntries, ...greekEntries];

  try {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(projectUri, "files", "common", "partsOfSpeech.xml"),
      await extractPartsOfSpeechData([...hebrewEntries, ...greekEntries])
    );
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(projectUri, "files", "common", "domains.xml"),
      await extractDomainsData([...hebrewEntries, ...greekEntries])
    );

    await createEntries(projectUri, "hebrew", hebrewEntries);
    await createEntries(projectUri, "greek", greekEntries);
  } catch (e) {
    console.log(`Error: ${e}`);
  }
}

async function readEntries(sourceDirectory: vscode.Uri): Promise<Uint8Array[]> {
  const sourceDirContents = await vscode.workspace.fs.readDirectory(
    sourceDirectory
  );

  return Promise.all(
    sourceDirContents
      .filter(([, fileType]) => fileType === vscode.FileType.File)
      .map(([fileName]) =>
        vscode.workspace.fs.readFile(
          vscode.Uri.joinPath(sourceDirectory, fileName)
        )
      )
  );
}

async function extractPartsOfSpeechData(entries: any): Promise<Buffer> {
  entries.map((entry: any) => entry.content);
  return Buffer.from([]);
}
async function extractDomainsData(entries: any): Promise<Buffer> {
  entries.map((entry: any) => entry.content);
  return Buffer.from([]);
}

async function createEntries(
  projectUri: vscode.Uri,
  langName: "hebrew" | "greek",
  entries: any
) {
  await Promise.all(
    entries.map((entry: any) =>
      Promise.all([
        vscode.workspace.fs.writeFile(
          vscode.Uri.joinPath(
            projectUri,
            "files",
            "source",
            langName,
            entry.name
          ),
          Buffer.from(entry.content, "base64")
        ),
        vscode.workspace.fs.writeFile(
          vscode.Uri.joinPath(
            projectUri,
            "files",
            "target",
            langName,
            entry.name
          ),
          new Uint8Array()
        ),
      ])
    )
  );
}

function buildMetadata(details: ProjectDetails): Buffer {
  return Buffer.from(
    JSON.stringify(
      {
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
      },
      null,
      2
    )
  );
}
