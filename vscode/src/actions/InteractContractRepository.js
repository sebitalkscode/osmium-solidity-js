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
exports.InteractContractRepository = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const uuid_1 = require("uuid");
class InteractContractRepository {
    constructor(workspacePath) {
        this._contracts = [];
        this._osmiumPath = path.join(workspacePath, '.osmium');
        this._contractsPath = path.join(this._osmiumPath, 'contracts.json');
        this.load();
    }
    _save() {
        const json = JSON.stringify({ contracts: this._contracts });
        fs.writeFileSync(this._contractsPath, json, { encoding: 'utf-8' });
    }
    load() {
        if (!fs.existsSync(this._osmiumPath)) {
            fs.mkdirSync(this._osmiumPath);
        }
        if (!fs.existsSync(this._contractsPath)) {
            this._contracts = [];
            fs.writeFileSync(this._contractsPath, JSON.stringify({ contracts: this._contracts }));
        }
        else {
            const raw = fs.readFileSync(this._contractsPath);
            const json = JSON.parse(raw.toString());
            this._contracts = json.contracts;
        }
    }
    getContracts() {
        return this._contracts;
    }
    getContract(id) {
        return this._contracts.find((c) => c.id === id);
    }
    createContract(address, abi, chainId, name, rpc) {
        const contract = { address, abi, chainId, name, rpc, id: (0, uuid_1.v4)() };
        if (this._contracts.find((c) => c.address === address)) {
            this._contracts = this._contracts.map((w) => {
                if (w.address === address) {
                    return contract;
                }
                return w;
            });
        }
        else {
            this._contracts.push(contract);
        }
        this._save();
    }
    updateContract(id, key, value) {
        const environment = this._contracts.find((e) => e.id === id);
        if (environment) {
            environment[key] = value;
            this._save();
        }
    }
    deleteContract(id) {
        this._contracts = this._contracts.filter((c) => c.id !== id);
        this._save();
    }
}
exports.InteractContractRepository = InteractContractRepository;
