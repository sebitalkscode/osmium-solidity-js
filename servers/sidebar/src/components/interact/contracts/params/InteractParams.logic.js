import { useEffect } from 'react';
import { useFormContext } from 'react-hook-form';

export const useInteractParams = (contracts) => {
  const form = useFormContext();
  const selectedFunction = form.watch('function');
  const selectedContractAddress = form.watch('contract');
  const selectedContract = contracts?.find((c) => c.id === selectedContractAddress);
  const functions =
    selectedContract?.abi?.map((abi) => (abi.type === 'function' ? abi : undefined)).filter(Boolean) || [];
  const func = functions?.find((f) => f?.name === selectedFunction) || null;
  const inputs = func?.inputs || [];
  const displayParams = inputs?.length > 0;

  useEffect(() => {
    form.resetField('inputs');
  }, [selectedFunction, selectedContractAddress]);

  return { inputs, form, displayParams };
};
