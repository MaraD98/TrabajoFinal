import { api } from "./api";


// Función para crear eventos
export async function createEvento(eventoData: any, token: string) {
  const res = await api.post("/eventos", eventoData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

// Función para obtener TODOS los eventos (Público)
export async function getEventos() {
  const res = await api.get("/eventos/");
  return res.data;
}

// --- OBTENER SOLO MIS EVENTOS ---
export async function getMisEventos() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) throw new Error("No hay token de autenticación");

    const res = await api.get("/eventos/mis-eventos", {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
}

// HU 4.1: Cancelar mi propio evento
export const cancelarEventoPropio = async (idEvento: number, motivo: string) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    // URL CORRECTA: /eventos/{id}/cancelar
    // BODY: { "motivo": "..." }
    const response = await api.patch(`/eventos/${idEvento}/cancelar`, 
        { motivo }, 
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

// HU 4.2: Solicitar baja (Usuario Externo)
export const solicitarBajaEvento = async (idEvento: number, motivo: string) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    // URL CORRECTA: /eventos/{id}/solicitar-eliminacion
    const response = await api.patch(`/eventos/${idEvento}/solicitar-eliminacion`, 
        { motivo }, 
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

// HU 4.3: Eliminar como Administrador
export const adminEliminarEvento = async (idEvento: number, motivo: string) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    // URL CORRECTA: /eventos/{id}/admin-eliminar
    const response = await api.patch(`/eventos/${idEvento}/admin-eliminar`, 
        { motivo }, 
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

export async function getEventosCalendario(month: number, year: number) {
  const res = await api.get("/eventos/calendario/", {
    params: {
      month: month,
      year: year
    }
  });
  return res.data;
}

// Login: recibe email y contrasenia, devuelve token
export async function login(email: string, contrasenia: string) {
  // =========================================================================
  // CAMBIO IMPORTANTE: Formato Formulario (OAuth2 Standard)
  // =========================================================================
  // ¿Por qué no usamos JSON aquí?
  // FastAPI y Swagger usan el estándar "OAuth2PasswordRequestForm".
  // Este estándar requiere que los datos se envíen como un formulario (x-www-form-urlencoded)
  // y que los campos se llamen estrictamente 'username' y 'password'.
  // Esto permite que el botón "Authorize" de la documentación (Swagger) funcione correctamente.
  // =========================================================================

  const formData = new URLSearchParams();
  formData.append('username', email);       // El backend espera 'username', aunque le pasemos el email
  formData.append('password', contrasenia); // El backend espera 'password'

  const res = await api.post("/auth/login", formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded' // Avisamos que es un formulario
    }
  });
  
  return res.data; // { access_token, token_type }
}

// Obtener usuario actual a partir del token
export async function getCurrentUser(token: string) {
  const res = await api.get("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data; // UsuarioResponse con id_rol, nombre, etc.
}

// Registro de usuario
export async function register(usuarioData: any) {
  const res = await api.post("/auth/register", usuarioData);
  return res.data; 
}

// REPORTESS 

// Obtener un reporte en JSON (para mostrar en pantalla)
export async function getReporte(tipo: string, token: string) {
  const res = await api.get(`/reportes/${tipo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data; // Devuelve el objeto JSON con el reporte
}

// Exportar un reporte en CSV (descargar archivo)
export async function exportReporteCSV(tipo: string, token: string) {
  const res = await api.get(`/reportes/export`, {
    params: { tipo },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    responseType: "blob", // 👈 importante para manejar archivos
  });

  // Crear un link temporal para descargar el archivo
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${tipo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
/**
 * Interfaz para los parámetros de filtrado (HU-7.1 a 7.7)
 */
export interface FiltrosEventos {
  busqueda?: string;          // HU-7.6: Búsqueda por nombre/palabra clave
  fecha_desde?: string;       // HU-7.2: Rango de fechas (formato: YYYY-MM-DD)
  fecha_hasta?: string;       // HU-7.2: Rango de fechas
  fecha_exacta?: string;      // HU-7.2: Fecha exacta
  ubicacion?: string;         // HU-7.3: Filtro por ubicación
  id_tipo?: number;           // HU-7.4: Filtro por tipo de evento
  id_dificultad?: number;     // HU-7.5: Filtro por dificultad
  skip?: number;              // Paginación
  limit?: number;             // Paginación (máx 100)
}

/**
 * Interfaz para la respuesta de búsqueda filtrada
 */
export interface EventosFiltradosResponse {
  total: number;
  eventos: any[];
  skip: number;
  limit: number;
  filtros_aplicados: Record<string, any>;
  mensaje: string;
}

/**
 * Interfaz para los catálogos
 */
export interface CatalogosResponse {
  tipos_evento: Array<{ id: number; nombre: string }>;
  niveles_dificultad: Array<{ id: number; nombre: string }>;
}

// ============================================================================
// NUEVAS FUNCIONES: Búsqueda Avanzada con Filtros (HU-7.1 a 7.10)
// ============================================================================

/**
 * Buscar eventos con filtros combinables (HU-7.1 a 7.10)
 * 
 * @param filtros - Objeto con los criterios de filtrado
 * @returns Respuesta con eventos filtrados y metadata
 * 
 * @example
 * ```typescript
 * // Buscar carreras en Córdoba en febrero 2026
 * const resultado = await buscarEventosConFiltros({
 *   id_tipo: 1,
 *   ubicacion: "Córdoba",
 *   fecha_desde: "2026-02-01",
 *   fecha_hasta: "2026-02-28"
 * });
 * ```
 */
export async function buscarEventosConFiltros(
  filtros: FiltrosEventos
): Promise<EventosFiltradosResponse> {
  try {
    // Construir query params solo con los filtros que tienen valor
    const params = new URLSearchParams();
    
    if (filtros.busqueda) params.append("busqueda", filtros.busqueda);
    if (filtros.fecha_desde) params.append("fecha_desde", filtros.fecha_desde);
    if (filtros.fecha_hasta) params.append("fecha_hasta", filtros.fecha_hasta);
    if (filtros.fecha_exacta) params.append("fecha_exacta", filtros.fecha_exacta);
    if (filtros.ubicacion) params.append("ubicacion", filtros.ubicacion);
    if (filtros.id_tipo !== undefined) params.append("id_tipo", filtros.id_tipo.toString());
    if (filtros.id_dificultad !== undefined) params.append("id_dificultad", filtros.id_dificultad.toString());
    if (filtros.skip !== undefined) params.append("skip", filtros.skip.toString());
    if (filtros.limit !== undefined) params.append("limit", filtros.limit.toString());

    const queryString = params.toString();
    const url = `/eventos/buscar${queryString ? `?${queryString}` : ""}`;
    
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error buscando eventos con filtros:", error);
    throw error;
  }
}

/**
 * Obtener catálogos para poblar los filtros (tipos y dificultades)
 * 
 * @returns Objeto con arrays de tipos de evento y niveles de dificultad
 */
export async function obtenerCatalogosParaFiltros(): Promise<CatalogosResponse> {
  try {
    const response = await api.get("/eventos/catalogos/filtros");
    return response.data;
  } catch (error) {
    console.error("Error obteniendo catálogos:", error);
    // Retornar valores por defecto en caso de error
    return {
      tipos_evento: [],
      niveles_dificultad: []
    };
  }
}

/**
 * Hook auxiliar para limpiar filtros vacíos
 * Útil para evitar enviar parámetros innecesarios al backend
 */
export function limpiarFiltrosVacios(filtros: FiltrosEventos): FiltrosEventos {
  const filtrosLimpios: FiltrosEventos = {};
  
  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      filtrosLimpios[key as keyof FiltrosEventos] = value as any;
    }
  });
  
  return filtrosLimpios;
}
