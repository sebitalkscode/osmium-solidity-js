const { JsonRpcProvider, Contract } = require("ethers");

const defaultRpc = "https://eth.llamarpc.com";
const provider = new JsonRpcProvider(defaultRpc);

async function estimateContractGas(opts) {
  const { address, abi, functionName, args = [] } = opts;
  const contract = new Contract(address, abi, provider);
  const fn = contract.getFunction(functionName);
  const gas = await fn.estimateGas(...args);
  return gas;
}

const publicClient = {
  estimateContractGas,
};

module.exports = {
  publicClient,
  defaultRpc,
  provider,
};
