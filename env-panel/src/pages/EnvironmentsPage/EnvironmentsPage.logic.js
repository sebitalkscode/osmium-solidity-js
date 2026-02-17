import { EnvironmentSchema } from '@/schemas/Environment.schema.js';
import { MessageType } from '@/backend-enums.js';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

export const useEnvironmentsPageLogic = (vscode) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(EnvironmentSchema),
  });

  const onSubmit = (data) => {
    if (!data.name.length) form.setError('name', { type: 'manual', message: 'Invalid string' });
    if (!data.rpc.length) form.setError('rpc', { type: 'manual', message: 'Invalid string' });
    vscode.postMessage({ type: MessageType.ADD_ENVIRONMENT, data });
  };

  const deleteEnvironment = (id) => {
    vscode.postMessage({ type: MessageType.DELETE_ENVIRONMENT, data: { id } });
  };

  const editEnvironment = (id, key, value) => {
    vscode.postMessage({ type: MessageType.EDIT_ENVIRONMENT, data: { id, key, value } });
  };

  return { form, onSubmit, deleteEnvironment, editEnvironment };
};
