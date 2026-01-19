import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Importaciones existentes
import EventsMapPage from "./pages/mapa-page";
import CreateEventPage from "./pages/registro-evento-page";
import LoginPage from "./pages/login-page";
import ProtectedRoute from "./components/protected-route";
import RegisterPage from './pages/register-page';
import CalendarioPage from "./pages/calendario-page";
import SolicitudEventoPage from './pages/solicitud-evento-page';
// 👇 NUEVA IMPORTACIÓN (La página de inicio estilo WakeUp)
import InicioPage from "./pages/inicio-page";

function App() {
  return (
    <Router>
      <Routes>
        {/* 👇 AQUÍ ESTÁ EL CAMBIO: Ahora carga tu diseño nuevo */}
        <Route path="/" element={<InicioPage />} />
        
        <Route path="/mapa" element={<EventsMapPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
        {/* este es solicitud */}
        <Route path="/publicar-evento" element={<SolicitudEventoPage />} /> 
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
  );
}

export default App;