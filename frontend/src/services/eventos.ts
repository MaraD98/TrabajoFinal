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

// HU 4.1: Cancelar mi propio evento
export const cancelarEventoPropio = async (idEvento: number, motivo: string) => {
    const response = await api.patch(`/eventos/${idEvento}/cancelar`, null, {
        params: { motivo }
    });
    return response.data;
};

// HU 4.2: Solicitar baja (Usuario Externo)
export const solicitarBajaEvento = async (idEvento: number, motivo: string) => {
    const response = await api.patch(`/eventos/${idEvento}/solicitar-eliminacion`, null, {
        params: { motivo }
    });
    return response.data;
};

// HU 4.3: Eliminar como Administrador
export const adminEliminarEvento = async (idEvento: number, motivo: string) => {
    const response = await api.patch(`/eventos/${idEvento}/admin-eliminar`, null, {
        params: { motivo }
    });
    return response.data;
};
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
