import React from 'react';

/**
 * Hook para renderizar errores de validación en campos.
 * @param path Ruta del campo (e.g., 'core.host')
 * @param errors Mapa de errores del endpoint de preview o formulario
 * @returns Componente React con el error formateado, o null
 */
export function renderFieldError(path: string, errors: Record<string, string[]> = {}) {
  if (!errors[path] || errors[path].length === 0) return null;
  return <div style={{ color: '#f88', fontSize: '0.75rem', marginTop: 2 }}>{errors[path][0]}</div>;
}

/**
 * Renderiza hint contextual para campos de ruta.
 * @param hint Texto de ayuda
 * @returns Componente React con hint estilizado
 */
export function renderPathHelper(hint: string) {
  return <div style={{ fontSize: '0.75rem', color: '#9db', marginTop: 2 }}>{hint}</div>;
}

/**
 * Estilos reutilizables para secciones de formulario.
 */
export const sectionStyles = {
  container: {
    padding: 12,
    borderRadius: 8,
    background: '#071018',
    marginBottom: 12
  } as React.CSSProperties,
  grid2Col: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8
  } as React.CSSProperties,
  grid1Col: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 8
  } as React.CSSProperties
};
