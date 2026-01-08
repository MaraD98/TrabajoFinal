import { useEffect } from "react";
import { getEventos } from "../services/eventos";
import "../styles/mapa.css";

export default function MapPage() {
  useEffect(() => {
    getEventos().then(data => {
      console.log("Eventos:", data);
      // Aquí después dibujás los marcadores en el mapa
    });
  }, []);

  return <div id="map"></div>;
}


