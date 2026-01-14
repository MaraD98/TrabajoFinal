import { useState, useEffect, useRef } from "react";
import { getEventos } from "../services/eventos";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/mapa.css";

interface Evento {
  id_evento: number;
  nombre_evento: string;
  ubicacion: string;
  fecha_evento: string;
  descripcion: string;
  costo_participacion: number;
  lat: number;
  lng: number;
  id_tipo?: number;
  id_dificultad?: number;
}

export default function EventsMapPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    loadEventos();
  }, []);

  const loadEventos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEventos();
      
      // Filtrar eventos que tengan coordenadas válidas
      const eventosConCoordenadas = data.filter(
        (evento: Evento) => evento.lat && evento.lng
      );
      
      setEventos(eventosConCoordenadas);
    } catch (err) {
      console.error("Error cargando eventos:", err);
      setError("No se pudieron cargar los eventos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && eventos.length > 0) {
      addMarkers();
    }
  }, [eventos]);

  const initMap = () => {
    if (mapRef.current) return; // 👈 evita recrear el mapa

    const map = L.map("events-map", {
      center: [-38.4161, -63.6167],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 4,
      maxZoom: 18,
    });

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
  };

  const addMarkers = () => {
    // Limpiar marcadores existentes
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!mapRef.current) return;

    const bounds: L.LatLngBoundsExpression = [];

    eventos.forEach((evento) => {
      if (!evento.lat || !evento.lng) return;

      const getMarkerColor = (id_tipo?: number) => {
      switch (id_tipo) {
        case 1: return "#e63946"; // Running
        case 2: return "#457b9d"; // Ciclismo
        case 3: return "#2a9d8f"; // Triatlón
        case 4: return "#f4a261"; // Natación
        default: return "#999";   // Otros
      }
    };

    const customIcon = L.divIcon({
      className: "event-marker",
      html: `
        <div class="event-marker__pin" style="background:${getMarkerColor(evento.id_tipo)}">
          <div class="event-marker__pulse"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    const marker = L.marker([evento.lat, evento.lng], { icon: customIcon })
        .addTo(mapRef.current!);

      marker.on("click", () => {
        setSelectedEvent(evento);
        mapRef.current?.setView([evento.lat, evento.lng], 13, {
          animate: true,
          duration: 0.5,
        });
      });

      // Popup personalizado
      const popupContent = `
        <div class="event-popup">
          <h3 class="event-popup__title">${evento.nombre_evento}</h3>
          <p class="event-popup__date">📅 ${new Date(evento.fecha_evento).toLocaleDateString('es-AR')}</p>
          <p class="event-popup__location">📍 ${evento.ubicacion}</p>
          ${evento.costo_participacion > 0 
            ? `<p class="event-popup__price">💰 $${evento.costo_participacion}</p>` 
            : `<p class="event-popup__price free">🎉 Gratis</p>`
          }
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: "custom-popup",
        maxWidth: 300,
      });

      markersRef.current.push(marker);
      bounds.push([evento.lat, evento.lng]);
    });

    // Ajustar vista para mostrar todos los marcadores
    if (bounds.length > 0 && mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };
  

  const handleEventClick = (evento: Evento) => {
    setSelectedEvent(evento);
    if (mapRef.current && evento.lat && evento.lng) {
      mapRef.current.setView([evento.lat, evento.lng], 14, {
        animate: true,
        duration: 0.5,
      });
      
      // Abrir popup del marcador
      const marker = markersRef.current.find(m => {
        const pos = m.getLatLng();
        return pos.lat === evento.lat && pos.lng === evento.lng;
      });
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const getTipoEvento = (id?: number) => {
    const tipos: { [key: number]: string } = {
      1: "Running",
      2: "Ciclismo",
      3: "Triatlón",
      4: "Natación",
    };
    return id ? tipos[id] || "Evento" : "Evento";
  };

  const getDificultad = (id?: number) => {
    const dificultades: { [key: number]: string } = {
      1: "Principiante",
      2: "Intermedio",
      3: "Avanzado",
      4: "Profesional",
    };
    return id ? dificultades[id] || "-" : "-";
  };

  return (
    <div className="events-map-page">
      <div className="events-map-page__container">
        <div className="events-map-page__header">
          <h1 className="events-map-page__title">Mapa de Eventos Deportivos</h1>
          <p className="events-map-page__subtitle">
            Explora eventos en toda Argentina
          </p>
        </div>

        <div className="events-map-page__content">
          <div className="events-sidebar">
            <div className="events-sidebar__header">
              <h2 className="events-sidebar__title">
                Eventos Disponibles
                {eventos.length > 0 && (
                  <span className="events-sidebar__count">{eventos.length}</span>
                )}
              </h2>
              <button onClick={loadEventos} className="events-sidebar__refresh">
                ↻
              </button>
            </div>

            <div className="events-sidebar__list">
              {loading && (
                <div className="events-sidebar__loading">
                  <div className="spinner-large"></div>
                  <p>Cargando eventos...</p>
                </div>
              )}

              {error && (
                <div className="events-sidebar__error">
                  <p>⚠️ {error}</p>
                  <button onClick={loadEventos} className="btn-retry">
                    Reintentar
                  </button>
                </div>
              )}

              {!loading && !error && eventos.length === 0 && (
                <div className="events-sidebar__empty">
                  <div className="empty-icon">📍</div>
                  <h3>No hay eventos disponibles</h3>
                  <p>Actualmente no hay eventos publicados con ubicación.</p>
                </div>
              )}

              {!loading && !error && eventos.length > 0 && eventos.map((evento) => (
                <div
                  key={evento.id_evento}
                  className={`event-card ${selectedEvent?.id_evento === evento.id_evento ? "event-card--active" : ""}`}
                  onClick={() => handleEventClick(evento)}
                >
                  <div className="event-card__header">
                    <h3 className="event-card__title">{evento.nombre_evento}</h3>
                    <span className="event-card__type">{getTipoEvento(evento.id_tipo)}</span>
                  </div>
                  <div className="event-card__info">
                    <p className="event-card__date">
                      📅 {new Date(evento.fecha_evento).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="event-card__location">📍 {evento.ubicacion}</p>
                    <div className="event-card__footer">
                      <span className="event-card__difficulty">
                        {getDificultad(evento.id_dificultad)}
                      </span>
                      <span className={`event-card__price ${evento.costo_participacion === 0 ? 'free' : ''}`}>
                        {evento.costo_participacion > 0 
                          ? `$${evento.costo_participacion}` 
                          : "Gratis"
                        }
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="events-map-wrapper">
            <div id="events-map" className="events-map"></div>
            
            {!loading && eventos.length === 0 && (
              <div className="map-overlay">
                <div className="map-overlay__content">
                  <div className="map-overlay__icon">🗺️</div>
                  <h2>Mapa sin eventos</h2>
                  <p>No hay eventos disponibles para mostrar en el mapa.</p>
                  <p className="map-overlay__hint">
                    Los eventos aparecerán aquí una vez que sean publicados.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}