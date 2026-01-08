import { api } from "./api";

export async function createEvento(eventoData: any, token: string) {
  const res = await api.post("/eventos", eventoData, {
    headers: {
      Authorization: `Bearer ${token}`, // 👈 token del login
    },
  });
  return res.data;
}


export async function getEventos() {
  const res = await api.get("/eventos");
  return res.data;
}

export async function getEventosCalendario(month: number, year: number) {
  // Pide al backend solo los eventos de ese mes específico
  const res = await api.get(`/eventos/calendario?month=${month}&year=${year}`);
  return res.data;
}


