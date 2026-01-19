import { api } from "./api";

// Definimos las interfaces para los catálogos
export interface TipoEvento {
  id_tipo: number;
  nombre: string;
}

export interface NivelDificultad {
  id_dificultad: number;
  nombre: string;
}

// Crear una nueva solicitud
export async function createSolicitudEvento(solicitudData: any, token: string) {
  const res = await api.post("/solicitudes-eventos/", solicitudData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

// Obtener catálogo de Tipos
export async function getTiposEvento() {
  const res = await api.get("/solicitudes-eventos/catalogos/tipos");
  return res.data; // Retorna array de TipoEvento
}

// Obtener catálogo de Dificultades
export async function getNivelesDificultad() {
  const res = await api.get("/solicitudes-eventos/catalogos/dificultades");
  return res.data; // Retorna array de NivelDificultad
}