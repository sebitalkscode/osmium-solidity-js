import { useEffect, useState } from 'react';
import { MessageType } from '@/backend-enums.js';

export const useResourceManager = (vscode) => {
  const [wallets, setWallets] = useState([]);
  const [scripts, setScripts] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [interactContracts, setInteractContracts] = useState([]);
  const [deployContracts, setDeployContracts] = useState([]);

  useEffect(() => {
    if (!vscode) return;
    vscode.postMessage({ type: MessageType.GET_WALLETS });
    vscode.postMessage({ type: MessageType.GET_SCRIPTS });
    vscode.postMessage({ type: MessageType.GET_ENVIRONMENTS });
    vscode.postMessage({ type: MessageType.GET_DEPLOY_CONTRACTS });
    vscode.postMessage({ type: MessageType.GET_INTERACT_CONTRACTS });
  }, [vscode]);

  useEffect(() => {
    const listener = (event) => {
      switch (event.data.type) {
        case MessageType.WALLETS:
          setWallets(event.data.wallets);
          break;
        case MessageType.SCRIPTS:
          setScripts(event.data.scripts);
          break;
        case MessageType.ENVIRONMENTS:
          setEnvironments(event.data.environments);
          break;
        case MessageType.DEPLOY_CONTRACTS:
          setDeployContracts(event.data.contracts);
          break;
        case MessageType.INTERACT_CONTRACTS:
          setInteractContracts(event.data.contracts);
          break;
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  return {
    wallets,
    scripts,
    environments,
    interactContracts,
    deployContracts,
  };
};
