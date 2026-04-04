"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interact = void 0;
const ethers = require("ethers");
class Interact {
    constructor(contractRepository, walletRepository) {
        this._contractRepository = contractRepository;
        this._walletRepository = walletRepository;
    }

    _getProvider(rpcUrl) {
        if (rpcUrl.startsWith("ws")) {
            return new ethers.WebSocketProvider(rpcUrl);
        }
        return new ethers.JsonRpcProvider(rpcUrl);
    }

    async readContract({ contractId, method, params, outputChannel }) {
        const contractInfos = this._contractRepository.getContract(contractId);
        if (!contractInfos) {
            throw new Error(`contract id ${contractId} not found`);
        }
        try {
            const provider = this._getProvider(contractInfos.rpc);
            const contract = new ethers.Contract(
                contractInfos.address,
                contractInfos.abi,
                provider
            );
            const args = Array.isArray(params) ? params : params != null ? [params] : [];
            const methodFn = contract.getFunction(method);
            const res = await methodFn(...args);
            outputChannel.append("Output :" + String(res) + "\n");
            return res;
        } catch (error) {
            outputChannel.append("Error :" + error + "\n");
            const msg =
                (error && error.reason) ||
                (error && error.message) ||
                String(error);
            return msg;
        }
    }

    async writeContract({
        walletId,
        contractId,
        functionName,
        params,
        gasLimit,
        value,
        outputChannel,
    }) {
        const walletInfos = this._walletRepository.getWallet(walletId);
        const contractInfos = this._contractRepository.getContract(contractId);
        if (!walletInfos) {
            throw new Error(`wallet id ${walletId} not found`);
        }
        if (!contractInfos) {
            throw new Error(`contract id ${contractId} not found`);
        }
        try {
            const provider = this._getProvider(contractInfos.rpc);
            const wallet = new ethers.Wallet(walletInfos.privateKey, provider);
            const contract = new ethers.Contract(
                contractInfos.address,
                contractInfos.abi,
                wallet
            );
            const args = Array.isArray(params) ? params : params != null ? [params] : [];
            const overrides = {};
            if (gasLimit != null) overrides.gasLimit = gasLimit;
            if (value != null) overrides.value = BigInt(value);
            const tx = await contract
                .getFunction(functionName)(...args, overrides);
            outputChannel.append("Transaction hash :" + tx.hash + "\n");
            return tx.hash;
        } catch (error) {
            outputChannel.append("Error :" + error + "\n");
            const msg =
                (error && error.reason) ||
                (error && error.message) ||
                String(error);
            return msg;
        }
    }
}
exports.Interact = Interact;
