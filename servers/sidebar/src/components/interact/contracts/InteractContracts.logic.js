import { MessageType } from '@/backend-enums.js';
import { useFormContext } from 'react-hook-form';

export const useInteractContracts = (contracts, vscode) => {
  const { register, watch, formState: { errors } } = useFormContext();
  const selectedContract = watch('contract');

  const openPanel = (id) => {
    vscode.postMessage({ type: MessageType.OPEN_PANEL, data: { id } });
  };

  const functions =
    contracts
      ?.find((c) => c.id === selectedContract)
      ?.abi?.map((abi) => (abi.type === 'function' ? abi.name : undefined))
      .filter(Boolean) || [];

  return { register, functions, errors, openPanel };
};
