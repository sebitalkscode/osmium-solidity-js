import { MessageType } from '@/backend-enums.js';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

export const useDeployPage = (vscode, resourceManager) => {
  const [isPendingContract, setIsPendingContract] = useState(false);
  const [isPendingScript, setIsPendingScript] = useState(false);
  const scriptForm = useForm({
    defaultValues: { environment: '', script: '' },
  });

  const contractForm = useForm({
    defaultValues: {
      wallet: '',
      contract: '',
      environment: '',
      value: 0,
      valueUnit: 'wei',
      gasLimit: 300000,
      inputs: [],
    },
  });

  const onSubmitScriptForm = (data) => {
    setIsPendingScript(true);
    vscode.postMessage({ type: MessageType.DEPLOY_SCRIPT, data });
  };

  const onSubmitContractForm = (data) => {
    if (Number.isNaN(data.gasLimit)) contractForm.setError('gasLimit', { type: 'manual', message: 'Invalid number' });
    if (Number.isNaN(data.value)) contractForm.setError('value', { type: 'manual', message: 'Invalid number' });
    setIsPendingContract(true);
    vscode.postMessage({ type: MessageType.DEPLOY_CONTRACT, data });
  };

  return {
    scriptForm,
    contractForm,
    vscode,
    wallets: resourceManager.wallets,
    scripts: resourceManager.scripts,
    environments: resourceManager.environments,
    contracts: resourceManager.deployContracts,
    onSubmitContractForm,
    onSubmitScriptForm,
    isPendingScript,
    isPendingContract,
    setIsPendingScript,
    setIsPendingContract,
  };
};
