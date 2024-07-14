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
const dataRepoUrl =
  "https://api.github.com/repos/globalbibletools/semantic-dictionary/contents/data";

export default async function createNewProject() {
  const data: any = await fetch(dataRepoUrl).then((res) => res.json());
  const availableLanguageCodes = data.map((folder: any) => folder.name);

  const projectDetails = await getProjectDetails(availableLanguageCodes);
  if (!projectDetails) {
    vscode.window.showInformationMessage("Cancelled project creation");
    return;
  }

  const { projectName, userName, sourceLanguage, targetLanguage } =
    projectDetails;

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
    await createDirectories(projectUri);
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(projectUri, "metadata.json"),
      buildMetadata({ projectName, userName, sourceLanguage, targetLanguage })
    );
  } catch (e) {
    vscode.window.showErrorMessage(`Error: ${e}`);
    return;
  }

  const sourceLanguageData: any = await fetch(
    data.find((folder: any) => folder.name === sourceLanguage.tag)?.url ?? ""
  ).then((res) => res.json());
  await populateFiles(projectUri, sourceLanguageData);

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

async function getProjectDetails(
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

async function createDirectories(projectUri: vscode.Uri) {
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

async function populateFiles(projectUri: vscode.Uri, sourceLanguageData: any) {
  const hebrewData: any = await fetch(
    sourceLanguageData.find((folder: any) => folder.name === "hebrew").url
  ).then((res) => res.json());
  const greekData: any = await fetch(
    sourceLanguageData.find((folder: any) => folder.name === "greek").url
  ).then((res) => res.json());

  try {
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(projectUri, "files", "common", "partsOfSpeech.xml"),
      new Uint8Array()
    );
    await vscode.workspace.fs.writeFile(
      vscode.Uri.joinPath(projectUri, "files", "common", "domains.xml"),
      new Uint8Array()
    );

    await createEntries(projectUri, "hebrew", hebrewData);
    await createEntries(projectUri, "greek", greekData);
  } catch (e) {
    console.log(`Error: ${e}`);
  }
}

async function createEntries(
  projectUri: vscode.Uri,
  langName: "hebrew" | "greek",
  data: any
) {
  await Promise.all(
    data
      .slice(0, 1) // <------ We slice the data so we don't exceed github's fetch rate limit
      .map((file: any) =>
        fetch(file.url)
          .then((res) => res.json())
          .then((entry: any) =>
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
      )
  );
}

function buildMetadata(details: {
  projectName: string;
  userName: string;
  sourceLanguage: { tag: string };
  targetLanguage: { tag: string };
}): Buffer {
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
