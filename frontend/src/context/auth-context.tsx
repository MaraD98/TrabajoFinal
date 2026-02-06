import { createContext, useState, useEffect, useContext } from 'react';
import type { ReactNode } from 'react'; 
import { getCurrentUser } from '../services/eventos'; 

export interface User {
  id_usuario: number;
  nombre_y_apellido: string; 
  email: string;
  id_rol: number;
  telefono?: string; 
}

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

  // 1. Al cargar la app, verificamos si hay sesión guardada en Local o Session
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      // También intentamos recuperar el usuario guardado para no esperar a la API
      const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');

      if (token) {
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        
        try {
          // Validamos el token con el servidor por seguridad
          const userData = await getCurrentUser(token);
          setUser(userData);
          // Actualizamos la copia guardada
          const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
          storage.setItem('user', JSON.stringify(userData));
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
    const storage = rememberMe ? localStorage : sessionStorage;
    
    storage.setItem('token', token);

    try {
      const userData = await getCurrentUser(token);
      setUser(userData);
      
      // GUARDAMOS TODO en el mismo tipo de storage (Local o Session)
      storage.setItem('user', JSON.stringify(userData));
      storage.setItem("rol", userData.id_rol.toString());
      
      console.log('✅ Sesión iniciada y guardada en:', rememberMe ? 'LocalStorage' : 'SessionStorage');
    } catch (error) {
      console.error("Error obteniendo usuario", error);
      throw error;
    }
  };

  // 3. Función de cerrar sesión (Limpia AMBOS)
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem("rol");
    localStorage.removeItem("user");
    sessionStorage.removeItem('token');
    sessionStorage.removeItem("rol");
    sessionStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};