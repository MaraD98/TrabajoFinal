import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// 👇 1. IMPORTACIÓN NUEVA: El proveedor de autenticación
import { AuthProvider } from "./context/auth-context";

// Importaciones existentes
import EventsMapPage from "./pages/mapa-page";
import CreateEventPage from "./pages/registro-evento-page";
import EventosPage from "./pages/eventos-page";
import LoginPage from "./pages/login-page";
import ProtectedRoute from "./components/protected-route";
import RegisterPage from './pages/register-page';
import CalendarioPage from "./pages/calendario-page";
import InicioPage from "./pages/inicio-page";

// 🔥 NUEVO IMPORT: La página de recuperar contraseña
import ForgotPasswordPage from "./pages/forgot-password-page";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<h1>Inicio</h1>} />
        <Route path="/mapa" element={<EventsMapPage />} />
        <Route path="/evento" element={<EventosPage />} />
        <Route path="/registro-evento"
          element={
            <ProtectedRoute allowedRoles={[1, 2]}>
              <CreateEventPage />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </Router>
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

          {/* 🔥 NUEVA RUTA: Aquí conectamos la página */}
          <Route path="/olvide-password" element={<ForgotPasswordPage />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;