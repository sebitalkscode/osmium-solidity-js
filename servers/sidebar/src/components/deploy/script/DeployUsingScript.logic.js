import { MessageType } from '@/backend-enums.js';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';

export const useDeployUsingScript = (vscode, scripts, environments, setIsPending) => {
  const form = useFormContext();
  const { formState: { errors } } = form;
  const [response, setResponse] = useState(null);

  const openPanel = (id) => {
    vscode.postMessage({ type: MessageType.OPEN_PANEL, data: { id } });
  };

  useEffect(() => {
    const listener = (event) => {
      if (event.data.type === MessageType.DEPLOY_SCRIPT_RESPONSE) {
        setResponse(event.data.response);
        setIsPending(false);
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [setIsPending]);

  useEffect(() => {
    form.setValue('script', scripts[0]?.id || '');
  }, [scripts]);

  useEffect(() => {
    form.setValue('environment', environments[0]?.id || '');
  }, [environments]);

  return { form, errors, response, openPanel };
};
