"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deploy = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../utils");
class Deploy {
    constructor(contractRepository, walletRepository, scriptRepository, environmentRepository, workspacePath) {
        this._contractRepository = contractRepository;
        this._walletRepository = walletRepository;
        this._scriptRepository = scriptRepository;
        this._environmentRepository = environmentRepository;
        this._projectPath = workspacePath;
        const foundryConfigPath = path_1.default.join(this._projectPath, 'foundry.toml');
        if (fs_1.default.existsSync(foundryConfigPath)) {
            const script = (0, utils_1.getTomlValue)(foundryConfigPath, 'script');
            this._scriptFolderPath = script ? script : 'script';
        }
        else {
            this._scriptFolderPath = 'script';
        }
    }
    async deployScript({ environmentId, scriptId, verify, outputChannel }) {
        const environmentInfos = this._environmentRepository.getEnvironment(environmentId);
        const scriptInfos = this._scriptRepository.getScript(scriptId);
        if (!environmentInfos) {
            throw new Error(`environment id ${environmentId} not found`);
        }
        if (!scriptInfos) {
            throw new Error(`script id ${scriptId} not found`);
        }
        const command = `forge script --broadcast ${path_1.default.join(this._scriptFolderPath, scriptInfos.path)}:${scriptInfos.name} --rpc-url ${environmentInfos.rpc} ${verify ? '--verify' : ''}`;
        return new Promise((resolve, reject) => {
            const childProcess = (0, child_process_1.exec)(command, { cwd: this._projectPath }, (error, stdout, stderr) => {
                if (error) {
                    outputChannel.appendLine(`Error: ${error.message}`);
                    resolve({
                        exitCode: error.code,
                        output: error.message,
                    });
                }
                else {
                    const printableData = stdout.replace(/[^\x20-\x7E]|(\[2m|\[0m|\[32m)/g, '');
                    outputChannel.append(printableData + '\n');
                    resolve({
                        exitCode: 0,
                        output: stdout,
                    });
                }
                outputChannel.show();
            });
            childProcess.stdout?.on('data', (data) => {
                const printableData = data.replace(/[^\x20-\x7E]|(\[2m|\[0m|\[32m)/g, '');
                outputChannel.append(printableData + '\n');
            });
            childProcess.stderr?.on('data', (data) => {
                const printableData = data.replace(/[^\x20-\x7E]|(\[2m|\[0m|\[32m)/g, '');
                outputChannel.append(printableData + '\n');
            });
        });
    }
    async deployContract({ contractId, environmentId, walletId, gasLimit, value, params, verify, outputChannel, }) {
        const environmentInfos = this._environmentRepository.getEnvironment(environmentId);
        const contractInfos = this._contractRepository.getContract(contractId);
        const walletInfos = this._walletRepository.getWallet(walletId);
        if (!environmentInfos) {
            throw new Error(`environment id ${environmentId} not found`);
        }
        if (!contractInfos) {
            throw new Error(`contract id ${contractId} not found`);
        }
        if (!walletInfos) {
            throw new Error(`wallet id ${walletId} not found`);
        }
        const command = [
            'forge',
            'create',
            `"${contractInfos.path}:${contractInfos.name}"`,
            '--private-key',
            walletInfos.privateKey,
            '--rpc-url',
            environmentInfos.rpc,
            '--value',
            value.toString(),
            '--broadcast'
        ];
        if (gasLimit) {
            command.push('--gas-limit', gasLimit.toString());
        }
        if (verify) {
            command.push('--verify');
        }
        if (params.length) {
            command.push(`--constructor-args ${params.join(' ')}`);
        }
        return new Promise((resolve, reject) => {
            const childProcess = (0, child_process_1.exec)(command.join(' '), { cwd: this._projectPath }, (error, stdout, stderr) => {
                if (error) {
                    outputChannel.appendLine(`Error: ${error.message} \n`);
                    resolve({
                        exitCode: error.code,
                        output: error.message,
                    });
                }
                else {
                    const printableData = stdout.replace(/[^\x20-\x7E]|(\[2m|\[0m|\[32m)/g, '');
                    outputChannel.appendLine(printableData + '\n');
                    resolve({
                        exitCode: 0,
                        output: stdout,
                    });
                }
                outputChannel.show();
            });
            childProcess.stdout?.on('data', (data) => {
                const printableData = data.replace(/[^\x20-\x7E]|(\[2m|\[0m|\[32m)/g, '');
                outputChannel.append(printableData + '\n');
            });
            childProcess.stderr?.on('data', (data) => {
                const printableData = data.replace(/[^\x20-\x7E]|(\[2m|\[0m|\[32m)/g, '');
                outputChannel.append(printableData + '\n');
            });
        });
    }
}
exports.Deploy = Deploy;
