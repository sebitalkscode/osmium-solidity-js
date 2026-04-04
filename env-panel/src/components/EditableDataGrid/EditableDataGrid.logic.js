import { useEffect } from 'react';

export const useEditableDataGridLogic = (deleteCallback, editCallback, gridId) => {
  const dataGrid = document.getElementById(gridId);

  useEffect(() => {
    if (dataGrid) {
      dataGrid.onclick = cellClick;
    }
  }, [dataGrid]);

  const cellClick = (cell) => {
    const { srcElement } = cell;
    if (srcElement && srcElement.id === 'editable-cell') {
      const handleChange = (target) => {
        const newValue = target.textContent;
        editCallback(srcElement.className.split(' ')[0], srcElement.className.split(' ')[1], newValue);
        srcElement.setAttribute('contenteditable', 'false');
        srcElement.onkeydown = undefined;
        srcElement.onblur = undefined;
      };

      srcElement.onkeydown = (e) => {
        if (e.code === 'Enter') {
          handleChange(e.target);
          return false;
        }
      };

      srcElement.onblur = (e) => {
        handleChange(e.target);
      };

      srcElement.setAttribute('contenteditable', 'true');
    }
  };

  const deleteRow = (event) => {
    const id = event.target.id;
    deleteCallback(id);
  };

  return { deleteRow };
};
