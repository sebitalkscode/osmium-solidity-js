import { DeployPage } from '@/pages/DeployPage/DeployPage.jsx';
import { InteractPage } from '@/pages/InteractPage/InteractPage.jsx';
import { GetStartedPage } from '@/pages/GetStartedPage/GetStartedPage.jsx';
import { VSCodePanels, VSCodePanelTab, VSCodePanelView } from '@vscode/webview-ui-toolkit/react';
import { useApp } from '@/App.logic.js';

export const App = () => {
  const logic = useApp();

  return (
    <>
      <GetStartedPage vscode={logic.vscode} />
      <VSCodePanels>
        <VSCodePanelTab id="tab-interact">INTERACT</VSCodePanelTab>
        <VSCodePanelTab id="tab-deploy">DEPLOY</VSCodePanelTab>
        <VSCodePanelView id="view-interact">
          <InteractPage vscode={logic.vscode} resourceManager={logic.resourceManager} />
        </VSCodePanelView>
        <VSCodePanelView id="view-deploy">
          <DeployPage vscode={logic.vscode} resourceManager={logic.resourceManager} />
        </VSCodePanelView>
      </VSCodePanels>
    </>
  );
};
