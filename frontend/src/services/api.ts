import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Interceptor para agregar el token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔑 Token enviado:", token.substring(0, 20) + "...");
    } else {
      console.warn("⚠️ No hay token en localStorage");
    }
    
    console.log("📤 Request:", config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error("❌ Error en request interceptor:", error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => {
    console.log("✅ Response:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error("❌ Error en response:", error.response?.status, error.config?.url);
    console.error("Detalles:", error.response?.data);
    
    // Si es 401, redirigir al login
    if (error.response?.status === 401) {
      console.warn("⚠️ Token inválido o expirado");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    
    // Si es 403, mostrar error de permisos
    if (error.response?.status === 403) {
      console.error("🚫 Acceso denegado - No tienes permisos de administrador");
      alert("No tienes permisos de administrador para acceder a esta sección");
    }
    
    return Promise.reject(error);
  }
);