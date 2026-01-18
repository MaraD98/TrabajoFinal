import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/inicio.css'; // Usa los mismos estilos que el inicio
import logoWakeUp from '../assets/wakeup-logo.png'; 
import { getMisEventos } from '../services/eventos'; 
import CancelEventModal from '../components/CancelEventModal'; // Asumo que tienes este componente

// Constantes de imágenes (mismas que Inicio)
const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.split('/api')[0] : 'http://localhost:8000';

const IMAGENES_TIPO: Record<number | string, string> = {
    1: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800&auto=format&fit=crop", 
    2: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=800&auto=format&fit=crop", 
    3: "https://images.unsplash.com/photo-1471506480208-91b3a4cc78be?q=80&w=800&auto=format&fit=crop", 
    4: "https://images.unsplash.com/photo-1475666675596-cca2035b3d79?q=80&w=800&auto=format&fit=crop", 
    default: "https://images.unsplash.com/photo-1507035895480-2b3156c31110?q=80&w=800&auto=format&fit=crop" 
};

const NOMBRES_TIPO: Record<number | string, string> = {
    1: "Carrera", 2: "Paseo", 3: "Entrenamiento", 4: "Cicloturismo"
};

// Interface basada en tu Schema de Python y lo que usa el inicio
interface Evento {
    id_evento: number;
    nombre_evento: string;
    descripcion: string;
    fecha_evento: string; // Viene como string del JSON
    ubicacion: string;
    imagen_url?: string;
    costo_participacion: number;
    id_tipo: number; 
    nombre_tipo?: string; // Opcional por si el backend no lo manda en este endpoint
    id_estado: number; // <--- AGREGAR ESTO
    nombre_dificultad?: string;
    cupo_maximo: number;
    multimedia?: { url_archivo: string }[];
}

