import { useDeployContractsParams } from './DeployContractParams.logic.js';
import { VSCodeTextField } from '@vscode/webview-ui-toolkit/react';
import './DeployContractParams.css';

export const DeployContractParams = (props) => {
  const logic = useDeployContractsParams(props.contracts);

  return (
    <>
      {logic.displayParams && (
        <div className="params-container">
          {logic.inputs?.map((input, index) => (
            <VSCodeTextField
              key={index}
              className="text-field"
              {...logic.form.register(`inputs.${index}`, {
                required: true,
                valueAsNumber: input.type.includes('int'),
              })}
            >
              {input.name} ({input.type})
            </VSCodeTextField>
          ))}
        </div>
      )}
    </>
  );
};
