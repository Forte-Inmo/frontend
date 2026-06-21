import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

export function useHistory(initialValue) {
  const [state, setState] = useState(initialValue);
  const stateRef = useRef(state);
  stateRef.current = state;
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const reset = useCallback((newState) => {
    undoStack.current = [];
    redoStack.current = [];
    setCanUndo(false);
    setCanRedo(false);
    setState(newState);
  }, []);

  const record = useCallback(() => {
    undoStack.current.push(structuredClone(stateRef.current));
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop();
    redoStack.current.push(structuredClone(stateRef.current));
    setState(prev);
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop();
    undoStack.current.push(structuredClone(stateRef.current));
    setState(next);
    setCanRedo(redoStack.current.length > 0);
    setCanUndo(true);
  }, []);

  return { state, setState, reset, record, undo, redo, canUndo, canRedo };
}
