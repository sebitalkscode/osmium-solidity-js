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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvPanelProvider = void 0;
const vscode = __importStar(require("vscode"));
const utils_1 = require("./utils");
const enums_1 = require("./enums");
const path_1 = __importDefault(require("path"));
class EnvPanelProvider {
    constructor(_extensionUri, _interactContractRepository, _walletRepository, _environmentRepository) {
        this._extensionUri = _extensionUri;
        this._interactContractRepository = _interactContractRepository;
        this._walletRepository = _walletRepository;
        this._environmentRepository = _environmentRepository;
        this.panel = undefined;
        this._osmiumWatcher = vscode.workspace.createFileSystemWatcher('**/.osmium/*.json');
        this._osmiumWatcher.onDidChange((uri) => this._osmiumWatcherCallback(uri));
    }
    async _osmiumWatcherCallback(uri) {
        if (!this.panel) {
            return;
        }
        const basename = path_1.default.basename(uri.fsPath, '.json');
        if (basename === 'contracts') {
            this._interactContractRepository?.load();
            await this.panel.webview.postMessage({
                type: enums_1.MessageType.INTERACT_CONTRACTS,
                contracts: this._interactContractRepository?.getContracts(),
            });
        }
        if (basename === 'wallets') {
            this._walletRepository?.load();
            await this.panel.webview.postMessage({
                type: enums_1.MessageType.WALLETS,
                wallets: this._walletRepository?.getWallets(),
            });
        }
        if (basename === 'environments') {
            this._environmentRepository?.load();
            await this.panel.webview.postMessage({
                type: enums_1.MessageType.ENVIRONMENTS,
                environments: this._environmentRepository?.getEnvironments(),
            });
        }
    }
    async _onMessageCallback(message) {
        if (!this.panel) {
            return;
        }
        switch (message.type) {
            case enums_1.MessageType.GET_WALLETS:
                await this.panel.webview.postMessage({
                    type: enums_1.MessageType.WALLETS,
                    wallets: this._walletRepository.getWallets(),
                });
                break;
            case enums_1.MessageType.GET_INTERACT_CONTRACTS:
                await this.panel.webview.postMessage({
                    type: enums_1.MessageType.INTERACT_CONTRACTS,
                    contracts: this._interactContractRepository.getContracts(),
                });
                break;
            case enums_1.MessageType.GET_ENVIRONMENTS:
                await this.panel.webview.postMessage({
                    type: enums_1.MessageType.ENVIRONMENTS,
                    environments: this._environmentRepository.getEnvironments(),
                });
                break;
            case enums_1.MessageType.DELETE_WALLET:
                this._walletRepository.deleteWallet(message.data.id);
                break;
            case enums_1.MessageType.EDIT_WALLET:
                this._walletRepository.updateWallet(message.data.id, message.data.key, message.data.value);
                break;
            case enums_1.MessageType.ADD_WALLET:
                this._walletRepository.createWallet(message.data.name, message.data.privateKey);
                break;
            case enums_1.MessageType.DELETE_ENVIRONMENT:
                this._environmentRepository.deleteEnvironment(message.data.id);
                break;
            case enums_1.MessageType.EDIT_ENVIRONMENT:
                this._environmentRepository.updateEnvironment(message.data.id, message.data.key, message.data.value);
                break;
            case enums_1.MessageType.ADD_ENVIRONMENT:
                this._environmentRepository.createEnvironment(message.data.name, message.data.rpc);
                break;
            case enums_1.MessageType.DELETE_CONTRACT:
                this._interactContractRepository.deleteContract(message.data.id);
                break;
            case enums_1.MessageType.EDIT_CONTRACT:
                this._interactContractRepository.updateContract(message.data.id, message.data.key, message.data.value);
                break;
            case enums_1.MessageType.ADD_CONTRACT:
                this._interactContractRepository.createContract(message.data.address, JSON.parse(message.data.abi), message.data.chainId, message.data.name, message.data.rpc);
                break;
        }
    }
    async resolveWebview(context) {
        if (this.panel) {
            this.panel.reveal();
        }
        else {
            this.panel = vscode.window.createWebviewPanel(EnvPanelProvider.viewType, 'Environment Panel', vscode.ViewColumn.One, {
                enableScripts: true,
                localResourceRoots: [this._extensionUri],
            });
            this.panel.webview.html = this._getHtmlForWebview(this.panel.webview);
            this.panel.webview.onDidReceiveMessage((e) => {
                this._onMessageCallback(e);
            });
            this.panel.onDidDispose(() => {
                this.panel = undefined;
            }, null, context.subscriptions);
        }
    }
    _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'index-env-panel.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'index-env-panel.css'));
        const nonce = (0, utils_1.getNonce)();
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
exports.EnvPanelProvider = EnvPanelProvider;
EnvPanelProvider.viewType = 'osmium.env-panel';
