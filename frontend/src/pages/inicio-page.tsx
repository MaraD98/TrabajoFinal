import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/inicio.css'; 
import logoWakeUp from '../assets/wakeup-logo.png';
import { buscarEventosConFiltros, obtenerCatalogosParaFiltros, type FiltrosEventos } from '../services/eventos';
import { useAuth } from '../context/auth-context';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL.split('/api')[0];

const IMAGENES_TIPO: Record<number | string, string> = {
    1: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800&auto=format&fit=crop",
    2: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=800&auto=format&fit=crop",
    3: "https://images.unsplash.com/photo-1471506480208-91b3a4cc78be?q=80&w=800&auto=format&fit=crop",
    4: "https://images.unsplash.com/photo-1475666675596-cca2035b3d79?q=80&w=800&auto=format&fit=crop",
    default: "https://images.unsplash.com/photo-1507035895480-2b3156c31110?q=80&w=800&auto=format&fit=crop"
};

const NOMBRES_TIPO: Record<number | string, string> = {
    1: "Carrera",
    2: "Paseo",
    3: "Entrenamiento",
    4: "Cicloturismo"
};

interface CatalogoItem {
  id: number;
  nombre: string;
}

interface Evento {
    id_evento: number;
    nombre_evento: string;
    descripcion: string;
    fecha_evento: string;
    ubicacion: string;
    imagen_url?: string;
    costo_participacion: number;
    id_tipo: number;
    nombre_tipo?: string;
    nombre_dificultad?: string;
    cupo_maximo?: number;
    multimedia?: { url_archivo: string }[];
}

