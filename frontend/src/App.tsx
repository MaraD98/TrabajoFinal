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
import NotificationBell from './components/notificaciones';
import TablaGestionPagos from "./pages/gestion-pagos-pages";
import PanelInscriptos from "./pages/inscriptos-page";
import HistorialEdicionPage from "./pages/historial-edicion-pages"; 
import { TiposCarrerasPage } from './pages/tipos-de-carreras-page';
import { OfertaOrganizadoresPage } from './pages/oferta-organizadores-page';

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
          <Route path="/tipos-de-carreras" element={<TiposCarrerasPage />} />
          <Route path="/organizadores" element={<OfertaOrganizadoresPage />} />

          {/* ========== RUTAS PROTEGIDAS - TODOS LOS USUARIOS AUTENTICADOS ========== */}
          
          {/* Perfil - Accesible para TODOS los usuarios autenticados */}
          <Route 
            path="/perfil" 
            element={
              <ProtectedRoute>
                <PerfilPage />
              </ProtectedRoute>
            } 
          />

          {/* ✅ CORREGIDO: Mis Eventos - Accesible para TODOS los roles (1,2,3,4) */}
          <Route 
            path="/mis-eventos" 
            element={
              <ProtectedRoute allowedRoles={[1, 2, 3, 4]}>
                <MisEventosPage />
              </ProtectedRoute>
            } 
          />

          {/* 🆕 NUEVO: Historial de Ediciones - Accesible para TODOS los usuarios */}
          <Route 
            path="/historial-ediciones/:id_evento" 
            element={
              <ProtectedRoute allowedRoles={[1, 2, 3, 4]}>
                <HistorialEdicionPage />
              </ProtectedRoute>
            } 
          />

          {/* ========== RUTAS PROTEGIDAS - ORGANIZADORES Y ADMIN ========== */}
          
          {/* ✅ CORREGIDO: Reportes - Incluir rol 3 (Operario/Organizador) */}
          <Route 
            path="/reportes" 
            element={
              <ProtectedRoute allowedRoles={[1, 2, 3, 4]}>
                <ReportesPage />
              </ProtectedRoute>
            } 
          />

          {/* ✅ CORREGIDO: Solicitar Evento - Incluir rol 3 (Operario/Organizador) */}
          <Route 
            path="/publicar-evento" 
            element={
              <ProtectedRoute allowedRoles={[1, 2, 3, 4]}>
                <SolicitudEventoPage />
              </ProtectedRoute>
            } 
          />

          {/* ========== RUTAS PROTEGIDAS - SOLO ADMIN/SUPERVISORES (Rol 1, 2) ========== */}
          
          {/* Crear Evento Directamente */}
          <Route 
            path="/registro-evento"
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

          {/* 3. ZONA ADMIN - Dashboard y sus páginas hijas */}
          <Route path="/admin" 
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

          {/* 🔥 NUEVA RUTA: Aquí conectamos la página de contraseña */}
          <Route path="/olvide-password" element={<ForgotPasswordPage />} />

          {/* 👇 NUEVA RUTA: Mi Perfil */}
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/notificaciones" element={<NotificationBell />} />
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