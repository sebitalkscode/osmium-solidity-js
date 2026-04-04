import { WalletSchema } from '@/schemas/Wallet.schema.js';
import { MessageType } from '@/backend-enums.js';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

export const useWalletsPageLogic = (vscode) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(WalletSchema),
  });

  const onSubmit = (data) => {
    vscode.postMessage({ type: MessageType.ADD_WALLET, data });
  };

  const deleteWallet = (id) => {
    vscode.postMessage({ type: MessageType.DELETE_WALLET, data: { id } });
  };

  const editWallet = (id, key, value) => {
    vscode.postMessage({ type: MessageType.EDIT_WALLET, data: { id, key, value } });
  };

  return { deleteWallet, editWallet, form, onSubmit };
};
