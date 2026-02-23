import { useState, useEffect, useRef } from "react";
import { getEventos } from "../services/eventos";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/mapa.css";
import { Navbar } from "../components/navbar";

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
  ruta_coordenadas?: [number, number][] | string;
}

export default function EventsMapPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Evento | null>(null);

  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    loadEventos();
  }, []);

  // MODIFICAR LOAD EVENTOS (magia del ordenamiento)
  const loadEventos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEventos();
      
      // LÓGICA DE REORDENAMIENTO BASADA EN URL
      const params = new URLSearchParams(location.search);
      const idUrl = params.get('id');

      let eventosOrdenados = [...data];

      if (idUrl) {
        const idBuscardo = Number(idUrl);
        const index = eventosOrdenados.findIndex(e => e.id_evento === idBuscardo);
        
        if (index > -1) {
          // Sacamos el evento de su posición original
          const [eventoEncontrado] = eventosOrdenados.splice(index, 1);
          // Lo ponemos al principio del array (índice 0)
          eventosOrdenados.unshift(eventoEncontrado);
          // También lo marcamos como seleccionado de una vez
          setSelectedEvent(eventoEncontrado);
        }
      }

      setEventos(eventosOrdenados);
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

  // 🔥 EFFECT: Escucha cuando cambia el evento seleccionado para dibujar/borrar la ruta
  useEffect(() => {
    if (!mapRef.current) return;

    // A. Borramos la ruta anterior si existe
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    // B. Verificamos si el evento actual tiene ruta_coordenadas
    if (selectedEvent && selectedEvent.ruta_coordenadas) {
      
      let coordenadas: [number, number][] = [];
      
      // 🛡️ Red de seguridad: si viene como string (ej. "[[-38,-63],...]") lo transformamos a array.
      // Si ya viene como array, lo usamos directo.
      try {
        coordenadas = typeof selectedEvent.ruta_coordenadas === 'string'
          ? JSON.parse(selectedEvent.ruta_coordenadas)
          : selectedEvent.ruta_coordenadas;
      } catch (error) {
        console.error("Error al leer las coordenadas de la ruta:", error);
        return; // Cortamos acá si la data está corrupta
      }

      // Si después de leerlo tenemos coordenadas válidas, dibujamos
      if (coordenadas.length > 0) {
        const polyline = L.polyline(coordenadas, {
          color: "#0cb7f2",
          weight: 5,
          opacity: 0.8,
        });

        polyline.addTo(mapRef.current);
        routeLayerRef.current = polyline;

        mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
    }
  }, [selectedEvent]);

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

   function getMarkerColor(id_tipo: number | undefined): import("csstype").Property.BackgroundColor | undefined {
    const colores: { [key: number]: string } = {
      1: "#d3525d", // Ciclismo de Ruta
      2: "#45c495", // Mountain Bike (MTB)
      3: "#d19a76", // Rural Bike
      4: "#7789d3", // Gravel
      5: "#558ab9", // Cicloturismo
      6: "#e5d055", // Entrenamiento / Social
    };
    return id_tipo ? colores[id_tipo] : undefined;
  }
  
  const addMarkers = () => {
    // Limpiar marcadores existentes
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!mapRef.current) return;

    const bounds: L.LatLngBoundsExpression = [];
    
    // 🔥 Leemos la URL
    const params = new URLSearchParams(location.search);
    const idUrl = params.get('id');
    
    // Variables para guardar el evento objetivo si viene por URL
    let targetMarker: L.Marker | null = null;
    let targetCoords: [number, number] | null = null;

    eventos.forEach((evento) => {
      const lat = Number(evento.lat);
      const lng = Number(evento.lng);
      if (!lat || !lng || lat === 0 || lng === 0) return;


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

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(mapRef.current!);

      marker.on("click", () => {
        setSelectedEvent(evento);
        mapRef.current?.setView([lat, lng], 13, {
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
      bounds.push([lat, lng]);

      if (idUrl && evento.id_evento === Number(idUrl)) {
        targetMarker = marker;
        targetCoords = [lat, lng];
      }
    });

    // 🔥 LOGICA PARA CENTRAR EL MAPA AL FINALIZAR EL BUCLE
    if (targetMarker && targetCoords && mapRef.current) {
      // Si vinimos desde el calendario, vamos directo a ese evento y abrimos popup
      mapRef.current.setView(targetCoords, 14, { animate: false });
      (targetMarker as L.Marker).openPopup();
    } else if (bounds.length > 0 && mapRef.current) {
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
      
      const marcadores = markersRef.current as L.Marker[];

      const marker = marcadores.find((m) => {
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
      1: "Ciclismo de Ruta",
      2: "Mountain Bike (MTB)",
      3: "Rural Bike",
      4: "Gravel",
      5: "Cicloturismo",
      6: "Entrenamiento / Social",
    };
    return id ? tipos[id] || "Evento" : "Evento";
  };

  const getDificultad = (id?: number) => {
    const dificultades: { [key: number]: string } = {
      1: "Basico",
      2: "Intermedio",
      3: "Avanzado",
    };
    return id ? dificultades[id] || "-" : "-";
  };

 

  return (
    <div className="events-map-page">
      <Navbar/>
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
                    <span 
                      className="event-card__type" 
                      style={{ 
                        backgroundColor: getMarkerColor(evento.id_tipo),
                        color: "#333333", // 🔥 Cambiamos a oscuro para que contraste con el pastel
                        padding: "4px 10px", 
                        borderRadius: "12px", 
                        fontSize: "0.8rem",
                        fontWeight: "bold",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)" // Sombra más suave para combinar con lo pastel
                      }}
                    >
                      {getTipoEvento(evento.id_tipo)}
                    </span>
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