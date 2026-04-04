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
exports.SidebarProvider = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const Deploy_1 = require("./actions/Deploy");
const DeployContractRepository_1 = require("./actions/DeployContractRepository");
const Interact_1 = require("./actions/Interact");
const ScriptRepository_1 = require("./actions/ScriptRepository");
const config_1 = require("./config");
const enums_1 = require("./enums");
const utils_1 = require("./utils");
class SidebarProvider {
    constructor(_extensionUri, _interactContractRepository, _walletRepository, _environmentRepository, _envPanelProvider) {
        this._extensionUri = _extensionUri;
        this._interactContractRepository = _interactContractRepository;
        this._walletRepository = _walletRepository;
        this._environmentRepository = _environmentRepository;
        this._envPanelProvider = _envPanelProvider;
        this._outputChannel = vscode.window.createOutputChannel('Osmium Solidity Logs');
    }
    async _osmiumWatcherCallback(uri) {
        if (!this._view) {
            return;
        }
        const basename = path.basename(uri.fsPath, '.json');
        if (basename === 'contracts') {
            this._interactContractRepository?.load();
            await this._view.webview.postMessage({
                type: enums_1.MessageType.INTERACT_CONTRACTS,
                contracts: this._interactContractRepository?.getContracts(),
            });
        }
        if (basename === 'wallets') {
            this._walletRepository?.load();
            await this._view.webview.postMessage({
                type: enums_1.MessageType.WALLETS,
                wallets: this._walletRepository?.getWallets(),
            });
        }
        if (basename === 'environments') {
            this._environmentRepository?.load();
            await this._view.webview.postMessage({
                type: enums_1.MessageType.ENVIRONMENTS,
                environments: this._environmentRepository?.getEnvironments(),
            });
        }
    }
    async _outWatcherCallback() {
        if (!this._view) {
            return;
        }
        this._deployContractRepository?.load();
        await this._view.webview.postMessage({
            type: enums_1.MessageType.DEPLOY_CONTRACTS,
            contracts: this._deployContractRepository?.getContracts(),
        });
    }
    _init() {
        if (vscode.workspace.workspaceFolders?.length) {
            const fsPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            this._deployContractRepository = new DeployContractRepository_1.DeployContractRepository(fsPath);
            this._scriptRepository = new ScriptRepository_1.ScriptRepository(fsPath);
            this._interact = new Interact_1.Interact(this._interactContractRepository, this._walletRepository);
            this._deploy = new Deploy_1.Deploy(this._deployContractRepository, this._walletRepository, this._scriptRepository, this._environmentRepository, fsPath);
            this._osmiumWatcher = vscode.workspace.createFileSystemWatcher('**/.osmium/*.json');
            this._osmiumWatcher.onDidChange((uri) => this._osmiumWatcherCallback(uri));
            this._outWatcher = vscode.workspace.createFileSystemWatcher(`**/${(0, utils_1.getTomlValue)(path.join(fsPath, 'foundry.toml'), 'out') ?? 'out'}/*.json`);
            this._outWatcher.onDidChange(() => this._outWatcherCallback());
        }
    }
    async _onMessageCallback(message) {
        if (!this._view ||
            !this._interactContractRepository ||
            !this._deployContractRepository ||
            !this._walletRepository ||
            !this._environmentRepository ||
            !this._scriptRepository ||
            !this._interact ||
            !this._deploy) {
            return;
        }
        switch (message.type) {
            case enums_1.MessageType.GET_WALLETS:
                await this._view.webview.postMessage({
                    type: enums_1.MessageType.WALLETS,
                    wallets: this._walletRepository.getWallets(),
                });
                break;
            case enums_1.MessageType.GET_INTERACT_CONTRACTS:
                await this._view.webview.postMessage({
                    type: enums_1.MessageType.INTERACT_CONTRACTS,
                    contracts: this._interactContractRepository.getContracts(),
                });
                break;
            case enums_1.MessageType.GET_SCRIPTS:
                await this._view.webview.postMessage({
                    type: enums_1.MessageType.SCRIPTS,
                    scripts: this._scriptRepository.getScripts(),
                });
                break;
            case enums_1.MessageType.GET_DEPLOY_CONTRACTS:
                await this._view.webview.postMessage({
                    type: enums_1.MessageType.DEPLOY_CONTRACTS,
                    contracts: this._deployContractRepository.getContracts(),
                });
                break;
            case enums_1.MessageType.GET_ENVIRONMENTS:
                await this._view.webview.postMessage({
                    type: enums_1.MessageType.ENVIRONMENTS,
                    environments: this._environmentRepository.getEnvironments(),
                });
                break;
            case enums_1.MessageType.WRITE:
                let value = BigInt(message.data.value);
                if (message.data.valueUnit === 'ether') {
                    value = value * BigInt(10) ** BigInt(18);
                }
                else if (message.data.valueUnit === 'gwei') {
                    value = value * BigInt(10) ** BigInt(9);
                }
                const writeResponse = await this._interact.writeContract({
                    walletId: message.data.wallet,
                    contractId: message.data.contract,
                    functionName: message.data.function,
                    params: message.data.inputs,
                    gasLimit: message.data.gasLimit > 0 ? message.data.gasLimit : undefined,
                    value: value > 0 ? value : undefined,
                    outputChannel: this._outputChannel,
                });
                await this._view.webview.postMessage({
                    type: enums_1.MessageType.WRITE_RESPONSE,
                    response: writeResponse,
                });
                break;
            case enums_1.MessageType.READ:
                const readResponse = await this._interact.readContract({
                    contractId: message.data.contract,
                    method: message.data.function,
                    params: message.data.inputs,
                    outputChannel: this._outputChannel,
                });
                await this._view.webview.postMessage({
                    type: enums_1.MessageType.READ_RESPONSE,
                    response: readResponse.toString(),
                });
                break;
            case enums_1.MessageType.DEPLOY_SCRIPT:
                const deployScriptResponse = await this._deploy.deployScript({
                    environmentId: message.data.environment,
                    scriptId: message.data.script,
                    verify: message.data.verify,
                    outputChannel: this._outputChannel,
                });
                await this._view.webview.postMessage({
                    type: enums_1.MessageType.DEPLOY_SCRIPT_RESPONSE,
                    response: deployScriptResponse,
                });
                break;
            case enums_1.MessageType.DEPLOY_CONTRACT:
                const deployContractResponse = await this._deploy.deployContract({
                    contractId: message.data.contract,
                    environmentId: message.data.environment,
                    walletId: message.data.wallet,
                    value: message.data.value,
                    gasLimit: message.data.gasLimit,
                    params: message.data.inputs,
                    verify: message.data.verify,
                    outputChannel: this._outputChannel,
                });
                await this._view.webview.postMessage({
                    type: enums_1.MessageType.DEPLOY_CONTRACT_RESPONSE,
                    response: deployContractResponse,
                });
                break;
            case enums_1.MessageType.OPEN_PANEL:
                await vscode.commands.executeCommand('osmium.show-env-panel');
                if (this._envPanelProvider.panel) {
                    await this._envPanelProvider.panel.webview.postMessage({
                        type: enums_1.MessageType.OPEN_PANEL_RESPONSE,
                        id: message.data.id,
                    });
                }
                break;
            case enums_1.MessageType.OPEN_DOCUMENTATION:
                vscode.commands.executeCommand('osmium.documentation');
                break;
            case enums_1.MessageType.OPEN_WALKTHROUGH:
                vscode.commands.executeCommand('workbench.action.openWalkthrough', 'OsmiumToolchains.osmium-solidity-extension#osmium.getStarted');
                break;
            case enums_1.MessageType.ESTIMATE_GAS:
                const gas = await config_1.publicClient.estimateContractGas({
                    address: message.data.address,
                    abi: message.data.abi,
                    functionName: message.data.function,
                    account: message.data.walletAddress,
                    args: message.data.params,
                });
                const gasWithBuffer = (gas * 12n) / 10n;
                await this._view.webview.postMessage({
                    type: enums_1.MessageType.ESTIMATE_GAS_RESPONSE,
                    response: { gas: gasWithBuffer.toString() },
                });
                break;
        }
    }
    async resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        this._init();
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage((e) => {
            this._onMessageCallback(e);
        });
    }
    _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'index-sidebar.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'index-sidebar.css'));
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
exports.SidebarProvider = SidebarProvider;
SidebarProvider.viewType = 'osmium.sidebar';
