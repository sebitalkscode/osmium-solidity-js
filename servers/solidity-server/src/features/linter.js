const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { fileURLToPath, pathToFileURL } = require('url');
const { DiagnosticSeverity, DiagnosticTag } = require('vscode-languageserver');

const execFileAsync = promisify(execFile);

const UNNECESSARY_RULES = new Set([
  'no-unused-vars',
  'no-unused-import',
  'no-unused-state',
]);
const DEPRECATED_RULES = new Set([
  'avoid-sha3',
  'avoid-suicide',
  'avoid-throw',
  'constructor-syntax',
]);

let connection = null;
let documents = null;
let getWorkspaceRoot = null;

function toFsPath(uriOrPath) {
  if (!uriOrPath) return null;
  if (typeof uriOrPath === 'string' && uriOrPath.startsWith('file:')) {
    try {
      return fileURLToPath(uriOrPath);
    } catch {
      return null;
    }
  }
  return path.resolve(uriOrPath);
}

function getSolhintRunner(workspaceRoot) {
  const rootPath = toFsPath(workspaceRoot) || process.cwd();
  const candidates = [];
  const serverDir = path.resolve(__dirname, '..', '..');
  let d = serverDir;
  for (let i = 0; i < 5; i++) {
    candidates.push(path.join(d, 'node_modules', 'solhint', 'solhint.js'));
    const parent = path.dirname(d);
    if (parent === d) break;
    d = parent;
  }
  candidates.push(path.join(rootPath, 'node_modules', 'solhint', 'solhint.js'));
  let dir = rootPath;
  const root = path.parse(dir).root;
  for (let i = 0; i < 5; i++) {
    const p = path.join(dir, 'node_modules', 'solhint', 'solhint.js');
    if (!candidates.includes(p)) candidates.push(p);
    const parent = path.dirname(dir);
    if (parent === dir || parent === root) break;
    dir = parent;
  }
  for (const scriptPath of candidates) {
    if (fs.existsSync(scriptPath)) return { node: process.execPath, script: scriptPath };
  }
  return null;
}

function findSolhintConfigDir(cwd) {
  let dir = path.resolve(cwd);
  const root = path.parse(dir).root;
  while (true) {
    if (fs.existsSync(path.join(dir, '.solhint.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir || parent === root) break;
    dir = parent;
  }
  return null;
}

function runSolhint(cwd, args) {
  const workspaceRoot = typeof cwd === 'string' ? cwd : null;
  const runner = getSolhintRunner(workspaceRoot || cwd);
  if (!runner) return Promise.resolve('');
  const cmdArgs = [runner.script, '-f', 'json', ...args];
  const configDir = findSolhintConfigDir(cwd);
  if (configDir) {
    const configPath = path.join(configDir, '.solhint.json');
    if (fs.existsSync(configPath)) cmdArgs.push('--config', configPath);
  }
  return execFileAsync(runner.node, cmdArgs, { cwd, maxBuffer: 4 * 1024 * 1024 })
    .then(({ stdout }) => stdout || '')
    .catch((err) => err.stdout || '');
}

function parseSolhintJson(stdout) {
  if (!stdout || !stdout.trim()) return [];
  let jsonStr = stdout.trim();
  const jsonStart = jsonStr.indexOf('[');
  if (jsonStart === -1) return [];
  if (jsonStart > 0) jsonStr = jsonStr.slice(jsonStart);
  try {
    const out = JSON.parse(jsonStr);
    const list = Array.isArray(out) ? out : out.reports || [];
    const flat = [];
    for (const item of list) {
      if (!item) continue;
      const fp = item.filePath ?? item.file;
      if (typeof fp !== 'string') continue;
      if (Array.isArray(item.messages) && item.messages.length > 0) {
        for (const msg of item.messages) {
          if (msg) flat.push({ ...msg, filePath: fp });
        }
      }
      if (item.line != null || item.message) {
        flat.push({ ...item, filePath: fp });
      }
    }
    return flat;
  } catch {
    return [];
  }
}

function messageToDiagnostic(msg) {
  const line = Math.max(0, (msg.line || 1) - 1);
  const col = Math.max(0, (msg.column || 1) - 1);
  const endLine = msg.endLine != null ? Math.max(0, msg.endLine - 1) : line;
  const endCol = msg.endColumn != null ? Math.max(0, msg.endColumn - 1) : col + 1;
  const severity =
    msg.severity === 2 || msg.severity === 'Error'
      ? DiagnosticSeverity.Error
      : DiagnosticSeverity.Warning;
  const text = msg.message || '';
  const displayMsg = msg.ruleId ? `${text} [${msg.ruleId}]` : text;
  const diag = {
    range: { start: { line, character: col }, end: { line: endLine, character: endCol } },
    message: displayMsg,
    severity,
    source: '',
  };
  const tags = [];
  if (msg.ruleId && UNNECESSARY_RULES.has(msg.ruleId)) tags.push(DiagnosticTag.Unnecessary);
  if (msg.ruleId && DEPRECATED_RULES.has(msg.ruleId)) tags.push(DiagnosticTag.Deprecated);
  if (tags.length > 0) diag.tags = tags;
  return diag;
}

function uriToFsPath(uri) {
  if (typeof uri !== 'string' || !uri.startsWith('file:')) return null;
  try {
    return fileURLToPath(uri);
  } catch {
    return null;
  }
}

function init(conn, docs, getRoot) {
  connection = conn;
  documents = docs;
  getWorkspaceRoot = getRoot;
}

async function validateDocument(textDocument) {
  const uri = textDocument.uri;
  const fsPath = uriToFsPath(uri);
  if (!fsPath || !connection) return [];
  const rawRoot = getWorkspaceRoot ? getWorkspaceRoot() : null;
  const workspaceRoot = toFsPath(rawRoot) || path.dirname(fsPath);
  const cwd = workspaceRoot;
  const rel = path.relative(cwd, fsPath).replace(/\\/g, '/');
  const stdout = await runSolhint(cwd, [rel]);
  const messages = parseSolhintJson(stdout);
  const seen = new Set();
  const uniqueMsgs = messages.filter((m) => {
    const key = `${m.line}:${m.column}:${m.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const diagnostics = uniqueMsgs.map(messageToDiagnostic);
  return diagnostics;
}

async function validateWorkspace() {
  const rawRoot = getWorkspaceRoot ? getWorkspaceRoot() : null;
  const workspaceRoot = toFsPath(rawRoot) || process.cwd();
  const result = new Map();
  if (!connection) return result;
  const dirs = ['src', 'script', 'test'];
  const existingDirs = dirs.filter((d) => fs.existsSync(path.join(workspaceRoot, d)));
  if (existingDirs.length === 0) return result;
  const stdout = await runSolhint(workspaceRoot, existingDirs);
  const messages = parseSolhintJson(stdout);
  const byFile = new Map();
  for (const msg of messages) {
    const absPath = path.isAbsolute(msg.filePath)
      ? msg.filePath
      : path.join(workspaceRoot, msg.filePath);
    const fileUri = pathToFileURL(absPath).toString();
    if (!byFile.has(fileUri)) byFile.set(fileUri, []);
    byFile.get(fileUri).push(msg);
  }
  for (const [fileUri, msgs] of byFile) {
    const seen = new Set();
    const unique = msgs.filter((m) => {
      const key = `${m.line}:${m.column}:${m.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const diagnostics = unique.map(messageToDiagnostic);
    result.set(fileUri, diagnostics);
  }
  return result;
}

module.exports = {
  init,
  validateDocument,
  validateWorkspace,
};
