import { useEffect, useState } from 'react';
import { useResourceManager } from '@/hooks/useResourceManager.js';

export const useApp = () => {
  const [vscode, setVscode] = useState(undefined);
  const resourceManager = useResourceManager(vscode);

  useEffect(() => {
    setVscode(typeof acquireVsCodeApi !== 'undefined' ? acquireVsCodeApi() : undefined);
  }, []);

  return { vscode, resourceManager };
};
