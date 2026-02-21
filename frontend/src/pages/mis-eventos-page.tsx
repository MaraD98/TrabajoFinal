import { useEffect, useState} from 'react';
import { Link } from 'react-router-dom';
import '../styles/mis-eventos.css';
import { 
    getMisEventos, 
    getMisSolicitudes, 
    getMisSolicitudesEliminacion,
    getMisSolicitudesEdicion,
    solicitarBajaEvento 
} from '../services/eventos';
import Toast from '../components/modals/Toast';
import InputModal from '../components/modals/InputModal';
import EditEventModal from '../components/EditEventModal';
import EventoDetalleModal from '../components/modals/EventoDetalleModal';
import { Navbar } from '../components/navbar';
import { Footer } from '../components/footer';


const IMAGENES_TIPO: Record<number | string, string> = {
    1: "https://images.unsplash.com/photo-1615845522846-02f89af04c2e?q=80&w=1638&auto=format&fit=crop",
    2: "https://images.unsplash.com/photo-1629056528325-f328b5f27ae7?q=80&w=1170&auto=format&fit=crop",
    3: "https://images.unsplash.com/photo-1769293191463-e0d620e71860?q=80&w=1029&auto=format&fit=crop",
    4: "https://plus.unsplash.com/premium_photo-1670002408049-f19bd003901c?q=80&w=1170&auto=format&fit=crop",
    5: "https://plus.unsplash.com/premium_photo-1681885419412-dd7fb2802d3e?q=80&w=1170&auto=format&fit=crop",
    6: "https://images.unsplash.com/photo-1757366225063-33e161f1a44c?q=80&w=1170&auto=format&fit=crop",
    default: "https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=800&auto=format&fit=crop"
};
const NOMBRES_TIPO: Record<number | string, string> = {
    1: "Ciclismo de Ruta", 2: "Mountain Bike (MTB)", 3: "Rural Bike", 4: "Gravel", 5: "Cicloturismo", 6: "Entrenamiento / Social"
};

type Vista = 'activos' | 'pendientes' | 'historial' | 'borradores';
type FiltroHistorial = 'finalizados' | 'cancelados';
type FiltroPendientes = 'aprobacion' | 'edicion' | 'eliminacion';
type ItemConImagen = {
    id_tipo: number;
    multimedia?: { url_archivo: string }[];
    imagen_url?: string;
};
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
    multimedia?: { url_archivo: string }[];
    imagen_url?: string;                     
}

