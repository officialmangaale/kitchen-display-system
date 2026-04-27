import { useState, useCallback, useRef } from 'react';

let toastId = 0;

/**
 * Toast notification hook.
 * Returns { toasts, addToast, removeToast }
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = ++toastId;
      const toast = { id, message, type, createdAt: Date.now() };

      setToasts((prev) => {
        // Keep max 5 toasts
        const next = [...prev, toast];
        if (next.length > 5) next.shift();
        return next;
      });

      timersRef.current[id] = setTimeout(() => {
        removeToast(id);
      }, duration);

      return id;
    },
    [removeToast]
  );

  return { toasts, addToast, removeToast };
}
