import { useState, useEffect } from 'react';

/**
 * Hook para retrasar la actualización de un valor hasta que haya dejado de cambiar
 * por el tiempo especificado.
 * Ideal para auto-guardado o búsquedas mientras el usuario escribe.
 * 
 * @param {any} value - El valor a observar
 * @param {number} delay - El tiempo de espera en milisegundos
 * @returns {any} El valor debounced
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Configuramos el temporizador para actualizar el valor después del retraso
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Si el valor cambia antes de que termine el temporizador,
    // limpiamos el temporizador anterior y empezamos de nuevo.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
