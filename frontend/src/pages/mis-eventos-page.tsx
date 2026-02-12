import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/mis-eventos.css';
import { 
    getMisEventos, 
    getMisSolicitudes, 
    getMisSolicitudesEliminacion,
    getMisSolicitudesEdicion, // ✅ AGREGADO
    solicitarBajaEvento 
} from '../services/eventos';
import Toast from '../components/modals/Toast';
import InputModal from '../components/modals/InputModal';
import EditEventModal from '../components/EditEventModal';
import CancelEventModal from '../components/CancelEventModal';
import { Navbar } from '../components/navbar';
import { Footer } from '../components/footer';

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

interface SolicitudEliminacion {
    id_eliminacion: number;
    id_evento: number;
    nombre_evento: string;
    fecha_evento: string;
    ubicacion: string;
    id_tipo: number;
    cupo_maximo?: number;
    motivo: string;
    fecha_solicitud: string;
}

// ✅ NUEVA INTERFAZ
interface SolicitudEdicion {
    id_solicitud_edicion: number;
    id_evento: number;
    nombre_evento: string;
    fecha_evento: string;
    ubicacion: string;
    id_tipo: number;
    cambios_propuestos: Record<string, {
        anterior: string;
        nuevo: string;
        valor_real: any;
    }>;
    fecha_solicitud: string;
    estado: string;
}

