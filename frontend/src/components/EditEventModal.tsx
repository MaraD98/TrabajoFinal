import { useState, useEffect, useRef } from 'react';
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

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
    esBorrador?: boolean;
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
        lng: null as number | null,
        distancia_km: null as number | null,
        tiempo_estimado: '',
        ruta_coordenadas: null as { lat: number; lng: number }[] | null,
    });

    const [tipos, setTipos] = useState<Catalogo[]>([]);
    const [dificultades, setDificultades] = useState<Catalogo[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [isSearching, setIsSearching] = useState(false);
    const [locationStatus, setLocationStatus] = useState<"idle" | "found" | "not-found">("idle");
    const mapRef = useRef<L.Map | null>(null);
    const searchTimeoutRef = useRef<number | null>(null);
    const routingControlRef = useRef<any>(null);

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

    // ✅ FIX: normaliza la fecha al formato yyyy-mm-dd que espera el input type="date"
    const cargarDatosItem = () => {
        if (!item) return;

        const normalizarFecha = (fecha: string): string => {
            if (!fecha) return '';
            // Si viene como ISO: "2026-03-15T00:00:00" → "2026-03-15"
            if (fecha.includes('T')) return fecha.split('T')[0];
            // Si viene como "dd-mm-yyyy" → convertir a "yyyy-mm-dd"
            if (/^\d{2}-\d{2}-\d{4}$/.test(fecha)) {
                const [dd, mm, yyyy] = fecha.split('-');
                return `${yyyy}-${mm}-${dd}`;
            }
            // Ya está en "yyyy-mm-dd"
            return fecha;
        };

        setFormData({
            nombre_evento: item.nombre_evento || '',
            fecha_evento: normalizarFecha(item.fecha_evento),
            ubicacion: item.ubicacion || '',
            id_tipo: item.id_tipo || 1,
            id_dificultad: item.id_dificultad || 1,
            costo_participacion: item.costo_participacion || 0,
            cupo_maximo: item.cupo_maximo || 0,
            descripcion: item.descripcion || '',
            lat: item.lat || null,
            lng: item.lng || null,
            distancia_km: null,
            tiempo_estimado: '',
            ruta_coordenadas: null,
        });
    };

    const initMap = () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
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

        const routingControl = (L as any).Routing.control({
            waypoints: formData.lat && formData.lng
                ? [L.latLng(formData.lat, formData.lng)]
                : [],
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

        // Cuando se calcula una ruta, guardamos distancia y tiempo
        routingControl.on('routesfound', (e: any) => {
            const summary = e.routes[0].summary;
            const distanceKm = parseFloat((summary.totalDistance / 1000).toFixed(2));
            const totalSeconds = summary.totalTime;
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const tiempoFormateado = hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
            const coords = e.routes[0].coordinates;

            setFormData(prev => ({
                ...prev,
                distancia_km: distanceKm,
                tiempo_estimado: tiempoFormateado,
                ruta_coordenadas: coords
            }));
        });

        // Click en el mapa: primer clic = ubicación, siguientes = waypoints
        map.on("click", async (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;

            const currentWaypoints = routingControlRef.current
                .getWaypoints()
                .filter((wp: any) => wp && wp.latLng)
                .map((wp: any) => wp.latLng);

            if (currentWaypoints.length === 0) {
                setFormData(prev => ({ ...prev, lat, lng }));
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
                        { headers: { "User-Agent": "EventRegistrationApp/1.0" } }
                    );
                    const data = await res.json();
                    if (data?.display_name) {
                        setFormData(prev => ({ ...prev, ubicacion: data.display_name.substring(0, 150) }));
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
                        // Usamos el routing en vez del marker directo
                        if (routingControlRef.current) {
                            routingControlRef.current.setWaypoints([L.latLng(lat, lng)]);
                        }
                    }
                } else {
                    setFormData((prev) => ({ ...prev, lat: null, lng: null }));
                    setLocationStatus("not-found");
                    // Limpiamos los waypoints en vez del marker
                    if (routingControlRef.current) {
                        routingControlRef.current.setWaypoints([]);
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

        if (esBorrador && (!formData.cupo_maximo || formData.cupo_maximo <= 0)) {
            onShowToast('El cupo máximo debe ser mayor a 0 para enviar', 'error');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            const isEvento = 'id_evento' in item;

            let endpoint: string;
            if (esBorrador) {
                endpoint = `/solicitudes-eventos/${(item as Solicitud).id_solicitud}?enviar=true`;
            } else if (isEvento) {
                endpoint = `/edicion-eventos/actualizar/${(item as Evento).id_evento}`;
            } else {
                endpoint = `/solicitudes-eventos/${(item as Solicitud).id_solicitud}?enviar=false`;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...formData,
                    ubicacion: formData.ubicacion.substring(0, 150)
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                if (esBorrador) {
                    if (esAdmin) {
                        onShowToast('✅ Evento publicado exitosamente', 'success');
                    } else {
                        onShowToast('📤 Solicitud enviada para revisión', 'success');
                    }
                } else if (data.id_solicitud) {
                    onShowToast(
                        data.mensaje || 'Solicitud de edición enviada. Quedará pendiente de aprobación.', 
                        'success'
                    );
                } else {
                    onShowToast('Cambios guardados exitosamente', 'success');
                }
                
                onSuccess();
                onClose();
            } else {
                const error = await response.json();
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
                                    📍 Ubicación y Ruta
                                </h3>
                                <p style={{ margin: '4px 0 8px 0', color: '#666', fontSize: '0.8rem' }}>
                                    Hacé clic para marcar el inicio. Seguí haciendo clic para trazar la ruta.
                                </p>

                                {formData.distancia_km !== null && (
                                    <div style={{ marginBottom: '8px', padding: '8px 12px', backgroundColor: '#0f2a1a', borderRadius: '6px', borderLeft: '3px solid #4a9eff', color: '#ccc', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                        🚴‍♂️ {formData.distancia_km} km — ⏱️ {formData.tiempo_estimado}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (routingControlRef.current) {
                                            routingControlRef.current.setWaypoints([]);
                                        }
                                        setFormData(prev => ({
                                            ...prev,
                                            lat: null,
                                            lng: null,
                                            distancia_km: null,
                                            ruta_coordenadas: null,
                                            ubicacion: '',
                                            tiempo_estimado: ''
                                        }));
                                        setLocationStatus("idle");
                                    }}
                                    style={{ 
                                        padding: '6px 14px', 
                                        background: '#c30404', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '6px', 
                                        fontWeight: '600', 
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        width: '100%'
                                    }}
                                >
                                    🗑️ Limpiar Mapa y Ruta
                                </button>
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