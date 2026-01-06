
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

      // Reverse geocoding: coordenadas → texto
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
    <div className="event-page">
      <div className="event-page__container">
        <div className="event-page__header">
          <h1 className="event-page__title">Crear Nuevo Evento</h1>
          <p className="event-page__subtitle">
            Completa los detalles de tu evento y selecciona la ubicación en el mapa
          </p>
        </div>

        <div className="event-page__content">
          <div className="event-page__form-section">
            <form onSubmit={handleSubmit} className="event-form">
              <div className="event-form__group">
                <label htmlFor="nombre_evento" className="event-form__label">
                  Nombre del evento
                </label>
                <input
                  id="nombre_evento"
                  type="text"
                  name="nombre_evento"
                  placeholder="Ej: Maratón Córdoba 2026"
                  onChange={handleChange}
                  className="event-form__input"
                  required
                />
              </div>

              <div className="event-form__group">
                <label htmlFor="ubicacion" className="event-form__label">
                  Ubicación
                </label>
                <input
                  id="ubicacion"
                  type="text"
                  name="ubicacion"
                  placeholder="Ej: Córdoba, Argentina"
                  value={formData.ubicacion}
                  onChange={handleChange}
                  className="event-form__input"
                  required
                />
                <span className="event-form__hint">
                  Escribe una dirección o haz clic en el mapa
                </span>
              </div>

              <div className="event-form__group">
                <label htmlFor="fecha_evento" className="event-form__label">
                  Fecha del evento
                </label>
                <input
                  id="fecha_evento"
                  type="date"
                  name="fecha_evento"
                  onChange={handleChange}
                  className="event-form__input"
                  required
                />
              </div>

              <div className="event-form__group">
                <label htmlFor="descripcion" className="event-form__label">
                  Descripción
                </label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  placeholder="Describe tu evento..."
                  onChange={handleChange}
                  className="event-form__textarea"
                  rows={5}
                  required
                />
              </div>

              <div className="event-form__group">
                <label htmlFor="costo_participacion" className="event-form__label">
                  Costo de participación
                </label>
                <div className="event-form__input-wrapper">
                  <span className="event-form__currency">$</span>
                  <input
                    id="costo_participacion"
                    type="number"
                    name="costo_participacion"
                    placeholder="0"
                    onChange={handleChange}
                    className="event-form__input event-form__input--currency"
                    min="0"
                  />
                </div>
              </div>

              <button type="submit" className="event-form__submit">
                Crear Evento
              </button>
            </form>
          </div>

          <div className="event-page__map-section">
            <div className="map-wrapper">
              <div id="map" className="map-container"></div>
              <div className="map-instructions">
                <svg className="map-instructions__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Haz clic en el mapa para marcar la ubicación</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}