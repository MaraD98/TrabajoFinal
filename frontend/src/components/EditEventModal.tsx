import { useState, useEffect, useRef } from 'react';
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Evento {
    id_evento: number;
    nombre_evento: string;
    fecha_evento: string;
    ubicacion: string;
    descripcion?: string;
    costo_participacion: number;
    id_tipo: number;
    id_dificultad: number;
    cupo_maximo?: number;
    lat?: number | null;
    lng?: number | null;
    id_estado: number;
}

interface Solicitud {
    id_solicitud: number;
    nombre_evento: string;
    fecha_evento: string;
    ubicacion: string;
    descripcion?: string;
    costo_participacion: number;
    id_tipo: number;
    id_dificultad: number;
    cupo_maximo?: number;
    lat?: number | null;
    lng?: number | null;
}

interface EditEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Evento | Solicitud;
    tipo: 'evento' | 'solicitud';
    onSuccess: () => void;
    onShowToast: (message: string, type: 'success' | 'error') => void;
    // ✅ NUEVO: indica si la solicitud es un borrador (estado 1)
    // Cuando es true, el submit envía con enviar=true → pasa a pendiente o auto-aprueba
    esBorrador?: boolean;
    // ✅ NUEVO: indica si el usuario es admin/supervisor (rol 1 o 2)
    // Cuando es true + esBorrador, el submit auto-aprueba y publica directamente
    esAdmin?: boolean;
}

interface Catalogo {
    id_tipo?: number;
    id_dificultad?: number;
    nombre: string;
}

