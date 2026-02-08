import { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react'; 
import { getCurrentUser } from '../services/eventos'; 

export interface User {
  id_usuario: number;
  nombre_y_apellido: string;
  email: string;
  id_rol: number;
  telefono?: string;
  direccion?: string;
  enlace_redes?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loadingAuth: boolean;
  loginOk: (token: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  getToken: () => string | null; // 👈 NUEVO: función helper
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // 🔥 HELPER: Busca el token en ambos storages
  const getToken = (): string | null => {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  };

  // 1. Al cargar la app, verificamos si hay sesión guardada
  useEffect(() => {
    const checkSession = async () => {
      const token = getToken();
      
      // También verificamos si hay usuario guardado en localStorage
      const savedUser = localStorage.getItem('user');

      if (token) {
        try {
          // Si hay usuario guardado, lo usamos primero
          if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
          }
          
          // Luego verificamos con el backend
          const userData = await getCurrentUser(token);
          setUser(userData);
          
          // Guardamos en localStorage para persistencia
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('rol', userData.id_rol.toString());
        } catch (error) {
          console.error("Sesión inválida", error);
          logout();
        }
      }
      setLoadingAuth(false);
    };

    checkSession();
  }, []);

  // 2. Función para procesar el login exitoso
  const loginOk = async (token: string, rememberMe: boolean) => {
    // Guardamos el token según la preferencia del usuario
    if (rememberMe) {
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('token', token);
    }

    try {
      const userData = await getCurrentUser(token);
      setUser(userData);
      
      // Siempre guardamos user y rol en localStorage (para acceso rápido)
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('rol', userData.id_rol.toString());
    } catch (error) {
      console.error("Error obteniendo usuario", error);
      throw error; // Propagamos el error para que login-page lo maneje
    }
  };

  // 3. Función de cerrar sesión
  const logout = () => {
    // Limpiamos AMBOS storages
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rol');
    localStorage.removeItem('token_type');
    sessionStorage.removeItem('token');
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      loadingAuth, 
      loginOk, 
      logout,
      getToken // 👈 Exponemos la función
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};