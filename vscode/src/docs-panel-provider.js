const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { getNonce } = require('./utils');

class DocsPanelProvider {
  static get viewType() {
    return 'osmium.documentation';
  }

  constructor(_extensionUri) {
    this._extensionUri = _extensionUri;
    this.panel = undefined;
  }

  async resolveWebview(context) {
    if (this.panel) {
      this.panel.reveal();
    } else {
      this.panel = vscode.window.createWebviewPanel(
        DocsPanelProvider.viewType,
        'Osmium Documentation',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [this._extensionUri],
        },
      );
      this.panel.webview.html = this._getHtmlForWebview(this.panel.webview);

      this.panel.onDidDispose(
        () => {
          this.panel = undefined;
        },
        null,
        context.subscriptions,
      );
    }
  }

  _getHtmlForWebview(webview) {
    const scriptPath = path.join(this._extensionUri.fsPath, 'dist', 'index-docs-panel.js');
    const hasAssets = fs.existsSync(scriptPath);

    if (!hasAssets) {
      return `<!doctype html>
        <html lang="en">
          <head><meta charset="UTF-8"><title>Osmium Documentation</title></head>
          <body style="font-family: var(--vscode-font-family); padding: 1rem;">
            <h2>Osmium Documentation</h2>
            <p>To see the full docs panel, from the repo root run:</p>
            <p><code>pnpm run build:frontends</code></p>
            <p>Then rebuild the extension (<code>cd vscode && pnpm run build</code>) and reload.</p>
          </body>
        </html>`;
    }

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'index-docs-panel.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'index-docs-panel.css'),
    );
    const nonce = getNonce();

    return `<!doctype html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Panel</title>
            <script type="module" nonce="${nonce}" crossorigin src="${scriptUri}"></script>
            <link rel="stylesheet" crossorigin href="${styleUri}">
          </head>
          <body>
            <div id="root"></div>
          </body>
        </html>`;
  }
}

module.exports = {
  DocsPanelProvider,
};
