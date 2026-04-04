# Osmium Solidity

This VS Code extension is a modernized rework of the original Osmium Solidity language support tool. Built primarily in JavaScript with Webview integration, it provides specialized Solidity developer tooling directly within the editor environment.

*Note: While I am not directly affiliated with the original OsmiumToolchains team, this updated version is published under their name with the permission of the original team.*
For general announcements from the original team, refer to their [Discord](https://discord.gg/vFXVFwqtHT) and [Twitter](https://twitter.com/osmiumtoolchain).

---

## Capabilities

The extension integrates with your Foundry workspace to offer the following features:

- **Interactive UI Sidebar:** Interfaces for deploying smart contracts and executing blockchain transactions compiled via `ethers.js` v6.
- **Gas Tooling:** Inline gas estimation on save, gas snapshot differences, and on-demand decoration clearing.
- **Slither Integration:** Integrated Slither security framework for vulnerability detection upon saving.
- **Foundry Support:** Core integration with `foundry.toml` scripts, including local deployment verification and environment variable management.
- **Linter & Formatter:** Base capabilities for syntax validation, formatting, and definition referencing.

## Usage

The extension can be downloaded from the VS Code Marketplace by searching for **"Osmium solidity"**.

When opening a `.sol` file or Foundry project:
1. Core compiler features (Linter, Formatter, Slither, Gas Estimation) initialize automatically.
2. The **Osmium Icon** in the Activity Bar opens the **Deploy** and **Interact** environments.
3. **Osmium Walkthroughs** are available in the welcome panels to verify your environment configuration (Anvil, Forge, Slither).

## Architecture

This iteration refactors the original extension into modular JavaScript and Webpack bundles:

- `servers/` & `vscode/`: Implements the Javascript LSP configuration, action handling logic (`Deploy.js` / `Interact.js`), and language client hooks.
- `sidebar/`: The Webview UI codebase compiled to `dist/`, executing real-time blockchain operations via the VS Code messaging API.
- `docs-panel/` & `env-panel/`: UI components for project settings and metadata oversight.
