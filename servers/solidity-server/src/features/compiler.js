const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const { pathToFileURL, fileURLToPath } = require('url');
const { Diagnostic, DiagnosticSeverity, Range } = require('vscode-languageserver');

const execAsync = promisify(exec);
const EIP170_LIMIT = 24576;

const FORGE_LINT_FILTER = [
  'mixed-case-variable',
  'mixed-case-function',
  'screaming-snake-case-const',
  'erc20-unchecked-transfer',
  'mixed-case-parameter',
];

function parseForgeOutput(output, cwd) {
  const results = [];
  const blockPattern = /(Error|Warning)\s*\((\d+)\):\s*([\s\S]*?)(?=\n\s*(?:Error|Warning)\s*\(\d+\)|$)/g;
  const locPattern = /-->\s*([^\s:]+):(\d+):(\d+)/;
  let match;

  while ((match = blockPattern.exec(output)) !== null) {
    const severity = match[1];
    const code = match[2];
    const body = match[3];
    const message = body.split('\n')[0].trim();

    const locMatch = body.match(locPattern);
    if (!locMatch) continue;

    let filePath = locMatch[1].trim();
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(cwd, filePath);
    }
    filePath = path.normalize(filePath);

    const line = Math.max(0, parseInt(locMatch[2], 10) - 1);
    const col = Math.max(0, parseInt(locMatch[3], 10) - 1);

    const underlineMatch = body.match(/\n\s*\|?\s*([\^~-]+)\s*$/m);
    let endCol = col + 1;
    if (underlineMatch) {
      endCol = col + underlineMatch[1].length;
    }

    results.push({
      file: filePath,
      line,
      col,
      endCol,
      message: message + ' [' + code + ']',
      severity: severity === 'Error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    });
  }

  const notePattern = /(?:note|warning)\[([^\]]+)\]:\s*(.*?)\n\s*-->\s*([^\s:]+):(\d+):(\d+)/g;
  while ((match = notePattern.exec(output)) !== null) {
    const ruleId = match[1];
    if (FORGE_LINT_FILTER.includes(ruleId)) continue;

    const noteMsg = match[2].trim();
    let noteFile = match[3].trim();
    if (!path.isAbsolute(noteFile)) {
      noteFile = path.join(cwd, noteFile);
    }
    noteFile = path.normalize(noteFile);

    const noteLine = Math.max(0, parseInt(match[4], 10) - 1);
    const noteCol = Math.max(0, parseInt(match[5], 10) - 1);

    results.push({
      file: noteFile,
      line: noteLine,
      col: noteCol,
      endCol: noteCol + 1,
      message: noteMsg + ' [' + ruleId + ']',
      severity: DiagnosticSeverity.Information,
    });
  }

  return results;
}

function resultsToDiagnostics(results) {
  const byUri = Object.create(null);
  for (const r of results) {
    const uri = pathToFileURL(r.file).href;
    if (!byUri[uri]) byUri[uri] = [];
    byUri[uri].push({
      range: Range.create(r.line, r.col, r.line, r.endCol),
      message: r.message,
      severity: r.severity,
      source: 'osmium-solidity-foundry-compiler',
    });
  }
  return byUri;
}

function getContractSize(contractId, cwd) {
  return execAsync(`forge inspect "${contractId}" deployedBytecode`, {
    cwd,
    maxBuffer: 2 * 1024 * 1024,
  })
    .then(({ stdout }) => {
      let hex = (stdout || '').trim();
      if (!hex || hex === '0x') return -1;
      if (hex.startsWith('0x')) hex = hex.slice(2);
      return Math.floor(hex.length / 2);
    })
    .catch(() => -1);
}

function findContracts(content) {
  const contracts = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*(?:abstract\s+)?contract\s+([A-Za-z0-9_]+)/);
    if (m) contracts.push({ name: m[1], line: i });
  }
  return contracts;
}

let connection;
let documents;
let getWorkspaceRoot;

module.exports = {
  init(conn, docs, getRoot) {
    connection = conn;
    documents = docs;
    getWorkspaceRoot = getRoot;
  },

  async compileWorkspace(root) {
    let cwd = root || (getWorkspaceRoot && getWorkspaceRoot());
    if (cwd && typeof cwd === 'string' && cwd.startsWith('file:')) {
      cwd = fileURLToPath(cwd);
    }
    if (!cwd || typeof cwd !== 'string') {
      connection.sendNotification('osmium/compilerStatus', {
        status: 'error',
        errorCount: 0,
        warningCount: 0,
      });
      return {};
    }

    let output = '';
    try {
      const { stdout, stderr } = await execAsync('forge build', {
        cwd,
        maxBuffer: 4 * 1024 * 1024,
      });
      output = ((stdout || '') + '\n' + (stderr || '')).trim();
    } catch (e) {
      output = ((e.stdout || '') + '\n' + (e.stderr || '')).trim() || (e.message || '');
    }

    const results = parseForgeOutput(output, cwd);
    const diagMap = resultsToDiagnostics(results);

    const errorCount = results.filter((r) => r.severity === DiagnosticSeverity.Error).length;
    const warningCount = results.filter((r) => r.severity === DiagnosticSeverity.Warning).length;
    const status =
      errorCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'ok';

    connection.sendNotification('osmium/compilerStatus', {
      status,
      errorCount,
      warningCount,
    });

    const contractSizes = [];
    const allDocs = documents.all();
    for (const doc of allDocs) {
      const uri = doc.uri;
      if (!uri.startsWith('file:') || !uri.endsWith('.sol')) continue;

      const filePath = fileURLToPath(uri);
      const content = doc.getText();
      const contracts = findContracts(content);
      const relPath = path.relative(cwd, filePath).replace(/\\/g, '/');

      for (const { name, line } of contracts) {
        const contractId = relPath + ':' + name;
        const bytes = await getContractSize(contractId, cwd);
        if (bytes > 0) {
          contractSizes.push({
            file: filePath,
            contractName: name,
            line,
            bytes,
            limit: EIP170_LIMIT,
          });
        }
      }
    }

    connection.sendNotification('osmium/contractSizes', contractSizes);

    return diagMap;
  },
};