export default function MisEventosPage() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // Estados para el Modal de Cancelación
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);

    useEffect(() => {
        cargarMisEventos();
    }, [navigate]);

    const cargarMisEventos = async () => {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token"); // ✅ CORRECTO
        if (!token) {
            navigate("/login");
            return;
        }

        try {
            // Usamos el endpoint específico que vi en tu backend: /mis-eventos
            const data = await getMisEventos();
            
            // Ordenamos por fecha (más reciente primero o futuro primero, a tu gusto)
            // Aquí ordeno para que el más próximo aparezca antes
            data.sort((a: Evento, b: Evento) => new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime());
            
            setEventos(data);
        } catch (err) {
            console.error(err);
            setError('No se pudieron cargar tus eventos. Verifica tu conexión.');
        } finally {
            setLoading(false);
        }
    };

    // --- LÓGICA DE IMÁGENES (Copiada y corregida de InicioPage) ---
    const obtenerImagen = (evento: Evento) => {
        // 1. Multimedia (nuevo array)
        if (evento.multimedia && evento.multimedia.length > 0) {
            let mediaUrl = evento.multimedia[0].url_archivo;
            mediaUrl = mediaUrl.replace(/\\/g, "/"); // Fix Windows paths
            if (mediaUrl.startsWith('http')) return mediaUrl;
            const cleanPath = mediaUrl.startsWith("/") ? mediaUrl.substring(1) : mediaUrl;
            return `${API_BASE_URL}/${cleanPath}`;
        }
        // 2. Fallback imagen_url
        const url = evento.imagen_url;
        if (url && (url.includes("static") || url.includes("uploads"))) {
            let cleanPath = url.replace(/\\/g, "/");
            cleanPath = cleanPath.startsWith("/") ? cleanPath.substring(1) : cleanPath;
            return `${API_BASE_URL}/${cleanPath}`;
        }
        if (url && url.startsWith("http")) return url;
        
        // 3. Default por tipo
        return IMAGENES_TIPO[evento.id_tipo] || IMAGENES_TIPO.default;
    };

    const handleClickEliminar = (id: number) => {
        setSelectedEventoId(id);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        cargarMisEventos(); // Recarga la lista tras cancelar
    };

    const handleEditar = (id: number) => {
        // Redirige a tu página de edición (cuando la tengas)
        console.log("Ir a editar evento:", id);
        // navigate(`/editar-evento/${id}`);
    };

    if (loading) return <div style={{ color: '#ccff00', background: '#0d0d0d', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>CARGANDO...</div>;

    return (
        <div className="inicio-container">
            {/* Navbar Simplificada para panel de usuario */}
            <nav className="hero-navbar" style={{ borderBottom: '1px solid #333' }}>
                <Link to="/">
                    <img src={logoWakeUp} alt="Wake Up" className="hero-logo" onError={(e) => e.currentTarget.style.display='none'} />
                </Link>
                <Link to="/" className="hero-login-btn">Volver al Inicio</Link>
            </nav>

            <section className="eventos-section">
                <div className="section-header">
                    <h2 className="section-title">Gestionar Mis Eventos</h2>
                    <Link to="/publicar-evento" className="enlace-calendario" style={{ fontSize: '1rem' }}>
                        + Crear Nuevo
                    </Link>
                </div>

                {error && <p style={{ color: 'red' }}>{error}</p>}
                
                {eventos.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#888', padding: '50px', border: '1px dashed #333', borderRadius: '10px' }}>
                        <h3>Aún no has creado eventos.</h3>
                        <p>¡Anímate a organizar tu primera salida!</p>
                        <br />
                        <Link to="/publicar-evento" className="hero-login-btn" style={{ background: '#ccff00', color: 'black', border: 'none' }}>
                            Publicar Evento
                        </Link>
                    </div>
                ) : (
                    <div className="grid-eventos">
                        {eventos.map((evento) => {
                            const fechaLimpia = evento.fecha_evento.toString().split('T')[0];
                            const nombreTipo = evento.nombre_tipo || NOMBRES_TIPO[evento.id_tipo] || "Evento";

                            return (
                            <article key={evento.id_evento} className="evento-card">
                                <div className="card-img-wrapper">
                                    <span className="tipo-badge">
                                        {nombreTipo}
                                    </span>
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
                                
                                <div className="card-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    
                                    {/* Título y Estado */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{evento.nombre_evento}</h3>
                                    </div>

                                    {/* Info rápida */}
                                    <div style={{ marginBottom: '15px', color: '#ccc', fontSize: '0.9rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                                            <span style={{ color: '#ccff00' }}>📅</span> {fechaLimpia}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: '#ccff00' }}>📍</span> {evento.ubicacion}
                                        </div>
                                        <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#888' }}>
                                            Cupo: {evento.cupo_maximo > 0 ? evento.cupo_maximo : 'Ilimitado'}
                                        </div>
                                    </div>

                                    {/* Botones de Acción (Lo diferente a Inicio) */}
                                    <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <button 
                                            onClick={() => handleEditar(evento.id_evento)}
                                            className="btn-ver-detalle"
                                            style={{ 
                                                backgroundColor: '#333', 
                                                border: '1px solid #555',
                                                fontSize: '0.9rem',
                                                margin: 0
                                            }}
                                        >
                                            ✏️ Editar
                                        </button>
                                            {/* SOLO MOSTRAR SI NO ESTÁ CANCELADO NI ELIMINADO */}
                                            {evento.id_estado !== 5 && evento.id_estado !== 6 && (
                                        <button
                                        onClick={() => handleClickEliminar(evento.id_evento)}
                                        className="btn-ver-detalle"
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: '1px solid #e74c3c',
                                            color: '#e74c3c',
                                            fontSize: '0.9rem',
                                            margin: 0
                                            }}
                                        >
                                            ✕ Cancelar
                                        </button>
                                        )}

                                        {/* OPCIONAL: Mostrar un texto si está cancelado */}
                                        {evento.id_estado === 5 && (
                                            <span style={{ color: '#e74c3c', fontSize: '0.8rem', alignSelf: 'center', textAlign: 'center' }}>
                                                🚫 CANCELADO
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Modal de Cancelación */}
            {selectedEventoId && (
                <CancelEventModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    idEvento={selectedEventoId}
                    tipoAccion="PROPIO"
                    onSuccess={handleModalSuccess}
                />
            )}
        </div>
    );
}