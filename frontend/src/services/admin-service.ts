import { api } from './api';

export class AdminService {
  
  // ===========================
  // SOLICITUDES DE ALTA
  // ===========================
  static async obtenerSolicitudesPendientes() {
    try {
      const response = await api.get('/admin/solicitudes/pendientes');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo solicitudes de alta:', error);
      return [];
    }
  }

  static async aprobarSolicitud(idSolicitud: number) {
    try {
      const response = await api.patch(`/admin/solicitudes/${idSolicitud}/revisar`, {
        id_estado_solicitud: 3
      });
      return response.data;
    } catch (error) {
      console.error('Error aprobando solicitud:', error);
      throw error;
    }
  }

  static async rechazarSolicitud(idSolicitud: number, motivo: string) {
    try {
      const response = await api.patch(`/admin/solicitudes/${idSolicitud}/revisar`, {
        id_estado_solicitud: 4,
        observaciones_admin: motivo
      });
      return response.data;
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
      throw error;
    }
  }

  // ===========================
  // SOLICITUDES DE BAJA
  // ===========================
  
  // ✅ CORREGIDO: Sin parámetro idEliminacion
  static async aprobarBaja(idEvento: number) {
    try {
      const response = await api.patch(`/eliminacion/admin/aprobar-baja/${idEvento}`);
      return response.data;
    } catch (error) {
      console.error('Error aprobando baja:', error);
      throw error;
    }
  }

  // ✅ CORREGIDO: Sin parámetro idEliminacion
  static async rechazarBaja(idEvento: number) {
    try {
      const response = await api.patch(`/eliminacion/admin/rechazar-baja/${idEvento}`);
      return response.data;
    } catch (error) {
      console.error('Error rechazando baja:', error);
      throw error;
    }
  }

  static async obtenerBajasPendientes() {
    try {
      const response = await api.get('/eliminacion/admin/bajas-pendientes');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo bajas pendientes:', error);
      return [];
    }
  }

  // ===========================
  // EVENTOS ACTIVOS
  // ===========================
  static async obtenerEventosActivos() {
    try {
      const response = await api.get('/eventos');
      return response.data.filter((e: any) => e.id_estado === 3);
    } catch (error) {
      console.error('Error obteniendo eventos activos:', error);
      return [];
    }
  }

  // ===========================
  // EVENTOS FINALIZADOS
  // ===========================
  static async obtenerEventosFinalizados() {
    try {
      const response = await api.get('/eliminacion/admin/eventos-finalizados');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo eventos finalizados:', error);
      return [];
    }
  }

  // ===========================
  // HISTORIAL DE ELIMINACIONES
  // ===========================
  static async obtenerHistorialEliminaciones() {
    try {
      const response = await api.get('/eliminacion/admin/historial');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo historial de eliminaciones:', error);
      return [];
    }
  }

  // ===========================
  // RESTAURAR EVENTO CANCELADO
  // ===========================
  static async restaurarEvento(idEvento: number) {
    try {
      const response = await api.patch(`/eliminacion/admin/restaurar/${idEvento}`);
      return response.data;
    } catch (error) {
      console.error('Error restaurando evento:', error);
      throw error;
    }
  }

  // ===========================
  // DEPURAR EVENTO
  // ===========================
  static async depurarEvento(idEvento: number, motivo: string) {
    try {
      const response = await api.delete(`/eliminacion/admin/depurar/${idEvento}`, {
        data: { motivo }
      });
      return response.data;
    } catch (error) {
      console.error('Error depurando evento:', error);
      throw error;
    }
  }

  // ===========================
  // INSCRIPCIONES Y RESERVAS 
  // ===========================
  
  static async obtenerTodasLasReservas() {
    try {
      // NOTA: Si tu backend requiere ruta admin, cámbialo a '/admin/reservas'
      const response = await api.get('/reservas'); 
      return response.data;
    } catch (error) {
      console.error('Error obteniendo todas las reservas:', error);
      return [];
    }
  }
}