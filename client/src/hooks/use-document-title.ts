import { useEffect } from 'react';

/**
 * Hook personalizado para actualizar el título del documento
 * @param title - Título a establecer
 * @param suffix - Sufijo opcional para añadir al título (p.ej. nombre de la aplicación)
 */
export function useDocumentTitle(title: string, suffix: string = 'Merlin Observer') {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = suffix ? `${title} | ${suffix}` : title;
    
    // Cleanup: restaurar el título anterior al desmontar el componente
    return () => {
      document.title = previousTitle;
    };
  }, [title, suffix]);
}