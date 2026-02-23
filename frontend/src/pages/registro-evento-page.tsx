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

  // ── AUTOGUARDADO (igual que solicitud-evento-page) ──────────────────────
  const [idBorrador, setIdBorrador] = useState<number | null>(null);
  const [ultimoAutoguardado, setUltimoAutoguardado] = useState<Date | null>(null);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const autoGuardadoRef = useRef<number | null>(null);
  const AUTOGUARDADO_INTERVALO = 30000; // 30 segundos

  // ✅ FIX Bug 3: cuando hay borrador previo, preguntamos al usuario
  // si quiere continuar con ese o empezar uno nuevo (sin pisarlo)
  const [mostrarAlertaBorrador, setMostrarAlertaBorrador] = useState(false);
  // ────────────────────────────────────────────────────────────────────────

  const token = localStorage.getItem("token");
  const mapRef = useRef<L.Map | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
  const routingControlRef = useRef<any>(null);
  const navigate = useNavigate();

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
  };

  // ── PARSEAR ERROR (maneja detail como string o array Pydantic) ──────────
  const parsearError = (errorBody: any): string => {
    if (!errorBody) return 'Error desconocido';
    if (typeof errorBody.detail === 'string') return errorBody.detail;
    if (Array.isArray(errorBody.detail)) {
      return errorBody.detail.map((e: any) => e.msg || String(e)).join(', ');
    }
    if (typeof errorBody.detail === 'object') return JSON.stringify(errorBody.detail);
    return 'Error al procesar el evento';
  };
  // ────────────────────────────────────────────────────────────────────────

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
      // Si hay borrador guardado, enviarlo como enviar=true vía PUT
      // Si no, crear nuevo directamente
      let response;
      if (idBorrador) {
        response = await fetch(
          `${import.meta.env.VITE_API_URL}/eventos/borradores/${idBorrador}?enviar=true`,
          {
            method: "PUT",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(formData)
          }
        );
      } else {
        const evento = await createEvento(datosAEnviar, token);
        console.log("Evento creado:", evento);
        localStorage.removeItem('borrador_evento_admin');
        setIdBorrador(null);
        showToast("¡Evento creado exitosamente!", "success");
        setTimeout(() => navigate("/mis-eventos"), 2000);
        return;
      }

      if (response && response.ok) {
        localStorage.removeItem('borrador_evento_admin');
        setIdBorrador(null);
        showToast("¡Evento creado exitosamente!", "success");
        setTimeout(() => navigate("/mis-eventos"), 2000);
      } else if (response) {
        const errorBody = await response.json();
        showToast(parsearError(errorBody), "error");
      }
    } catch (err) {
      console.error("Error al crear evento:", err);
      showToast("Error al crear el evento", "error");
    }
  };

  // ── AUTOGUARDADO ────────────────────────────────────────────────────────
  const autoGuardarBorrador = async () => {
    // Solo autoguarda si hay al menos nombre o ubicación escrita
    const tieneDatosMinimos =
      formData.nombre_evento.trim() !== "" ||
      formData.ubicacion.trim() !== "";

    if (!tieneDatosMinimos || guardandoBorrador || !token) return;

    try {
      setGuardandoBorrador(true);

      const url = idBorrador
        ? `${import.meta.env.VITE_API_URL}/eventos/borradores/${idBorrador}?enviar=false`
        : `${import.meta.env.VITE_API_URL}/eventos/?enviar=false`;

      const method = idBorrador ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();

        // Guardar el id_solicitud devuelto para los siguientes autoguardados
        if (!idBorrador && data.id_solicitud) {
          setIdBorrador(data.id_solicitud);
        }

        setUltimoAutoguardado(new Date());

        localStorage.setItem('borrador_evento_admin', JSON.stringify({
          formData,
          idBorrador: data.id_solicitud || idBorrador,
          id_usuario: token ? JSON.parse(atob(token.split('.')[1]))?.sub : null  // ✅ para detectar cambio de usuario
        }));
      } else {
        const errorBody = await response.json();
        console.error('❌ Error en autoguardado:', errorBody);
        console.error('Mensaje:', parsearError(errorBody));
      }
    } catch (err) {
      console.error('❌ Error en autoguardado:', err);
    } finally {
      setGuardandoBorrador(false);
    }
  };

  const formatearUltimoAutoguardado = () => {
    if (!ultimoAutoguardado) return '';
    const diff = Math.floor((new Date().getTime() - ultimoAutoguardado.getTime()) / 1000);
    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
    return ultimoAutoguardado.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };
  // ────────────────────────────────────────────────────────────────────────

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

  // ── EFECTO: recuperar borrador guardado al montar ───────────────────────
  useEffect(() => {
    initMap();

    const borradorGuardado = localStorage.getItem('borrador_evento_admin');
    if (borradorGuardado) {
      try {
        // ✅ FIX Bug 3: en vez de cargar automáticamente el borrador (lo que pisaba
        // el nuevo evento silenciosamente), mostramos una alerta para que el usuario
        // decida si continuar con el borrador anterior o empezar uno nuevo.
        setMostrarAlertaBorrador(true);
      } catch (err) {
        console.error('Error al recuperar borrador:', err);
        localStorage.removeItem('borrador_evento_admin');
      }
    }

    return () => {
      if (autoGuardadoRef.current) clearTimeout(autoGuardadoRef.current);
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  // Handlers de la alerta de borrador previo
  const continuarConBorrador = () => {
    const borradorGuardado = localStorage.getItem('borrador_evento_admin');
    if (borradorGuardado) {
      try {
        const datos = JSON.parse(borradorGuardado);
        setFormData(datos.formData);
        setIdBorrador(datos.idBorrador);
        showToast('Borrador recuperado. Podés continuar desde donde lo dejaste.', 'info');
      } catch (err) {
        console.error('Error al recuperar borrador:', err);
      }
    }
    setMostrarAlertaBorrador(false);
  };

  const descartarBorradorYEmpezarNuevo = () => {
    // Descarta el borrador guardado en localStorage pero NO lo borra del backend
    // (el borrador sigue en "Mis Eventos → Borradores" para accederlo desde ahí)
    localStorage.removeItem('borrador_evento_admin');
    setIdBorrador(null);
    setMostrarAlertaBorrador(false);
    showToast('Podés crear un nuevo evento. El borrador anterior sigue en Mis Eventos.', 'info');
  };

  // ── EFECTO: disparar autoguardado 30s después de cada cambio ───────────
  useEffect(() => {
    if (autoGuardadoRef.current) clearTimeout(autoGuardadoRef.current);

    const tieneDatosMinimos =
      formData.nombre_evento.trim() !== "" ||
      formData.ubicacion.trim() !== "";

    if (!tieneDatosMinimos) return;

    autoGuardadoRef.current = setTimeout(() => {
      autoGuardarBorrador();
    }, AUTOGUARDADO_INTERVALO) as unknown as number;

    return () => {
      if (autoGuardadoRef.current) clearTimeout(autoGuardadoRef.current);
    };
  }, [formData]);
  // ────────────────────────────────────────────────────────────────────────

  // ── EFECTO: buscar ubicación en el mapa (original sin cambios) ──────────
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

      {/* TOAST */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={toast.type === "success" ? 2000 : 4000}
        />
      )}

      {/* ✅ FIX Bug 3: Alerta de borrador previo — igual que Gmail cuando hay un borrador sin enviar */}
      {mostrarAlertaBorrador && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#1a1a1a', border: '1px solid #333', borderRadius: '12px',
            padding: '32px', maxWidth: '440px', width: '90%', textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📝</div>
            <h3 style={{ color: '#fff', marginBottom: '8px', fontSize: '1.1rem' }}>
              Tenés un borrador sin terminar
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '24px' }}>
              ¿Querés continuar con ese borrador o empezar un evento nuevo?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={continuarConBorrador}
                style={{
                  background: '#c8ff00', color: '#000', border: 'none',
                  borderRadius: '8px', padding: '10px 20px',
                  fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                Continuar borrador
              </button>
              <button
                onClick={descartarBorradorYEmpezarNuevo}
                style={{
                  background: 'transparent', color: '#aaa',
                  border: '1px solid #444', borderRadius: '8px',
                  padding: '10px 20px', cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                Empezar nuevo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="event-registration__container">
        <div className="event-registration__header">
          <div>
            <h1 className="event-registration__title">Crear Nuevo Evento</h1>
            <p className="event-registration__subtitle">
              Completa la información del evento deportivo
            </p>
          </div>

          {/* ── Indicador de autoguardado ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {guardandoBorrador && (
              <span style={{ color: '#4a9eff', fontSize: '0.85rem', fontWeight: '500' }}>
                💾 Guardando...
              </span>
            )}
            {ultimoAutoguardado && !guardandoBorrador && (
              <span style={{ color: '#666', fontSize: '0.85rem' }}>
                ✓ Guardado {formatearUltimoAutoguardado()}
              </span>
            )}
          </div>
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
                    placeholder="Ej: Maratón Córdoba 2026"
                    value={formData.nombre_evento}
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
                    value={formData.fecha_evento}
                    onChange={handleChange}
                    className="event-form__input"
                    required
                  />
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
                  <label htmlFor="descripcion" className="event-form__label">
                    Descripción del Evento 
                  </label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    placeholder="Describe los detalles del evento, recorrido, premios, etc."
                    value={formData.descripcion}
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
                    placeholder="Ej: 500"
                    value={formData.cupo_maximo || ''}
                    onChange={handleChange}
                    className="event-form__input"
                    min="1"
                    required
                  />
                  <span className="event-form__hint">
                    Límite de participantes
                  </span>
                </div>

                <div className="event-form__field">
                  <label htmlFor="costo_participacion" className="event-form__label">Costo de Participación</label>
                  <div className="event-form__currency-wrapper">
                    <span className="event-form__currency">$</span>
                    <input
                      id="costo_participacion"
                      type="number"
                      name="costo_participacion"
                      placeholder="0"
                      value={formData.costo_participacion || ''}
                      onChange={handleChange}
                      className="event-form__input event-form__input--currency"
                      min="0"
                    />
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