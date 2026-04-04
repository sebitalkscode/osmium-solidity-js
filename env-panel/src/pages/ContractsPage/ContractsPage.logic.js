import { ContractSchema } from '@/schemas/Contract.schema.js';
import { MessageType } from '@/backend-enums.js';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

export const useContractsPageLogic = (vscode) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(ContractSchema),
  });

  const onSubmit = (data) => {
    vscode.postMessage({ type: MessageType.ADD_CONTRACT, data });
  };

  const deleteContract = (id) => {
    vscode.postMessage({ type: MessageType.DELETE_CONTRACT, data: { id } });
  };

  const editContract = (id, key, value) => {
    try {
      vscode.postMessage({
        type: MessageType.EDIT_CONTRACT,
        data: { id, key, value: key === 'abi' ? JSON.parse(value) : value },
      });
    } catch (error) {
      throw new Error('Impossible to parse ABI');
    }
  };

  return { form, onSubmit, deleteContract, editContract };
};
