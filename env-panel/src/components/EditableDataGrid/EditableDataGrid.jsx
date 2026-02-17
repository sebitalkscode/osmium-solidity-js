import { useState } from 'react';
import { VSCodeButton, VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow } from '@vscode/webview-ui-toolkit/react';
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
    <VSCodeDataGrid id={props.gridId}>
      <VSCodeDataGridRow>
        {props.headers.map((header, index) => (
          <VSCodeDataGridCell cellType="columnheader" grid-column={index + 1} key={index}>
            {header}
          </VSCodeDataGridCell>
        ))}
        <VSCodeDataGridCell cellType="columnheader" grid-column={props.headers.length + 1} />
      </VSCodeDataGridRow>
      {props.data.map((line) => {
        const keys = Object.keys(line).filter((key) => key !== 'id');
        const cells = keys.map((key, index) => {
          const cellId = `${line.id}-${key}`;
          const isProtectedCell = props.protectedIndices?.includes(index);
          const cellClass = isProtectedCell && editingCell !== cellId ? 'blur' : '';

          return (
            <VSCodeDataGridCell
              className={`${line.id} ${key} ${cellClass}`}
              id="editable-cell"
              grid-column={index + 1}
              key={cellId}
              onFocus={() => handleFocus(cellId)}
              onBlur={handleBlur}
              tabIndex={0}
            >
              {key === 'abi' ? JSON.stringify(line[key]) : line[key]}
            </VSCodeDataGridCell>
          );
        });
        cells.push(
          <VSCodeDataGridCell className="delete-cell" grid-column={keys.length + 1} key={`delete-${line.id}`}>
            <VSCodeButton onClick={logic.deleteRow} id={line.id}>
              Delete
            </VSCodeButton>
          </VSCodeDataGridCell>,
        );

        return <VSCodeDataGridRow key={line.id}>{cells}</VSCodeDataGridRow>;
      })}
    </VSCodeDataGrid>
  );
};
