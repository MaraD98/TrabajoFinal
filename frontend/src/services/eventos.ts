import { api } from "./api";

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
  const res = await api.get("/eventos/calendario", {
    params: {
      month: month,
      year: year
    }
  });
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