export default function InicioPage() {
    const { user, logout } = useAuth();
    const [localUserName, setLocalUserName] = useState<string>("Usuario"); 
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // ============================================================================
    // ✅ ESTADOS DE FILTROS (SIN DEBOUNCE - Se aplican al presionar botón)
    // ============================================================================
    const [busqueda, setBusqueda] = useState("");
    const [ubicacion, setUbicacion] = useState("");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");
    const [tipoSeleccionado, setTipoSeleccionado] = useState<number | undefined>();
    const [dificultadSeleccionada, setDificultadSeleccionada] = useState<number | undefined>();

    // Catálogos
    const [tiposEvento, setTiposEvento] = useState<CatalogoItem[]>([]);
    const [nivelesDificultad, setNivelesDificultad] = useState<CatalogoItem[]>([]);

    // Metadata
    const [totalEventos, setTotalEventos] = useState(0);
    const [mensajeResultado, setMensajeResultado] = useState("");
    const [mostrarFiltros, setMostrarFiltros] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user') || localStorage.getItem('usuario');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                const nombreReal = parsed.nombre_y_apellido || parsed.nombre;
                if (nombreReal && nombreReal !== "Usuario") {
                    setLocalUserName(nombreReal);
                }
            } catch (e) {
                console.error("Error leyendo datos locales", e);
            }
        }

        const token = localStorage.getItem('token');
        if (token) {
            axios.get(`${import.meta.env.VITE_API_URL}/me`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                const nombreDelServer = res.data.nombre_y_apellido || res.data.nombre;
                if (nombreDelServer) {
                    setLocalUserName(nombreDelServer);
                }
            }).catch(err => console.log("No se pudo refrescar el nombre desde el servidor", err));
        }
    }, [user]);

    const getClaseDificultad = (dificultad?: string) => {
        const dif = dificultad?.toLowerCase() || '';
        if (dif.includes('experto') || dif.includes('avanzado')) return '#ff4444'; 
        if (dif.includes('intermedio')) return '#ffaa00'; 
        if (dif.includes('principiante') || dif.includes('básico')) return '#00cc66'; 
        return '#666'; 
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    // ============================================================================
    // ✅ CARGA INICIAL: Cargar catálogos y eventos al montar
    // ============================================================================
    useEffect(() => {
        cargarCatalogos();
        cargarEventos(); // Carga inicial sin filtros
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cargarCatalogos = async () => {
        try {
            const catalogos = await obtenerCatalogosParaFiltros();
            setTiposEvento(catalogos.tipos_evento || []);
            setNivelesDificultad(catalogos.niveles_dificultad || []);
        } catch (error) {
            console.error("Error cargando catálogos:", error);
        }
    };

    // ============================================================================
    // ✅ FUNCIÓN DE CARGA (Se ejecuta manualmente al presionar "Aplicar Filtros")
    // ============================================================================
    const cargarEventos = async () => {
        setLoading(true);
        try {
            const filtros: FiltrosEventos = {};
            
            // Solo agregar filtros si tienen valor
            if (busqueda.trim()) filtros.busqueda = busqueda.trim();
            if (fechaDesde) filtros.fecha_desde = fechaDesde;
            if (fechaHasta) filtros.fecha_hasta = fechaHasta;
            if (ubicacion.trim()) filtros.ubicacion = ubicacion.trim();
            if (tipoSeleccionado) filtros.id_tipo = tipoSeleccionado;
            if (dificultadSeleccionada) filtros.id_dificultad = dificultadSeleccionada;

            const resultado = await buscarEventosConFiltros(filtros);
            const eventosFiltrados = resultado.eventos || [];
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            // Filtrar solo eventos futuros (el backend ya lo hace, pero doble validación)
            const eventosProcesados = eventosFiltrados
                .filter((evento: Evento) => {
                    const fechaEvento = new Date(evento.fecha_evento);
                    return fechaEvento >= hoy;
                })
                .sort((a: Evento, b: Evento) => {
                    const fechaA = new Date(a.fecha_evento).getTime();
                    const fechaB = new Date(b.fecha_evento).getTime();
                    return fechaA - fechaB;
                });

            setEventos(eventosProcesados);
            setTotalEventos(resultado.total);
            setMensajeResultado(resultado.mensaje);
        } catch (err) {
            console.error(err);
            setError('No se pudieron cargar los eventos.');
        } finally {
            setLoading(false);
        }
    };

    // ============================================================================
    // ✅ FUNCIÓN PARA APLICAR FILTROS (Botón manual)
    // ============================================================================
    const aplicarFiltros = () => {
        cargarEventos();
    };

    // ============================================================================
    // ✅ FUNCIÓN PARA LIMPIAR FILTROS
    // ============================================================================
    const limpiarFiltros = async () => {
        // Limpiar todos los estados
        setBusqueda("");
        setUbicacion("");
        setFechaDesde("");
        setFechaHasta("");
        setTipoSeleccionado(undefined);
        setDificultadSeleccionada(undefined);
        
        // Recargar eventos sin filtros (llamada directa sin esperar estados)
        setLoading(true);
        try {
            // Llamar al backend sin filtros (objeto vacío)
            const resultado = await buscarEventosConFiltros({});
            const eventosFiltrados = resultado.eventos || [];
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            const eventosProcesados = eventosFiltrados
                .filter((evento: Evento) => {
                    const fechaEvento = new Date(evento.fecha_evento);
                    return fechaEvento >= hoy;
                })
                .sort((a: Evento, b: Evento) => {
                    const fechaA = new Date(a.fecha_evento).getTime();
                    const fechaB = new Date(b.fecha_evento).getTime();
                    return fechaA - fechaB;
                });

            setEventos(eventosProcesados);
            setTotalEventos(resultado.total);
            setMensajeResultado(resultado.mensaje);
        } catch (err) {
            console.error(err);
            setError('No se pudieron cargar los eventos.');
        } finally {
            setLoading(false);
        }
    };

    const obtenerImagen = (evento: Evento) => {
        if (evento.multimedia && evento.multimedia.length > 0) {
            let mediaUrl = evento.multimedia[0].url_archivo;
            mediaUrl = mediaUrl.replace(/\\/g, "/");
            if (mediaUrl.startsWith('http')) return mediaUrl;
            const cleanPath = mediaUrl.startsWith("/") ? mediaUrl.substring(1) : mediaUrl;
            return `${API_BASE_URL}/${cleanPath}`;
        }
        const url = evento.imagen_url;
        if (url && (url.includes("static") || url.includes("uploads"))) {
            let cleanPath = url.replace(/\\/g, "/");
            cleanPath = cleanPath.startsWith("/") ? cleanPath.substring(1) : cleanPath;
            return `${API_BASE_URL}/${cleanPath}`;
        }
        if (url && url.startsWith("http") && url.length > 15) return url;
        const id = evento.id_tipo;
        if (IMAGENES_TIPO[id]) return IMAGENES_TIPO[id];
        return IMAGENES_TIPO.default;
    };

    // ============================================================================
    // ✅ FUNCIÓN PARA DETERMINAR RUTA DE CREACIÓN DE EVENTO SEGÚN ROL
    // ============================================================================
    const obtenerRutaCrearEvento = () => {
        if (!user) return "/login";
        
        // Roles 1 y 2 (Admin/Organizador) → /registro-evento
        if (user.id_rol === 1 || user.id_rol === 2) {
            return "/registro-evento";
        }
        
        // Roles 3 y 4 (Usuario Externo/Otro) → /publicar-evento
        if (user.id_rol === 3 || user.id_rol === 4) {
            return "/publicar-evento";
        }
        
        // Por defecto
        return "/publicar-evento";
    };

    // ============================================================================
    // ✅ FUNCIÓN PARA DETERMINAR SI MOSTRAR BOTÓN DE PANEL DE ADMIN
    // ============================================================================
    const mostrarBotonPanelAdmin = () => {
        return user && (user.id_rol === 1 || user.id_rol === 2);
    };

    if (loading) return <div style={{ color: '#ccff00', background: '#0d0d0d', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>CARGANDO...</div>;
    if (error) return <div style={{ color: 'red', background: '#0d0d0d', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{error}</div>;

    return (
        <div className="inicio-container">
            <header className="hero-section">
                <nav className="hero-navbar">
                    <Link to="/" className="hero-logo-link">
                        <img src={logoWakeUp} alt="Wake Up Bikes" className="hero-logo" />
                    </Link>

                    {user ? (
                        <div className="user-menu-container" ref={dropdownRef}>
                            <button
                                className="user-menu-trigger"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span className="user-icon">👤</span>
                                <span className="user-name">{localUserName}</span>
                                <span className="dropdown-arrow">▼</span>
                            </button>

                            {isDropdownOpen && (
                                <div className="user-dropdown">
                                    <div className="dropdown-header">MI CUENTA</div>
                                    <Link to="/perfil" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                        👤 Mi Perfil
                                    </Link>
                                    <Link to="/reportes" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                        📑 Mis Reportes
                                    </Link>

                                    <div className="dropdown-header">EVENTOS</div>
                                    <Link to="/mis-eventos?tab=inscriptos" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                        Inscriptos
                                    </Link>
                                    <Link to="/mis-eventos" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                        Mis Eventos
                                    </Link>
                                    
                                    <div className="dropdown-divider"></div>
                                    <Link to={obtenerRutaCrearEvento()}  className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                        Crear Evento
                                    </Link>
                                    

                                    {/* ✅ NUEVO: Botón Panel de Admin (SOLO para Admin y Supervisor) */}
                                    {mostrarBotonPanelAdmin() && (
                                        <>
                                            <div className="dropdown-divider"></div>
                                            <Link 
                                                to="/admin" 
                                                className="dropdown-item"
                                                style={{ 
                                                    backgroundColor: '#ff6600', 
                                                    color: '#fff',
                                                    fontWeight: 'bold'
                                                }}
                                                onClick={() => setIsDropdownOpen(false)}
                                            >
                                                ⚙️ Panel de Administrador
                                            </Link>
                                        </>
                                    )}

                                    <div className="dropdown-divider"></div>
                                    
                                    <button
                                        onClick={logout}
                                        className="dropdown-item logout-button"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" className="hero-login-btn">INICIAR SESIÓN</Link>
                    )}
                </nav>
                <div className="hero-content">
                    <h1>Siente la Adrenalina</h1>
                    <p>Únete a la comunidad más grande de eventos deportivos y solidarios.</p>
                    <a href="#eventos" className="cta-button">Explorar Eventos</a>
                </div>
            </header>

            <section id="eventos" className="eventos-section">
                <div className="section-header">
                    <h2 className="section-title">Próximos Eventos</h2>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button 
                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                            className="btn-toggle-filtros"
                            style={{
                                background: mostrarFiltros ? '#ccff00' : '#333',
                                color: mostrarFiltros ? '#000' : '#fff',
                                border: 'none',
                                padding: '10px 20px',
                                borderRadius: '5px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.3s'
                            }}
                        >
                            {mostrarFiltros ? '✕ Ocultar Filtros' : '🔍 Mostrar Filtros'}
                        </button>
                        <Link to="/calendario" className="enlace-calendario">
                            Calendario 2026 ➜
                        </Link>
                    </div>
                </div>

                {/* ============================================================================ */}
                {/* ✅ FILTROS CON BOTÓN MANUAL (SIN DEBOUNCE AUTOMÁTICO) */}
                {/* ============================================================================ */}
                {mostrarFiltros && (
                    <div className="filters-container-advanced" style={{ marginBottom: '30px' }}>
                        {/* Búsqueda por nombre */}
                        <div className="filter-row">
                            <div className="filter-group-full">
                                <label className="filter-label">🔍 Buscar por nombre del evento</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Ciclovía, Mountain Bike..." 
                                    className="filter-input"
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') aplicarFiltros();
                                    }}
                                />
                            </div>
                        </div>

                        {/* Fechas */}
                        <div className="filter-row">
                            <div className="filter-group">
                                <label className="filter-label">📅 Desde</label>
                                <input 
                                    type="date" 
                                    className="filter-input"
                                    value={fechaDesde}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">📅 Hasta</label>
                                <input 
                                    type="date" 
                                    className="filter-input"
                                    value={fechaHasta}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Ubicación */}
                        <div className="filter-row">
                            <div className="filter-group-full">
                                <label className="filter-label">📍 Ubicación</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Córdoba, Buenos Aires, Rosario..." 
                                    className="filter-input"
                                    value={ubicacion}
                                    onChange={(e) => setUbicacion(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') aplicarFiltros();
                                    }}
                                />
                            </div>
                        </div>

                        {/* Tipo y Dificultad */}
                        <div className="filter-row">
                            <div className="filter-group">
                                <label className="filter-label">🏆 Tipo de Evento</label>
                                <select 
                                    className="filter-select"
                                    value={tipoSeleccionado || ""} 
                                    onChange={(e) => setTipoSeleccionado(e.target.value ? Number(e.target.value) : undefined)} 
                                >
                                    <option value="">Todos los tipos</option>
                                    {tiposEvento.map(tipo => (
                                        <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label className="filter-label">💪 Dificultad</label>
                                <select 
                                    className="filter-select"
                                    value={dificultadSeleccionada || ""}
                                    onChange={(e) => setDificultadSeleccionada(e.target.value ? Number(e.target.value) : undefined)}
                                >
                                    <option value="">Todas las dificultades</option>
                                    {nivelesDificultad.map(nivel => (
                                        <option key={nivel.id} value={nivel.id}>{nivel.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ✅ BOTONES DE ACCIÓN (APLICAR + LIMPIAR) */}
                        <div className="filter-actions">
                            <button 
                                className="btn-aplicar-filtros"
                                onClick={aplicarFiltros}
                                style={{
                                    background: '#ccff00',
                                    color: '#000',
                                    border: 'none',
                                    padding: '12px 30px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                🔍 BUSCAR
                            </button>

                            <button 
                                className="btn-limpiar-filtros"
                                onClick={limpiarFiltros}
                                style={{
                                    background: '#ff4444',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '12px 30px',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                🗑️ LIMPIAR FILTROS
                            </button>
                        </div>

                        <div style={{ marginTop: '15px', color: '#ccff00', fontSize: '0.9rem', textAlign: 'center' }}>
                            {mensajeResultado} | Total: {totalEventos} eventos
                        </div>
                    </div>
                )}

                <div className="grid-eventos">
                    {eventos.map((evento) => {
                        const fechaLimpia = evento.fecha_evento.toString().split('T')[0];
                        const nombreTipo = evento.nombre_tipo || NOMBRES_TIPO[evento.id_tipo] || "Evento";
                        
                        return (
                            <article key={evento.id_evento} className="evento-card">
                                <div className="card-img-wrapper">
                                    <img
                                        src={obtenerImagen(evento)}
                                        alt={evento.nombre_evento}
                                        className="card-img"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = IMAGENES_TIPO.default;
                                        }}
                                    />
                                    <div className="tipo-badge">{nombreTipo}</div>
                                </div>
                                <div className="card-content">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1.2 }}>{evento.nombre_evento}</h3>
                                        <div style={{ backgroundColor: '#ccff00', color: '#000', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.9rem', whiteSpace: 'nowrap', marginLeft: '10px'}}>
                                            {evento.costo_participacion && evento.costo_participacion > 0 ? `$${evento.costo_participacion}` : 'GRATIS'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', border: `1px solid ${getClaseDificultad(evento.nombre_dificultad)}`, color: getClaseDificultad(evento.nombre_dificultad), textTransform: 'uppercase', fontWeight: 600 }}>
                                            {evento.nombre_dificultad || 'General'}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#333', color: '#aaa', border: '1px solid #444' }}>
                                            {evento.cupo_maximo ? `Cupos: ${evento.cupo_maximo}` : 'Cupo Libre'}
                                        </span>
                                    </div>
                                    <p className="card-desc">
                                        {evento.descripcion ? (evento.descripcion.length > 80 ? evento.descripcion.substring(0, 80) + '...' : evento.descripcion) : "Detalles próximamente."}
                                    </p>
                                    <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#cccccc', borderTop: '1px solid #333', paddingTop: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span title="Fecha" style={{ color: '#ccff00' }}>📅</span>
                                            <span>{fechaLimpia}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                            <span style={{ marginTop: '2px', color: '#ccff00' }} title="Ubicación">📍</span>
                                            <span style={{ lineHeight: '1.4', wordBreak: 'break-word' }}>{evento.ubicacion}</span>
                                        </div>
                                    </div>
                                    <Link to={`/calendario?fecha=${fechaLimpia}&id=${evento.id_evento}`} className="btn-ver-detalle">
                                        VER DETALLE E INSCRIPCIÓN
                                    </Link>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}