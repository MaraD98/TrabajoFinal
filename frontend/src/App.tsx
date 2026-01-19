import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/auth-context";

// Importaciones existentes
import EventsMapPage from "./pages/mapa-page";
import CreateEventPage from "./pages/registro-evento-page";
import LoginPage from "./pages/login-page";
import ProtectedRoute from "./components/protected-route";
import RegisterPage from './pages/register-page';
import CalendarioPage from "./pages/calendario-page";
import SolicitudEventoPage from './pages/solicitud-evento-page';
import InicioPage from "./pages/inicio-page";
import ReportesPage from './pages/reportes-page';
import ForgotPasswordPage from "./pages/forgot-password-page";
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
          {/* este es solicitud */}
          <Route path="/publicar-evento" element={<SolicitudEventoPage />} />
          <Route path="/olvide-password" element={<ForgotPasswordPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reportes" element={<ReportesPage />} />

          <Route path="/registro-evento"
            element={
              <ProtectedRoute allowedRoles={[1, 2]}>
                <CreateEventPage />
              </ProtectedRoute>
            }/>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;