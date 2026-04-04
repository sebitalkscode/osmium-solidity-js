const path = require('path');
const vscode = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');
const { SidebarProvider } = require('./sidebar-provider');
const { EnvPanelProvider } = require('./env-panel-provider');
const { DocsPanelProvider } = require('./docs-panel-provider');
const { InteractContractRepository } = require('./actions/InteractContractRepository');
const { WalletRepository } = require('./actions/WalletRepository');
const { EnvironmentRepository } = require('./actions/EnvironmentRepository');
const { registerWalkthroughPanel } = require('./walkthrough-provider');

let client = null;
let logChannel = null;
let gasDecorationType = null;
let sizeDecorationType = null;
let slitherDecorationTypes = null;
let statusBarCompiler = null;
let statusBarLinter = null;
let statusBarSlither = null;

function log(msg, err) {
  const line = err ? msg + ' ' + (err.message || err) : msg;
  if (logChannel) logChannel.appendLine(line);
}

function isDevelopmentHost(context) {
  const p = context.extensionUri.fsPath;
  return !p.includes(path.sep + '.vscode' + path.sep + 'extensions') && !p.includes('Extensions');
}

async function activate(context) {
  logChannel = vscode.window.createOutputChannel('Osmium');
  context.subscriptions.push(logChannel);
  log('Activating Osmium Solidity...');

  if (isDevelopmentHost(context)) {
    const devBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    devBar.text = '$(debug-alt) Osmium [dev]';
    devBar.tooltip = 'Extension Development Host';
    devBar.show();
    context.subscriptions.push(devBar);
  }

  const serverModule = context.asAbsolutePath(
    path.join('..', 'servers', 'solidity-server', 'src', 'server.js')
  );

  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc },
  };

  const clientOptions = {
    documentSelector: [{ scheme: 'file', language: 'solidity' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.sol'),
    },
    outputChannel: logChannel,
  };

  client = new LanguageClient(
    'osmium-solidity',
    'Osmium Solidity Server',
    serverOptions,
    clientOptions
  );

  setupStatusBars(context);
  setupDecorations(context);
  setupNotificationHandlers();
  setupCommands(context);
  setupPanels(context);

  await client.start();
  log('Language server started.');
}

function setupStatusBars(context) {
  statusBarCompiler = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 96);
  statusBarCompiler.text = '$(gear) Forge';
  statusBarCompiler.tooltip = 'Foundry Compiler';
  statusBarCompiler.show();
  context.subscriptions.push(statusBarCompiler);

  statusBarLinter = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 95);
  statusBarLinter.text = '$(check) Linter';
  statusBarLinter.tooltip = 'Solhint Linter';
  statusBarLinter.command = 'workbench.actions.view.problems';
  statusBarLinter.show();
  context.subscriptions.push(statusBarLinter);

  statusBarSlither = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 94);
  statusBarSlither.text = '$(shield) Slither';
  statusBarSlither.tooltip = 'Click to run Slither security analysis';
  statusBarSlither.command = 'osmium.slither-run';
  statusBarSlither.show();
  context.subscriptions.push(statusBarSlither);
}

function setupDecorations(context) {
  gasDecorationType = vscode.window.createTextEditorDecorationType({
    after: { margin: '0 0 0 1.5em', fontStyle: 'italic' },
    isWholeLine: false,
  });
  context.subscriptions.push(gasDecorationType);

  sizeDecorationType = vscode.window.createTextEditorDecorationType({
    after: { fontStyle: 'italic' },
    isWholeLine: false,
  });
  context.subscriptions.push(sizeDecorationType);

  slitherDecorationTypes = {
    high: vscode.window.createTextEditorDecorationType({ after: { margin: '0 0 0 1.5em', fontStyle: 'italic' } }),
    medium: vscode.window.createTextEditorDecorationType({ after: { margin: '0 0 0 1.5em', fontStyle: 'italic' } }),
    low: vscode.window.createTextEditorDecorationType({ after: { margin: '0 0 0 1.5em', fontStyle: 'italic' } }),
    info: vscode.window.createTextEditorDecorationType({ after: { margin: '0 0 0 1.5em', fontStyle: 'italic' } }),
    optimization: vscode.window.createTextEditorDecorationType({ after: { margin: '0 0 0 1.5em', fontStyle: 'italic' } }),
  };
  context.subscriptions.push(
    slitherDecorationTypes.high,
    slitherDecorationTypes.medium,
    slitherDecorationTypes.low,
    slitherDecorationTypes.info,
    slitherDecorationTypes.optimization
  );
}

