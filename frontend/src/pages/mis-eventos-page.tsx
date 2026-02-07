import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/mis-eventos.css';
import logoWakeUp from '../assets/wakeup-logo.png'; 
import { getMisEventos, getMisSolicitudes } from '../services/eventos'; 
import CancelEventModal from '../components/CancelEventModal';

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

interface Solicitud {
    id_solicitud: number;
    nombre_evento: string;
    descripcion: string;
    fecha_evento: string;
    ubicacion: string;
    costo_participacion: number;
    id_tipo: number;
    id_dificultad: number;
    id_estado_solicitud: number;
    fecha_solicitud: string;
    observaciones_admin?: string;
    cupo_maximo: number;
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
    id_estado: number;
    nombre_dificultad?: string;
    cupo_maximo: number;
    multimedia?: { url_archivo: string }[];
}

type Vista = 'borradores' | 'pendientes' | 'activos' | 'finalizados' | 'historial';

export default function MisEventosPage() {
    const [vistaActiva, setVistaActiva] = useState<Vista>('activos');
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const navigate = useNavigate();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);

    useEffect(() => {
        cargarDatos();
    }, [navigate, vistaActiva]);

    const cargarDatos = async () => {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }

        setLoading(true);
        try {
            if (vistaActiva === 'borradores' || vistaActiva === 'pendientes' || vistaActiva === 'historial') {
                await cargarSolicitudes();
            } else {
                await cargarEventos();
            }
        } catch (err) {
            console.error(err);
            setError('No se pudieron cargar los datos. Verifica tu conexión.');
        } finally {
            setLoading(false);
        }
    };

    const cargarSolicitudes = async () => {
        try {
            const data = await getMisSolicitudes();
            setSolicitudes(data);
        } catch (err) {
            console.error('Error cargando solicitudes:', err);
            setSolicitudes([]);
        }
    };

    const cargarEventos = async () => {
        try {
            const data = await getMisEventos();
            setEventos(data);
        } catch (err) {
            console.error('Error cargando eventos:', err);
            setEventos([]);
        }
    };

    const obtenerImagen = (item: Evento | Solicitud) => {
        if ('multimedia' in item && item.multimedia && item.multimedia.length > 0) {
            let mediaUrl = item.multimedia[0].url_archivo;
            mediaUrl = mediaUrl.replace(/\\/g, "/");
            if (mediaUrl.startsWith('http')) return mediaUrl;
            const cleanPath = mediaUrl.startsWith("/") ? mediaUrl.substring(1) : mediaUrl;
            return `${API_BASE_URL}/${cleanPath}`;
        }
        const url = 'imagen_url' in item ? item.imagen_url : undefined;
        if (url && (url.includes("static") || url.includes("uploads"))) {
            let cleanPath = url.replace(/\\/g, "/");
            cleanPath = cleanPath.startsWith("/") ? cleanPath.substring(1) : cleanPath;
            return `${API_BASE_URL}/${cleanPath}`;
        }
        if (url && url.startsWith("http")) return url;
        return IMAGENES_TIPO[item.id_tipo] || IMAGENES_TIPO.default;
    };

    const handleClickEliminar = (id: number) => {
        setSelectedEventoId(id);
        setIsModalOpen(true);
    };

    const handleModalSuccess = () => {
        showToast('Operación realizada con éxito', 'success');
        cargarDatos();
    };

    const handleEditar = (id: number) => {
        console.log("Editar", id);
    };

    const handleEnviarSolicitud = async (idSolicitud: number) => {
        try {
            const token = localStorage.getItem("token") || sessionStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/solicitudes-eventos/${idSolicitud}/enviar`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                showToast('Solicitud enviada para revisión', 'success');
                cargarDatos();
            } else {
                const error = await response.json();
                showToast(error.detail || 'Error al enviar solicitud', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast('Error al enviar solicitud', 'error');
        }
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        setToast({ message, type });
    };

    // Filtrar según vista activa
    const solicitudesBorradores = solicitudes.filter(s => s.id_estado_solicitud === 1);
    const solicitudesPendientes = solicitudes.filter(s => s.id_estado_solicitud === 2);
    const solicitudesHistorial = solicitudes.filter(s => s.id_estado_solicitud === 3 || s.id_estado_solicitud === 4);
    
    const eventosActivos = eventos.filter(e => e.id_estado === 3 && new Date(e.fecha_evento) >= new Date());
    const eventosFinalizados = eventos.filter(e => e.id_estado === 3 && new Date(e.fecha_evento) < new Date());

    // Componente de Toast
    const Toast = () => {
        if (!toast) return null;
        
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6' };

        return (
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                background: '#1a1a1a',
                border: `2px solid ${colors[toast.type]}`,
                borderRadius: '8px',
                padding: '16px 20px',
                minWidth: '300px',
                maxWidth: '500px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8)',
                zIndex: 10000,
                animation: 'slideInRight 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontFamily: 'Montserrat, sans-serif'
            }}>
                <span style={{ fontSize: '1.5rem' }}>{icons[toast.type]}</span>
                <span style={{ color: '#fff', flex: 1, fontSize: '0.95rem', fontWeight: '500' }}>{toast.message}</span>
                <button 
                    onClick={() => setToast(null)} 
                    style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#888', 
                        fontSize: '1.2rem', 
                        cursor: 'pointer', 
                        padding: '4px 8px' 
                    }}
                >✕</button>
            </div>
        );
    };

    // Renderizar tarjeta de solicitud
    const renderSolicitudCard = (solicitud: Solicitud) => {
        const fechaLimpia = solicitud.fecha_evento.toString().split('T')[0];
        const nombreTipo = NOMBRES_TIPO[solicitud.id_tipo] || "Evento";
        const esBorrador = solicitud.id_estado_solicitud === 1;
        const esPendiente = solicitud.id_estado_solicitud === 2;
        const esAprobada = solicitud.id_estado_solicitud === 3;
        const esRechazada = solicitud.id_estado_solicitud === 4;

        return (
            <article key={solicitud.id_solicitud} className="evento-card">
                <div className="card-img-wrapper">
                    <span className="tipo-badge">{nombreTipo}</span>
                    <img 
                        src={obtenerImagen(solicitud)}
                        alt={solicitud.nombre_evento} 
                        className="card-img"
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = IMAGENES_TIPO.default;
                        }}
                    />
                </div>
                
                <div className="card-content">
                    <div className="card-header">
                        <h3>{solicitud.nombre_evento}</h3>
                    </div>

                    <div className="card-info">
                        <div className="info-item">
                            <span className="icon">📅</span> {fechaLimpia}
                        </div>
                        <div className="info-item">
                            <span className="icon">📍</span> {solicitud.ubicacion}
                        </div>
                        <div className="info-cupo">
                            Cupo: {solicitud.cupo_maximo > 0 ? solicitud.cupo_maximo : 'Ilimitado'}
                        </div>
                    </div>

                    <div className="card-actions">
                        {esBorrador && (
                            <>
                                <button onClick={() => handleEditar(solicitud.id_solicitud)} className="btn-editar">
                                    ✏️ Editar
                                </button>
                                <button onClick={() => handleEnviarSolicitud(solicitud.id_solicitud)} className="btn-enviar">
                                    📤 Enviar
                                </button>
                            </>
                        )}
                        
                        {esPendiente && (
                            <span className="estado-pendiente">⏳ EN REVISIÓN</span>
                        )}

                        {esAprobada && (
                            <span className="estado-aprobado">✅ APROBADA</span>
                        )}

                        {esRechazada && solicitud.observaciones_admin && (
                            <div className="estado-rechazado-wrapper">
                                <span className="estado-rechazado">❌ RECHAZADA</span>
                                <p className="observaciones-admin">{solicitud.observaciones_admin}</p>
                            </div>
                        )}
                    </div>
                </div>
            </article>
        );
    };

    // Renderizar tarjeta de evento
    const renderEventoCard = (evento: Evento) => {
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
                        {vistaActiva === 'activos' && evento.id_estado !== 5 && evento.id_estado !== 6 && (
                            <>
                                <button onClick={() => handleEditar(evento.id_evento)} className="btn-editar">
                                    ✏️ Editar
                                </button>
                                <button onClick={() => handleClickEliminar(evento.id_evento)} className="btn-eliminar">
                                    ✕ Cancelar
                                </button>
                            </>
                        )}

                        {vistaActiva === 'finalizados' && (
                            <span className="estado-finalizado">🏁 FINALIZADO</span>
                        )}
                    </div>
                </div>
            </article>
        );
    };

    if (loading) return <div className="loading-screen">CARGANDO...</div>;

    return (
        <div className="mis-eventos-container">
            <Toast />

            <nav className="mis-eventos-navbar">
                <Link to="/" className="hero-logo-link">
                    <img src={logoWakeUp} alt="Wake Up Bikes" className="hero-logo" />
                </Link>
                <Link to="/" className="btn-volver">Volver al Inicio</Link>
            </nav>

            <div className="mis-eventos-layout">
                {/* SIDEBAR CON PESTAÑAS */}
                <aside className="mis-eventos-sidebar">
                    <button 
                        className={`sidebar-btn ${vistaActiva === 'borradores' ? 'active' : ''}`}
                        onClick={() => setVistaActiva('borradores')}
                    >
                        <span className="icon">📝</span>
                        <span className="text">Borradores</span>
                        {solicitudesBorradores.length > 0 && (
                            <span className="badge">{solicitudesBorradores.length}</span>
                        )}
                    </button>

                    <button 
                        className={`sidebar-btn ${vistaActiva === 'pendientes' ? 'active' : ''}`}
                        onClick={() => setVistaActiva('pendientes')}
                    >
                        <span className="icon">⏳</span>
                        <span className="text">Pendientes</span>
                        {solicitudesPendientes.length > 0 && (
                            <span className="badge">{solicitudesPendientes.length}</span>
                        )}
                    </button>

                    <button 
                        className={`sidebar-btn ${vistaActiva === 'activos' ? 'active' : ''}`}
                        onClick={() => setVistaActiva('activos')}
                    >
                        <span className="icon">✅</span>
                        <span className="text">Activos</span>
                        {eventosActivos.length > 0 && (
                            <span className="badge">{eventosActivos.length}</span>
                        )}
                    </button>

                    <button 
                        className={`sidebar-btn ${vistaActiva === 'finalizados' ? 'active' : ''}`}
                        onClick={() => setVistaActiva('finalizados')}
                    >
                        <span className="icon">🕐</span>
                        <span className="text">Finalizados</span>
                        {eventosFinalizados.length > 0 && (
                            <span className="badge">{eventosFinalizados.length}</span>
                        )}
                    </button>

                    <button 
                        className={`sidebar-btn ${vistaActiva === 'historial' ? 'active' : ''}`}
                        onClick={() => setVistaActiva('historial')}
                    >
                        <span className="icon">📜</span>
                        <span className="text">Historial</span>
                    </button>

                    <Link to="/publicar-evento" className="btn-crear-sidebar">
                        + Crear Nuevo Evento
                    </Link>
                </aside>

                {/* CONTENIDO PRINCIPAL */}
                <main className="mis-eventos-main">
                    <div className="section-header">
                        <h2>
                            {vistaActiva === 'borradores' && '📝 Mis Borradores'}
                            {vistaActiva === 'pendientes' && '⏳ En Revisión'}
                            {vistaActiva === 'activos' && '✅ Eventos Activos'}
                            {vistaActiva === 'finalizados' && '🕐 Eventos Finalizados'}
                            {vistaActiva === 'historial' && '📜 Historial'}
                        </h2>
                    </div>

                    {error && <p className="error-msg">{error}</p>}

                    {/* BORRADORES */}
                    {vistaActiva === 'borradores' && (
                        solicitudesBorradores.length === 0 ? (
                            <div className="empty-state">
                                <h3>No tienes borradores</h3>
                                <p>Los eventos que crees se guardarán aquí hasta que los envíes para aprobación.</p>
                            </div>
                        ) : (
                            <div className="grid-eventos">
                                {solicitudesBorradores.map(renderSolicitudCard)}
                            </div>
                        )
                    )}

                    {/* PENDIENTES */}
                    {vistaActiva === 'pendientes' && (
                        solicitudesPendientes.length === 0 ? (
                            <div className="empty-state">
                                <h3>No tienes solicitudes pendientes</h3>
                                <p>Tus solicitudes enviadas aparecerán aquí mientras son revisadas.</p>
                            </div>
                        ) : (
                            <div className="grid-eventos">
                                {solicitudesPendientes.map(renderSolicitudCard)}
                            </div>
                        )
                    )}

                    {/* ACTIVOS */}
                    {vistaActiva === 'activos' && (
                        eventosActivos.length === 0 ? (
                            <div className="empty-state">
                                <h3>No tienes eventos activos</h3>
                                <p>¡Crea tu primer evento y compártelo con la comunidad!</p>
                                <Link to="/publicar-evento" className="btn-crear-empty">
                                    Publicar Evento
                                </Link>
                            </div>
                        ) : (
                            <div className="grid-eventos">
                                {eventosActivos.map(renderEventoCard)}
                            </div>
                        )
                    )}

                    {/* FINALIZADOS */}
                    {vistaActiva === 'finalizados' && (
                        eventosFinalizados.length === 0 ? (
                            <div className="empty-state">
                                <h3>No tienes eventos finalizados</h3>
                                <p>Los eventos cuya fecha ya pasó aparecerán aquí.</p>
                            </div>
                        ) : (
                            <div className="grid-eventos">
                                {eventosFinalizados.map(renderEventoCard)}
                            </div>
                        )
                    )}

                    {/* HISTORIAL */}
                    {vistaActiva === 'historial' && (
                        solicitudesHistorial.length === 0 ? (
                            <div className="empty-state">
                                <h3>No hay registros en el historial</h3>
                                <p>Las solicitudes aprobadas y rechazadas aparecerán aquí.</p>
                            </div>
                        ) : (
                            <div className="grid-eventos">
                                {solicitudesHistorial.map(renderSolicitudCard)}
                            </div>
                        )
                    )}
                </main>
            </div>

            {selectedEventoId && (
                <CancelEventModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    idEvento={selectedEventoId}
                    tipoAccion="PROPIO"
                    onSuccess={handleModalSuccess}
                    onShowToast={showToast}
                />
            )}
        </div>
    );
}