export default function EditEventModal({ isOpen, onClose, item, tipo, onSuccess, onShowToast, esBorrador = false, esAdmin = false }: EditEventModalProps) {
    const [formData, setFormData] = useState({
        nombre_evento: '',
        fecha_evento: '',
        ubicacion: '',
        id_tipo: 1,
        id_dificultad: 1,
        costo_participacion: 0,
        cupo_maximo: 0,
        descripcion: '',
        lat: null as number | null,
        lng: null as number | null
    });

    const [tipos, setTipos] = useState<Catalogo[]>([]);
    const [dificultades, setDificultades] = useState<Catalogo[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [isSearching, setIsSearching] = useState(false);
    const [locationStatus, setLocationStatus] = useState<"idle" | "found" | "not-found">("idle");
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const searchTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            cargarCatalogos();
            cargarDatosItem();
            setTimeout(() => initMap(), 100);
        }
        
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [isOpen, item]);

    const cargarCatalogos = async () => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            
            const [tiposRes, dificultadesRes] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_URL}/solicitudes-eventos/catalogos/tipos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${import.meta.env.VITE_API_URL}/solicitudes-eventos/catalogos/dificultades`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (tiposRes.ok && dificultadesRes.ok) {
                setTipos(await tiposRes.json());
                setDificultades(await dificultadesRes.json());
            }
        } catch (error) {
            console.error('Error cargando catálogos:', error);
        }
    };

    const cargarDatosItem = () => {
        if (!item) return;

        setFormData({
            nombre_evento: item.nombre_evento || '',
            fecha_evento: item.fecha_evento?.split('T')[0] || '',
            ubicacion: item.ubicacion || '',
            id_tipo: item.id_tipo || 1,
            id_dificultad: item.id_dificultad || 1,
            costo_participacion: item.costo_participacion || 0,
            cupo_maximo: item.cupo_maximo || 0,
            descripcion: item.descripcion || '',
            lat: item.lat || null,
            lng: item.lng || null
        });
    };

    const initMap = () => {
        if (mapRef.current) {
            mapRef.current.remove();
        }

        const lat = formData.lat || -31.4135;
        const lng = formData.lng || -64.181;

        const map = L.map("edit-event-map", {
            center: [lat, lng],
            zoom: 13,
            zoomControl: true,
            scrollWheelZoom: true,
        });
        
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
        }).addTo(map);

        if (formData.lat && formData.lng) {
            const customIcon = L.divIcon({
                className: "custom-marker",
                html: '<div class="marker-pin"></div>',
                iconSize: [30, 42],
                iconAnchor: [15, 42],
            });
            
            markerRef.current = L.marker([formData.lat, formData.lng], { icon: customIcon }).addTo(map);
        }

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

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nombre_evento || !formData.fecha_evento || !formData.ubicacion) {
            onShowToast('Por favor completa todos los campos obligatorios', 'error');
            return;
        }

        if (formData.lat === null || formData.lng === null) {
            onShowToast('Debes seleccionar una ubicación en el mapa', 'error');
            return;
        }

        // ✅ NUEVO: validación extra solo cuando se envía un borrador
        if (esBorrador && (!formData.cupo_maximo || formData.cupo_maximo <= 0)) {
            onShowToast('El cupo máximo debe ser mayor a 0 para enviar', 'error');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            const isEvento = 'id_evento' in item;

            // ✅ CAMBIO PRINCIPAL: si es borrador, el PUT va con enviar=true
            // para que el backend lo pase a pendiente (externo) o lo auto-apruebe (admin)
            // Si no es borrador, se comporta igual que antes
            let endpoint: string;
            if (esBorrador) {
                // Borrador de solicitud → PUT /solicitudes-eventos/{id}?enviar=true
                // El backend detecta el rol:
                //   - Admin/Supervisor → auto-aprueba y publica
                //   - Externo → pasa a Pendiente (espera aprobación manual)
                endpoint = `/solicitudes-eventos/${(item as Solicitud).id_solicitud}?enviar=true`;
            } else if (isEvento) {
                // Edición de evento publicado → flujo de edición normal (sin cambios)
                endpoint = `/edicion-eventos/actualizar/${(item as Evento).id_evento}`;
            } else {
                // Edición de solicitud pendiente → sin cambiar estado
                endpoint = `/solicitudes-eventos/${(item as Solicitud).id_solicitud}?enviar=false`;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const data = await response.json();
                
                if (esBorrador) {
                    // ✅ NUEVO: mensaje diferenciado según el resultado del envío
                    if (esAdmin) {
                        onShowToast('✅ Evento publicado exitosamente', 'success');
                    } else {
                        onShowToast('📤 Solicitud enviada para revisión', 'success');
                    }
                } else if (data.id_solicitud) {
                    // Solicitud de edición creada (flujo original de tus compañeros)
                    onShowToast(
                        data.mensaje || 'Solicitud de edición enviada. Quedará pendiente de aprobación.', 
                        'success'
                    );
                } else {
                    // Edición directa aplicada (flujo original de tus compañeros)
                    onShowToast('Cambios guardados exitosamente', 'success');
                }
                
                onSuccess();
                onClose();
            } else {
                const error = await response.json();
                // Parsear errores Pydantic (pueden venir como array)
                const mensaje = typeof error.detail === 'string'
                    ? error.detail
                    : Array.isArray(error.detail)
                        ? error.detail.map((e: any) => e.msg || String(e)).join(', ')
                        : 'Error al guardar cambios';
                onShowToast(mensaje, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            onShowToast('Error al guardar cambios', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    // ✅ NUEVO: textos dinámicos según contexto
    const tituloModal = esBorrador
        ? `📤 Completar y Enviar Borrador`
        : `✏️ Editar ${tipo === 'evento' ? 'Evento' : 'Solicitud'}`;

    const textoBtnSubmit = loading
        ? '⏳ ENVIANDO...'
        : esBorrador
            ? esAdmin
                ? '🚀 PUBLICAR EVENTO'
                : '📤 ENVIAR PARA REVISIÓN'
            : '💾 GUARDAR CAMBIOS';

    const colorBtnSubmit = loading ? '#2a2a2a' : esBorrador ? '#c8ff00' : '#ccff00';

    return (
        <>
            <div 
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 9998,
                }}
            />
            
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: '#1a1a1a',
                borderRadius: '12px',
                maxWidth: '1200px',
                width: '95%',
                maxHeight: '90vh',
                overflow: 'auto',
                border: `1px solid ${esBorrador ? '#c8ff0044' : '#2a2a2a'}`,
                zIndex: 9999,
                fontFamily: 'Montserrat, sans-serif'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '24px',
                    borderBottom: `1px solid ${esBorrador ? '#c8ff0033' : '#2a2a2a'}`,
                    background: '#0f0f0f',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    <div>
                        <h2 style={{ 
                            margin: 0, 
                            fontSize: '1.5rem', 
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            {tituloModal}
                        </h2>
                        {/* ✅ NUEVO: aviso contextual debajo del título */}
                        {esBorrador && (
                            <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#aaa' }}>
                                {esAdmin
                                    ? 'Al guardar, el evento se publicará directamente.'
                                    : 'Al guardar, la solicitud quedará pendiente de aprobación por un administrador.'}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#a8a8a8',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            padding: '0',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px',
                    padding: '24px'
                }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                color: '#ccff00',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                textTransform: 'uppercase'
                            }}>
                                Nombre del Evento *
                            </label>
                            <input
                                type="text"
                                name="nombre_evento"
                                value={formData.nombre_evento}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#0f0f0f',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                color: '#ccff00',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                textTransform: 'uppercase'
                            }}>
                                Fecha *
                            </label>
                            <input
                                type="date"
                                name="fecha_evento"
                                value={formData.fecha_evento}
                                onChange={handleChange}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#0f0f0f',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                color: '#ccff00',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                textTransform: 'uppercase'
                            }}>
                                Ubicación *
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    name="ubicacion"
                                    value={formData.ubicacion}
                                    onChange={handleChange}
                                    placeholder="Ej: Colombres 879, Córdoba"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: '#0f0f0f',
                                        border: '1px solid #2a2a2a',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                    }}
                                />
                                {isSearching && (
                                    <span style={{ position: 'absolute', right: '12px', top: '12px' }}>
                                        <span className="spinner"></span>
                                    </span>
                                )}
                                {!isSearching && locationStatus === "found" && (
                                    <span style={{ position: 'absolute', right: '12px', top: '12px', color: '#10b981' }}>✓</span>
                                )}
                                {!isSearching && locationStatus === "not-found" && (
                                    <span style={{ position: 'absolute', right: '12px', top: '12px', color: '#ef4444' }}>✕</span>
                                )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginTop: '4px' }}>
                                Escribe la dirección o haz clic en el mapa
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '8px', 
                                    color: '#ccff00',
                                    fontWeight: '600',
                                    fontSize: '0.8rem',
                                    textTransform: 'uppercase'
                                }}>
                                    Tipo
                                </label>
                                <select
                                    name="id_tipo"
                                    value={formData.id_tipo}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: '#0f0f0f',
                                        border: '1px solid #2a2a2a',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value={0}>Seleccionar...</option>
                                    {tipos.map((t) => (
                                        <option key={t.id_tipo} value={t.id_tipo}>
                                            {t.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '8px', 
                                    color: '#ccff00',
                                    fontWeight: '600',
                                    fontSize: '0.8rem',
                                    textTransform: 'uppercase'
                                }}>
                                    Dificultad
                                </label>
                                <select
                                    name="id_dificultad"
                                    value={formData.id_dificultad}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: '#0f0f0f',
                                        border: '1px solid #2a2a2a',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '0.95rem',
                                        outline: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value={0}>Seleccionar...</option>
                                    {dificultades.map((d) => (
                                        <option key={d.id_dificultad} value={d.id_dificultad}>
                                            {d.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '8px', 
                                    color: '#ccff00',
                                    fontWeight: '600',
                                    fontSize: '0.8rem',
                                    textTransform: 'uppercase'
                                }}>
                                    Costo ($)
                                </label>
                                <input
                                    type="number"
                                    name="costo_participacion"
                                    value={formData.costo_participacion}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: '#0f0f0f',
                                        border: '1px solid #2a2a2a',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '0.95rem',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ 
                                    display: 'block', 
                                    marginBottom: '8px', 
                                    color: '#ccff00',
                                    fontWeight: '600',
                                    fontSize: '0.8rem',
                                    textTransform: 'uppercase'
                                }}>
                                    {/* ✅ NUEVO: asterisco cuando es borrador porque es requerido para enviar */}
                                    Cupo Máximo {esBorrador && '*'}
                                </label>
                                <input
                                    type="number"
                                    name="cupo_maximo"
                                    value={formData.cupo_maximo}
                                    onChange={handleChange}
                                    min="0"
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: '#0f0f0f',
                                        border: `1px solid ${esBorrador && (!formData.cupo_maximo || formData.cupo_maximo <= 0) ? '#ef444466' : '#2a2a2a'}`,
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '0.95rem',
                                        outline: 'none'
                                    }}
                                />
                                {esBorrador && (!formData.cupo_maximo || formData.cupo_maximo <= 0) && (
                                    <span style={{ fontSize: '0.72rem', color: '#ef4444', display: 'block', marginTop: '4px' }}>
                                        Requerido para enviar
                                    </span>
                                )}
                            </div>
                        </div>

                        <div>
                            <label style={{ 
                                display: 'block', 
                                marginBottom: '8px', 
                                color: '#ccff00',
                                fontWeight: '600',
                                fontSize: '0.8rem',
                                textTransform: 'uppercase'
                            }}>
                                Descripción
                            </label>
                            <textarea
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                                rows={4}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: '#0f0f0f',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    resize: 'vertical',
                                    fontFamily: 'Montserrat, sans-serif'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    padding: '12px 24px',
                                    background: 'transparent',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: '8px',
                                    color: '#a8a8a8',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                CANCELAR
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    padding: '12px 24px',
                                    background: loading ? '#2a2a2a' : colorBtnSubmit,
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: loading ? '#666' : '#000',
                                    fontWeight: '700',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s ease',
                                    opacity: loading ? 0.6 : 1
                                }}
                            >
                                {textoBtnSubmit}
                            </button>
                        </div>
                    </form>

                    <div>
                        <div style={{
                            background: '#0f0f0f',
                            border: '1px solid #2a2a2a',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            height: '100%',
                            minHeight: '500px'
                        }}>
                            <div style={{ 
                                padding: '16px', 
                                borderBottom: '1px solid #2a2a2a',
                                background: '#1a1a1a'
                            }}>
                                <h3 style={{ margin: 0, color: '#ccff00', fontSize: '1rem', fontWeight: '700' }}>
                                    📍 Ubicación en el Mapa
                                </h3>
                                <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '0.8rem' }}>
                                    Haz clic en el mapa para marcar el punto exacto
                                </p>
                            </div>
                            <div id="edit-event-map" style={{ height: 'calc(100% - 70px)', minHeight: '430px' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-marker {
                    background: transparent;
                    border: none;
                }
                .marker-pin {
                    width: 30px;
                    height: 30px;
                    border-radius: 50% 50% 50% 0;
                    background: #ccff00;
                    position: absolute;
                    transform: rotate(-45deg);
                    left: 50%;
                    top: 50%;
                    margin: -15px 0 0 -15px;
                    box-shadow: 0 0 10px rgba(204, 255, 0, 0.5);
                }
                .marker-pin::after {
                    content: '';
                    width: 14px;
                    height: 14px;
                    margin: 8px 0 0 8px;
                    background: #000;
                    position: absolute;
                    border-radius: 50%;
                }
            `}</style>
        </>
    );
}