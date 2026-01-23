// Tipos para Solicitudes de Alta
export interface SolicitudAlta {
  id_solicitud: number;
  nombre_evento: string;
  fecha_evento: string;
  ubicacion: string;
  id_tipo: number;
  id_dificultad: number;
  descripcion?: string;
  usuario?: {
    email: string;
    nombre_y_apellido?: string;
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

// Tipos para Solicitudes de Baja
export interface SolicitudBaja {
  id_eliminacion: number;
  id_evento: number;
  nombre_evento: string;
  motivo: string;
  usuario_solicitante: string;
  fecha_solicitud: string;
}

// Tipos para Eventos Activos
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

// Tipos para Historial
export interface EventoEliminado {
  id_evento: number;
  nombre_evento: string;
  fecha_eliminacion: string;
  motivo: string;
  eliminado_por: string;
  estado: string;
  tipo_eliminacion: 'soft_delete' | 'hard_delete' | 'physical_delete';
}