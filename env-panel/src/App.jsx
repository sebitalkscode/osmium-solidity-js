import { VSCodePanels, VSCodePanelTab, VSCodePanelView } from '@vscode/webview-ui-toolkit/react';
import './App.css';
import { WalletsPage } from '@/pages/WalletsPage/WalletsPage.jsx';
import { EnvironmentsPage } from '@/pages/EnvironmentsPage/EnvironmentsPage.jsx';
import { ContractsPage } from '@/pages/ContractsPage/ContractsPage.jsx';
import { useApp } from '@/App.logic.js';

export const App = () => {
  const logic = useApp();

  return (
    <div className="app-container">
      <VSCodePanels activeid={logic.resourceManager.openingPanelId} onChange={logic.onTabChange}>
        <VSCodePanelTab id="tab-wallets">WALLETS</VSCodePanelTab>
        <VSCodePanelTab id="tab-environments">ENVIRONMENTS</VSCodePanelTab>
        <VSCodePanelTab id="tab-contracts">CONTRACTS</VSCodePanelTab>
        <VSCodePanelView id="view-wallets">
          <WalletsPage resourceManager={logic.resourceManager} vscode={logic.vscode} />
        </VSCodePanelView>
        <VSCodePanelView id="view-environments">
          <EnvironmentsPage resourceManager={logic.resourceManager} vscode={logic.vscode} />
        </VSCodePanelView>
        <VSCodePanelView id="view-contracts">
          <ContractsPage resourceManager={logic.resourceManager} vscode={logic.vscode} />
        </VSCodePanelView>
      </VSCodePanels>
    </div>
  );
};
