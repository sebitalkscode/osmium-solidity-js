import { useEffect, useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

export const useDeployContractsParams = (contracts) => {
  const form = useFormContext();
  const selectedContractId = form.watch('contract');
  const inputs = useMemo(() => {
    const res = [];
    if (selectedContractId && contracts) {
      const selectedContract = contracts.find((c) => c.id === selectedContractId);
      if (selectedContract?.abi) {
        const constructorAbi = selectedContract.abi.find((abi) => abi.type === 'constructor');
        if (constructorAbi?.inputs) res.push(...constructorAbi.inputs);
      }
    }
    return res;
  }, [selectedContractId, contracts]);

  const displayParams = inputs?.length > 0;

  useEffect(() => {
    return () => {
      inputs.forEach((_, idx) => form.resetField(`inputs.${idx}`));
    };
  }, [inputs]);

  return { inputs, form, displayParams };
};
