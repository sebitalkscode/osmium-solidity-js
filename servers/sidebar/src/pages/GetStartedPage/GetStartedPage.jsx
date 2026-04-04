import './GetStartedPage.css';
import { VSCodeButton } from '@vscode/webview-ui-toolkit/react';
import { MessageType } from '@/backend-enums.js';
import { useState } from 'react';

export const GetStartedPage = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const openDocumentation = () => {
    props.vscode.postMessage({ type: MessageType.OPEN_DOCUMENTATION });
  };

  const openWalkthrough = () => {
    props.vscode.postMessage({ type: MessageType.OPEN_WALKTHROUGH });
  };

  return isVisible && (
    <div className="getStarted-container">
      <div className="text-container" onClick={() => setIsOpen(!isOpen)}>
        <div className="close-button" onClick={() => setIsVisible(false)}>X</div>
        <h1 className="title">
          <span>{isOpen ? '▼ ' : '► '}</span>
          Get Started with Osmium
        </h1>
        <p className="subtitle">Unfold to discover Osmium Solidity's features</p>
      </div>
      {isOpen && (
        <div className="button-container">
          <VSCodeButton className="documentation-button" onClick={openDocumentation}>Documentation</VSCodeButton>
          <VSCodeButton className="walkthrough-button" onClick={openWalkthrough}>Walkthroughs</VSCodeButton>
        </div>
      )}
    </div>
  );
};
