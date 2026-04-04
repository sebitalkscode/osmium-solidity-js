/**
 * Osmium Solidity Linter
 * Uses the solhint Node.js API directly (no subprocess) for fast, reliable linting.
 */

const fs = require('fs');
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const { DiagnosticSeverity, DiagnosticTag } = require('vscode-languageserver');

// Lazy-load solhint modules so we don't crash if they're missing
let _solhintApi = null;
let _solhintConfigFile = null;
let _solhintApplyExtends = null;

function getSolhintModules() {
  if (_solhintApi) return { api: _solhintApi, loadConfig: _solhintConfigFile, applyExtends: _solhintApplyExtends };
  try {
    _solhintApi = require('solhint/lib/index');
    const configFile = require('solhint/lib/config/config-file');
    _solhintConfigFile = configFile.loadConfig;
    _solhintApplyExtends = configFile.applyExtends;
    return { api: _solhintApi, loadConfig: _solhintConfigFile, applyExtends: _solhintApplyExtends };
  } catch (err) {
    return null;
  }
}

// Rules that should render as "unnecessary" (strikethrough) in VS Code
const UNNECESSARY_RULES = new Set([
  'no-unused-vars',
  'no-unused-import',
  'no-unused-state',
]);

// Rules that should render as "deprecated" in VS Code
const DEPRECATED_RULES = new Set([
  'avoid-sha3',
  'avoid-suicide',
  'avoid-throw',
  'constructor-syntax',
]);

// Default configuration used when no .solhint.json is found.
// This matches the original Osmium Solidity extension behaviour.
const DEFAULT_CONFIG = {
  extends: 'solhint:recommended',
  rules: {
    'compiler-version': ['warn', '^0.8.0'],
    'func-visibility': ['warn', { ignoreConstructors: true }],
    'state-visibility': 'warn',
    'avoid-tx-origin': 'warn',
    'check-send-result': 'warn',
    'multiple-sends': 'warn',
    'reentrancy': 'warn',
    'no-complex-fallback': 'warn',
    'payable-fallback': 'warn',
    'reason-string': ['warn', { maxLength: 32 }],
    'custom-errors': 'off',
    'quotes': ['warn', 'double'],
    'no-inline-assembly': 'warn',
    'avoid-call-value': 'warn',
  },
};

let connection = null;
let documents = null;
let getWorkspaceRoot = null;

function toFsPath(uriOrPath) {
  if (!uriOrPath) return null;
  if (typeof uriOrPath === 'string' && uriOrPath.startsWith('file:')) {
    try { return fileURLToPath(uriOrPath); } catch { return null; }
  }
  return path.resolve(uriOrPath);
}

function uriToFsPath(uri) {
  if (typeof uri !== 'string' || !uri.startsWith('file:')) return null;
  try { return fileURLToPath(uri); } catch { return null; }
}

/**
 * Walk up the directory tree from `startDir` looking for a .solhint.json file.
 * Returns the absolute config path if found, or null.
 */
function findSolhintConfig(startDir) {
  const configNames = ['.solhint.json', '.solhintrc', '.solhintrc.json'];
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;
  while (true) {
    for (const name of configNames) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir || parent === root) break;
    dir = parent;
  }
  return null;
}

/**
 * Load a solhint config object from a path, or return the built-in default.
 */
function loadSolhintConfig(configPath, modules) {
  if (configPath) {
    try {
      return modules.loadConfig(configPath);
    } catch (_) {}
  }
  // Return the default config (will be processed by applyExtends below)
  return { ...DEFAULT_CONFIG };
}

/**
 * Convert a solhint Reporter result object into LSP Diagnostics.
 */
