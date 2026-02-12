import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/registro-evento.css";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import Toast from '../components/modals/Toast';

export default function SolicitudEventoPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // ========== Estados del Formulario ==========
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

  // ========== Estados de Autoguardado ==========
  const [idBorrador, setIdBorrador] = useState<number | null>(null);
  const [ultimoAutoguardado, setUltimoAutoguardado] = useState<Date | null>(null);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const autoGuardadoRef = useRef<number | null>(null);

  const AUTOGUARDADO_INTERVALO = 30000; // 30 segundos

  // ========== Estados del Mapa ==========
  const [isSearching, setIsSearching] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "found" | "not-found">("idle");
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  // ========== Estados del Toast ==========
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (mensaje: string, tipo: 'success' | 'error' | 'info') => {
    setToast({ mensaje, tipo });
  };

  // ========== Handlers ==========
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // ========== SUBMIT - ENVIAR DIRECTAMENTE (estado 2) ==========
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
      showToast("Debes estar logueado para enviar una solicitud", "error");
      return;
    }
    if (formData.lat === null || formData.lng === null) {
      showToast("Debes seleccionar una ubicación en el mapa", "error");
      return;
    }
    if (formData.cupo_maximo <= 0) {
      showToast("El cupo máximo debe ser mayor a 0", "error");
      return;
    }

    try {
      setLoading(true);

      // Preparar datos completos
      const datosAEnviar = {
        nombre_evento: formData.nombre_evento,
        ubicacion: formData.ubicacion,
        fecha_evento: formData.fecha_evento,
        descripcion: formData.descripcion || "",
        costo_participacion: formData.costo_participacion || 0,
        cupo_maximo: formData.cupo_maximo,
        id_tipo: formData.id_tipo,
        id_dificultad: formData.id_dificultad,
        lat: formData.lat,
        lng: formData.lng
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/solicitudes-eventos?enviar=true`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(datosAEnviar)
        }
      );

      if (response.ok) {
        // Limpiar borrador guardado
        localStorage.removeItem('borrador_solicitud');
        setIdBorrador(null);
        
        showToast("✅ Solicitud enviada para revisión", "success");
        
        setTimeout(() => {
          navigate("/mis-eventos");
        }, 1500);
      } else {
        const error = await response.json();
        showToast(error.detail || "Error al enviar solicitud", "error");
      }
    } catch (error) {
      console.error("Error:", error);
      showToast("Error al enviar solicitud", "error");
    } finally {
      setLoading(false);
    }
  };

  // ========== AUTOGUARDADO CORREGIDO ==========
  const autoGuardarBorrador = async () => {
    // ✅ VALIDACIÓN ESTRICTA: Debe tener nombre, ubicación, fecha Y coordenadas
    const tieneDatosCompletos = 
      formData.nombre_evento.trim() !== "" &&
      formData.ubicacion.trim() !== "" &&
      formData.fecha_evento !== "" &&
      formData.lat !== null &&
      formData.lng !== null;

    if (!tieneDatosCompletos || guardandoBorrador) {
      console.log('⏸️ Autoguardado pausado: faltan datos mínimos');
      return;
    }

    try {
      setGuardandoBorrador(true);
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!token) {
        console.error('No hay token de autenticación');
        return;
      }

      // ✅ Preparar datos asegurándose de que todo esté presente
      const datosAEnviar = {
        nombre_evento: formData.nombre_evento,
        ubicacion: formData.ubicacion,
        fecha_evento: formData.fecha_evento,
        descripcion: formData.descripcion || "",
        costo_participacion: formData.costo_participacion || 0,
        cupo_maximo: formData.cupo_maximo || 10, // ✅ Default 10 si es 0
        id_tipo: formData.id_tipo,
        id_dificultad: formData.id_dificultad,
        lat: formData.lat,
        lng: formData.lng
      };

      const url = idBorrador
        ? `${import.meta.env.VITE_API_URL}/solicitudes-eventos/${idBorrador}?enviar=false`
        : `${import.meta.env.VITE_API_URL}/solicitudes-eventos?enviar=false`;

      const method = idBorrador ? "PUT" : "POST";

      console.log('📤 Autoguardando...', { url, method, datos: datosAEnviar });

      const response = await fetch(url, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(datosAEnviar)
      });

      if (response.ok) {
        const data = await response.json();
        
        if (!idBorrador && data.id_solicitud) {
          setIdBorrador(data.id_solicitud);
        }

        setUltimoAutoguardado(new Date());
        
        // Guardar en localStorage
        localStorage.setItem('borrador_solicitud', JSON.stringify({
          formData: datosAEnviar,
          idBorrador: data.id_solicitud || idBorrador
        }));

        console.log('✅ Borrador guardado automáticamente', data);
      } else {
        const error = await response.json();
        console.error('❌ Error en autoguardado:', error);
      }
    } catch (error) {
      console.error('❌ Error en autoguardado:', error);
    } finally {
      setGuardandoBorrador(false);
    }
  };

  // ========== FORMATEAR TIEMPO ==========
  const formatearUltimoAutoguardado = () => {
    if (!ultimoAutoguardado) return '';
    
    const ahora = new Date();
    const diff = Math.floor((ahora.getTime() - ultimoAutoguardado.getTime()) / 1000);
    
    if (diff < 60) return 'hace unos segundos';
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} minutos`;
    return ultimoAutoguardado.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
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

  // ========== EFECTOS ==========

  // Efecto 1: Inicializar y recuperar borrador
  useEffect(() => {
    initMap();
    
    // Recuperar borrador guardado
    const borradorGuardado = localStorage.getItem('borrador_solicitud');
    if (borradorGuardado) {
      try {
        const datos = JSON.parse(borradorGuardado);
        setFormData(datos.formData);
        setIdBorrador(datos.idBorrador);
        showToast('Se recuperó un borrador guardado', 'info');
      } catch (error) {
        console.error('Error al recuperar borrador:', error);
      }
    }

    return () => {
      if (autoGuardadoRef.current) {
        clearTimeout(autoGuardadoRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Efecto 2: Autoguardado automático CORREGIDO
  useEffect(() => {
    // Limpiar timeout anterior
    if (autoGuardadoRef.current) {
      clearTimeout(autoGuardadoRef.current);
    }

    // ✅ VALIDACIÓN MEJORADA: Verificar que todos los campos mínimos tengan valor
    const tieneDatosMinimos = 
      formData.nombre_evento.trim() !== "" &&
      formData.ubicacion.trim() !== "" &&
      formData.fecha_evento !== "" &&
      formData.lat !== null &&
      formData.lng !== null;

    if (!tieneDatosMinimos) {
      console.log('⏸️ Esperando datos mínimos para autoguardar...');
      return; // No hay nada que guardar aún
    }

    // Programar autoguardado en 30 segundos
    autoGuardadoRef.current = setTimeout(() => {
      console.log('⏰ Ejecutando autoguardado programado...');
      autoGuardarBorrador();
    }, AUTOGUARDADO_INTERVALO) as unknown as number;

    return () => {
      if (autoGuardadoRef.current) {
        clearTimeout(autoGuardadoRef.current);
      }
    };
  }, [formData]);

  // Efecto 3: Búsqueda de ubicación
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
    }, 800) as unknown as number;

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [formData.ubicacion]);

  return (
    <div className="event-registration">
      {toast && <Toast message={toast.mensaje} type={toast.tipo} onClose={() => setToast(null)} />}
      
      <Navbar /> 
      <div className="event-registration__container">
        <div className="event-registration__header">
          <div>
            <h1 className="event-registration__title">Solicitud de Publicación</h1>
            <p className="event-registration__subtitle">
              Completa la información para solicitar un evento externo
            </p>
          </div>
          
          {/* Indicador de Autoguardado */}
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
            <Link to="/" style={{ color: '#ccff00', textDecoration: 'none', fontWeight: '600' }}>
              ← Volver al Inicio
            </Link>
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
                    placeholder="Ej: Carrera Nocturna 2026"
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
                    <option value={1}>Carrera</option>
                    <option value={2}>Paseo</option>
                    <option value={3}>Entrenamiento</option>
                    <option value={4}>Cicloturismo</option>
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
                    placeholder="Ej: 50"
                    value={formData.cupo_maximo || ''}
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
                      value={formData.costo_participacion || ''}
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

              <button type="submit" className="event-form__submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Solicitud'}
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
      {/* <Footer/>  */}
    </div>
  );
}