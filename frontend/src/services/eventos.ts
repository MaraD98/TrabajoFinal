import { api } from "./api";
// Si "api" es una instancia de Axios, al poner la URL completa (http://...) 
// ignorará la configuración base y funcionará directo.

// Función para crear eventos
export async function createEvento(eventoData: any, token: string) {
  const res = await api.post("/eventos", eventoData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

// Función para obtener TODOS los eventos
export async function getEventos() {
  const res = await api.get("/eventos");
  return res.data;
}

export async function getEventosCalendario(month: number, year: number) {
  // Al usar api.get y pasar los params así, Axios construye la URL:
  // http://localhost:8000/api/v1/eventos/calendario?month=X&year=Y
  const res = await api.get("/eventos/calendario", {
    params: {
      month: month,
      year: year
    }
  });
  return res.data;
}