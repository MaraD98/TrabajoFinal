import { api } from "./api";

//Crear un evento
export async function createEvento(eventoData: any, token: string) {
  const res = await api.post("/eventos", eventoData, {
    headers: {
      Authorization: `Bearer ${token}`, // 👈 token del login
    },
  });
  return res.data;
}

// Listar todos los eventos 
export async function getEventos() {
  const res = await api.get("/eventos");
  return res.data;
}