function setupNotificationHandlers() {
  client.onNotification('osmium/compilerStatus', function (params) {
    if (!statusBarCompiler) return;
    if (params.status === 'compiling') {
      statusBarCompiler.text = '$(sync~spin) Forge: compiling...';
      statusBarCompiler.backgroundColor = undefined;
    } else if (params.status === 'error') {
      statusBarCompiler.text = '$(error) Forge: ' + params.errorCount + ' error(s)';
      statusBarCompiler.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else if (params.status === 'warning') {
      statusBarCompiler.text = '$(warning) Forge: ' + params.warningCount + ' warning(s)';
      statusBarCompiler.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    } else {
      statusBarCompiler.text = '$(check) Forge: build OK';
      statusBarCompiler.backgroundColor = undefined;
    }
  });

  client.onNotification('osmium/contractSizes', function (params) {
    if (!sizeDecorationType || !Array.isArray(params)) return;
    var byFile = {};
    for (var i = 0; i < params.length; i++) {
      var item = params[i];
      var key = item.file;
      if (!byFile[key]) byFile[key] = [];
      var pct = ((item.bytes / item.limit) * 100).toFixed(1);
      var label = '  ' + formatSize(item.bytes) + ' / ' + formatSize(item.limit) + ' bytes (' + pct + '%)';
      if (item.bytes > item.limit) label += ' OVER LIMIT!';
      var color = sizeColor(item.bytes, item.limit);
      byFile[key].push({
        range: new vscode.Range(item.line, 0, item.line, 200),
        renderOptions: { after: { contentText: label, color: color, fontStyle: 'italic', margin: '0 0 0 1em' } },
      });
    }
    vscode.window.visibleTextEditors.forEach(function (editor) {
      var fp = editor.document.uri.fsPath;
      var decs = byFile[fp] || byFile[normalizeUri(editor.document.uri)] || [];
      editor.setDecorations(sizeDecorationType, decs);
    });
  });

  client.onNotification('osmium/gasReport', function (params) {
    if (!gasDecorationType) return;
    applyGasDecorations(params);
  });

  client.onNotification('osmium/slitherReport', function (params) {
    if (!slitherDecorationTypes) return;
    applySlitherDecorations(params);
    if (statusBarSlither) {
      var count = params.findings ? params.findings.length : 0;
      if (count === 0) {
        statusBarSlither.text = '$(shield) Slither: clean';
        statusBarSlither.backgroundColor = undefined;
      } else {
        statusBarSlither.text = '$(shield) Slither: ' + count + ' finding(s)';
        var hasHigh = params.findings.some(function (f) { return f.impact === 'High'; });
        statusBarSlither.backgroundColor = hasHigh
          ? new vscode.ThemeColor('statusBarItem.errorBackground')
          : new vscode.ThemeColor('statusBarItem.warningBackground');
      }
    }
  });
}

function setupCommands(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('osmium.gas-estimation', function () {
      if (client) client.sendRequest('osmium/runGasEstimation', {});
    }),
    vscode.commands.registerCommand('osmium.slither-run', function () {
      if (statusBarSlither) {
        statusBarSlither.text = '$(sync~spin) Slither: scanning...';
        statusBarSlither.backgroundColor = undefined;
      }
      if (client) client.sendRequest('osmium/runSlither', {});
    }),
    vscode.commands.registerCommand('osmium.slither-clear', function () {
      clearSlitherDecorations();
      if (statusBarSlither) {
        statusBarSlither.text = '$(shield) Slither';
        statusBarSlither.backgroundColor = undefined;
      }
    }),
    vscode.commands.registerCommand('osmium.gas-clear', function () {
      vscode.window.visibleTextEditors.forEach(function (e) {
        e.setDecorations(gasDecorationType, []);
      });
    }),
    vscode.commands.registerCommand('osmium.format-sol-file', function () {
      vscode.commands.executeCommand('editor.action.formatDocument');
    }),
    vscode.commands.registerCommand('osmium.format-sol-workspace', function () {
      var ws = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
      if (!ws) return;
      var child_process = require('child_process');
      child_process.exec('forge fmt', { cwd: ws.uri.fsPath }, function (err) {
        if (err) {
          vscode.window.showErrorMessage('Osmium: Workspace format failed — ' + err.message);
        } else {
          vscode.window.showInformationMessage('Osmium: Workspace formatted.');
        }
      });
    }),
    vscode.commands.registerCommand('osmium.gas-snapshot-diff', function () {
      var ws = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
      if (!ws) return;
      var child_process = require('child_process');
      var outputChannel = vscode.window.createOutputChannel('Osmium Gas Snapshot');
      outputChannel.show();
      child_process.exec('forge snapshot --diff', { cwd: ws.uri.fsPath, maxBuffer: 4 * 1024 * 1024 }, function (err, stdout, stderr) {
        if (err) {
          outputChannel.appendLine('Gas snapshot diff failed: ' + (stderr || err.message));
        } else {
          outputChannel.appendLine(stdout || 'No diff output.');
        }
      });
    })
  );
}

