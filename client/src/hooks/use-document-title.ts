import { useEffect } from 'react';

/**
 * Hook para establecer el título del documento
 * @param title El título que se quiere establecer para la página
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    // Guardar el título original para restaurarlo cuando el componente se desmonte
    const originalTitle = document.title;
    
    // Establecer el nuevo título
    document.title = `${title} | Merlin Observer`;
    
    // Restaurar el título original cuando el componente se desmonte
    return () => {
      document.title = originalTitle;
    };
  }, [title]);
}