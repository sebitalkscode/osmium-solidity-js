# Osmium Solidity

A VS Code extension for Solidity development, built with a JavaScript LSP server architecture.

## Features

- **Linting** via solhint with inline diagnostics
- **Compiler** integration with Foundry (`forge build`) including error/warning parsing and contract size checking (EIP-170)
- **Formatter** using Prettier with `prettier-plugin-solidity`, fallback to `forge fmt`
- **Gas Estimation** via `forge test --gas-report` with inline decorations
- **Slither** security analysis with rich diagnostics
- **Code Intelligence** — Go-to-Definition, Find References, Hover with NatSpec
- **Deploy & Interact** sidebar for smart contract deployment and interaction

## Architecture

The extension uses a Language Server Protocol (LSP) client-server model:

- **`vscode/`** — Thin VS Code client extension (JavaScript)
- **`servers/solidity-server/`** — Node.js LSP server handling linting, compilation, formatting, gas estimation, Slither, and code intelligence
- **`servers/sidebar/`**, **`docs-panel/`**, **`env-panel/`** — Webview panels (JavaScript/JSX, built with Vite)

## Install and run

Requires [pnpm](https://pnpm.io/) (the repo uses pnpm workspaces).

```bash
pnpm install
pnpm run build:recode
```

Then press **F5** in VS Code to launch the Extension Development Host.

## Testing

Open any folder containing `.sol` files in the Extension Development Host. Use the Osmium sidebar, **Osmium: Documentation**, and **Osmium: Open environment panel** commands to access all features.