function setupPanels(context) {
  try {
    vscode.commands.executeCommand('setContext', 'Osmium.showsidebar', true);

    var fsPath = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0]
      ? vscode.workspace.workspaceFolders[0].uri.fsPath : '';
    var interactContractRepository = new InteractContractRepository(fsPath);
    var walletRepository = new WalletRepository(fsPath);
    var environmentRepository = new EnvironmentRepository(fsPath);

    var docsPanelProvider = new DocsPanelProvider(context.extensionUri);
    var envPanelProvider = new EnvPanelProvider(
      context.extensionUri, interactContractRepository, walletRepository, environmentRepository
    );
    var sidebarProvider = new SidebarProvider(
      context.extensionUri, interactContractRepository, walletRepository, environmentRepository, envPanelProvider
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('osmium.show-env-panel', function () {
        envPanelProvider.resolveWebview(context);
      }),
      vscode.commands.registerCommand('osmium.documentation', function () {
        docsPanelProvider.resolveWebview(context);
      })
    );

    registerWalkthroughPanel(context);

    var interactDeployHandler = vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider);
    context.subscriptions.push(interactDeployHandler);
  } catch (e) {
    log('Panels init error', e);
  }
}

function applyGasDecorations(params) {
  if (!params || !params.functions) return;
  var gasByContract = {};
  for (var i = 0; i < params.functions.length; i++) {
    var fn = params.functions[i];
    if (!fn.contract || !fn.function) continue;
    var key = fn.contract;
    if (!gasByContract[key]) gasByContract[key] = [];
    gasByContract[key].push(fn);
  }
  vscode.window.visibleTextEditors.forEach(function (editor) {
    if (editor.document.languageId !== 'solidity') return;
    var text = editor.document.getText();
    var lines = text.split('\n');
    var decs = [];
    var currentContract = null;
    for (var li = 0; li < lines.length; li++) {
      var contractMatch = lines[li].match(/^\s*(?:abstract\s+)?contract\s+(\w+)/);
      if (contractMatch) currentContract = contractMatch[1];
      if (!currentContract || !gasByContract[currentContract]) continue;
      var fnMatch = lines[li].match(/^\s*function\s+(\w+)/);
      if (!fnMatch) continue;
      var fnName = fnMatch[1];
      var gasEntries = gasByContract[currentContract];
      for (var gi = 0; gi < gasEntries.length; gi++) {
        if (gasEntries[gi].function === fnName) {
          var g = gasEntries[gi];
          decs.push({
            range: new vscode.Range(li, 0, li, lines[li].length),
            renderOptions: {
              after: {
                contentText: '  Gas: ' + formatNum(g.avg) + ' avg (' + formatNum(g.min) + ' - ' + formatNum(g.max) + ')',
                color: gasColor(g.avg),
                fontStyle: 'italic',
                margin: '0 0 0 1.5em',
              },
            },
          });
          break;
        }
      }
    }
    editor.setDecorations(gasDecorationType, decs);
  });
}

