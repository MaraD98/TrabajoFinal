import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/mis-eventos.css';
import logoWakeUp from '../assets/wakeup-logo.png';
import { getMisEventos, getMisSolicitudes } from '../services/eventos';
import CancelEventModal from '../components/CancelEventModal';
import EditEventModal from '../components/EditEventModal';

const API_BASE_URL = import.meta.env.VITE_API_URL ?
    import.meta.env.VITE_API_URL.split('/api')[0] : 'http://localhost:8000';

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

type Vista = 'borradores' | 'pendientes' | 'historial';
type FiltroHistorial = 'activos' | 'finalizados' | 'eliminados';
type FiltroPendientes = 'aprobacion' | 'edicion' | 'eliminacion';

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
    cupos_disponibles?: number;
    id_estado: number;
    id_usuario: number;
    multimedia?: { url_archivo: string }[];
    imagen_url?: string;
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
    id_estado: number;
    id_estado_solicitud: number;
    fecha_solicitud: string;
    id_usuario: number;
    multimedia?: { url_archivo: string }[];
    imagen_url?: string;
}

export default function MisEventosPage() {
    const navigate = useNavigate();
    const [vistaActiva, setVistaActiva] = useState<Vista>('borradores');
    const [filtroHistorial, setFiltroHistorial] = useState<FiltroHistorial>('activos');
    const [filtroPendientes, setFiltroPendientes] = useState<FiltroPendientes>('aprobacion');
    
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [modalCancelar, setModalCancelar] = useState(false);
    const [eventoACancelar, setEventoACancelar] = useState<number | null>(null);
    
    const [modalEditar, setModalEditar] = useState(false);
    const [itemAEditar, setItemAEditar] = useState<Evento | Solicitud | null>(null);
    const [tipoEdicion, setTipoEdicion] = useState<'evento' | 'solicitud'>('evento');

    // Toast
    const [toastMessage, setToastMessage] = useState<string>('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [showToastFlag, setShowToastFlag] = useState(false);

    // Obtener rol del usuario
    const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const userRole = user?.id_rol;

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            setError(null);

            const [eventosData, solicitudesData] = await Promise.all([
                getMisEventos(),
                getMisSolicitudes()
            ]);

            setEventos(eventosData);
            setSolicitudes(solicitudesData);
        } catch (err: any) {
            console.error('Error cargando datos:', err);
            setError(err.response?.data?.detail || 'Error al cargar eventos');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToastMessage(message);
        setToastType(type);
        setShowToastFlag(true);
        setTimeout(() => setShowToastFlag(false), 3000);
    };

    // Filtros
    const solicitudesBorradores = solicitudes.filter(s => s.id_estado_solicitud === 1);
    const solicitudesPendientes = solicitudes.filter(s => s.id_estado_solicitud === 2);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const eventosActivos = eventos.filter(e => 
        e.id_estado === 3 && new Date(e.fecha_evento) >= hoy
    );
    
    const eventosFinalizados = eventos.filter(e => 
        (e.id_estado === 3 && new Date(e.fecha_evento) < hoy) || e.id_estado === 4
    );
    
    const eventosEliminados = eventos.filter(e => e.id_estado === 5 || e.id_estado === 6);

    // Pendientes de aprobación
    const pendientesAprobacion = solicitudesPendientes;
    
    // Pendientes de edición (estado 2)
    const pendientesEdicion = eventos.filter(e => e.id_estado === 2);
    
    // Pendientes de eliminación (estado 7)
    const pendientesEliminacion = eventos.filter(e => e.id_estado === 7);

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

    const handleEditar = (item: Evento | Solicitud, tipo: 'evento' | 'solicitud') => {
        setItemAEditar(item);
        setTipoEdicion(tipo);
        setModalEditar(true);
    };

    const handleCancelar = (idEvento: number) => {
        setEventoACancelar(idEvento);
        setModalCancelar(true);
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

    // Función para determinar ruta de creación según rol
    const obtenerRutaCrearEvento = () => {
        if (!user) return "/login";
        if (userRole === 1 || userRole === 2) {
            return "/registro-evento";
        }
        if (userRole === 3 || userRole === 4) {
            return "/publicar-evento";
        }
        return "/publicar-evento";
    };

    const renderSolicitudCard = (solicitud: Solicitud) => {
        const fechaLimpia = solicitud.fecha_evento.toString().split('T')[0];
        const nombreTipo = NOMBRES_TIPO[solicitud.id_tipo] || "Evento";
        const esBorrador = solicitud.id_estado_solicitud === 1;

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
                            Cupo: {solicitud.cupo_maximo || 'Ilimitado'}
                        </div>
                    </div>
                    <div className="card-actions">
                        {esBorrador && (
                            <>
                                <button 
                                    onClick={() => handleEditar(solicitud, 'solicitud')} 
                                    className="btn-editar"
                                >
                                    ✏️ Editar
                                </button>
                                <button 
                                    onClick={() => handleEnviarSolicitud(solicitud.id_solicitud)} 
                                    className="btn-enviar"
                                >
                                    📤 Enviar
                                </button>
                            </>
                        )}
                        {!esBorrador && (
                            <span className="estado-pendiente">⏳ EN REVISIÓN</span>
                        )}
                    </div>
                </div>
            </article>
        );
    };

    const renderEventoCard = (evento: Evento) => {
        const fechaLimpia = evento.fecha_evento.toString().split('T')[0];
        const nombreTipo = NOMBRES_TIPO[evento.id_tipo] || "Evento";

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
                            Cupo: {evento.cupo_maximo || 'Ilimitado'}
                        </div>
                    </div>
                    <div className="card-actions">
                        {evento.id_estado === 3 && (
                            <>
                                <button 
                                    onClick={() => handleEditar(evento, 'evento')} 
                                    className="btn-editar"
                                >
                                    ✏️ Editar
                                </button>
                                <button 
                                    onClick={() => handleCancelar(evento.id_evento)} 
                                    className="btn-eliminar"
                                >
                                    ✕ Cancelar
                                </button>
                            </>
                        )}
                        {evento.id_estado === 4 && (
                            <span className="estado-finalizado">🏁 FINALIZADO</span>
                        )}
                        {evento.id_estado === 2 && (
                            <span className="estado-pendiente">⏳ PENDIENTE DE EDICIÓN</span>
                        )}
                    </div>
                </div>
            </article>
        );
    };

    if (loading) return <div className="loading-screen">CARGANDO...</div>;

    return (
        <div className="mis-eventos-container">
            {/* Toast */}
            {showToastFlag && (
                <div className={`toast toast-${toastType}`}>
                    {toastMessage}
                </div>
            )}

            {/* Navbar */}
            <nav className="mis-eventos-navbar">
                <Link to="/" className="hero-logo-link">
                    <img src={logoWakeUp} alt="Wake Up Bikes" className="hero-logo" />
                </Link>
                <Link to="/" className="btn-volver">Volver al Inicio</Link>
            </nav>

            <div className="mis-eventos-layout">
                {/* Sidebar */}
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
                        {(pendientesAprobacion.length + pendientesEdicion.length + pendientesEliminacion.length) > 0 && (
                            <span className="badge">
                                {pendientesAprobacion.length + pendientesEdicion.length + pendientesEliminacion.length}
                            </span>
                        )}
                    </button>

                    <button
                        className={`sidebar-btn ${vistaActiva === 'historial' ? 'active' : ''}`}
                        onClick={() => setVistaActiva('historial')}
                    >
                        <span className="icon">📜</span>
                        <span className="text">Historial de Eventos</span>
                    </button>

                    <Link to={obtenerRutaCrearEvento()} className="btn-crear-sidebar">
                        + CREAR NUEVO EVENTO
                    </Link>
                </aside>

                {/* Main Content */}
                <main className="mis-eventos-main">
                    {/* BORRADORES */}
                    {vistaActiva === 'borradores' && (
                        <>
                            <div className="section-header">
                                <h2>📝 Mis Borradores</h2>
                            </div>
                            {error && <p className="error-msg">{error}</p>}
                            {solicitudesBorradores.length === 0 ? (
                                <div className="empty-state">
                                    <h3>No tienes borradores</h3>
                                    <p>Los eventos que crees se guardarán aquí hasta que los envíes para aprobación.</p>
                                </div>
                            ) : (
                                <div className="grid-eventos">
                                    {solicitudesBorradores.map(renderSolicitudCard)}
                                </div>
                            )}
                        </>
                    )}

                    {/* PENDIENTES */}
                    {vistaActiva === 'pendientes' && (
                        <>
                            <div className="section-header">
                                <h2>⏳ Pendientes</h2>
                            </div>

                            {/* Filtros de pendientes */}
                            <div className="filtros-pendientes">
                                <button
                                    className={`filtro-btn ${filtroPendientes === 'aprobacion' ? 'active' : ''}`}
                                    onClick={() => setFiltroPendientes('aprobacion')}
                                >
                                    PENDIENTES DE APROBACIÓN ({pendientesAprobacion.length})
                                </button>
                                <button
                                    className={`filtro-btn ${filtroPendientes === 'edicion' ? 'active' : ''}`}
                                    onClick={() => setFiltroPendientes('edicion')}
                                >
                                    PENDIENTES DE EDICIÓN ({pendientesEdicion.length})
                                </button>
                                <button
                                    className={`filtro-btn ${filtroPendientes === 'eliminacion' ? 'active' : ''}`}
                                    onClick={() => setFiltroPendientes('eliminacion')}
                                >
                                    PENDIENTES DE ELIMINACIÓN ({pendientesEliminacion.length})
                                </button>
                            </div>

                            {filtroPendientes === 'aprobacion' && (
                                pendientesAprobacion.length === 0 ? (
                                    <div className="empty-state">
                                        <h3>No hay solicitudes pendientes de aprobación</h3>
                                    </div>
                                ) : (
                                    <div className="grid-eventos">
                                        {pendientesAprobacion.map(renderSolicitudCard)}
                                    </div>
                                )
                            )}

                            {filtroPendientes === 'edicion' && (
                                pendientesEdicion.length === 0 ? (
                                    <div className="empty-state">
                                        <h3>No hay eventos pendientes de edición</h3>
                                    </div>
                                ) : (
                                    <div className="grid-eventos">
                                        {pendientesEdicion.map(renderEventoCard)}
                                    </div>
                                )
                            )}

                            {filtroPendientes === 'eliminacion' && (
                                pendientesEliminacion.length === 0 ? (
                                    <div className="empty-state">
                                        <h3>No hay eventos pendientes de eliminación</h3>
                                    </div>
                                ) : (
                                    <div className="grid-eventos">
                                        {pendientesEliminacion.map(renderEventoCard)}
                                    </div>
                                )
                            )}
                        </>
                    )}

                    {/* HISTORIAL */}
                    {vistaActiva === 'historial' && (
                        <>
                            <div className="section-header">
                                <h2>📜 Historial de Eventos</h2>
                            </div>

                            {/* Filtros de historial */}
                            <div className="filtros-historial">
                                <button
                                    className={`filtro-btn ${filtroHistorial === 'activos' ? 'active' : ''}`}
                                    onClick={() => setFiltroHistorial('activos')}
                                >
                                    ACTIVOS ({eventosActivos.length})
                                </button>
                                <button
                                    className={`filtro-btn ${filtroHistorial === 'finalizados' ? 'active' : ''}`}
                                    onClick={() => setFiltroHistorial('finalizados')}
                                >
                                    FINALIZADOS ({eventosFinalizados.length})
                                </button>
                                <button
                                    className={`filtro-btn ${filtroHistorial === 'eliminados' ? 'active' : ''}`}
                                    onClick={() => setFiltroHistorial('eliminados')}
                                >
                                    ELIMINADOS ({eventosEliminados.length})
                                </button>
                            </div>

                            {filtroHistorial === 'activos' && (
                                eventosActivos.length === 0 ? (
                                    <div className="empty-state">
                                        <h3>No tienes eventos activos</h3>
                                        <p>¡Crea tu primer evento y compártelo con la comunidad!</p>
                                        <Link to={obtenerRutaCrearEvento()} className="btn-crear-empty">
                                            Publicar Evento
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid-eventos">
                                        {eventosActivos.map(renderEventoCard)}
                                    </div>
                                )
                            )}

                            {filtroHistorial === 'finalizados' && (
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

                            {filtroHistorial === 'eliminados' && (
                                eventosEliminados.length === 0 ? (
                                    <div className="empty-state">
                                        <h3>No tienes eventos eliminados</h3>
                                    </div>
                                ) : (
                                    <div className="grid-eventos">
                                        {eventosEliminados.map(renderEventoCard)}
                                    </div>
                                )
                            )}
                        </>
                    )}
                </main>
            </div>

            {/* Modales */}
            {modalCancelar && eventoACancelar && (
                <CancelEventModal 
                    isOpen={modalCancelar}
                    onClose={() => {
                        setModalCancelar(false);
                        setEventoACancelar(null);
                    }}
                    idEvento={eventoACancelar}
                    tipoAccion="PROPIO"
                    onSuccess={() => {
                        showToast('Solicitud de cancelación enviada', 'success');
                        cargarDatos();
                    }}
                    onShowToast={showToast}
                />
            )}

            {modalEditar && itemAEditar && (
                <EditEventModal
                    isOpen={modalEditar}
                    onClose={() => {
                        setModalEditar(false);
                        setItemAEditar(null);
                    }}
                    item={itemAEditar}
                    tipo={tipoEdicion}
                    onSuccess={() => {
                        showToast('Cambios guardados correctamente', 'success');
                        cargarDatos();
                    }}
                    onShowToast={showToast}
                />
            )}
        </div>
    );
}