export default function MisEventosPage() {
    const [vistaActiva, setVistaActiva] = useState<Vista>('activos');
    const [filtroHistorial, setFiltroHistorial] = useState<FiltroHistorial>('finalizados');
    const [filtroPendientes, setFiltroPendientes] = useState<FiltroPendientes>('aprobacion');
    
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [solicitudesEliminacion, setSolicitudesEliminacion] = useState<SolicitudEliminacion[]>([]);
    const [solicitudesEdicion, setSolicitudesEdicion] = useState<SolicitudEdicion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── CONTADORES para las tabs (carga rápida desde /resumen)
    const [contadores, setContadores] = useState({ activos: 0, pendientes: 0, historial: 0, borradores: 0 });

    const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' | 'info' } | null>(null);
    const [modalEditar, setModalEditar] = useState(false);
    const [itemAEditar, setItemAEditar] = useState<Evento | Solicitud | null>(null);
    const [tipoEdicion, setTipoEdicion] = useState<'evento' | 'solicitud'>('evento');

    const [detalleEventoId, setDetalleEventoId] = useState<number | null>(null);
    const [detallePreview, setDetallePreview] = useState<{ nombre_evento: string; fecha_evento: string } | null>(null);
    const [detalleEstado, setDetalleEstado] = useState<number | null>(null);
    
    const [inputModal, setInputModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        value: string;
        onConfirm: (value: string) => void;
        type: 'warning' | 'danger' | 'info';
    }>({ show: false, title: '', message: '', value: '', onConfirm: () => {}, type: 'warning' });

    // ── Al montar: cargamos contadores + tab inicial (activos) ──
    useEffect(() => {
        cargarContadores();
        cargarDatosPorVista('activos');
    }, []);

    // ── Al cambiar de tab: cargamos solo lo necesario ──
    useEffect(() => {
        if (vistaActiva !== 'activos') {
            cargarDatosPorVista(vistaActiva);
        }
    }, [vistaActiva]);

    const showToast = (mensaje: string, tipo: 'success' | 'error' | 'info') =>
        setToast({ mensaje, tipo });

    const showInputModal = (
        title: string, message: string,
        onConfirm: (value: string) => void,
        type: 'warning' | 'danger' | 'info' = 'warning'
    ) => setInputModal({ show: true, title, message, value: '', onConfirm, type });

    const hideInputModal = () =>
        setInputModal({ show: false, title: '', message: '', value: '', onConfirm: () => {}, type: 'warning' });

    const handleVerDetalle = (evento: Evento) => {
        setDetallePreview({ nombre_evento: evento.nombre_evento, fecha_evento: evento.fecha_evento });
        setDetalleEstado(evento.id_estado);
        setDetalleEventoId(evento.id_evento);
    };

    // ── Carga rápida de contadores desde el nuevo endpoint ──
    const cargarContadores = async () => {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/eventos/mis-eventos/resumen`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setContadores(await res.json());
        } catch {
            // Silencioso: los contadores no son críticos
        }
    };

    // ── Carga por demanda según la tab activa ──
    const cargarDatosPorVista = async (vista: Vista) => {
        setLoading(true);
        setError(null);
        try {
            if (vista === 'activos' || vista === 'historial') {
                const data = await getMisEventos();
                setEventos(data);
            } else if (vista === 'pendientes') {
                const [solicitudesData, eliminacionesData, edicionesData] = await Promise.all([
                    getMisSolicitudes(),
                    getMisSolicitudesEliminacion(),
                    getMisSolicitudesEdicion()
                ]);
                setSolicitudes(solicitudesData);
                setSolicitudesEliminacion(eliminacionesData);
                setSolicitudesEdicion(edicionesData);
            } else if (vista === 'borradores') {
                const data = await getMisSolicitudes();
                setSolicitudes(data);
            }
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Error al cargar eventos');
        } finally {
            setLoading(false);
        }
    };

    // ── cargarDatos: recarga la vista actual + contadores (usado después de acciones) ──
    const cargarDatos = async () => {
        await cargarDatosPorVista(vistaActiva);
        await cargarContadores();
    };

    // ── FILTROS DE DATOS ────────────────────────────────────────
    const solicitudesBorradores = solicitudes.filter(s => s.id_estado_solicitud === 1);
    const solicitudesPendientes = solicitudes.filter(s => s.id_estado_solicitud === 2);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const parseFecha = (fechaStr: string): Date => {
        if (!fechaStr) return new Date(0);
        if (/^\d{2}-\d{2}-\d{4}$/.test(fechaStr)) {
            const [dd, mm, yyyy] = fechaStr.split('-');
            return new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
        }
        return new Date(fechaStr);
    };
    
    const idsConSolicitudEdicion     = solicitudesEdicion.map(s => s.id_evento);
    const idsConSolicitudEliminacion = solicitudesEliminacion.map(s => s.id_evento);
    
    const eventosActivos = eventos.filter(e => 
        e.id_estado === 3 && 
        parseFecha(e.fecha_evento) >= hoy &&
        !idsConSolicitudEdicion.includes(e.id_evento) &&
        !idsConSolicitudEliminacion.includes(e.id_evento)
    );
    
    const eventosFinalizados = eventos.filter(e => 
        (e.id_estado === 3 && parseFecha(e.fecha_evento) < hoy) || e.id_estado === 4
    );
    
    const eventosCancelados = eventos.filter(e => e.id_estado === 5);

    const pendientesAprobacion  = solicitudesPendientes;
    const pendientesEdicion     = solicitudesEdicion;
    const pendientesEliminacion = solicitudesEliminacion;

    // ── HELPERS ─────────────────────────────────────────────────
    const obtenerImagen = (item: ItemConImagen) => {
        if ('multimedia' in item && item.multimedia && item.multimedia.length > 0) {
            let mediaUrl = item.multimedia[0].url_archivo.replace(/\\/g, "/");
            if (mediaUrl.startsWith('http')) return mediaUrl;
            
            const cleanPath = mediaUrl.startsWith("/") ? mediaUrl.substring(1) : mediaUrl;
            
            const baseUrl = import.meta.env.VITE_API_URL 
                ? import.meta.env.VITE_API_URL.split('/api')[0] 
                : 'http://localhost:8000';

            return `${baseUrl}/${cleanPath}`;
        }
        const url = 'imagen_url' in item ? item.imagen_url : undefined;
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
            `Estás solicitando la cancelación de "${nombreEvento}". El evento seguirá activo hasta que un administrador lo apruebe. Ingresá el motivo:`,
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
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (response.ok) {
                showToast('Solicitud enviada para revisión', 'success');
                cargarDatos();
            } else {
                const err = await response.json();
                showToast(err.detail || 'Error al enviar solicitud', 'error');
            }
        } catch {
            showToast('Error al enviar solicitud', 'error');
        }
    };

    // ── RENDERS DE CARDS ────────────────────────────────────────

    const renderEventoCard = (evento: Evento, mostrarAcciones = false) => {
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
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGENES_TIPO.default; }}
                    />
                    {evento.id_estado === 3 && mostrarAcciones && (
                        <span className="estado-chip estado-chip--activo">● Activo</span>
                    )}
                    {(evento.id_estado === 4 || (evento.id_estado === 3 && parseFecha(evento.fecha_evento) < hoy)) && (
                        <span className="estado-chip estado-chip--finalizado">🏁 Finalizado</span>
                    )}
                    {evento.id_estado === 5 && (
                        <span className="estado-chip estado-chip--cancelado">🚫 Cancelado</span>
                    )}
                </div>
                
                <div className="card-content">
                    <div className="card-header">
                        <h3>{evento.nombre_evento}</h3>
                    </div>
                    <div className="card-info">
                        <div className="info-item"><span className="icon">📅</span> {fechaLimpia}</div>
                        <div className="info-item"><span className="icon">📍</span> {evento.ubicacion}</div>
                        <div className="info-cupo">👥 Cupo: {evento.cupo_maximo || 'Ilimitado'}</div>
                    </div>

                    <div className="card-actions">
                        <button
                            onClick={() => handleVerDetalle(evento)}
                            className="btn-ver-detalle"
                            title="Ver detalles completos"
                        >
                            👁️ Ver más
                        </button>

                        {mostrarAcciones && evento.id_estado === 3 && (
                            <>
                                <button onClick={() => handleEditar(evento, 'evento')} className="btn-editar">
                                    ✏️ Editar
                                </button>
                                <button onClick={() => handleCancelar(evento.id_evento, evento.nombre_evento)} className="btn-eliminar">
                                    Solicitar cancelación
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </article>
        );
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
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGENES_TIPO.default; }}
                    />
                    {esBorrador
                        ? <span className="estado-chip estado-chip--borrador">📝 Borrador</span>
                        : <span className="estado-chip estado-chip--pendiente">⏳ En revisión</span>
                    }
                </div>
                <div className="card-content">
                    <div className="card-header"><h3>{solicitud.nombre_evento}</h3></div>
                    <div className="card-info">
                        <div className="info-item"><span className="icon">📅</span> {fechaLimpia}</div>
                        <div className="info-item"><span className="icon">📍</span> {solicitud.ubicacion}</div>
                        <div className="info-cupo">👥 Cupo: {solicitud.cupo_maximo || 'Ilimitado'}</div>
                    </div>
                    <div className="card-actions">
                        {esBorrador && (
                            <>
                                <button onClick={() => handleEditar(solicitud, 'solicitud')} className="btn-editar">
                                    ✏️ Editar
                                </button>
                                <button onClick={() => handleEnviarSolicitud(solicitud.id_solicitud)} className="btn-enviar">
                                    📤 Enviar para revisión
                                </button>
                            </>
                        )}
                        {!esBorrador && (
                            <p className="info-pendiente">Tu solicitud está siendo revisada por un administrador.</p>
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
                    <img src={obtenerImagen(solicitud)} alt={solicitud.nombre_evento} className="card-img"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGENES_TIPO.default; }} />
                    <span className="estado-chip estado-chip--cancelado">🗑️ Baja solicitada</span>
                </div>
                <div className="card-content">
                    <div className="card-header"><h3>{solicitud.nombre_evento}</h3></div>
                    <div className="card-info">
                        <div className="info-item"><span className="icon">📅</span> {fechaLimpia}</div>
                        <div className="info-item"><span className="icon">📍</span> {solicitud.ubicacion}</div>
                        <div className="info-item"><span className="icon">📝</span> <small>{solicitud.motivo}</small></div>
                    </div>
                    <div className="card-actions">
                        <p className="info-pendiente">Solicitud de cancelación en espera de aprobación.</p>
                    </div>
                </div>
            </article>
        );
    };

    const renderSolicitudEdicionCard = (solicitud: SolicitudEdicion) => {
        const fechaLimpia = solicitud.fecha_evento.toString().split('T')[0];
        const nombreTipo = NOMBRES_TIPO[solicitud.id_tipo] || "Evento";
        const cantidadCambios = Object.keys(solicitud.cambios_propuestos || {}).length;
        return (
            <article key={solicitud.id_solicitud_edicion} className="evento-card">
                <div className="card-img-wrapper">
                    <span className="tipo-badge">{nombreTipo}</span>
                    <img src={obtenerImagen(solicitud)} alt={solicitud.nombre_evento} className="card-img" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGENES_TIPO.default; }}/>
                    <span className="estado-chip estado-chip--pendiente">✏️ Edición pendiente</span>
                </div>
                <div className="card-content">
                    <div className="card-header"><h3>{solicitud.nombre_evento}</h3></div>
                    <div className="card-info">
                        <div className="info-item"><span className="icon">📅</span> {fechaLimpia}</div>
                        <div className="info-item"><span className="icon">📍</span> {solicitud.ubicacion}</div>
                        <div className="info-item">
                            <span className="icon">✏️</span>
                            <small>{cantidadCambios} campo{cantidadCambios !== 1 ? 's' : ''} modificado{cantidadCambios !== 1 ? 's' : ''} esperando aprobación</small>
                        </div>
                    </div>
                    <div className="card-actions">
                        <button
                            onClick={() => setDetalleEventoId(solicitud.id_evento)}
                            className="btn-ver-detalle"
                            title="Ver estado actual del evento"
                        >
                            👁️ Ver evento actual
                        </button>
                        <p className="info-pendiente">El administrador revisará los cambios propuestos.</p>
                    </div>
                </div>
            </article>
        );
    };

    // ── EMPTY STATE ─────────────────────────────────────────────
    const EmptyState = ({ icon, title, subtitle, showCreate = false }: {
        icon: string; title: string; subtitle?: string; showCreate?: boolean;
    }) => (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
            {showCreate && (
                <Link to="/publicar-evento" className="btn-crear-empty">
                    + Crear evento
                </Link>
            )}
        </div>
    );

    // ── RENDER PRINCIPAL ────────────────────────────────────────
    return (
        <>
            <Navbar />
            <div className="mis-eventos-container">
                {toast && <Toast message={toast.mensaje} type={toast.tipo} onClose={() => setToast(null)} />}

                <div className="mis-eventos-page-header">
                    <div>
                        <h1>Mis Eventos</h1>
                        <p>Gestioná todos tus eventos desde un solo lugar</p>
                    </div>
                    <Link to="/publicar-evento" className="btn-crear-header">
                        + Crear evento
                    </Link>
                </div>

                <div className="mis-eventos-tabs">
                    <button className={`tab-btn ${vistaActiva === 'activos' ? 'active' : ''}`} onClick={() => setVistaActiva('activos')}>
                        Activos
                        {contadores.activos > 0 && <span className="tab-count">{contadores.activos}</span>}
                    </button>
                    <button className={`tab-btn ${vistaActiva === 'pendientes' ? 'active' : ''}`} onClick={() => setVistaActiva('pendientes')}>
                        Pendientes
                        {contadores.pendientes > 0 && <span className="tab-count tab-count--alert">{contadores.pendientes}</span>}
                    </button>
                    <button className={`tab-btn ${vistaActiva === 'historial' ? 'active' : ''}`} onClick={() => setVistaActiva('historial')}>
                        Historial
                        {contadores.historial > 0 && <span className="tab-count">{contadores.historial}</span>}
                    </button>
                    <button className={`tab-btn ${vistaActiva === 'borradores' ? 'active' : ''}`} onClick={() => setVistaActiva('borradores')}>
                        Borradores
                        {contadores.borradores > 0 && <span className="tab-count">{contadores.borradores}</span>}
                    </button>
                </div>

                <div className="mis-eventos-main">
                    {error && <p className="error-msg">{error}</p>}

                    {/* ACTIVOS */}
                    {vistaActiva === 'activos' && (
                        loading ? <div className="loading-state">Cargando...</div>
                        : eventosActivos.length === 0
                            ? <EmptyState icon="🚴" title="No tenés eventos activos"
                                subtitle="¡Creá tu primer evento y compartilo con la comunidad!" showCreate />
                            : <div className="grid-eventos">{eventosActivos.map(e => renderEventoCard(e, true))}</div>
                    )}

                    {/* PENDIENTES */}
                    {vistaActiva === 'pendientes' && (
                        <>
                            <div className="filtros-pendientes">
                                <button className={`filtro-btn ${filtroPendientes === 'aprobacion' ? 'active' : ''}`} onClick={() => setFiltroPendientes('aprobacion')}>
                                    Pendientes de aprobación
                                    {pendientesAprobacion.length > 0 && <span className="filtro-count">{pendientesAprobacion.length}</span>}
                                </button>
                                <button className={`filtro-btn ${filtroPendientes === 'edicion' ? 'active' : ''}`} onClick={() => setFiltroPendientes('edicion')}>
                                    Pendientes de edición
                                    {pendientesEdicion.length > 0 && <span className="filtro-count">{pendientesEdicion.length}</span>}
                                </button>
                                <button className={`filtro-btn ${filtroPendientes === 'eliminacion' ? 'active' : ''}`} onClick={() => setFiltroPendientes('eliminacion')}>
                                    Pendientes de cancelación
                                    {pendientesEliminacion.length > 0 && <span className="filtro-count">{pendientesEliminacion.length}</span>}
                                </button>
                            </div>

                            {loading ? <div className="loading-state">Cargando...</div> : (
                                <>
                                    {filtroPendientes === 'aprobacion' && (
                                        pendientesAprobacion.length === 0
                                            ? <EmptyState icon="✅" title="No hay solicitudes pendientes de aprobación" />
                                            : <div className="grid-eventos">{pendientesAprobacion.map(renderSolicitudCard)}</div>
                                    )}
                                    {filtroPendientes === 'edicion' && (
                                        pendientesEdicion.length === 0
                                            ? <EmptyState icon="✏️" title="No hay solicitudes de edición pendientes" />
                                            : <div className="grid-eventos">{pendientesEdicion.map(renderSolicitudEdicionCard)}</div>
                                    )}
                                    {filtroPendientes === 'eliminacion' && (
                                        pendientesEliminacion.length === 0
                                            ? <EmptyState icon="🗑️" title="No hay solicitudes de cancelación pendientes" />
                                            : <div className="grid-eventos">{pendientesEliminacion.map(renderSolicitudEliminacionCard)}</div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* HISTORIAL */}
                    {vistaActiva === 'historial' && (
                        <>
                            <div className="filtros-historial">
                                <button className={`filtro-btn ${filtroHistorial === 'finalizados' ? 'active' : ''}`} onClick={() => setFiltroHistorial('finalizados')}>
                                    Finalizados
                                    {eventosFinalizados.length > 0 && <span className="filtro-count">{eventosFinalizados.length}</span>}
                                </button>
                                <button className={`filtro-btn ${filtroHistorial === 'cancelados' ? 'active' : ''}`} onClick={() => setFiltroHistorial('cancelados')}>
                                    Cancelados
                                    {eventosCancelados.length > 0 && <span className="filtro-count">{eventosCancelados.length}</span>}
                                </button>
                            </div>

                            {loading ? <div className="loading-state">Cargando...</div> : (
                                <>
                                    {filtroHistorial === 'finalizados' && (
                                        eventosFinalizados.length === 0
                                            ? <EmptyState icon="🏁" title="No hay eventos finalizados"
                                                subtitle="Los eventos cuya fecha ya pasó van a aparecer acá." />
                                            : <div className="grid-eventos">{eventosFinalizados.map(e => renderEventoCard(e))}</div>
                                    )}
                                    {filtroHistorial === 'cancelados' && (
                                        eventosCancelados.length === 0
                                            ? <EmptyState icon="🚫" title="No hay eventos cancelados" />
                                            : <div className="grid-eventos">{eventosCancelados.map(e => renderEventoCard(e))}</div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* BORRADORES */}
                    {vistaActiva === 'borradores' && (
                        loading ? <div className="loading-state">Cargando...</div>
                        : solicitudesBorradores.length === 0
                            ? <EmptyState icon="📝" title="No tenés borradores guardados"
                                subtitle="Cuando guardes un evento sin enviar, va a aparecer acá." />
                            : <div className="grid-eventos">{solicitudesBorradores.map(renderSolicitudCard)}</div>
                    )}
                </div>
            </div>

            <Footer />

            {/* MODALES */}
            <InputModal
                show={inputModal.show}
                title={inputModal.title}
                message={inputModal.message}
                value={inputModal.value}
                onChange={(value) => setInputModal({ ...inputModal, value })}
                onConfirm={() => { inputModal.onConfirm(inputModal.value); }}
                onCancel={hideInputModal}
                type={inputModal.type}
            />

            {modalEditar && itemAEditar && (
                <EditEventModal
                    isOpen={modalEditar}
                    onClose={() => { setModalEditar(false); setItemAEditar(null); }}
                    item={itemAEditar}
                    tipo={tipoEdicion}
                    onSuccess={() => { showToast('Cambios guardados correctamente', 'success'); cargarDatos(); }}
                    onShowToast={showToast}
                />
            )}

            {/* Modal de detalle de evento */}
            <EventoDetalleModal
                eventoId={detalleEventoId}
                eventoPreview={detallePreview}
                idEstado={detalleEstado}
                onClose={() => {
                    setDetalleEventoId(null);
                    setDetallePreview(null);
                    setDetalleEstado(null);
                }}
            />
        </>
    );
}