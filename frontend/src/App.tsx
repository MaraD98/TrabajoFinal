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
import SolicitudEventoPage from './pages/solicitud-evento-page';
// 👇 NUEVA IMPORTACIÓN (La página de inicio estilo WakeUp)
import InicioPage from "./pages/inicio-page";
import ForgotPasswordPage from "./pages/forgot-password-page";

// 👇 3. AGREGADO: Importamos la página de Mis Eventos
import MisEventosPage from "./pages/mis-eventos-page"; 
// 👇 AGREGADO: DASHBOARD DE ADMIN
import AdminDashboardPage from "./pages/admin-dashboard-page";
// 👇 NUEVO IMPORT: La página de perfil
import PerfilPage from "./pages/perfil-page";

// ⚠️ AGREGADO: Tus nuevas páginas de Admin (Pagos e Inscriptos)
import TablaGestionPagos from "./pages/gestion-pagos-pages";
import PanelInscriptos from "./pages/inscriptos-page";

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
          {/* este es solicitud */}
          <Route path="/publicar-evento" element={<SolicitudEventoPage />} />
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

          {/* 3. ZONA ADMIN - Dashboard y sus páginas hijas */}
          <Route path="/admin" 
            element={
              <ProtectedRoute allowedRoles={[1, 2]}>
                <AdminDashboardPage/>
              </ProtectedRoute>
            }
          />
          
          {/* ✅ AQUÍ ESTABAN FALTANDO TUS RUTAS: Agregadas */}
          <Route path="/admin/pagos" 
            element={
              <ProtectedRoute allowedRoles={[1, 2]}>
                <TablaGestionPagos/>
              </ProtectedRoute>
            }
          />
           <Route path="/admin/inscriptos" 
            element={
              <ProtectedRoute allowedRoles={[1, 2]}>
                <PanelInscriptos/>
              </ProtectedRoute>
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