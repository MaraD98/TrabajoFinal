import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/inicio.css';
import logoWakeUp from '../assets/wakeup-logo.png';
// Importamos la función que ya arreglamos. ¡No reinventemos la rueda!
import { getEventos } from '../services/eventos'; 

// Obtenemos la URL base (http://localhost:8000) quitándole el "/api/v1" para las imágenes
const API_BASE_URL = import.meta.env.VITE_API_URL.split('/api')[0];

// --- 1. DICCIONARIO DE IMÁGENES ---
const IMAGENES_TIPO: Record<number | string, string> = {
    1: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800&auto=format&fit=crop", 
    2: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=800&auto=format&fit=crop", 
    3: "https://images.unsplash.com/photo-1471506480208-91b3a4cc78be?q=80&w=800&auto=format&fit=crop", 
    4: "https://images.unsplash.com/photo-1475666675596-cca2035b3d79?q=80&w=800&auto=format&fit=crop", 
    default: "https://images.unsplash.com/photo-1507035895480-2b3156c31110?q=80&w=800&auto=format&fit=crop" 
};

// --- NOMBRES PARA LA ETIQUETA ---
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
}

export default function InicioPage() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cargarEventos = async () => {
            try {
                // CAMBIO CLAVE: Usamos la función del servicio, no un fetch manual
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

    // --- LÓGICA DE IMAGEN ---
    const obtenerImagen = (evento: Evento) => {
        const url = evento.imagen_url;

        if (url && url.includes("static/uploads")) {
            const cleanPath = url.startsWith("/") ? url.substring(1) : url;
            // Usamos la URL calculada dinámicamente arriba
            return `${API_BASE_URL}/${cleanPath}`;
        }
        if (url && url.startsWith("http") && url.length > 15) {
            return url;
        }
        const id = evento.id_tipo;
        if (IMAGENES_TIPO[id]) {
            return IMAGENES_TIPO[id];
        }
        return IMAGENES_TIPO.default;
    };

    if (loading) return <div className="loading-container">CARGANDO...</div>;
    if (error) return <div className="loading-container" style={{color: 'red'}}>{error}</div>;

    return (
        <div className="inicio-container">
            <header className="hero-section">
                <nav className="hero-navbar">
                    <Link to="/" className="hero-logo-link">
                        <img src={logoWakeUp} alt="Wake Up Bikes" className="hero-logo" />
                    </Link>
                    <Link to="/login" className="hero-login-btn">INICIAR SESIÓN</Link>
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
                    <Link to="/calendario" className="section-subtitle enlace-calendario">
                        Calendario 2026 ➜
                    </Link>
                </div>
                
                <div className="grid-eventos">
                    {eventos.map((evento) => {
                        const fechaLimpia = evento.fecha_evento.toString().split('T')[0];

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
                            </div>
                            
                            <div className="card-content">
                                <h3>{evento.nombre_evento}</h3>
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
                                    color: '#ccc',
                                    borderTop: '1px solid #333',
                                    paddingTop: '10px'
                                }}>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span title="Tipo">🏷️</span> 
                                        <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>
                                            {NOMBRES_TIPO[evento.id_tipo] || "Evento General"}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span title="Fecha">📅</span> 
                                        <span>{fechaLimpia}</span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                        <span style={{ marginTop: '2px' }} title="Ubicación">📍</span> 
                                        <span style={{ lineHeight: '1.4', wordBreak: 'break-word' }}>
                                            {evento.ubicacion}
                                        </span>
                                    </div>
                                </div>

                                <Link 
                                    to={`/calendario?fecha=${fechaLimpia}&id=${evento.id_evento}`}
                                    className="btn-ver-detalle"
                                    style={{ 
                                        marginTop: '20px', 
                                        width: '100%',
                                        display: 'block',    
                                        textAlign: 'center', 
                                        textDecoration: 'none'
                                    }}
                                >
                                    VER DETALLE
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