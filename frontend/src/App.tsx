import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import MapPage from "./pages/mapa-page";
import CreateEventPage from "./pages/registro-evento-page";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<h1>Inicio</h1>} />
        <Route path="/mapa" element={<MapPage />} />
        <Route path="/registro-evento" element={<CreateEventPage />} />
      </Routes>
    </Router>
  );
}

export default App;
