/**
 * Parsea un regex que puede contener flags inline como (?i), (?m), etc.
 * y los convierte a un objeto RegExp de JavaScript válido.
 * 
 * Ejemplos:
 * - "(?i)alicorp" → /alicorp/i
 * - "(?i).*prod.*" → /.*prod.* /i
 * - "^test.*$" → /^test.*$/
 * - "(?im)multi.*line" → /multi.*line/im
 */
export function parseRegexWithFlags(regexString: string): RegExp {
  if (!regexString) {
    // Regex vacío = match todo
    return /.*/;
  }

  // Extraer flags inline como (?i), (?m), (?im), (?s), etc.
  const inlineFlagsMatch = regexString.match(/^\(\?([imsguy]+)\)/);
  
  let flags = '';
  let pattern = regexString;

  if (inlineFlagsMatch) {
    // Extraer las flags encontradas
    flags = inlineFlagsMatch[1];
    // Remover las flags inline del pattern
    pattern = regexString.replace(/^\(\?[imsguy]+\)/, '');
  }

  try {
    // Crear el RegExp con el pattern y las flags
    return new RegExp(pattern, flags);
  } catch (error) {
    console.error('Error parsing regex:', error);
    // Si el regex es inválido, retornar uno que no matchea nada
    return /(?!.*)/;
  }
}

/**
 * Test si un string coincide con un regex pattern (con soporte para flags inline)
 */
export function matchesRegex(value: string, regexString: string): boolean {
  const regex = parseRegexWithFlags(regexString);
  return regex.test(value);
}

/**
 * Filtra un array basándose en un regex aplicado a una propiedad específica
 */
export function filterByRegex<T>(
  items: T[],
  regexString: string,
  propertyGetter: (item: T) => string
): T[] {
  if (!regexString) {
    return items;
  }

  const regex = parseRegexWithFlags(regexString);
  return items.filter(item => {
    const value = propertyGetter(item);
    return regex.test(value);
  });
}
