import { useEffect, useState } from 'react';
import { MessageType } from '@/backend-enums.js';

export const useResourceManager = (vscode) => {
  const [wallets, setWallets] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [interactContracts, setInteractContracts] = useState([]);
  const [openingPanelId, setOpeningPanelId] = useState('');

  useEffect(() => {
    if (!vscode) return;
    vscode.postMessage({ type: MessageType.GET_WALLETS });
    vscode.postMessage({ type: MessageType.GET_ENVIRONMENTS });
    vscode.postMessage({ type: MessageType.GET_INTERACT_CONTRACTS });
  }, [vscode]);

  useEffect(() => {
    const listener = (event) => {
      switch (event.data.type) {
        case MessageType.WALLETS:
          setWallets(event.data.wallets);
          break;
        case MessageType.ENVIRONMENTS:
          setEnvironments(event.data.environments);
          break;
        case MessageType.INTERACT_CONTRACTS:
          setInteractContracts(event.data.contracts);
          break;
        case MessageType.OPEN_PANEL_RESPONSE:
          setOpeningPanelId(event.data.id);
          break;
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  return {
    wallets,
    environments,
    interactContracts,
    openingPanelId,
    setOpeningPanelId,
  };
};
