import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/auth-context";

// Componentes y Páginas
import EventsMapPage from "./pages/mapa-page";
import CreateEventPage from "./pages/registro-evento-page";
import LoginPage from "./pages/login-page";
import ProtectedRoute from "./components/protected-route";
import RegisterPage from './pages/register-page';
import CalendarioPage from "./pages/calendario-page";
import SolicitudEventoPage from './pages/solicitud-evento-page';
import InicioPage from "./pages/inicio-page";
import ForgotPasswordPage from "./pages/forgot-password-page";
import ReportesPage from './pages/reportes-page';
import MisEventosPage from "./pages/mis-eventos-page"; 
import AdminDashboardPage from "./pages/admin-dashboard-page";
import PerfilPage from "./pages/perfil-page";
import TablaGestionPagos from "./pages/gestion-pagos-pages";
import PanelInscriptos from "./pages/inscriptos-page";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ========== RUTAS PÚBLICAS ========== */}
          <Route path="/" element={<InicioPage />} />
          <Route path="/mapa" element={<EventsMapPage />} />
          <Route path="/calendario" element={<CalendarioPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/olvide-password" element={<ForgotPasswordPage />} />

          {/* ========== RUTAS PROTEGIDAS - USUARIOS COMUNES (Rol 4) ========== */}
          
          {/* Perfil - Accesible para TODOS los usuarios autenticados */}
          <Route 
            path="/perfil" 
            element={
              <ProtectedRoute>
                <PerfilPage />
              </ProtectedRoute>
            } 
          />

          {/* Reportes - Accesible para usuarios Rol 4 */}
          <Route 
            path="/reportes" 
            element={
              <ProtectedRoute allowedRoles={[1, 2, 4]}>
                <ReportesPage />
              </ProtectedRoute>
            } 
          />

          {/* Solicitar Evento - Accesible para usuarios Rol 4 */}
          <Route 
            path="/publicar-evento" 
            element={
              <ProtectedRoute allowedRoles={[1, 2, 4]}>
                <SolicitudEventoPage />
              </ProtectedRoute>
            } 
          />

          {/* Mis Eventos - Accesible para usuarios Rol 4 */}
          <Route 
            path="/mis-eventos" 
            element={
              <ProtectedRoute allowedRoles={[1, 2, 4]}>
                <MisEventosPage />
              </ProtectedRoute>
            } 
          />

          {/* ========== RUTAS PROTEGIDAS - ADMIN/ORGANIZADORES (Rol 1, 2) ========== */}
          
          {/* Crear Evento Directamente */}
          <Route 
            path="/registro-evento"
            element={
              <ProtectedRoute allowedRoles={[1, 2]}>
                <CreateEventPage />
              </ProtectedRoute>
            }
          />

          {/* Dashboard Admin */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={[1, 2]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          
          {/* Gestión de Pagos */}
          <Route 
            path="/admin/pagos" 
            element={
              <ProtectedRoute allowedRoles={[1, 2]}>
                <TablaGestionPagos />
              </ProtectedRoute>
            }
          />

          {/* Panel de Inscriptos */}
          <Route 
            path="/admin/inscriptos" 
            element={
              <ProtectedRoute allowedRoles={[1, 2]}>
                <PanelInscriptos />
              </ProtectedRoute>
            }
          />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;