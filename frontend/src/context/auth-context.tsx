import { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react'; 
import { getCurrentUser } from '../services/eventos'; 

// --- CORRECCIÓN AQUÍ ---
// Definimos la estructura IGUAL a tu Base de Datos
export interface User {
  id_usuario: number;
  nombre_y_apellido: string; // Cambiado para coincidir con tu SQL
  email: string;
  id_rol: number;
  telefono?: string; // Lo agrego como OPCIONAL (?) porque el Calendario lo usa, aunque no lo vi en tu tabla SQL.
}
// -----------------------

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loadingAuth: boolean;
  loginOk: (token: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // 1. Al cargar la app, verificamos si hay sesión guardada
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');

      if (token) {
        try {
          const userData = await getCurrentUser(token);
          // OJO: Si el backend devuelve "nombre_y_apellido", se asignará correctamente aquí.
          setUser(userData);
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
    if (rememberMe) {
      localStorage.setItem('token', token);
    } else {
      sessionStorage.setItem('token', token);
    }

    try {
      const userData = await getCurrentUser(token);
      setUser(userData);
      localStorage.setItem("rol", userData.id_rol.toString());
    } catch (error) {
      console.error("Error obteniendo usuario", error);
    }
  };

  // 3. Función de cerrar sesión
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem("rol");
    localStorage.removeItem("token_type"); // Asegurate de limpiar esto si lo usas
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
      logout 
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