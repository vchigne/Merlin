import { useEffect } from 'react';

/**
 * Hook para actualizar el título del documento
 * @param title Título a establecer
 * @param suffix Sufijo opcional (ej. '| Merlin')
 */
export function useDocumentTitle(title: string, suffix: string = '| Merlin') {
  useEffect(() => {
    // Guarda el título original para restaurarlo
    const originalTitle = document.title;
    
    // Actualiza el título
    document.title = `${title} ${suffix}`;
    
    // Restaura el título original cuando el componente se desmonte
    return () => {
      document.title = originalTitle;
    };
  }, [title, suffix]);
}