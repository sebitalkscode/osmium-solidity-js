"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletRepository = void 0;
const path = require("path");
const fs = require("fs");
const { v4: uuidV4 } = require("uuid");
const ethers = require("ethers");
function privateKeyToAddress(privateKey) {
    try {
        const wallet = new ethers.Wallet(privateKey);
        return wallet.address;
    } catch (e) {
        console.error("Impossible to parse private key:", privateKey);
        return "0x";
    }
}

class WalletRepository {
    constructor(workspacePath) {
        this._wallets = [];
        this._osmiumPath = path.join(workspacePath, ".osmium");
        this._walletsPath = path.join(this._osmiumPath, "wallets.json");
        this.load();
    }

    _save() {
        const json = JSON.stringify({ wallets: this._wallets });
        fs.writeFileSync(this._walletsPath, json, { encoding: "utf-8" });
    }

    load() {
        if (!fs.existsSync(this._osmiumPath)) {
            fs.mkdirSync(this._osmiumPath);
        }
        if (!fs.existsSync(this._walletsPath)) {
            this._wallets = [];
            fs.writeFileSync(
                this._walletsPath,
                JSON.stringify({ wallets: this._wallets })
            );
        } else {
            const raw = fs.readFileSync(this._walletsPath);
            const json = JSON.parse(raw.toString());
            this._wallets = json.wallets;
        }
        this._wallets = this._wallets.map((w) => {
            try {
                return { ...w, address: privateKeyToAddress(w.privateKey) };
            } catch (e) {
                console.error("Impossible to parse private key: ", w.privateKey);
                return { ...w, address: "0x" };
            }
        });
    }

    getWallets() {
        return this._wallets;
    }

    getWallet(id) {
        return this._wallets.find((w) => w.id === id);
    }

    createWallet(name, privateKey) {
        const address = privateKeyToAddress(privateKey);
        const wallet = { name, address, privateKey, id: uuidV4() };
        if (this._wallets.find((w) => w.address === address)) {
            this._wallets = this._wallets.map((w) =>
                w.address === address ? wallet : w
            );
        } else {
            this._wallets.push(wallet);
        }
        this._save();
    }

    updateWallet(id, key, value) {
        const wallet = this._wallets.find((w) => w.id === id);
        if (wallet) {
            wallet[key] = value;
            this._save();
        }
    }

    deleteWallet(id) {
        this._wallets = this._wallets.filter((w) => w.id !== id);
        this._save();
    }
}
exports.WalletRepository = WalletRepository;
