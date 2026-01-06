import { useState, useEffect, useRef } from "react";
import { createEvento } from "../services/eventos";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/registro-evento.css";

export default function CreateEventPage() {
  const [formData, setFormData] = useState({
    nombre_evento: "",
    ubicacion: "",
    fecha_evento: "",
    descripcion: "",
    costo_participacion: 0,
    id_tipo: 1,
    id_dificultad: 1,
    lat: null as number | null,
    lng: null as number | null,
  });

  const token = localStorage.getItem("token");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("Debes estar logueada para crear eventos");
      return;
    }
    try {
      const evento = await createEvento(formData, token);
      console.log("Evento creado:", evento);
    } catch (err) {
      console.error("Error al crear evento:", err);
    }
  };

  // Referencias para mapa y marcador
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const initMap = () => {
    if (mapRef.current) {
      mapRef.current.remove();
    }

    const map = L.map("map").setView([-31.4, -64.2], 5);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    map.on("click", async (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng;
    setFormData((prev) => ({ ...prev, lat, lng }));

    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([lat, lng]).addTo(map);

    // 🔁 Reverse geocoding: coordenadas → texto
    try {
        const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
        );
        const data = await res.json();
        if (data && data.display_name) {
        setFormData((prev) => ({ ...prev, ubicacion: data.display_name }));
        }
    } catch (err) {
        console.error("Error obteniendo dirección:", err);
    }
    });

  };

 useEffect(() => {
  if (formData.ubicacion.trim() !== "") {
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ar&q=${encodeURIComponent(
            formData.ubicacion
          )}`
        );
        const data = await res.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);

          setFormData((prev) => ({ ...prev, lat, lng }));

          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 12);
            if (markerRef.current) markerRef.current.remove();
            markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
          }
        } else {
          // Si no se encuentra ubicación válida, reseteamos
          setFormData((prev) => ({ ...prev, lat: null, lng: null }));
          if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
          }
        }
      } catch (err) {
        console.error("Error buscando ubicación:", err);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }
}, [formData.ubicacion]);



  useEffect(() => {
    initMap();
  }, []);

  return (
    <div className="create-event-container">
      <h2>Crear Evento</h2>
      <form onSubmit={handleSubmit} className="create-event-form">
        <label htmlFor="nombre_evento">Nombre del evento</label>
        <input
          id="nombre_evento"
          type="text"
          name="nombre_evento"
          placeholder="Ej: Maratón 2026"
          onChange={handleChange}
        />

        <label htmlFor="ubicacion">Ubicación</label>
        <input
          id="ubicacion"
          type="text"
          name="ubicacion"
          placeholder="Ej: Córdoba, Argentina"
          value={formData.ubicacion}
          onChange={handleChange}
        />

        <label htmlFor="fecha_evento">Fecha del evento</label>
        <input
          id="fecha_evento"
          type="date"
          name="fecha_evento"
          onChange={handleChange}
        />

        <label htmlFor="descripcion">Descripción</label>
        <textarea
          id="descripcion"
          name="descripcion"
          placeholder="Breve descripción del evento"
          onChange={handleChange}
        />

        <label htmlFor="costo_participacion">Costo de participación</label>
        <input
          id="costo_participacion"
          type="number"
          name="costo_participacion"
          placeholder="Ej: 100"
          onChange={handleChange}
        />

        <button type="submit">Crear Evento</button>
      </form>

      {/* Contenedor del mapa */}
      <div id="map" className="map-container"></div>
    </div>
  );
}
