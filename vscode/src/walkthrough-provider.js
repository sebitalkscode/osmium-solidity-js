const vscode = require('vscode');
const { exec } = require('child_process');

function registerWalkthroughPanel(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('osmium.walkthrough', () => {
      vscode.commands
        .executeCommand(
          'workbench.action.openWalkthrough',
          'OsmiumToolchains.osmium-solidity-extension#osmium.getStarted',
          false,
        )
        .then(undefined, (err) => {
          vscode.window.showErrorMessage(
            `Could not open walkthrough: ${err?.message || err}. Try: Welcome tab → Get Started → Osmium Solidity.`,
          );
        });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('osmium.checkIfForgeInstalled', () => {
      exec('forge --version', (err, stdout) => {
        if (err) {
          vscode.window.showErrorMessage('Foundry/Forge is not installed. Please install it.');
          vscode.commands.executeCommand('setContext', 'osmium.forgeInstalled', false);
        } else {
          vscode.window.showInformationMessage(`Foundry/Forge is installed: ${stdout}`);
          vscode.commands.executeCommand('setContext', 'osmium.forgeInstalled', true);
        }
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('osmium.checkIfSlitherInstalled', () => {
      exec('slither --version', (err, stdout) => {
        if (err) {
          vscode.window.showErrorMessage('Slither is not installed. Please install it.');
          vscode.commands.executeCommand('setContext', 'osmium.slitherInstalled', false);
        } else {
          vscode.window.showInformationMessage(`Slither is installed: ${stdout}`);
          vscode.commands.executeCommand('setContext', 'osmium.slitherInstalled', true);
        }
      });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('osmium.checkIfSolcInstalled', () => {
      exec('solc --version', (err, stdout) => {
        if (err) {
          vscode.window.showErrorMessage('Solc is not installed. Please install it.');
          vscode.commands.executeCommand('setContext', 'osmium.solcInstalled', false);
        } else {
          vscode.window.showInformationMessage(`Solc is installed: ${stdout}`);
          vscode.commands.executeCommand('setContext', 'osmium.solcInstalled', true);
        }
      });
    }),
  );
}

module.exports = {
  registerWalkthroughPanel,
};
