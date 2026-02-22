import { useState, useEffect, useRef } from "react";
import { createEvento } from "../services/eventos";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  });

  const [isSearching, setIsSearching] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "found" | "not-found">("idle");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

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
  const markerRef = useRef<L.Marker | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      showToast("Debes estar logueado para crear eventos", "error");
      return;
    }
    if (formData.lat === null || formData.lng === null) {
      showToast("Debes seleccionar una ubicación en el mapa o escribir una dirección válida", "error");
      return;
    }
    if (formData.cupo_maximo <= 0) {
      showToast("El cupo máximo debe ser mayor a 0", "error");
      return;
    }
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
        const evento = await createEvento(formData, token);
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
      showToast("Error al crear el evento. Por favor intenta nuevamente.", "error");
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

  return (
    <div className="event-registration">
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
                    <option value={1}>Ciclismo de Ruta</option>
                    <option value={2}>Mountain Bike (MTB)</option>
                    <option value={3}>Rural Bike</option>
                    <option value={4}>Gravel</option>
                    <option value={5}>Cicloturismo</option>
                    <option value={6}>Entrenamiento / Social</option>
                  </select>
                </div>

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
                      placeholder="Ej: Colombres 879, Córdoba"
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
                      value={formData.costo_participacion || ''}
                      onChange={handleChange}
                      className="event-form__input event-form__input--currency"
                      min="0"
                    />
                  </div>
                  <span className="event-form__hint">
                    Dejar en 0 si el evento es gratuito
                  </span>
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