import { useState, useEffect, useRef } from "react";
import { createEvento } from "../services/eventos";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";
import gifDemostracion from '../assets/gifDemostracion.gif';
import "../styles/registro-evento.css";
import { useNavigate } from 'react-router-dom';
import { Navbar } from "../components/navbar";
import Toast from "../components/modals/Toast";

export default function CreateEventPage() {
  const [formData, setFormData] = useState({
    nombre_evento: "",
    ubicacion: "",
    fecha_evento: "",
    descripcion: "",
    costo_participacion: 0,
    cupo_maximo: 0,
    id_tipo: 1,
    id_dificultad: 1,
    lat: null as number | null,
    lng: null as number | null,
    distancia_km: null as number | null,
    ruta_coordenadas: null as { lat: number; lng: number }[] | null,
    tiempo_estimado: "",
  });

  const [isSearching, setIsSearching] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "found" | "not-found">("idle");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [mostrarAyudaMapa, setMostrarAyudaMapa] = useState(false);

  const token = localStorage.getItem("token");
  const mapRef = useRef<L.Map | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const routingControlRef = useRef<any>(null);
  const navigate = useNavigate();

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // ✅ FUNCIÓN PARA LIMPIAR EL MAPA
  const limpiarMapa = () => {
    if (routingControlRef.current) {
      routingControlRef.current.setWaypoints([]);
    }
    setFormData(prev => ({
      ...prev,
      lat: null,
      lng: null,
      distancia_km: null,
      ruta_coordenadas: null,
      ubicacion: "",
      tiempo_estimado: ""
    }));
    setLocationStatus("idle");
  };

  // ========== SUBMIT ==========
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showToast("Debes estar logueado para crear eventos", "error");
      return;
    }
    if (formData.lat === null || formData.lng === null) {
      showToast("Debes seleccionar una ubicación en el mapa o trazar una ruta", "error");
      return;
    }
    if (formData.cupo_maximo <= 0) {
      showToast("El cupo máximo debe ser mayor a 0", "error");
      return;
    }

    // ✅ LÓGICA NUEVA: Agregar el tiempo y distancia a la descripción
    let descripcionFinal = formData.descripcion || "";
    if (formData.tiempo_estimado && !descripcionFinal.includes("Tiempo Estimado")) {
      descripcionFinal = `${descripcionFinal}\n\n⏱️ Tiempo Estimado de recorrido: ${formData.tiempo_estimado}\n🚴‍♂️ Distancia Total: ${formData.distancia_km} km`;
    }

    // Armamos los datos a enviar con la nueva descripción
    const datosAEnviar = {
      ...formData,
      descripcion: descripcionFinal.trim()
    };

    try {
      // ✅ Le pasamos los datos actualizados al servicio
      const evento = await createEvento(datosAEnviar, token);
      console.log("Evento creado:", evento);
      showToast("¡Evento creado exitosamente!", "success");
      setTimeout(() => navigate("/mis-eventos"), 2000);
    } catch (err) {
      console.error("Error al crear evento:", err);
      showToast("Error al crear el evento", "error");
    }
  };

  // ========== MAPA ==========
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

    // ✅ Inicialización blindada del Routing
    const routingControl = (L as any).Routing.control({
      waypoints: [], 
      routeWhileDragging: true,
      show: false, 
      fitSelectedRoutes: false, 
      lineOptions: {
        styles: [{ color: '#2563eb', opacity: 0.8, weight: 6 }] 
      },
      router: (L as any).Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      }),
      createMarker: function(_i: number, waypoint: any) {
        const customIcon = L.divIcon({
          className: "custom-marker",
          html: '<div class="marker-pin"></div>',
          iconSize: [30, 42],
          iconAnchor: [15, 42],
        });
        return L.marker(waypoint.latLng, { icon: customIcon, draggable: true });
      }
    }).addTo(map);

    routingControlRef.current = routingControl;

    // ✅ Evento: Ruta calculada con éxito
    routingControl.on('routesfound', (e: any) => {
      const routes = e.routes;
      const summary = routes[0].summary;

      const distanceKm = parseFloat((summary.totalDistance / 1000).toFixed(2));
      const totalSeconds = summary.totalTime;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const tiempoFormateado = hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
      const coords = routes[0].coordinates;

      setFormData(prev => ({
        ...prev,
        distancia_km: distanceKm,
        tiempo_estimado: tiempoFormateado,
        ruta_coordenadas: coords
      }));
    });

    routingControl.on('routingerror', (e: any) => {
      console.error("Error calculando ruta:", e);
      showToast("No se pudo calcular la ruta por las calles. Intenta acercar los puntos.", "error");
    });

    // ✅ Lógica de clics en el mapa
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      
      const currentWaypoints = routingControlRef.current
        .getWaypoints()
        .filter((wp: any) => wp && wp.latLng)
        .map((wp: any) => wp.latLng);

      if (currentWaypoints.length === 0) {
        setFormData((prev) => ({ ...prev, lat, lng }));
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
      }

      currentWaypoints.push(L.latLng(lat, lng));
      routingControlRef.current.setWaypoints(currentWaypoints);
    });
  };

  useEffect(() => {
    initMap();
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Efecto: Búsqueda de ubicación
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (formData.ubicacion.trim() === "") {
      setLocationStatus("idle");
      setIsSearching(false);
      return;
    }

    // ✅ Evita borrar la ruta si ya hay puntos en el mapa
    const currentWps = routingControlRef.current?.getWaypoints().filter((w:any) => w.latLng);
    if (currentWps && currentWps.length > 0) {
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
            if (routingControlRef.current) {
               routingControlRef.current.setWaypoints([L.latLng(lat, lng)]);
            }
          }
        } else {
          setLocationStatus("not-found");
        }
      } catch (err) {
        console.error("Error buscando ubicación:", err);
        setLocationStatus("not-found");
      } finally {
        setIsSearching(false);
      }
    }, 800) as unknown as number;

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [formData.ubicacion]);

  return (
    <div className="event-registration">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <Navbar /> 
      <div className="event-registration__container">
        <div className="event-registration__header">
          <div>
            <h1 className="event-registration__title">Crear Nuevo Evento</h1>
          </div>
        </div>

        <div className="event-registration__layout">
          <div className="event-registration__form-wrapper">
            <form onSubmit={handleSubmit} className="event-form">
              <div className="event-form__section">
                <h2 className="event-form__section-title">Información General</h2>
                
                <div className="event-form__field">
                  <label htmlFor="nombre_evento" className="event-form__label">Nombre del Evento *</label>
                  <input id="nombre_evento" type="text" name="nombre_evento" placeholder="Ej: Carrera Nocturna 2026" value={formData.nombre_evento} onChange={handleChange} className="event-form__input" required />
                </div>

                <div className="event-form__field">
                  <label htmlFor="fecha_evento" className="event-form__label">Fecha del Evento *</label>
                  <input id="fecha_evento" type="date" name="fecha_evento" value={formData.fecha_evento} onChange={handleChange} className="event-form__input" required />
                </div>

                <div className="event-form__field">
                  <label htmlFor="id_tipo" className="event-form__label">Tipo de Evento *</label>
                  <select id="id_tipo" name="id_tipo" value={formData.id_tipo} onChange={handleChange} className="event-form__select" required>
                    <option value={1}>Ciclismo de Ruta</option>
                    <option value={2}>Mountain Bike (MTB)</option>
                    <option value={3}>Rural Bike</option>
                    <option value={4}>Gravel</option>
                    <option value={5}>Cicloturismo</option>
                    <option value={6}>Entrenamiento / Social</option>
                  </select>
                </div>

                <div className="event-form__field">
                  <label htmlFor="id_dificultad" className="event-form__label">Nivel de Dificultad *</label>
                  <select id="id_dificultad" name="id_dificultad" value={formData.id_dificultad} onChange={handleChange} className="event-form__select" required>
                    <option value={1}>Básico</option>
                    <option value={2}>Intermedio</option>
                    <option value={3}>Avanzado</option>
                  </select>
                </div>
              </div>

              <div className="event-form__section">
                <h2 className="event-form__section-title">Ubicación</h2>
                <div className="event-form__field">
                  <label htmlFor="ubicacion" className="event-form__label">Dirección o Lugar *</label>
                  <div className="event-form__input-group">
                    <input id="ubicacion" type="text" name="ubicacion" placeholder="Ej: Parque Sarmiento, Córdoba" value={formData.ubicacion} onChange={handleChange} className="event-form__input" required />
                    {isSearching && <span className="event-form__status event-form__status--searching"><span className="spinner"></span></span>}
                    {!isSearching && locationStatus === "found" && <span className="event-form__status event-form__status--success">✓</span>}
                    {!isSearching && locationStatus === "not-found" && <span className="event-form__status event-form__status--error">✕</span>}
                  </div>
                  <span className="event-form__hint">Escribe la dirección o haz clic en el mapa para marcar el inicio</span>
                </div>
              </div>

              <div className="event-form__section">
                <h2 className="event-form__section-title">Detalles Adicionales</h2>
                
                <div className="event-form__field">
                  <label htmlFor="descripcion" className="event-form__label">Descripción del Evento</label>
                  <textarea id="descripcion" name="descripcion" placeholder="Describe los detalles del evento..." value={formData.descripcion} onChange={handleChange} className="event-form__textarea" rows={5} />
                </div>

                <div className="event-form__field">
                  <label htmlFor="cupo_maximo" className="event-form__label">Cupo Máximo *</label>
                  <input id="cupo_maximo" type="number" name="cupo_maximo" placeholder="Ej: 50" value={formData.cupo_maximo || ''} onChange={handleChange} className="event-form__input" min="1" required />
                </div>

                <div className="event-form__field">
                  <label htmlFor="costo_participacion" className="event-form__label">Costo de Participación</label>
                  <div className="event-form__currency-wrapper">
                    <span className="event-form__currency">$</span>
                    <input id="costo_participacion" type="number" name="costo_participacion" placeholder="0" value={formData.costo_participacion || ''} onChange={handleChange} className="event-form__input event-form__input--currency" min="0" />
                  </div>
                  <span className="event-form__hint">Dejar en 0 si es gratuito</span>
                </div>
              </div>

              <button type="submit" className="event-form__submit">
                Crear Evento
              </button>
            </form>
          </div>

          <div className="event-registration__map-wrapper">
            <div className="map-card">
              <div className="map-card__header">
                <h3 className="map-card__title">Ubicación y Ruta
                  <button 
                    type="button" 
                    onClick={() => setMostrarAyudaMapa(true)}
                    style={{ background: '#c30404', border: 'none', color: 'white', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                    💡 Ver ejemplo
                  </button>
                </h3>
                <p className="map-card__subtitle">Haz clic para marcar el inicio. Sigue haciendo clic para trazar la ruta.</p>
                
                {formData.distancia_km !== null && (
                  <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#e8f4fd', borderRadius: '8px', borderLeft: '4px solid #4a9eff', color: '#333', fontWeight: 'bold' }}>
                    🚴‍♂️ Distancia Total: {formData.distancia_km} km - ⏱️ Tiempo Estimado: {formData.tiempo_estimado}
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={limpiarMapa} 
                  style={{ marginTop: '12px', padding: '8px 16px', cursor: 'pointer', background: 'rgb(195 4 4)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', width: '100%' }}
                >
                  🗑️ Limpiar Mapa y Ruta
                </button>
              </div>
              <div id="map" className="map-card__map"></div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ MODAL DE AYUDA DEL MAPA */}
      {mostrarAyudaMapa && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div style={{ backgroundColor: '#1a1a1a', padding: '30px', borderRadius: '12px', maxWidth: '500px', width: '100%', position: 'relative', border: '1px solid #333' }}>
            <button 
              onClick={() => setMostrarAyudaMapa(false)} 
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#888', fontSize: '24px', cursor: 'pointer' }}
            >
              ✖
            </button>
            <h3 style={{ marginTop: 0, color: '#ccff00', fontSize: '1.5rem', marginBottom: '15px' }}>¿Cómo trazar tu ruta?</h3>
            <ul style={{ color: '#ddd', fontSize: '1rem', lineHeight: '1.6', paddingLeft: '20px', marginBottom: '20px' }}>
              <li>Haz un <strong>primer clic</strong> en el mapa para marcar el punto de salida (se autocompletará la calle).</li>
              <li>Sigue haciendo <strong>más clics</strong> por las calles donde pasará la carrera. La ruta se dibujará sola.</li>
              <li>Puedes <strong>arrastrar la línea azul</strong> con el mouse si quieres forzarla a pasar por otra calle.</li>
            </ul>
            
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '20px' }}>
               <img 
                 src={gifDemostracion}
                 alt="Ejemplo de cómo trazar la ruta" 
                 style={{ maxWidth: '100%', borderRadius: '8px', border: '2px solid #555' }} 
               />
            </div>

            <button 
              onClick={() => setMostrarAyudaMapa(false)}
              style={{ width: '100%', padding: '12px', marginTop: '20px', backgroundColor: '#ccff00', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}