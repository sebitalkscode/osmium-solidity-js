import { MessageType } from '@/backend-enums.js';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

export const useDeployUsingContract = (vscode, wallets, contracts, environments, setIsPending) => {
  const form = useFormContext();
  const { formState: { errors } } = form;
  const [response, setResponse] = useState(null);

  useEffect(() => {
    const listener = (event) => {
      if (event.data.type === MessageType.DEPLOY_CONTRACT_RESPONSE) {
        setResponse(event.data.response);
        setIsPending(false);
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [setIsPending]);

  const openPanel = (id) => {
    vscode.postMessage({ type: MessageType.OPEN_PANEL, data: { id } });
  };

  useEffect(() => {
    form.setValue('wallet', wallets[0]?.id || '');
  }, [wallets]);

  useEffect(() => {
    form.setValue('contract', contracts[0]?.id || '');
  }, [contracts]);

  useEffect(() => {
    form.setValue('environment', environments[0]?.id || '');
  }, [environments]);

  return { form, errors, response, openPanel };
};
