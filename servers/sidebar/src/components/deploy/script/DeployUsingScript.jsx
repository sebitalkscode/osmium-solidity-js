import Loader from '@/components/Loader.jsx';
import { VSCodeButton, VSCodeDivider, VSCodeDropdown, VSCodeOption } from '@vscode/webview-ui-toolkit/react';
import './DeployUsingScript.css';
import { useDeployUsingScript } from './DeployUsingScript.logic.js';

export const DeployUsingScript = ({ scripts, vscode, environments, isPending, setIsPending }) => {
  const logic = useDeployUsingScript(vscode, scripts, environments, setIsPending);

  return (
    <div>
      <div>
        <div className="title-script">Deploy using script</div>
        <div className="dropdown-container">
          <label htmlFor="dropdown-environment" className="label">Environment:</label>
          <div className="environment-container">
            <VSCodeDropdown
              id="dropdown-environment"
              className="dropdown-environment"
              {...logic.form?.register('environment', { required: true })}
            >
              {environments.map((env) => (
                <VSCodeOption value={env.id} key={env.id}>
                  {env.name} ({env.rpc})
                </VSCodeOption>
              ))}
            </VSCodeDropdown>
            <VSCodeButton className="add-wallet-button" onClick={() => logic.openPanel('tab-environments')}>
              Edit
            </VSCodeButton>
          </div>
        </div>
        <div className="dropdown-container">
          <label htmlFor="dropdown" className="label">Select script:</label>
          <VSCodeDropdown id="dropdown" {...logic.form?.register('script', { required: true })}>
            {scripts?.map((script) => (
              <VSCodeOption value={script.id} key={script.id}>
                {script.name} ({script.path})
              </VSCodeOption>
            ))}
          </VSCodeDropdown>
        </div>
      </div>
      <VSCodeDivider className="divider" />
      <VSCodeButton className="submit-button" appearance="primary" type="submit">
        Deploy with script
      </VSCodeButton>
      {isPending && !logic.response && <Loader />}
      <VSCodeDivider className="divider" />
      {logic.response && (
        <div className={logic.response.exitCode !== 0 ? 'error-message' : ''}>
          {logic.response.output}
          <VSCodeDivider className="divider" />
        </div>
      )}
    </div>
  );
};
