import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// 1. Contexto de Autenticación
import { AuthProvider } from "./context/auth-context";

// 2. Componentes y Páginas
import EventsMapPage from "./pages/mapa-page";
import CreateEventPage from "./pages/registro-evento-page";
import LoginPage from "./pages/login-page";
import ProtectedRoute from "./components/protected-route";
import RegisterPage from './pages/register-page';
import CalendarioPage from "./pages/calendario-page";
import InicioPage from "./pages/inicio-page";
import ForgotPasswordPage from "./pages/forgot-password-page";

// 👇 3. AGREGADO: Importamos la página de Mis Eventos
import MisEventosPage from "./pages/mis-eventos-page"; 
// 👇 NUEVO IMPORT: La página de perfil
import PerfilPage from "./pages/perfil-page";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Ruta Pública: Inicio */}
          <Route path="/" element={<InicioPage />} />
          
          {/* Rutas Públicas de Funcionalidad */}
          <Route path="/mapa" element={<EventsMapPage />} />
          <Route path="/calendario" element={<CalendarioPage />} />
          
          {/* Rutas de Autenticación */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/olvide-password" element={<ForgotPasswordPage />} />

          {/* 👇 RUTAS PROTEGIDAS (Requieren Login) 👇 */}
          
          {/* 1. Crear Evento */}
          <Route path="/registro-evento"
            element={
              <ProtectedRoute allowedRoles={[1, 2]}>
                <CreateEventPage />
              </ProtectedRoute>
            }
          />

          {/* 2. Mis Eventos (AGREGADA) */}
          <Route path="/mis-eventos"
            element={
              
                <MisEventosPage />
              
            }
          />
          {/* 🔥 NUEVA RUTA: Aquí conectamos la página de contraseña */}
          <Route path="/olvide-password" element={<ForgotPasswordPage />} />

          {/* 👇 NUEVA RUTA: Mi Perfil */}
          <Route path="/perfil" element={<PerfilPage />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;