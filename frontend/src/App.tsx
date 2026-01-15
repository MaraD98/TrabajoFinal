import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import EventsMapPage from "./pages/mapa-page";
import CreateEventPage from "./pages/registro-evento-page";
import LoginPage from "./pages/login-page";
import ProtectedRoute from "./components/protected-route";
import RegisterPage from './pages/register-page';

// 👇 TU IMPORTACIÓN (Agregamos esta línea)
import CalendarioPage from "./pages/calendario-page";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<h1>Inicio</h1>} />
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
      </Routes>
    </Router>
  );
}

export default App;