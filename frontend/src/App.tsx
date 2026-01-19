import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Importaciones existentes
import EventsMapPage from "./pages/mapa-page";
import CreateEventPage from "./pages/registro-evento-page";
import LoginPage from "./pages/login-page";
import ProtectedRoute from "./components/protected-route";
import RegisterPage from './pages/register-page';
import CalendarioPage from "./pages/calendario-page";
import InicioPage from "./pages/inicio-page";
import ReportesPage from './pages/reportes-page';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<InicioPage />} />
        <Route path="/mapa" element={<EventsMapPage />} />
        <Route path="/calendario" element={<CalendarioPage />} />
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
  );
}

export default App;