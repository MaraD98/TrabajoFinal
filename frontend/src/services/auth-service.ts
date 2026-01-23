import { api } from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserData {
  id_usuario: number;
  nombre_y_apellido: string;
  email: string;
  id_rol: number;
  telefono?: string;
  direccion?: string;
  enlace_redes?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserData;
}

export class AuthService {
  
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Crear FormData para OAuth2PasswordRequestForm
      const formData = new FormData();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);
      
      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      const data: LoginResponse = response.data;
      
      // ✅ Guardar token y usuario en localStorage
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // ✅ Configurar el header Authorization para futuras peticiones
      api.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`;
      
      return data;
    } catch (error: any) {
      console.error('Error en login:', error);
      throw new Error(error.response?.data?.detail || 'Error al iniciar sesión');
    }
  }
  
  static async getCurrentUser(): Promise<UserData> {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      
      // Actualizar localStorage con datos frescos
      localStorage.setItem('user', JSON.stringify(userData));
      
      return userData;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      throw error;
    }
  }
  
  static logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  }
  
  static getStoredUser(): UserData | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
  
  static isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
  
  static isAdmin(): boolean {
    const user = this.getStoredUser();
    return user ? [1, 2].includes(user.id_rol) : false;
  }
}