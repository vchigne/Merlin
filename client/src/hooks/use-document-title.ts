import { useEffect } from 'react';

/**
 * Hook para actualizar el título del documento
 * @param title El título que se establecerá para el documento
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    // Guardar el título original para restaurarlo cuando el componente se desmonte
    const originalTitle = document.title;
    
    // Establecer el nuevo título
    document.title = title;
    
    // Restaurar el título original cuando el componente se desmonte
    return () => {
      document.title = originalTitle;
    };
  }, [title]);
}