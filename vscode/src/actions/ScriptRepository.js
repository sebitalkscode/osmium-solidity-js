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
exports.ScriptRepository = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../utils");
const uuid_1 = require("uuid");
class ScriptRepository {
    constructor(workspacePath) {
        this._scripts = [];
        this._foundryConfigPath = path.join(workspacePath, 'foundry.toml');
        if (fs.existsSync(this._foundryConfigPath)) {
            const script = (0, utils_1.getTomlValue)(this._foundryConfigPath, 'script');
            this._scriptFolderPath = path.join(workspacePath, script ?? 'script');
        }
        else {
            this._scriptFolderPath = path.join(workspacePath, 'script');
        }
        this.load();
    }
    load() {
        this._scripts = [];
        if (!fs.existsSync(this._scriptFolderPath)) {
            return;
        }
        const regex = new RegExp(/contract\s+(\w+)\s+is\s+Script/g);
        fs.readdirSync(this._scriptFolderPath).forEach((file) => {
            if (!file.endsWith('.s.sol')) {
                return;
            }
            const content = fs.readFileSync(path.join(this._scriptFolderPath, file), 'utf-8');
            let matches;
            while ((matches = regex.exec(content)) !== null) {
                this._addScript(matches[1], file);
            }
        });
    }
    _addScript(name, path) {
        if (this._scripts.find((s) => s.name === name)) {
            if (this._scripts.find((s) => s.path === path)) {
                return;
            }
        }
        this._scripts.push({
            name,
            path,
            id: (0, uuid_1.v4)(),
        });
    }
    getScripts() {
        return this._scripts;
    }
    getScript(id) {
        return this._scripts.find((s) => s.id === id);
    }
}
exports.ScriptRepository = ScriptRepository;
