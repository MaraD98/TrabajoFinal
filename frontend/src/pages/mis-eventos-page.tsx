import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/mis-eventos.css'; 
import { getMisEventos } from '../services/eventos'; 
import CancelEventModal from '../components/CancelEventModal';
import { Navbar } from '../components/navbar';
import { Footer } from '../components/footer';

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
    id_estado: number;
    nombre_dificultad?: string;
    cupo_maximo: number;
    multimedia?: { url_archivo: string }[];
}

export default function MisEventosPage() {
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);

    useEffect(() => {
        cargarMisEventos();
        // Quitamos 'navigate' de las dependencias para asegurar que solo cargue al montar
    }, []); 

    const cargarMisEventos = async () => {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }

        try {
            // Nota: Si el backend tarda, el 'await' espera aquí.
            const data = await getMisEventos();
            
            // Ordenamos
            data.sort((a: Evento, b: Evento) => new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime());
            
            setEventos(data);
        } catch (err) {
            console.error(err);
            setError('No se pudieron cargar tus eventos. Verifica tu conexión.');
        } finally {
            setLoading(false);
        }
    };

    // Optimizamos esta función para que no se recalcule innecesariamente
    const obtenerImagen = useCallback((evento: Evento) => {
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
        if (url && url.startsWith("http")) return url;
        return IMAGENES_TIPO[evento.id_tipo] || IMAGENES_TIPO.default;
    }, []);

    const handleClickEliminar = (id: number) => {
        setSelectedEventoId(id);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        setLoading(true); 
        cargarMisEventos();
    };

    const handleEditar = (id: number) => {
        console.log("Editar", id);
        // navigate(`/editar-evento/${id}`);
    };

    return (
        <div className="mis-eventos-container">
            <Navbar />
            
            <main className="mis-eventos-content-wrapper">
                <section className="main-section">
                    <div className="header-actions">
                        <h2>Gestionar Mis Eventos</h2>
                        <Link to="/publicar-evento" className="btn-crear">
                            + Crear Nuevo
                        </Link>
                    </div>

                    {error && <p className="error-msg">{error}</p>}
                    
                    {/* ✅ LÓGICA DE CARGA MEJORADA */}
                    {loading ? (
                        <div className="loading-container">
                           <div className="spinner"></div>
                            <p className="loading-text">Cargando tus eventos...</p>
                        </div>
                    ) : eventos.length === 0 ? (
                        <div className="empty-state">
                            <h3>Aún no has creado eventos.</h3>
                            <p>¡Anímate a organizar tu primera salida!</p>
                            <Link to="/publicar-evento" className="btn-crear-empty">
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
                                        <span className="tipo-badge">{nombreTipo}</span>
                                        <img 
                                            src={obtenerImagen(evento)}
                                            alt={evento.nombre_evento} 
                                            className="card-img"
                                            loading="lazy" /* 🚀 ESTO ACELERA LA PÁGINA */
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = IMAGENES_TIPO.default;
                                            }}
                                        />
                                    </div>
                                    
                                    <div className="card-content">
                                        <div className="card-header">
                                            <h3>{evento.nombre_evento}</h3>
                                        </div>

                                        <div className="card-info">
                                            <div className="info-item">
                                                <span className="icon">📅</span> {fechaLimpia}
                                            </div>
                                            <div className="info-item">
                                                <span className="icon">📍</span> {evento.ubicacion}
                                            </div>
                                            <div className="info-cupo">
                                                Cupo: {evento.cupo_maximo > 0 ? evento.cupo_maximo : 'Ilimitado'}
                                            </div>
                                        </div>

                                        <div className="card-actions">
                                            <button onClick={() => handleEditar(evento.id_evento)} className="btn-editar">
                                                ✏️ Editar
                                            </button>
                                            
                                            {evento.id_estado !== 5 && evento.id_estado !== 6 && (
                                                <button onClick={() => handleClickEliminar(evento.id_evento)} className="btn-eliminar">
                                                    ✕ Cancelar
                                                </button>
                                            )}

                                            {evento.id_estado === 5 && (
                                                <span className="estado-cancelado">🚫 CANCELADO</span>
                                            )}
                                            {evento.id_estado === 6 && (
                                                <span className="estado-pendiente-baja">⏳ PENDIENTE BAJA</span>
                                            )}
                                        </div>
                                    </div>
                                </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>

            <Footer />

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