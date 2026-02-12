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

// --- OBTENER MIS SOLICITUDES DE PUBLICACIÓN ---
export async function getMisSolicitudes() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) throw new Error("No hay token de autenticación");

    const res = await api.get("/solicitudes-eventos/mis-solicitudes", {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
}

// --- OBTENER HISTORIAL DE EDICIONES DE UN EVENTO ---
export async function getHistorialEdiciones(idEvento: number) {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) throw new Error("No hay token de autenticación");

    const res = await api.get(`/eventos/${idEvento}/historial-ediciones`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
}

export const getMisSolicitudesEliminacion = async () => {
    try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/eliminacion/mis-solicitudes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener solicitudes de eliminación');
        }

        return await response.json();
    } catch (error) {
        console.error('Error en getMisSolicitudesEliminacion:', error);
        throw error;
    }
};

// HU 4.1: Cancelar evento propio
export const cancelarEventoPropio = async (idEvento: number, motivo: string) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const response = await api.post(`/eliminacion/cancelar/${idEvento}`, 
        { motivo }, 
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

// HU 4.2: Solicitar baja (Usuario Externo)
export const solicitarBajaEvento = async (idEvento: number, motivo: string) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const response = await api.post(`/eliminacion/solicitar-baja/${idEvento}`, 
        { motivo }, 
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
};

// HU 4.3: Eliminar como Administrador
export const adminEliminarEvento = async (idEvento: number, motivo: string) => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const response = await api.post(`/eliminacion/admin/eliminar/${idEvento}`, 
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

export const inscribirseEvento = async (id_evento: number, token: string) => {
    const response = await api.post(`/inscripciones/${id_evento}`, {}, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    }); 
    return response.data;
};

// Login: recibe email y contrasenia, devuelve token
export async function login(email: string, contrasenia: string) {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', contrasenia);

  const res = await api.post("/auth/login", formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  
  return res.data;
}

// Obtener usuario actual a partir del token
export async function getCurrentUser(token: string) {
  const res = await api.get("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

// Registro de usuario
export async function register(usuarioData: any) {
  const res = await api.post("/auth/register", usuarioData);
  return res.data; 
}

// REPORTES

export async function getReporte(tipo: string, token: string, anio?: string, mes?: string) {
  const res = await api.get(`/reportes/${tipo}`, {
    params: { anio, mes }, // Axios se encarga de agregarlos a la URL si existen
    headers: 
    {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

// Exportar un reporte en CSV (descargar archivo)
export async function exportReporteCSV(tipo: string, token: string) {
  const res = await api.get(`/reportes/export`, {
    params: { tipo },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${tipo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function getReporteGeneral(token: string) {
  const res = await api.get('/reportes/', { 
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ============================================================================
// BÚSQUEDA AVANZADA CON FILTROS
// ============================================================================

export interface FiltrosEventos {
  busqueda?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  fecha_exacta?: string;
  ubicacion?: string;
  id_tipo?: number;
  id_dificultad?: number;
  skip?: number;
  limit?: number;
}

export interface EventosFiltradosResponse {
  total: number;
  eventos: any[];
  skip: number;
  limit: number;
  filtros_aplicados: Record<string, any>;
  mensaje: string;
}

export interface CatalogosResponse {
  tipos_evento: Array<{ id: number; nombre: string }>;
  niveles_dificultad: Array<{ id: number; nombre: string }>;
}

export async function buscarEventosConFiltros(
  filtros: FiltrosEventos
): Promise<EventosFiltradosResponse> {
  try {
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

export async function obtenerCatalogosParaFiltros(): Promise<CatalogosResponse> {
  try {
    const response = await api.get("/eventos/catalogos/filtros");
    return response.data;
  } catch (error) {
    console.error("Error obteniendo catálogos:", error);
    return {
      tipos_evento: [],
      niveles_dificultad: []
    };
  }
}

export function limpiarFiltrosVacios(filtros: FiltrosEventos): FiltrosEventos {
  const filtrosLimpios: FiltrosEventos = {};
  
  Object.entries(filtros).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      filtrosLimpios[key as keyof FiltrosEventos] = value as any;
    }
  });
  
  return filtrosLimpios;
}

// ============================================================================
// SOLICITUDES DE EDICIÓN (USUARIO)
// ============================================================================

/**
 * Obtener mis solicitudes de edición pendientes
 */
export async function getMisSolicitudesEdicion() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) throw new Error("No hay token de autenticación");

    const res = await api.get("/edicion-eventos/mis-solicitudes-edicion", {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
}