/**
 * Parsea una fecha en formato DD-MM-YYYY a objeto Date
 */
export function parsearFechaDD_MM_YYYY(fechaStr: string | null | undefined): Date | null {
  if (!fechaStr) return null;
  
  // Limpiar espacios
  const limpia = fechaStr.trim();
  
  // Parsear formato DD-MM-YYYY
  const partes = limpia.split('-');
  if (partes.length === 3 && partes[0].length === 2) {
    // Formato DD-MM-YYYY
    const [dia, mes, anio] = partes;
    const d = parseInt(dia);
    const m = parseInt(mes);
    const a = parseInt(anio);
    
    if (!isNaN(d) && !isNaN(m) && !isNaN(a)) {
      return new Date(a, m - 1, d); // mes es 0-indexed
    }
  }
  
  // Si viene en formato YYYY-MM-DD (por si acaso)
  if (partes.length === 3 && partes[0].length === 4) {
    const [anio, mes, dia] = partes;
    const d = parseInt(dia);
    const m = parseInt(mes);
    const a = parseInt(anio);
    
    if (!isNaN(d) && !isNaN(m) && !isNaN(a)) {
      return new Date(a, m - 1, d);
    }
  }
  
  return null;
}

/**
 * Formatea una fecha para mostrar (si ya viene en DD-MM-YYYY la devuelve tal cual)
 */
export function formatearFecha(fechaStr: string | null | undefined): string {
  if (!fechaStr) return '—';
  
  // Si ya está en DD-MM-YYYY, devolverla tal cual
  if (/^\d{2}-\d{2}-\d{4}$/.test(fechaStr)) return fechaStr;
  
  // Si viene en YYYY-MM-DD, convertir a DD-MM-YYYY
  if (/^\d{4}-\d{2}-\d{2}/.test(fechaStr)) {
    const [anio, mes, dia] = fechaStr.split('T')[0].split('-');
    return `${dia}-${mes}-${anio}`;
  }
  
  return fechaStr;
}