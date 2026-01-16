import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/inicio.css'; 
import logoWakeUp from '../assets/wakeup-logo.png';
import { getEventos } from '../services/eventos';
import { useAuth } from '../context/auth-context';

const API_BASE_URL = import.meta.env.VITE_API_URL.split('/api')[0];

const IMAGENES_TIPO: Record<number | string, string> = {
    1: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800&auto=format&fit=crop",
    2: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=800&auto=format&fit=crop",
    3: "https://images.unsplash.com/photo-1471506480208-91b3a4cc78be?q=80&w=800&auto=format&fit=crop",
    4: "https://images.unsplash.com/photo-1475666675596-cca2035b3d79?q=80&w=800&auto=format&fit=crop",
    default: "https://images.unsplash.com/photo-1507035895480-2b3156c31110?q=80&w=800&auto=format&fit=crop"
};

// Mantenemos esto como respaldo por si el backend no manda 'nombre_tipo'
const NOMBRES_TIPO: Record<number | string, string> = {
    1: "Carrera",
    2: "Paseo",
    3: "Entrenamiento",
    4: "Cicloturismo"
};

interface Evento {
    id_evento: number;
    nombre_evento: string;
    descripcion: string;
    fecha_evento: string;
    ubicacion: string;
    imagen_url?: string;
    costo_participacion: number;
    id_tipo: number;
    // Agregados para coincidir con Calendario
    nombre_tipo?: string;
    nombre_dificultad?: string;
    cupo_maximo?: number;
}

