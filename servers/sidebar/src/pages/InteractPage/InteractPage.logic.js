import { MessageType } from '@/backend-enums.js';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

const getFunctionAction = (func, contract, contracts) => {
  const selectedContract = contracts?.find((c) => c.id === contract);
  const functions =
    selectedContract?.abi?.map((abi) => (abi.type === 'function' ? abi : undefined)).filter(Boolean) || [];
  const selectedFunction = functions?.find((f) => f?.name === func) || null;
  if (!selectedFunction) return MessageType.UNKNOWN;
  if (selectedFunction.stateMutability === 'view') return MessageType.READ;
  return MessageType.WRITE;
};

export const useInteractPage = (vscode, resourceManager) => {
  const [isPending, setIsPending] = useState(false);
  const form = useForm({
    defaultValues: {
      wallet: '',
      contract: '',
      function: '',
      value: 0,
      valueUnit: 'wei',
      gasLimit: 300000,
      inputs: [],
    },
  });
  const [response, setResponse] = useState(undefined);
  const selectedFunctionId = form.watch('function');
  const selectedContractId = form.watch('contract');
  const selectedWalletId = form.watch('wallet');

  const onSubmit = (data) => {
    if (Number.isNaN(data.gasLimit)) form.setError('gasLimit', { type: 'manual', message: 'Invalid number' });
    if (Number.isNaN(data.value)) form.setError('value', { type: 'manual', message: 'Invalid number' });
    setIsPending(true);
    vscode.postMessage({
      type: getFunctionAction(data.function, data.contract, resourceManager.interactContracts),
      data,
    });
  };

  useEffect(() => {
    form.setValue(
      'wallet',
      resourceManager.wallets?.length ? resourceManager.wallets[0].id : '',
    );
  }, [resourceManager.wallets]);

  useEffect(() => {
    form.setValue(
      'contract',
      resourceManager.interactContracts?.length ? resourceManager.interactContracts[0].id : '',
    );
  }, [resourceManager.interactContracts]);

  useEffect(() => {
    const listener = (event) => {
      switch (event.data.type) {
        case MessageType.WRITE_RESPONSE:
          setResponse({ responseType: MessageType.WRITE, data: event.data.response });
          break;
        case MessageType.READ_RESPONSE:
          setResponse({ responseType: MessageType.READ, data: event.data.response });
          break;
        case MessageType.ESTIMATE_GAS_RESPONSE:
          form.setValue('gasLimit', event.data.response.gas);
          break;
      }
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  useEffect(() => {
    const functions =
      resourceManager.interactContracts
        ?.find((c) => c.id === selectedContractId)
        ?.abi?.map((abi) => (abi.type === 'function' ? abi.name : undefined))
        .filter(Boolean) || [];
    if (functions.length > 0 && functions[0]) form.setValue('function', functions[0]);
  }, [selectedContractId]);

  useEffect(() => {
    if (!vscode || !selectedContractId || !selectedWalletId) return;
    const selectedContract = resourceManager.interactContracts.filter((c) => c.id === selectedContractId);
    const selectedWallet = resourceManager.wallets.filter((w) => w.id === selectedWalletId);
    if (
      !selectedContract?.length ||
      !selectedContract[0].abi ||
      !selectedWallet?.length ||
      !selectedWallet[0].address ||
      !selectedContract[0].address ||
      !selectedFunctionId
    )
      return;

    const functionAbi = selectedContract[0].abi.find((abi) => abi.type === 'function' && abi.name === selectedFunctionId);
    if (!functionAbi) return;

    const updateParams = () => {
      const params = functionAbi.inputs.map((_, i) => form.getValues(`inputs.${i}`));
      if (params.length !== functionAbi.inputs.length) return;
      for (const param of params) {
        if (param === null || param === undefined) return;
      }
      vscode.postMessage({
        type: MessageType.ESTIMATE_GAS,
        data: {
          abi: selectedContract[0].abi,
          walletAddress: selectedWallet[0].address,
          params,
          function: selectedFunctionId,
          address: selectedContract[0].address,
        },
      });
    };

    updateParams();
    const subscription = form.watch((_value, { name }) => {
      if (name?.startsWith('inputs')) updateParams();
    });
    return () => subscription.unsubscribe();
  }, [vscode, selectedContractId, selectedWalletId, selectedFunctionId]);

  return {
    form,
    vscode,
    wallets: resourceManager.wallets,
    contracts: resourceManager.interactContracts,
    onSubmit,
    response,
    isPending,
  };
};
