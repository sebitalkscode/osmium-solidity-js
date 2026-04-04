import './EnvironmentsPage.css';
import { EditableDataGrid } from '@/components/EditableDataGrid/EditableDataGrid.jsx';
import { useEnvironmentsPageLogic } from '@/pages/EnvironmentsPage/EnvironmentsPage.logic.js';
import { FormProvider } from 'react-hook-form';

export const EnvironmentsPage = (props) => {
  const logic = useEnvironmentsPageLogic(props.vscode);

  return (
    <FormProvider {...logic.form}>
      <form onSubmit={logic.form.handleSubmit(logic.onSubmit)}>
        <div className="flex flex-row gap-4 mb-4">
          <div className="flex flex-col w-full group">
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide group-focus-within:text-primary transition-colors">Name</label>
            <input 
              type="text"
              {...logic.form.register('name', { required: true })}
              className="bg-zinc-900/50 border border-zinc-700/60 text-zinc-100 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none px-3.5 py-2.5 text-sm transition-all shadow-inner"
              placeholder="e.g. Localnode"
            />
            {logic.form.formState.errors.name && (
              <span className="text-xs text-red-400 mt-1.5">{logic.form.formState.errors.name.message}</span>
            )}
          </div>
          <div className="flex flex-col w-full group">
            <label className="text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide group-focus-within:text-primary transition-colors">Rpc</label>
            <input 
              type="text"
              {...logic.form.register('rpc', { required: true })}
              className="bg-zinc-900/50 border border-zinc-700/60 text-zinc-100 rounded-md focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none px-3.5 py-2.5 text-sm transition-all shadow-inner font-mono"
              placeholder="http://127.0.0.1:8545"
            />
            {logic.form.formState.errors.rpc && (
              <span className="text-xs text-red-400 mt-1.5">{logic.form.formState.errors.rpc.message}</span>
            )}
          </div>
        </div>
        <button 
          type="submit" 
          className="w-full bg-primary hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
        >
          Add Environment
        </button>
        <EditableDataGrid
          headers={['Name', 'Rpc']}
          data={props.resourceManager.environments}
          deleteCallback={logic.deleteEnvironment}
          editCallback={logic.editEnvironment}
          gridId="environments-grid"
        />
      </form>
    </FormProvider>
  );
};