export default function InicioPage() {
    const { user, logout } = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // --- LÓGICA DE DIFICULTAD (Traída del Calendario) ---
    const getClaseDificultad = (dificultad?: string) => {
        const dif = dificultad?.toLowerCase() || '';
        if (dif.includes('experto') || dif.includes('avanzado')) return '#ff4444'; // Rojo
        if (dif.includes('intermedio')) return '#ffaa00'; // Naranja
        if (dif.includes('principiante') || dif.includes('básico')) return '#00cc66'; // Verde
        return '#666'; // Gris default
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

    useEffect(() => {
        const cargarEventos = async () => {
            try {
                const data = await getEventos();
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);

                const eventosProcesados = data
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
            } catch (err) {
                console.error(err);
                setError('No se pudieron cargar los eventos.');
            } finally {
                setLoading(false);
            }
        };
        cargarEventos();
    }, []);

    const obtenerImagen = (evento: Evento) => {
        const url = evento.imagen_url;
        if (url && url.includes("static/uploads")) {
            const cleanPath = url.startsWith("/") ? url.substring(1) : url;
            return `${API_BASE_URL}/${cleanPath}`;
        }
        if (url && url.startsWith("http") && url.length > 15) {
            return url;
        }
        const id = evento.id_tipo;
        if (IMAGENES_TIPO[id]) { return IMAGENES_TIPO[id]; }
        return IMAGENES_TIPO.default;
    };

    if (loading) return <div style={{ color: '#ccff00', background: '#0d0d0d', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>CARGANDO...</div>;
    if (error) return <div style={{ color: 'red', background: '#0d0d0d', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{error}</div>;

    // ESTILOS DE DROPDOWN
    const dropdownStyle: React.CSSProperties = {
        position: 'absolute',
        top: '120%',
        right: 0,
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '10px 0',
        minWidth: '200px',
        zIndex: 1000,
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
        display: 'flex',
        flexDirection: 'column'
    };

    const dropdownItemStyle: React.CSSProperties = {
        padding: '12px 20px',
        color: '#fff',
        textDecoration: 'none',
        fontSize: '0.9rem',
        display: 'block',
        transition: 'background 0.2s',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        width: '100%'
    };

    return (
        <div className="inicio-container">
            <header className="hero-section">
                <nav className="hero-navbar">
                    <Link to="/" className="hero-logo-link">
                        <img src={logoWakeUp} alt="Wake Up Bikes" className="hero-logo" />
                    </Link>

                    {user ? (
                        <div className="user-menu-container" ref={dropdownRef} style={{ position: 'relative' }}>
                            <button
                                className="user-menu-trigger"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                style={{
                                    cursor: 'pointer',
                                    background: '#0d0d0d',
                                    border: '1px solid #ccff00',
                                    color: '#ccff00',
                                    padding: '10px 20px',
                                    borderRadius: '5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    fontWeight: 'bold'
                                }}
                            >
                                <span className="user-icon">👤</span>
                                <span className="user-name">{user.nombre || "Usuario"}</span>
                                <span className="dropdown-arrow">▼</span>
                            </button>

                            {isDropdownOpen && (
                                <div className="user-dropdown" style={dropdownStyle}>
                                    <div style={{ padding: '10px 20px', fontSize: '0.75rem', color: '#888', fontWeight: 800, textTransform: 'uppercase', borderBottom: '1px solid #333' }}>
                                        MI CUENTA
                                    </div>
                                    <Link to="/mis-eventos/inscriptos" style={dropdownItemStyle} className="dropdown-item-hover">
                                        Inscriptos
                                    </Link>
                                    <Link to="/mis-eventos/creados" style={dropdownItemStyle} className="dropdown-item-hover">
                                        Creados
                                    </Link>
                                    <div style={{ height: '1px', background: '#333', margin: '5px 0' }}></div>
                                    <button
                                        onClick={logout}
                                        style={{ ...dropdownItemStyle, color: '#ff4444' }}
                                        className="dropdown-item-hover"
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
                    <Link to="/calendario" className="enlace-calendario">
                        Calendario 2026 ➜
                    </Link>
                </div>

                <div className="grid-eventos">
                    {eventos.map((evento) => {
                        const fechaLimpia = evento.fecha_evento.toString().split('T')[0];
                        // Prioridad: nombre del tipo de la BD, sino mapeo manual
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
                                    {/* Mantenemos el badge de tipo flotante sobre la imagen también, estilo moderno */}
                                    <div className="tipo-badge">
                                        {nombreTipo}
                                    </div>
                                </div>

                                <div className="card-content" style={{ cursor: 'default' }}>
                                    
                                    {/* --- CABECERA DE LA CARD (Título y Precio) --- */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', lineHeight: 1.2 }}>{evento.nombre_evento}</h3>
                                        <div style={{ 
                                            backgroundColor: '#ccff00', 
                                            color: '#000', 
                                            padding: '4px 8px', 
                                            borderRadius: '4px', 
                                            fontWeight: 'bold', 
                                            fontSize: '0.9rem',
                                            whiteSpace: 'nowrap',
                                            marginLeft: '10px'
                                        }}>
                                            {evento.costo_participacion && evento.costo_participacion > 0 
                                                ? `$${evento.costo_participacion}`
                                                : 'GRATIS'}
                                        </div>
                                    </div>

                                    {/* --- BADGES (Dificultad, Cupo) --- */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                                        {/* Badge Dificultad */}
                                        <span style={{
                                            fontSize: '0.75rem',
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            border: `1px solid ${getClaseDificultad(evento.nombre_dificultad)}`,
                                            color: getClaseDificultad(evento.nombre_dificultad),
                                            textTransform: 'uppercase',
                                            fontWeight: 600
                                        }}>
                                            {evento.nombre_dificultad || 'General'}
                                        </span>

                                        {/* Badge Cupo */}
                                        <span style={{
                                            fontSize: '0.75rem',
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            backgroundColor: '#333',
                                            color: '#aaa',
                                            border: '1px solid #444'
                                        }}>
                                            {evento.cupo_maximo ? `Cupos: ${evento.cupo_maximo}` : 'Cupo Libre'}
                                        </span>
                                    </div>

                                    <p className="card-desc">
                                        {evento.descripcion
                                            ? (evento.descripcion.length > 80 ? evento.descripcion.substring(0, 80) + '...' : evento.descripcion)
                                            : "Detalles próximamente."}
                                    </p>

                                    <div style={{
                                        marginTop: '15px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        fontSize: '0.9rem',
                                        color: '#cccccc',
                                        borderTop: '1px solid #333',
                                        paddingTop: '10px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span title="Fecha" style={{ color: '#ccff00' }}>📅</span>
                                            <span>{fechaLimpia}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                            <span style={{ marginTop: '2px', color: '#ccff00' }} title="Ubicación">📍</span>
                                            <span style={{ lineHeight: '1.4', wordBreak: 'break-word' }}>
                                                {evento.ubicacion}
                                            </span>
                                        </div>
                                    </div>

                                    <Link
                                        to={`/calendario?fecha=${fechaLimpia}&id=${evento.id_evento}`}
                                        className="btn-ver-detalle"
                                        style={{ cursor: 'pointer', marginTop: '15px', textAlign: 'center', display: 'block' }}
                                    >
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