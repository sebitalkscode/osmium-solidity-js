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
exports.EnvironmentRepository = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const uuid_1 = require("uuid");
class EnvironmentRepository {
    constructor(workspacePath) {
        this._environments = [];
        this._osmiumPath = path.join(workspacePath, '.osmium');
        this._environmentsPath = path.join(this._osmiumPath, 'environments.json');
        this.load();
    }
    _save() {
        const json = JSON.stringify({ environments: this._environments });
        fs.writeFileSync(this._environmentsPath, json, { encoding: 'utf-8' });
    }
    load() {
        if (!fs.existsSync(this._osmiumPath)) {
            fs.mkdirSync(this._osmiumPath);
        }
        if (!fs.existsSync(this._environmentsPath)) {
            this._environments = [
                {
                    id: (0, uuid_1.v4)(),
                    name: 'Anvil',
                    rpc: 'http://localhost:8545',
                },
            ];
            fs.writeFileSync(this._environmentsPath, JSON.stringify({ environments: this._environments }));
        }
        else {
            const raw = fs.readFileSync(this._environmentsPath);
            const json = JSON.parse(raw.toString());
            this._environments = json.environments;
        }
    }
    getEnvironments() {
        return this._environments;
    }
    getEnvironment(id) {
        return this._environments.find((e) => e.id === id);
    }
    createEnvironment(name, rpc) {
        const environment = { name, rpc, id: (0, uuid_1.v4)() };
        if (this._environments.find((e) => e.name === name)) {
            this._environments = this._environments.map((e) => {
                if (e.name === name) {
                    return environment;
                }
                return e;
            });
        }
        else {
            this._environments.push(environment);
        }
        this._save();
    }
    updateEnvironment(id, key, value) {
        const environment = this._environments.find((e) => e.id === id);
        if (environment) {
            environment[key] = value;
            this._save();
        }
    }
    deleteEnvironment(id) {
        this._environments = this._environments.filter((e) => e.id !== id);
        this._save();
    }
}
exports.EnvironmentRepository = EnvironmentRepository;
