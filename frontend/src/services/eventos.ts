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
  // =========================================================================
  // CAMBIO IMPORTANTE: Formato Formulario (OAuth2 Standard)
  // =========================================================================
  // ¿Por qué no usamos JSON aquí?
  // FastAPI y Swagger usan el estándar "OAuth2PasswordRequestForm".
  // Este estándar requiere que los datos se envíen como un formulario (x-www-form-urlencoded)
  // y que los campos se llamen estrictamente 'username' y 'password'.
  // Esto permite que el botón "Authorize" de la documentación (Swagger) funcione correctamente.
  // =========================================================================

  const formData = new URLSearchParams();
  formData.append('username', email);       // El backend espera 'username', aunque le pasemos el email
  formData.append('password', contrasenia); // El backend espera 'password'

  const res = await api.post("/auth/login", formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded' // Avisamos que es un formulario
    }
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