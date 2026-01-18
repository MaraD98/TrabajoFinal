import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// 👇 1. IMPORTACIÓN NUEVA: El proveedor de autenticación
import { AuthProvider } from "./context/auth-context";

// Importaciones existentes
import EventsMapPage from "./pages/mapa-page";
import CreateEventPage from "./pages/registro-evento-page";
import LoginPage from "./pages/login-page";
import ProtectedRoute from "./components/protected-route";
import RegisterPage from './pages/register-page';
import CalendarioPage from "./pages/calendario-page";
import InicioPage from "./pages/inicio-page";

// 🔥 NUEVO IMPORT: La página de recuperar contraseña
import ForgotPasswordPage from "./pages/forgot-password-page";

// 👇 NUEVO IMPORT: La página de perfil
import PerfilPage from "./pages/perfil-page";

function App() {
  return (
    /* 👇 2. ENVOLVEMOS TODO CON EL AUTHPROVIDER */
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<InicioPage />} />
          
          <Route path="/mapa" element={<EventsMapPage />} />
          <Route path="/calendario" element={<CalendarioPage />} />
          
          <Route path="/registro-evento"
            element={
              <ProtectedRoute allowedRoles={[1, 2]}>
                <CreateEventPage />
              </ProtectedRoute>
            }
          />
          
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

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