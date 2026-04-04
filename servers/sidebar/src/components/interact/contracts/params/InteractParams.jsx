import { VSCodeTextField } from '@vscode/webview-ui-toolkit/react';
import './InteractParams.css';
import { useInteractParams } from './InteractParams.logic.js';

export const InteractParams = (props) => {
  const logic = useInteractParams(props.contracts);

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
