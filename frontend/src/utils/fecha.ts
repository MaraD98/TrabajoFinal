/**
 * Convierte fecha DD-MM-YYYY a formato legible (ya viene formateada del backend)
 */
export function formatearFecha(fechaISO: string | null | undefined): string {
  if (!fechaISO) return '—';
  
  // Si ya está en DD-MM-YYYY, devolverla tal cual
  if (/^\d{2}-\d{2}-\d{4}$/.test(fechaISO)) return fechaISO;
  
  // Convertir desde ISO: "2024-12-25" → "25-12-2024"
  const [anio, mes, dia] = fechaISO.split('T')[0].split('-');
  return `${dia}-${mes}-${anio}`;
}

/**
 * Parsea una fecha en formato DD-MM-YYYY a objeto Date
 * Necesario para comparar y ordenar fechas que vienen del backend
 */
export function parsearFechaDD_MM_YYYY(fechaStr: string | null | undefined): Date | null {
  if (!fechaStr) return null;
  
  // Parsear formato DD-MM-YYYY → Date
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
    const [dia, mes, anio] = partes;
    // new Date(año, mes-1, día) - mes es 0-indexed en JavaScript
    return new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
  }
  
  // Fallback: intentar parsear como ISO (por si viene en otro formato)
  const fecha = new Date(fechaStr);
  return isNaN(fecha.getTime()) ? null : fecha;
}