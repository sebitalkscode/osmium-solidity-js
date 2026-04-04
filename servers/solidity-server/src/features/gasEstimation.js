const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const { Diagnostic, Range, DiagnosticSeverity } = require('vscode-languageserver');

const execAsync = promisify(exec);

function uriToPath(uri) {
  try {
    const decoded = decodeURIComponent(new URL(uri).pathname);
    if (process.platform === 'win32' && decoded.match(/^\/[A-Za-z]:/)) {
      return decoded.slice(1);
    }
    return decoded;
  } catch {
    return uri.replace(/^file:\/\//, '');
  }
}

function pathToUri(filePath) {
  const normalized = path.resolve(filePath).replace(/\\/g, '/');
  return 'file://' + (normalized.startsWith('/') ? '' : '/') + normalized;
}

function parseGasReport(output) {
  const functions = [];
  const deployments = [];
  const lines = output.split('\n');
  let currentContract = null;
  let currentFile = null;
  let inFunctionSection = false;
  let deploymentCost = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const contractMatch = line.match(/\|\s*([^|]+\.sol):(\w+)\s+Contract\s*\|/);
    if (contractMatch) {
      currentFile = contractMatch[1].trim();
      currentContract = contractMatch[2].trim();
      inFunctionSection = false;
      deploymentCost = null;
      continue;
    }
    if (line.includes('Deployment Cost') && line.includes('Deployment Size')) {
      const nextDataLine = lines[i + 2];
      if (nextDataLine) {
        const nums = nextDataLine.match(/\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
        if (nums && currentContract) {
          deploymentCost = parseInt(nums[1], 10);
          deployments.push({ contract: currentContract, file: currentFile, gasUsed: deploymentCost, size: parseInt(nums[2], 10) });
        }
      }
      continue;
    }
    if (line.includes('Function Name') && line.includes('Min') && line.includes('Avg')) {
      inFunctionSection = true;
      continue;
    }
    if (inFunctionSection && currentContract && line.includes('|')) {
      const parts = line.split('|').map(s => s.trim()).filter(s => s.length > 0 && !s.match(/^[-=+]+$/));
      if (parts.length >= 6) {
        const fnName = parts[0];
        const min = parseInt(parts[1], 10);
        const avg = parseInt(parts[2], 10);
        const median = parseInt(parts[3], 10);
        const max = parseInt(parts[4], 10);
        const calls = parseInt(parts[5], 10);
        if (!isNaN(min) && fnName && fnName !== 'Function Name') {
          functions.push({
            file: currentFile || '',
            contract: currentContract,
            function: fnName,
            min: min || 0,
            avg: avg || 0,
            median: median || 0,
            max: max || 0,
            calls: calls || 0,
          });
        }
      }
    }
    if (line.match(/^[╰╯┗┘└]/)) {
      inFunctionSection = false;
    }
  }
  return { functions, deployments };
}

function collectGasHints(documents, getWorkspaceRoot) {
  const byUri = new Map();
  const root = getWorkspaceRoot();
  if (!root) return byUri;
  const uris = documents.keys ? Array.from(documents.keys()) : [];
  for (const uri of uris) {
    if (!uri.endsWith('.sol')) continue;
    const doc = documents.get(uri);
    if (!doc) continue;
    const diagnostics = [];
    const text = doc.getText();
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/function\s+\w+\s*\([^)]*\)\s*(?:external|public)[^{]*\bmemory\b/.test(line)) {
        const idx = line.indexOf('memory');
        if (idx >= 0) {
          diagnostics.push(Diagnostic.create(
            Range.create(i, idx, i, idx + 6),
            'Use calldata instead of memory for external function parameters to save gas',
            DiagnosticSeverity.Hint,
            undefined,
            'gas-hints'
          ));
        }
      }
      const gt0 = line.match(/\s>\s*0\b/);
      if (gt0 && !/!= 0/.test(line)) {
        const idx = line.indexOf(gt0[0]);
        diagnostics.push(Diagnostic.create(
          Range.create(i, idx, i, idx + gt0[0].length),
          'Use != 0 instead of > 0 for gas efficiency',
          DiagnosticSeverity.Hint,
          undefined,
          'gas-hints'
        ));
      }
      const ipp = line.match(/\bi\+\+\s*;/);
      if (ipp) {
        const idx = line.indexOf(ipp[0]);
        diagnostics.push(Diagnostic.create(
          Range.create(i, idx, i, idx + ipp[0].length),
          'Use ++i instead of i++ to save gas',
          DiagnosticSeverity.Hint,
          undefined,
          'gas-hints'
        ));
      }
      if (line.includes('for') && line.includes('storage')) {
        const idx = line.indexOf('storage');
        if (idx >= 0) {
          diagnostics.push(Diagnostic.create(
            Range.create(i, idx, i, idx + 7),
            'Storage reads in loops are expensive; consider caching in a local variable',
            DiagnosticSeverity.Hint,
            undefined,
            'gas-hints'
          ));
        }
      }
    }
    if (diagnostics.length > 0) byUri.set(uri, diagnostics);
  }
  return byUri;
}

let connection = null;
let documents = null;
let getWorkspaceRoot = null;

function init(conn, docs, getRoot) {
  connection = conn;
  documents = docs;
  getWorkspaceRoot = getRoot;
}

function analyzeGas() {
  const root = getWorkspaceRoot();
  if (!root) return Promise.resolve({ functions: [], deployments: [] });
  const cwd = uriToPath(root);
  const start = Date.now();
  return execAsync('forge test --gas-report', { cwd, maxBuffer: 10 * 1024 * 1024 })
    .then(({ stdout }) => {
      const data = parseGasReport(stdout);
      if (connection) {
        connection.sendNotification('osmium/gasReport', data);
      }
      return data;
    })
    .catch(() => {
      return { functions: [], deployments: [] };
    });
}

module.exports = {
  init,
  analyzeGas,
  collectGasHints,
};
