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

// 👇 ESTA ES LA QUE ESTABA FALLANDO
export async function getEventosCalendario(month: number, year: number) {
  // Escribimos la dirección COMPLETA del backend.
  // Asegúrate de que tu backend corre en el puerto 8000 y tiene el prefijo /api/v1
  const url = `http://127.0.0.1:8000/api/v1/eventos/calendario?month=${month}&year=${year}`;
  
  console.log("Intentando obtener eventos de:", url); // Esto te ayudará a ver la URL en la consola
  
  const res = await api.get(url);
  return res.data;
}