import * as vscode from "vscode";
const fastXmlParser = require("fast-xml-parser");

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
    await createProjectMetadata(projectUri, projectDetails);
    console.log("creating structure...");
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
    languages: [{ tag: details.targetLanguage.tag }],
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
  console.log("populating project files...");
  const hebrewEntries: any = await readEntries(
    vscode.Uri.joinPath(langUri, "hebrew")
  );
  const greekEntries: any = await readEntries(
    vscode.Uri.joinPath(langUri, "greek")
  );

  try {
    console.log("creating entries...");
    await createEntries(projectUri, "hebrew", hebrewEntries);
    await createEntries(projectUri, "greek", greekEntries);
  } catch (e) {
    console.log(`Error: ${e}`);
  }
  console.log("finished populating");
}

async function readEntries(sourceDirectory: vscode.Uri): Promise<any[]> {
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
  entries: any
) {
  async function stripTranslatableText(entry: string): Promise<Buffer> {
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
        } else if (langName === "greek") {
          if (!Array.isArray(lexMeaning["LEXDomains"]["LEXDomain"])) {
            lexMeaning["LEXDomains"]["LEXDomain"] = "";
          } else {
            lexMeaning["LEXDomains"]["LEXDomain"].fill("");
          }

          if (!Array.isArray(lexMeaning["LEXSubDomains"]["LEXSubDomain"])) {
            lexMeaning["LEXSubDomains"]["LEXSubDomain"] = "";
          } else {
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
          } else {
            lexSense["Glosses"]["Gloss"].fill("");
          }
        }
      }
    }
    return Buffer.from(
      new fastXmlParser.XMLBuilder({
        format: true,
        ignoreAttributes: false,
        suppressEmptyNode: true,
      }).build(parsedEntry)
    );
  }
  await Promise.all(
    entries
      .slice(0, 1)
      .map(
        async (entry: any) =>
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
            vscode.workspace.fs.writeFile(
              vscode.Uri.joinPath(
                projectUri,
                "files",
                "target",
                langName,
                entry.name
              ),
              await stripTranslatableText(entry.content.toString())
            ),
          ])
      )
  );
}