function reporterToDiagnostics(reporter) {
  const diagnostics = [];
  for (const r of reporter.reports || []) {
    const line = Math.max(0, (r.line || 1) - 1);
    const col = Math.max(0, (r.column || 1) - 1);
    const endCol = col + 1;

    // Map solhint severity (1=warn, 2=error) to LSP
    const severity =
      r.severity === 2
        ? DiagnosticSeverity.Error
        : DiagnosticSeverity.Warning;

    const ruleId = r.ruleId || r.rule;
    const text = r.message || '';
    const displayMsg = ruleId ? `${text} [${ruleId}]` : text;

    const diag = {
      range: {
        start: { line, character: col },
        end: { line, character: endCol },
      },
      message: displayMsg,
      severity,
      source: 'osmium-solidity-linter',
      code: ruleId || undefined,
    };

    const tags = [];
    if (ruleId && UNNECESSARY_RULES.has(ruleId)) tags.push(DiagnosticTag.Unnecessary);
    if (ruleId && DEPRECATED_RULES.has(ruleId)) tags.push(DiagnosticTag.Deprecated);
    if (tags.length > 0) diag.tags = tags;

    diagnostics.push(diag);
  }
  return diagnostics;
}

/**
 * Deduplicate diagnostics by line:col:message.
 */
function dedup(diagnostics) {
  const seen = new Set();
  return diagnostics.filter((d) => {
    const key = `${d.range.start.line}:${d.range.start.character}:${d.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function init(conn, docs, getRoot) {
  connection = conn;
  documents = docs;
  getWorkspaceRoot = getRoot;
}

async function validateDocument(textDocument) {
  const uri = textDocument.uri;
  const fsPath = uriToFsPath(uri);
  if (!fsPath) return [];

  const modules = getSolhintModules();
  if (!modules) return [];

  const rawRoot = getWorkspaceRoot ? getWorkspaceRoot() : null;
  const workspaceRoot = toFsPath(rawRoot) || path.dirname(fsPath);

  // Find the nearest .solhint.json walking up from the file's dir
  const configPath = findSolhintConfig(path.dirname(fsPath))
    || findSolhintConfig(workspaceRoot);

  let config;
  try {
    config = loadSolhintConfig(configPath, modules);
    config = modules.applyExtends(config);
  } catch (err) {
    // If even the default config fails, use bare recommended
    try {
      config = modules.applyExtends({ extends: 'solhint:recommended' });
    } catch (_) {
      return [];
    }
  }

  let reporter;
  try {
    const source = textDocument.getText();
    reporter = modules.api.processStr(source, config, fsPath);
  } catch (_) {
    return [];
  }

  return dedup(reporterToDiagnostics(reporter));
}

async function validateWorkspace() {
  const rawRoot = getWorkspaceRoot ? getWorkspaceRoot() : null;
  const workspaceRoot = toFsPath(rawRoot) || process.cwd();
  const result = new Map();

  const modules = getSolhintModules();
  if (!modules || !connection) return result;

  const dirs = ['src', 'script', 'test', 'contracts'];
  const solFiles = [];

  for (const dir of dirs) {
    const dirPath = path.join(workspaceRoot, dir);
    if (!fs.existsSync(dirPath)) continue;
    collectSolFiles(dirPath, solFiles);
  }

  for (const filePath of solFiles) {
    const configPath = findSolhintConfig(path.dirname(filePath))
      || findSolhintConfig(workspaceRoot);

    let config;
    try {
      config = loadSolhintConfig(configPath, modules);
      config = modules.applyExtends(config);
    } catch (_) {
      continue;
    }

    let reporter;
    try {
      const source = fs.readFileSync(filePath, 'utf8');
      reporter = modules.api.processStr(source, config, filePath);
    } catch (_) {
      continue;
    }

    const fileUri = pathToFileURL(filePath).toString();
    result.set(fileUri, dedup(reporterToDiagnostics(reporter)));
  }

  return result;
}

function collectSolFiles(dirPath, result) {
  let entries;
  try { entries = fs.readdirSync(dirPath, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectSolFiles(fullPath, result);
    } else if (entry.isFile() && entry.name.endsWith('.sol')) {
      result.push(fullPath);
    }
  }
}

module.exports = {
  init,
  validateDocument,
  validateWorkspace,
};
