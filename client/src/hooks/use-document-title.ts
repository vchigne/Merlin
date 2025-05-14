import { useEffect } from 'react';

/**
 * Hook para actualizar el título del documento.
 * @param title - El título a establecer
 * @param includeAppName - Si se debe incluir el nombre de la aplicación (por defecto: true)
 */
export function useDocumentTitle(title: string, includeAppName = true) {
  useEffect(() => {
    const appName = 'Merlin Dashboard';
    document.title = includeAppName ? `${title} | ${appName}` : title;
    
    return () => {
      document.title = appName;
    };
  }, [title, includeAppName]);
}