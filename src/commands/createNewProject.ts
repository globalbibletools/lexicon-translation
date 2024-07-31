import * as vscode from "vscode";
import { Language, languages } from "../common/languages";
import fastXmlParser from "fast-xml-parser";

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
  projectUri: vscode.Uri,
  langUri: vscode.Uri
) {
  const hebrewEntries: Entry[] = await readEntries(
    vscode.Uri.joinPath(langUri, "hebrew")
  );
  const greekEntries: Entry[] = await readEntries(
    vscode.Uri.joinPath(langUri, "greek")
  );
  try {
    await createEntries(projectUri, "hebrew", hebrewEntries);
    await createEntries(projectUri, "greek", greekEntries);
  } catch (e) {
    console.log(`Error: ${e}`);
  }
}

async function readEntries(sourceDirectory: vscode.Uri): Promise<Entry[]> {
  const sourceDirContents = await vscode.workspace.fs.readDirectory(
    sourceDirectory
  );
  return Promise.all(
    sourceDirContents
      .filter(([, fileType]) => fileType === vscode.FileType.File)
      .map(([fileName]) =>
        vscode.workspace.fs
          .readFile(vscode.Uri.joinPath(sourceDirectory, fileName))
          .then((fileData) => ({ name: fileName, content: fileData }))
      )
  );
}

async function createEntries(
  projectUri: vscode.Uri,
  langName: "hebrew" | "greek",
  entries: Entry[]
) {
  for (const entry of entries) {
    await Promise.all([
      vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(
          projectUri,
          "files",
          "source",
          langName,
          entry.name
        ),
        entry.content
      ),
      stripTranslatableTextFromEntry(entry, langName).then(
        (targetEntryContent) =>
          vscode.workspace.fs.writeFile(
            vscode.Uri.joinPath(
              projectUri,
              "files",
              "target",
              langName,
              entry.name
            ),
            targetEntryContent
          )
      ),
    ]);
  }
}

const xmlParser = new fastXmlParser.XMLParser({
  alwaysCreateTextNode: true,
  ignoreAttributes: false,
  parseTagValue: false,
  parseAttributeValue: false,
});
const xmlBuilder = new fastXmlParser.XMLBuilder({
  ignoreAttributes: false,
  format: true,
  suppressEmptyNode: true,
});

async function stripTranslatableTextFromEntry(
  entry: Entry,
  langName: "hebrew" | "greek"
): Promise<Buffer> {
  const parsedEntry = xmlParser.parse(entry.content.toString());
  const lexiconEntry = parsedEntry["Lexicon_Entry"];

  stripText(lexiconEntry["Notes"]);
  for (const baseForm of contentToArray(
    lexiconEntry["BaseForms"]["BaseForm"]
  )) {
    stripText(baseForm["PartsOfSpeech"]?.["PartOfSpeech"]);
    for (const lexMeaning of contentToArray(
      baseForm["LEXMeanings"]["LEXMeaning"]
    )) {
      stripText(lexMeaning["LEXDomains"]?.["LEXDomain"]);
      if (langName === "hebrew") {
        stripText(lexMeaning["LEXCoreDomains"]?.["LEXCoreDomain"]);
      } else if (langName === "greek") {
        stripText(lexMeaning["LEXSubDomains"]?.["LEXSubDomain"]);
      }
      for (const lexSense of contentToArray(
        lexMeaning["LEXSenses"]["LEXSense"]
      )) {
        stripText(lexSense["DefinitionShort"]);
        stripText(lexSense["Glosses"]["Gloss"]);
      }
    }
  }
  return Buffer.from(xmlBuilder.build(parsedEntry));
}

function stripText(content: any) {
  for (const value of contentToArray(content)) {
    value["#text"] = "";
  }
}

function contentToArray(content: any) {
  if (!content) {
    return [];
  } else if (!Array.isArray(content)) {
    return [content];
  } else {
    return content;
  }
}
