#!/usr/bin/env node

const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  TextDocumentSyncKind,
} = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');

const linter = require('./features/linter');
const compiler = require('./features/compiler');
const codeActions = require('./features/codeActions');
const formatter = require('./features/formatter');
const gasEstimation = require('./features/gasEstimation');
const slither = require('./features/slither');

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let workspaceRoot = null;

function getWorkspaceRoot() {
  return workspaceRoot;
}

const diagnosticStore = {};

function publishDiagnostics(uri, source, diagnostics) {
  if (!diagnosticStore[uri]) diagnosticStore[uri] = {};
  diagnosticStore[uri][source] = diagnostics || [];
  const merged = [];
  for (const src of Object.keys(diagnosticStore[uri])) {
    merged.push(...diagnosticStore[uri][src]);
  }
  connection.sendDiagnostics({ uri, diagnostics: merged });
}

function initFeature(feature) {
  if (feature.init) {
    feature.init(connection, documents, getWorkspaceRoot);
  }
}

initFeature(linter);
initFeature(compiler);
initFeature(codeActions);
initFeature(formatter);
initFeature(gasEstimation);
initFeature(slither);

connection.onInitialize((params) => {
  workspaceRoot = params.rootUri || params.rootPath || null;
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      definitionProvider: true,
      referencesProvider: true,
      hoverProvider: true,
      documentFormattingProvider: true,
      codeActionProvider: false,
    },
  };
});

let changeDebounce = null;

async function runLintForDocument(document) {
  try {
    const diagnostics = await linter.validateDocument(document);
    publishDiagnostics(document.uri, 'linter', diagnostics || []);
  } catch (_) {
    publishDiagnostics(document.uri, 'linter', []);
  }
}

async function runCompile() {
  try {
    const diagMap = await compiler.compileWorkspace(getWorkspaceRoot());
    if (diagMap && typeof diagMap === 'object') {
      for (const uri of Object.keys(diagMap)) {
        publishDiagnostics(uri, 'compiler', diagMap[uri] || []);
      }
    }
  } catch (_) {}
}

documents.onDidSave((event) => {
  runLintForDocument(event.document);
  runCompile();
});

documents.onDidOpen((event) => {
  runLintForDocument(event.document);
});

documents.onDidChangeContent((event) => {
  if (changeDebounce) clearTimeout(changeDebounce);
  changeDebounce = setTimeout(() => {
    changeDebounce = null;
    const document = documents.get(event.document.uri);
    if (document) runLintForDocument(document);
  }, 800);
});

connection.onDefinition((params) => {
  return codeActions.onDefinition(params);
});

connection.onReferences((params) => {
  return codeActions.onReferences(params);
});

connection.onHover((params) => {
  return codeActions.onHover(params);
});

connection.onDocumentFormatting((params) => {
  return formatter.formatDocument(params);
});

connection.onRequest('osmium/runGasEstimation', () => {
  return gasEstimation.analyzeGas();
});

connection.onRequest('osmium/runSlither', () => {
  return slither.runSlitherAnalysis();
});

connection.onRequest('osmium/compileWorkspace', () => {
  return runCompile();
});

documents.listen(connection);
connection.listen();
