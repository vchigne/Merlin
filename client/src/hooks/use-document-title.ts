import { useEffect } from 'react';

/**
 * Hook to set the document title with optional prefix and suffix
 * @param title The main title to set
 * @param options Optional configuration
 */
export function useDocumentTitle(
  title: string,
  options: { 
    prefix?: string;
    suffix?: string;
    appName?: string;
  } = {}
) {
  const {
    prefix = '',
    suffix = '',
    appName = 'Merlin Observer'
  } = options;

  useEffect(() => {
    // Create the full title with prefix and suffix if provided
    const fullTitle = [
      prefix,
      title,
      suffix,
      title ? `| ${appName}` : appName
    ].filter(Boolean).join(' ');

    // Set the document title
    document.title = fullTitle;

    // Restore the previous title when component unmounts
    return () => {
      // We don't restore to any specific title since other components
      // might have changed it before this one unmounts
    };
  }, [title, prefix, suffix, appName]);
}