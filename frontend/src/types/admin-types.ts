// ============================================================================
// TIPOS PARA EL PANEL DE ADMINISTRACIÓN
// ============================================================================

// Solicitudes de Alta (Publicación)
export interface SolicitudAlta {
  id_solicitud: number;
  nombre_evento: string;
  fecha_evento: string;
  ubicacion: string;
  id_tipo: number;
  id_dificultad: number;
  descripcion?: string;
  costo_participacion: string;
  id_estado_solicitud: number;
  fecha_solicitud: string;
  observaciones_admin?: string | null;
  id_usuario: number;
  usuario?: {
    id_usuario: number;
    nombre_y_apellido?: string;
    email: string;
  };
  tipo_evento?: {
    id_tipo: number;
    nombre: string;
  };
  nivel_dificultad?: {
    id_dificultad: number;
    nombre: string;
  };
  estado_solicitud?: {
    id_estado_solicitud: number;
    nombre: string;
  };
}

// Solicitudes de Baja (Eliminación)
export interface SolicitudBaja {
  id_eliminacion: number;
  id_evento: number;
  nombre_evento: string;
  motivo: string;
  usuario_solicitante: string;
  fecha_solicitud: string;
}

// Eventos Activos (Publicados - Estado 3)
export interface EventoActivo {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  ubicacion: string;
  id_usuario: number;
  costo_participacion: number;
  cupo_maximo: number;
  id_estado: number;
  tipo_evento?: {
    id_tipo: number;
    nombre: string;
  };
}

// ✅ NUEVO: Eventos Finalizados (Estado 4)
export interface EventoFinalizado {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  ubicacion: string;
  id_usuario: number;
  costo_participacion: number;
  cupo_maximo?: number;
  id_estado: number; // Siempre 4
  tipo_evento?: {
    id_tipo: number;
    nombre: string;
  };
}

// Historial de Eliminaciones
export interface EventoEliminado {
  id_evento: number;
  nombre_evento: string;
  fecha_eliminacion: string;
  motivo: string;
  eliminado_por: string;
  estado: string; // "Cancelado (Soft Delete)" o "Depurado (Hard Delete Lógico)"
  tipo_eliminacion: 'soft_delete' | 'hard_delete'; // Estado 5 o 7
}