function applySlitherDecorations(params) {
  clearSlitherDecorations();
  if (!params || !params.findings) return;
  var byFile = { high: {}, medium: {}, low: {}, info: {}, optimization: {} };
  for (var i = 0; i < params.findings.length; i++) {
    var f = params.findings[i];
    if (!f.file) continue;
    var sev = (f.impact || '').toLowerCase();
    if (sev !== 'high' && sev !== 'medium' && sev !== 'low' && sev !== 'optimization') sev = 'info';
    if (!byFile[sev][f.file]) byFile[sev][f.file] = [];
    var label = '  ' + f.impact + ': ' + f.check;
    byFile[sev][f.file].push({
      range: new vscode.Range(f.line || 0, 0, f.line || 0, 200),
      renderOptions: { after: { contentText: label, color: slitherColor(f.impact), fontStyle: 'italic', margin: '0 0 0 1.5em' } },
    });
  }
  vscode.window.visibleTextEditors.forEach(function (editor) {
    var fp = editor.document.uri.fsPath;
    editor.setDecorations(slitherDecorationTypes.high, byFile.high[fp] || []);
    editor.setDecorations(slitherDecorationTypes.medium, byFile.medium[fp] || []);
    editor.setDecorations(slitherDecorationTypes.low, byFile.low[fp] || []);
    editor.setDecorations(slitherDecorationTypes.info, byFile.info[fp] || []);
    editor.setDecorations(slitherDecorationTypes.optimization, byFile.optimization[fp] || []);
  });
}

function clearSlitherDecorations() {
  if (!slitherDecorationTypes) return;
  vscode.window.visibleTextEditors.forEach(function (e) {
    e.setDecorations(slitherDecorationTypes.high, []);
    e.setDecorations(slitherDecorationTypes.medium, []);
    e.setDecorations(slitherDecorationTypes.low, []);
    e.setDecorations(slitherDecorationTypes.info, []);
    e.setDecorations(slitherDecorationTypes.optimization, []);
  });
}

function formatSize(bytes) {
  return String(bytes).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatNum(n) {
  return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function sizeColor(bytes, limit) {
  var pct = bytes / (limit || 24576);
  if (pct < 0.5) return 'rgba(78, 205, 130, 0.85)';
  if (pct < 0.8) return 'rgba(255, 193, 37, 0.85)';
  if (pct < 1.0) return 'rgba(255, 140, 50, 0.9)';
  return 'rgba(255, 60, 60, 0.95)';
}

function gasColor(avg) {
  if (avg < 50000) return 'rgba(78, 205, 130, 0.85)';
  if (avg < 200000) return 'rgba(255, 193, 37, 0.85)';
  return 'rgba(255, 80, 80, 0.85)';
}

function slitherColor(impact) {
  switch ((impact || '').toLowerCase()) {
    case 'high': return 'rgba(255, 80, 80, 0.85)';
    case 'medium': return 'rgba(255, 180, 50, 0.85)';
    case 'low': return 'rgba(220, 220, 80, 0.85)';
    case 'optimization': return 'rgba(100, 220, 150, 0.85)';
    default: return 'rgba(100, 180, 255, 0.85)';
  }
}

function normalizeUri(uri) {
  return uri.toString();
}

async function deactivate() {
  if (client) {
    await client.stop();
  }
}

module.exports = { activate, deactivate };
