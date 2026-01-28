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
  static async obtenerBajasPendientes() {
    try {
      const response = await api.get('/admin/bajas/pendientes');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo bajas pendientes:', error);
      return [];
    }
  }

  static async aprobarBaja(idEliminacion: number, idEvento?: number) {
    try {
      // ✅ SOLUCIÓN: Si id_eliminacion es 0, usa el endpoint alternativo
      if (idEliminacion === 0 && idEvento) {
        console.log(`🔄 Usando endpoint alternativo para evento ${idEvento}`);
        const response = await api.patch(`/admin/eventos/${idEvento}/aprobar-baja`);
        return response.data;
      }
      
      // Flujo normal
      const response = await api.patch(`/admin/bajas/${idEliminacion}/aprobar`);
      return response.data;
    } catch (error) {
      console.error('Error aprobando baja:', error);
      throw error;
    }
  }

  static async rechazarBaja(idEliminacion: number, idEvento?: number) {
    try {
      // ✅ SOLUCIÓN: Si id_eliminacion es 0, usa el endpoint alternativo
      if (idEliminacion === 0 && idEvento) {
        console.log(`🔄 Usando endpoint alternativo para rechazar evento ${idEvento}`);
        const response = await api.patch(`/admin/eventos/${idEvento}/rechazar-baja`);
        return response.data;
      }
      
      // Flujo normal
      const response = await api.patch(`/admin/bajas/${idEliminacion}/rechazar`);
      return response.data;
    } catch (error) {
      console.error('Error rechazando baja:', error);
      throw error;
    }
  }

  // ===========================
  // EVENTOS ACTIVOS
  // ===========================
  static async obtenerEventosActivos() {
    try {
      const response = await api.get('/eventos');
      // Filtra solo eventos publicados (id_estado === 3)
      return response.data.filter((e: any) => e.id_estado === 3);
    } catch (error) {
      console.error('Error obteniendo eventos activos:', error);
      return [];
    }
  }

  // ===========================
  // HISTORIAL DE ELIMINACIONES
  // ===========================
  static async obtenerHistorialEliminaciones() {
    try {
      const response = await api.get('/admin/historial-eliminaciones');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo historial de eliminaciones:', error);
      return [];
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