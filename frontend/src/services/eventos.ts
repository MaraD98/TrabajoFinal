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
// Login: recibe email y contrasenia, devuelve token
export async function login(email: string, contrasenia: string) {
  const res = await api.post("/auth/login", {
    email,
    contrasenia,
  });
  return res.data; // { access_token, token_type }
}

// Obtener usuario actual a partir del token
export async function getCurrentUser(token: string) {
  const res = await api.get("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data; // UsuarioResponse con id_rol, nombre, etc.
}

// Registro de usuario
export async function register(usuarioData: any) {
  const res = await api.post("/auth/register", usuarioData);
  return res.data; 
}
