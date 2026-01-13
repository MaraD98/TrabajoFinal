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

// Listar todos los eventos publicados
export async function getEventos() {
  const res = await api.get("/eventos");
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
