import { useEffect, useState } from 'react';
import { useResourceManager } from '@/hooks/useResourceManager.js';

export const useApp = () => {
  const [vscode, setVscode] = useState(undefined);
  const resourceManager = useResourceManager(vscode);

  useEffect(() => {
    setVscode(typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined);
  }, []);

  const onTabChange = (event) => {
    const tabId = event.detail?.id;
    if (!tabId || !tabId.startsWith('tab-')) return;
    resourceManager.setOpeningPanelId(tabId);
  };

  return {
    vscode,
    resourceManager,
    onTabChange,
  };
};
