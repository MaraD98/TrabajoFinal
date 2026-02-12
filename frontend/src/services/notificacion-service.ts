import { api } from "./api";

export interface Notificacion {
  id_notificacion: number;
  id_usuario: number;
  mensaje: string;
  leida: boolean;
  fecha_creacion: string; 
}

// ============================================================================
// SERVICIOS DE NOTIFICACIONES
// ============================================================================

export async function getMisNotificaciones(): Promise<Notificacion[]> {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) throw new Error("No hay token de autenticación");

  const res = await api.get("/notificaciones/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function marcarNotificacionLeida(idNotificacion: number): Promise<Notificacion> {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) throw new Error("No hay token de autenticación");

  const res = await api.put(`/notificaciones/${idNotificacion}`, {}, {
      headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}