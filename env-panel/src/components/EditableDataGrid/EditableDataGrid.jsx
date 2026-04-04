import { useState } from 'react';
import { useEditableDataGridLogic } from '@/components/EditableDataGrid/EditableDataGrid.logic.js';
import './EditableDataGrid.css';

export const EditableDataGrid = (props) => {
  const logic = useEditableDataGridLogic(props.deleteCallback, props.editCallback, props.gridId);
  const [editingCell, setEditingCell] = useState(null);

  const handleFocus = (cellId) => {
    setEditingCell(cellId);
  };

  const handleBlur = () => {
    setEditingCell(null);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800/80 shadow-md mt-6 bg-zinc-900/40 backdrop-blur-sm" id={props.gridId}>
      <table className="min-w-full text-sm text-left text-zinc-300">
        <thead className="text-xs text-zinc-400 uppercase bg-zinc-900/50 border-b border-zinc-800/80 tracking-wider">
          <tr>
            {props.headers.map((header, index) => (
              <th key={index} className="px-6 py-4 font-semibold">{header}</th>
            ))}
            <th className="px-6 py-4 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {props.data.map((line) => {
            const keys = Object.keys(line).filter((key) => key !== 'id');
            return (
              <tr key={line.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/40 transition-colors duration-200">
                {keys.map((key, index) => {
                  const cellId = `${line.id}-${key}`;
                  const isProtectedCell = props.protectedIndices?.includes(index);
                  const isEditing = editingCell === cellId;
                  const displayValue = key === 'abi' ? JSON.stringify(line[key]).substring(0, 30) + '...' : line[key];

                  return (
                    <td
                      key={cellId}
                      className={`${line.id} ${key} px-6 py-4 outline-none cursor-text ${
                        isProtectedCell && !isEditing ? 'blur-sm select-none opacity-60' : ''
                      } focus:bg-zinc-800/80 focus:ring-1 focus:ring-primary/50 relative transition-all duration-300 font-mono text-xs`}
                      id="editable-cell"
                      onFocus={() => handleFocus(cellId)}
                      onBlur={handleBlur}
                      tabIndex={0}
                    >
                      {displayValue}
                    </td>
                  );
                })}
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={logic.deleteRow}
                    id={line.id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/20 px-3 py-1.5 rounded-md font-sans text-xs font-medium transition-all focus:outline-none focus:ring-1 focus:ring-red-400/50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
          {props.data.length === 0 && (
            <tr>
              <td colSpan={props.headers.length + 1} className="px-6 py-8 text-center text-zinc-500/80 italic font-mono text-xs">
                No entries found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
