import {
  CancellationToken,
  CustomTextEditorProvider,
  Disposable,
  ExtensionContext,
  TextDocument,
  Uri,
  WebviewPanel,
  window,
  workspace,
} from "vscode";
import path from "path";
import { XMLParser } from "fast-xml-parser";

export class LexiconEditorProvider implements CustomTextEditorProvider {
  public static register(context: ExtensionContext): Disposable {
    const provider = new LexiconEditorProvider(context);
    const providerRegistration = window.registerCustomEditorProvider(
      LexiconEditorProvider.viewType,
      provider
    );
    return providerRegistration;
  }

  private static readonly viewType = "lexicon-translation.lexicon-editor";

  constructor(private readonly context: ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: TextDocument,
    webviewPanel: WebviewPanel,
    _token: CancellationToken
  ): Promise<void> {
    const fs = workspace.fs;
    const pathToHtml = Uri.file(
      path.join(
        this.context.extensionPath,
        "src",
        "editors",
        "lexicon-editor",
        "lexicon-editor.html"
      )
    );
    console.log("PATH:", pathToHtml);

    webviewPanel.webview.options = { enableScripts: true };
    webviewPanel.webview.html = "<h1>loading...</h1>";
    fs.readFile(pathToHtml).then((data) => {
      webviewPanel.webview.html = data.toString();
    });

    const updateContent = (xmlContent: string) => {
      const parser = new XMLParser();
      const content = parser.parse(xmlContent);
      return webviewPanel.webview.postMessage({
        command: "contentChanged",
        content,
      });
    };

    webviewPanel.webview.onDidReceiveMessage((message) => {
      console.log("MESSAGE:", message);
      switch (message.type) {
        case "getContent":
          updateContent(document.getText());
          break;
      }
    });

    workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== document.uri.toString()) {
        return;
      }
      updateContent(event.document.getText());
    });
  }
}
