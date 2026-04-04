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
exports.DeployContractRepository = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const utils_1 = require("../utils");
const uuid_1 = require("uuid");
class DeployContractRepository {
    constructor(workspacePath) {
        this._contracts = [];
        this._foundryConfigPath = path.join(workspacePath, 'foundry.toml');
        if (fs.existsSync(this._foundryConfigPath)) {
            this._srcFolderPath = path.join(workspacePath, (0, utils_1.getTomlValue)(this._foundryConfigPath, 'src') ?? 'src');
            this._outFolderPath = path.join(workspacePath, (0, utils_1.getTomlValue)(this._foundryConfigPath, 'out') ?? 'out');
        }
        else {
            this._srcFolderPath = path.join(workspacePath, 'src');
            this._outFolderPath = path.join(workspacePath, 'out');
        }
        this.load();
    }
    async load() {
        this._contracts = [];
        if (!fs.existsSync(this._srcFolderPath) || !fs.existsSync(this._outFolderPath)) {
            return;
        }
        const outFiles = fs
            .readdirSync(this._outFolderPath, { recursive: true })
            .filter((f) => f.toString().endsWith('.json'));
        const outFilesContent = outFiles.map((f) => JSON.parse(fs.readFileSync(path.join(this._outFolderPath, f.toString())).toString()));
        for (const outFile of outFiles) {
            const outFileContent = JSON.parse(fs.readFileSync(path.join(this._outFolderPath, outFile.toString())).toString());
            console.log(Object.keys(outFileContent));
            if (!Object.keys(outFileContent).includes('metadata')) {
                continue;
            }
            const target = Object.keys(outFileContent.metadata.settings.compilationTarget)[0];
            if (path.parse(target).dir !== path.basename(this._srcFolderPath)) {
                continue;
            }
            this._contracts.push({
                name: path.basename(outFile.toString(), '.json'),
                path: target,
                abi: outFileContent.abi,
                id: (0, uuid_1.v4)(),
            });
        }
    }
    getContracts() {
        return this._contracts;
    }
    getContract(id) {
        return this._contracts.find((c) => c.id === id);
    }
}
exports.DeployContractRepository = DeployContractRepository;