export default function MisEventosPage() {
    const [vistaActiva, setVistaActiva] = useState<Vista>('borradores');
    const [filtroHistorial, setFiltroHistorial] = useState<FiltroHistorial>('activos');
    const [filtroPendientes, setFiltroPendientes] = useState<FiltroPendientes>('aprobacion');
    
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [solicitudesEliminacion, setSolicitudesEliminacion] = useState<SolicitudEliminacion[]>([]);
    const [solicitudesEdicion, setSolicitudesEdicion] = useState<SolicitudEdicion[]>([]); // ✅ AGREGADO
    const [, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados de modales
    const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' | 'info' } | null>(null);
    const [modalEditar, setModalEditar] = useState(false);
    const [itemAEditar, setItemAEditar] = useState<Evento | Solicitud | null>(null);
    const [tipoEdicion, setTipoEdicion] = useState<'evento' | 'solicitud'>('evento');
    
    const [inputModal, setInputModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        value: string;
        onConfirm: (value: string) => void;
        type: 'warning' | 'danger' | 'info';
    }>({ show: false, title: '', message: '', value: '', onConfirm: () => {}, type: 'warning' });

    const userString = localStorage.getItem('user') || sessionStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const userRole = user?.id_rol;

    useEffect(() => {
        cargarDatos();
    }, []);

    const showToast = (mensaje: string, tipo: 'success' | 'error' | 'info') => {
        setToast({ mensaje, tipo });
    };

    const showInputModal = (
        title: string,
        message: string,
        onConfirm: (value: string) => void,
        type: 'warning' | 'danger' | 'info' = 'warning'
    ) => {
        setInputModal({ show: true, title, message, value: '', onConfirm, type });
    };

    const hideInputModal = () => {
        setInputModal({ show: false, title: '', message: '', value: '', onConfirm: () => {}, type: 'warning' });
    };

    const cargarDatos = async () => {
        try {
            setLoading(true);
            setError(null);
            const [eventosData, solicitudesData, eliminacionesData, edicionesData] = await Promise.all([
                getMisEventos(),
                getMisSolicitudes(),
                getMisSolicitudesEliminacion(),
                getMisSolicitudesEdicion() // ✅ AGREGADO
            ]);
            setEventos(eventosData);
            setSolicitudes(solicitudesData);
            setSolicitudesEliminacion(eliminacionesData);
            setSolicitudesEdicion(edicionesData); // ✅ AGREGADO
        } catch (err: any) {
            console.error('Error cargando datos:', err);
            setError(err.response?.data?.detail || 'Error al cargar eventos');
        } finally {
            setLoading(false);
        }
    };

    // ✅ FILTROS
    const solicitudesBorradores = solicitudes.filter(s => s.id_estado_solicitud === 1);
    const solicitudesPendientes = solicitudes.filter(s => s.id_estado_solicitud === 2);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // ✅ IDs de eventos que tienen solicitudes pendientes (para filtrarlos)
    const idsEventosConSolicitudEdicion = solicitudesEdicion.map(s => s.id_evento);
    const idsEventosConSolicitudEliminacion = solicitudesEliminacion.map(s => s.id_evento);
    
    // ✅ Eventos activos: Estado 3, fecha futura, SIN solicitudes pendientes
    const eventosActivos = eventos.filter(e => 
        e.id_estado === 3 && 
        new Date(e.fecha_evento) >= hoy &&
        !idsEventosConSolicitudEdicion.includes(e.id_evento) &&
        !idsEventosConSolicitudEliminacion.includes(e.id_evento)
    );
    
    const eventosFinalizados = eventos.filter(e => 
        (e.id_estado === 3 && new Date(e.fecha_evento) < hoy) || e.id_estado === 4
    );
    
    const eventosEliminados = eventos.filter(e => e.id_estado === 5);

    // ✅ PENDIENTES
    const pendientesAprobacion = solicitudesPendientes;
    const pendientesEdicion = solicitudesEdicion;
    const pendientesEliminacion = solicitudesEliminacion;

    const obtenerImagen = (item: Evento | Solicitud | SolicitudEliminacion) => {
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

    const handleCancelar = (idEvento: number, nombreEvento: string) => {
        showInputModal(
            '🗑️ Solicitar Cancelación',
            `Estás solicitando la cancelación del evento "${nombreEvento}". El evento permanecerá activo hasta que un administrador apruebe tu solicitud. Ingresa el motivo:`,
            async (motivo) => {
                try {
                    await solicitarBajaEvento(idEvento, motivo);
                    showToast('Solicitud de cancelación enviada correctamente', 'success');
                    cargarDatos();
                } catch (error: any) {
                    showToast(error.response?.data?.detail || 'Error al solicitar cancelación', 'error');
                }
                hideInputModal();
            },
            'warning'
        );
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

    const obtenerRutaCrearEvento = () => {
        if (!user) return "/login";
        if (userRole === 1 || userRole === 2) return "/registro-evento";
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
                                    onClick={() => handleCancelar(evento.id_evento, evento.nombre_evento)} 
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
                        {evento.id_estado === 5 && (
                            <span className="estado-cancelado">🚫 CANCELADO</span>
                        )}
                    </div>
                </div>
            </article>
        );
    };

    const renderSolicitudEliminacionCard = (solicitud: SolicitudEliminacion) => {
        const fechaLimpia = solicitud.fecha_evento.toString().split('T')[0];
        const nombreTipo = NOMBRES_TIPO[solicitud.id_tipo] || "Evento";

        return (
            <article key={solicitud.id_eliminacion} className="evento-card">
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
                        <div className="info-item">
                            <span className="icon">📝</span> <small>{solicitud.motivo}</small>
                        </div>
                    </div>
                    <div className="card-actions">
                        <span className="estado-pendiente">⏳ PENDIENTE DE ELIMINACIÓN</span>
                    </div>
                </div>
            </article>
        );
    };

    // ✅ NUEVA FUNCIÓN
    const renderSolicitudEdicionCard = (solicitud: SolicitudEdicion) => {
    const fechaLimpia = solicitud.fecha_evento.toString().split('T')[0];
    const nombreTipo = NOMBRES_TIPO[solicitud.id_tipo] || "Evento";
    const cantidadCambios = Object.keys(solicitud.cambios_propuestos || {}).length;
    
    // Obtener imagen de forma segura
    const imagenUrl = IMAGENES_TIPO[solicitud.id_tipo] || IMAGENES_TIPO.default;

    return (
        <article key={solicitud.id_solicitud_edicion} className="evento-card">
            <div className="card-img-wrapper">
                <span className="tipo-badge">{nombreTipo}</span>
                <img
                    src={imagenUrl}
                    alt={solicitud.nombre_evento}
                    className="card-img"
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
                    <div className="info-item">
                        <span className="icon">✏️</span> 
                        <small>{cantidadCambios} campo{cantidadCambios !== 1 ? 's' : ''} modificado{cantidadCambios !== 1 ? 's' : ''}</small>
                    </div>
                </div>
                <div className="card-actions">
                    <span className="estado-pendiente">⏳ PENDIENTE DE APROBACIÓN</span>
                </div>
            </div>
        </article>
    );
    };

    return (
        <>
            <Navbar />
            <div className="mis-eventos-container">
                {toast && <Toast message={toast.mensaje} type={toast.tipo} onClose={() => setToast(null)} />}

                <div className="mis-eventos-layout">
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

                    <main className="mis-eventos-main">
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

                    {vistaActiva === 'pendientes' && (
                        <>
                            <div className="section-header">
                                <h2>⏳ Pendientes</h2>
                            </div>

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
                                        {pendientesEdicion.map(renderSolicitudEdicionCard)}
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
                                        {pendientesEliminacion.map(renderSolicitudEliminacionCard)}
                                    </div>
                                )
                            )}
                        </>
                    )}

                    {vistaActiva === 'historial' && (
                        <>
                            <div className="section-header">
                                <h2>📜 Historial de Eventos</h2>
                            </div>

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
                                    CANCELADOS ({eventosEliminados.length})
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
                                        <h3>No tienes eventos cancelados</h3>
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

            <InputModal
                show={inputModal.show}
                title={inputModal.title}
                message={inputModal.message}
                value={inputModal.value}
                onChange={(value) => setInputModal({ ...inputModal, value })}
                onConfirm={() => {
                    inputModal.onConfirm(inputModal.value);
                }}
                onCancel={hideInputModal}
                type={inputModal.type}
            />

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
        <Footer />
        </>
    );
}