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


// REPORTESS 

// Obtener un reporte en JSON (para mostrar en pantalla)
export async function getReporte(tipo: string, token: string) {
  const res = await api.get(`/reportes/${tipo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data; // Devuelve el objeto JSON con el reporte
}

// Exportar un reporte en CSV (descargar archivo)
export async function exportReporteCSV(tipo: string, token: string) {
  const res = await api.get(`/reportes/export`, {
    params: { tipo },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    responseType: "blob", // 👈 importante para manejar archivos
  });

  // Crear un link temporal para descargar el archivo
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${tipo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
