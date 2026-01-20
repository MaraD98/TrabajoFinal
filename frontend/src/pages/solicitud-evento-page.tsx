import { useState, useEffect, useRef } from "react";
import { createSolicitudEvento } from "../services/solicitudes-externas";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/registro-evento.css";

export default function SolicitudEventoPage() {
  const [formData, setFormData] = useState({
    nombre_evento: "",
    ubicacion: "",
    fecha_evento: "",
    descripcion: "",
    costo_participacion: 0,
    cupo_maximo: 0,
    id_tipo: 1,      // Por defecto 1 (Carrera)
    id_dificultad: 1, // Por defecto 1 (Básico)
    lat: null as number | null,
    lng: null as number | null,
  });

  const [isSearching, setIsSearching] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "found" | "not-found">("idle");

  const token = localStorage.getItem("token");
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      alert("Debes estar logueado para enviar una solicitud");
      return;
    }
    if (formData.lat === null || formData.lng === null) {
      alert("Debes seleccionar una ubicación en el mapa o escribir una dirección válida");
      return;
    }
    if (formData.cupo_maximo <= 0) {
      alert("El cupo máximo debe ser mayor a 0");
      return;
    }

    try {
      await createSolicitudEvento(formData, token);
      alert("¡Solicitud de evento enviada exitosamente!");
      // window.location.href = "/mis-solicitudes"; // Descomentar si quieres redirigir
    } catch (err: any) {
      console.error("Error al crear solicitud:", err);
      if (err.response && err.response.data) {
         alert("Error del servidor:\n" + JSON.stringify(err.response.data, null, 2));
      } else {
         alert("Error al enviar la solicitud. Por favor intenta nuevamente.");
      }
    }
  };

  // --- LÓGICA DEL MAPA (Idéntica a la anterior) ---
  const initMap = () => {
    if (mapRef.current) {
      mapRef.current.remove();
    }

    const map = L.map("map", {
      center: [-31.4135, -64.181],
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setFormData((prev) => ({ ...prev, lat, lng }));

      if (markerRef.current) markerRef.current.remove();
      
      const customIcon = L.divIcon({
        className: "custom-marker",
        html: '<div class="marker-pin"></div>',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
      });
      
      markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(map);

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
          { headers: { "User-Agent": "EventRegistrationApp/1.0" } }
        );
        const data = await res.json();
        if (data && data.display_name) {
          setFormData((prev) => ({ ...prev, ubicacion: data.display_name }));
          setLocationStatus("found");
        }
      } catch (err) {
        console.error("Error obteniendo dirección:", err);
      }
    });
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (formData.ubicacion.trim() === "") {
      setLocationStatus("idle");
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setLocationStatus("idle");

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ar&q=${encodeURIComponent(
            formData.ubicacion
          )}&limit=1`,
          { headers: { "User-Agent": "EventRegistrationApp/1.0" } }
        );
        const data = await res.json();

        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);

          setFormData((prev) => ({ ...prev, lat, lng }));
          setLocationStatus("found");

          if (mapRef.current) {
            mapRef.current.setView([lat, lng], 16);
            if (markerRef.current) markerRef.current.remove();
            
            const customIcon = L.divIcon({
              className: "custom-marker",
              html: '<div class="marker-pin"></div>',
              iconSize: [30, 42],
              iconAnchor: [15, 42],
            });
            markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(mapRef.current);
          }
        } else {
          setFormData((prev) => ({ ...prev, lat: null, lng: null }));
          setLocationStatus("not-found");
          if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
          }
        }
      } catch (err) {
        console.error("Error buscando ubicación:", err);
        setLocationStatus("not-found");
      } finally {
        setIsSearching(false);
      }
    }, 800);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [formData.ubicacion]);

  useEffect(() => {
    initMap();
  }, []);

  return (
    <div className="event-registration">
      <div className="event-registration__container">
        <div className="event-registration__header">
          <h1 className="event-registration__title">Solicitud de Publicación</h1>
          <p className="event-registration__subtitle">
            Completa la información para solicitar un evento externo
          </p>
        </div>

        <div className="event-registration__layout">
          <div className="event-registration__form-wrapper">
            <form onSubmit={handleSubmit} className="event-form">
              <div className="event-form__section">
                <h2 className="event-form__section-title">Información General</h2>
                
                <div className="event-form__field">
                  <label htmlFor="nombre_evento" className="event-form__label">
                    Nombre del Evento *
                  </label>
                  <input
                    id="nombre_evento"
                    type="text"
                    name="nombre_evento"
                    placeholder="Ej: Carrera Nocturna 2026"
                    onChange={handleChange}
                    className="event-form__input"
                    required
                  />
                </div>

                <div className="event-form__field">
                  <label htmlFor="fecha_evento" className="event-form__label">
                    Fecha del Evento *
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

                {/* --- SECCIÓN CORREGIDA: TIPOS DE EVENTO DE TU BASE DE DATOS --- */}
                <div className="event-form__field">
                  <label htmlFor="id_tipo" className="event-form__label">
                    Tipo de Evento *
                  </label>
                  <select
                    id="id_tipo"
                    name="id_tipo"
                    value={formData.id_tipo}
                    onChange={handleChange}
                    className="event-form__select"
                    required
                  >
                    {/* Estos valores coinciden con tu imagen image_311c52.png */}
                    <option value={1}>Carrera</option>
                    <option value={2}>Paseo</option>
                    <option value={3}>Entrenamiento</option>
                    <option value={4}>Cicloturismo</option>
                  </select>
                </div>

                {/* --- SECCIÓN CORREGIDA: DIFICULTADES DE TU BASE DE DATOS --- */}
                <div className="event-form__field">
                  <label htmlFor="id_dificultad" className="event-form__label">
                    Nivel de Dificultad *
                  </label>
                  <select
                    id="id_dificultad"
                    name="id_dificultad"
                    value={formData.id_dificultad}
                    onChange={handleChange}
                    className="event-form__select"
                    required
                  >
                     {/* Estos valores coinciden con tu imagen image_311c52.png */}
                    <option value={1}>Básico</option>
                    <option value={2}>Intermedio</option>
                    <option value={3}>Avanzado</option>
                  </select>
                </div>
              </div>

              <div className="event-form__section">
                <h2 className="event-form__section-title">Ubicación</h2>
                <div className="event-form__field">
                  <label htmlFor="ubicacion" className="event-form__label">
                    Dirección o Lugar *
                  </label>
                  <div className="event-form__input-group">
                    <input
                      id="ubicacion"
                      type="text"
                      name="ubicacion"
                      placeholder="Ej: Parque Sarmiento, Córdoba"
                      value={formData.ubicacion}
                      onChange={handleChange}
                      className="event-form__input"
                      required
                    />
                    {isSearching && (
                      <span className="event-form__status event-form__status--searching">
                        <span className="spinner"></span>
                      </span>
                    )}
                    {!isSearching && locationStatus === "found" && (
                      <span className="event-form__status event-form__status--success">✓</span>
                    )}
                    {!isSearching && locationStatus === "not-found" && (
                      <span className="event-form__status event-form__status--error">✕</span>
                    )}
                  </div>
                  <span className="event-form__hint">
                    Escribe la dirección completa o haz clic en el mapa
                  </span>
                </div>
              </div>

              <div className="event-form__section">
                <h2 className="event-form__section-title">Detalles Adicionales</h2>
                
                <div className="event-form__field">
                  <label htmlFor="descripcion" className="event-form__label">
                    Descripción del Evento 
                  </label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    placeholder="Describe los detalles del evento..."
                    onChange={handleChange}
                    className="event-form__textarea"
                    rows={5}
                  />
                </div>

                <div className="event-form__field">
                  <label htmlFor="cupo_maximo" className="event-form__label">
                    Cupo Máximo *
                  </label>
                  <input
                    id="cupo_maximo"
                    type="number"
                    name="cupo_maximo"
                    placeholder="Ej: 50"
                    onChange={handleChange}
                    className="event-form__input"
                    min="1"
                    required
                  />
                </div>

                <div className="event-form__field">
                  <label htmlFor="costo_participacion" className="event-form__label">
                    Costo de Participación
                  </label>
                  <div className="event-form__currency-wrapper">
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
                  <span className="event-form__hint">
                    Dejar en 0 si es gratuito
                  </span>
                </div>
              </div>

              <button type="submit" className="event-form__submit">
                Enviar Solicitud
              </button>
            </form>
          </div>

          <div className="event-registration__map-wrapper">
            <div className="map-card">
              <div className="map-card__header">
                <h3 className="map-card__title">Ubicación en el Mapa</h3>
                <p className="map-card__subtitle">
                  Haz clic en el mapa para marcar el punto exacto
                </p>
              </div>
              <div id="map" className="map-card__map"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}