import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Las páginas de tu compañera (Déjalas tal cual)
import MapPage from "./pages/mapa-page";
import CreateEventPage from "./pages/registro-evento-page";

// 👇 TU IMPORTACIÓN (Agregamos esta línea)
import CalendarioPage from "./pages/calendario-page";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<h1>Inicio</h1>} />
        <Route path="/mapa" element={<MapPage />} />
        <Route path="/registro-evento" element={<CreateEventPage />} />
        
        {/* 👇 TU RUTA (Agregamos esta línea) */}
        <Route path="/calendario" element={<CalendarioPage />} />
      </Routes>
    </Router>
  );
}

export default App;