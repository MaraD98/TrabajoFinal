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
import { useSearchParams } from 'react-router-dom';
import BuscadorEventos from '../components/BuscadorEventos';
import type { FiltroActivo } from '../components/BuscadorEventos';

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
    1: "Ciclismo de Ruta", 
    2: "Mountain Bike (MTB)", 
    3: "Rural Bike", 
    4: "Gravel", 
    5: "Cicloturismo", 
    6: "Entrenamiento / Social"
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
    const [searchParams] = useSearchParams();
    const tabInicial = (searchParams.get('tab') as Vista) || 'activos';
    const [vistaActiva, setVistaActiva] = useState<Vista>(tabInicial);
    const [filtroHistorial, setFiltroHistorial] = useState<FiltroHistorial>('finalizados');
    const [filtroPendientes, setFiltroPendientes] = useState<FiltroPendientes>('aprobacion');
    
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
    const [solicitudesEliminacion, setSolicitudesEliminacion] = useState<SolicitudEliminacion[]>([]);
    const [solicitudesEdicion, setSolicitudesEdicion] = useState<SolicitudEdicion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── BUSCADOR ────────────────────────────────────────────────
    const [filtroActivo, setFiltroActivo] = useState<FiltroActivo | null>(null);
    const hayFiltroActivo = filtroActivo !== null;

    // ── ESTADOS DE PAGINACIÓN ───────────────────────────────────
    const [paginaActual, setPaginaActual] = useState(1);
    const ITEMS_POR_PAGINA = 6; // Cantidad de eventos por página (podés poner 9 o 12)

    // Resetear a la página 1 cada vez que cambiás de tab o usás el buscador
    useEffect(() => { 
        setPaginaActual(1); 
    }, [vistaActiva, filtroHistorial, filtroPendientes, filtroActivo]);

    const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' | 'info' } | null>(null);
    const [modalEditar, setModalEditar] = useState(false);
    const [itemAEditar, setItemAEditar] = useState<Evento | Solicitud | null>(null);
    const [tipoEdicion, setTipoEdicion] = useState<'evento' | 'solicitud'>('evento');
    // ✅ NUEVO: indica si el item que se está editando es un borrador
    const [esBorradorEdicion, setEsBorradorEdicion] = useState(false);

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

    const getUserRole = (): number => {
        const userDataStr = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (!userDataStr) return 3;
        try {
            const userData = JSON.parse(userDataStr);
            return userData.id_rol || 3;
        } catch {
            return 3;
        }
    };

    const getRutaCreacion = (): string => {
        const rol = getUserRole();
        return (rol === 1 || rol === 2) ? '/registro-evento' : '/publicar-evento';
    };

    useEffect(() => { cargarDatos(); }, []);

    // Limpiar filtro al cambiar de tab
    useEffect(() => { setFiltroActivo(null); }, [vistaActiva]);

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

const cargarDatos = async () => {
    try {
        console.time('⏳ Tiempo TOTAL de las 4 APIs (PARALELO)');
        setLoading(true);
        setError(null);
        
        // Disparamos TODAS las peticiones al mismo tiempo
        const [eventosData, solicitudesData, eliminacionesData, edicionesData] = await Promise.all([
            getMisEventos(),
            getMisSolicitudes(),
            getMisSolicitudesEliminacion(),
            getMisSolicitudesEdicion()
        ]);

        // Una vez que llegaron todas, actualizamos los estados
        setEventos(eventosData);
        setSolicitudes(solicitudesData);
        setSolicitudesEliminacion(eliminacionesData);
        setSolicitudesEdicion(edicionesData);

    } catch (err: any) {
        setError(err.response?.data?.detail || 'Error al cargar datos');
    } finally {
        setLoading(false);
        console.timeEnd('⏳ Tiempo TOTAL de las 4 APIs (PARALELO)');
    }
};

    // ── FUNCIÓN DE FILTRADO ──────────────────────────────────────
    const aplicarFiltro = <T extends { nombre_evento: string; fecha_evento: string }>(lista: T[]): T[] => {
        if (!filtroActivo) return lista;
        const { nombre, dia, mes, anio, modoFecha } = filtroActivo;

        return lista.filter(item => {
            if (nombre.trim() && !item.nombre_evento.toLowerCase().includes(nombre.trim().toLowerCase())) {
                return false;
            }

            const fechaStr = item.fecha_evento?.toString() || '';
            let fechaDate: Date | null = null;
            if (fechaStr) {
                if (/^\d{2}-\d{2}-\d{4}$/.test(fechaStr)) {
                    const [dd, mm, yyyy] = fechaStr.split('-');
                    fechaDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
                } else {
                    fechaDate = new Date(fechaStr);
                }
            }

            if (fechaDate && !isNaN(fechaDate.getTime())) {
                const dEvento  = String(fechaDate.getDate()).padStart(2, '0');
                const mEvento  = String(fechaDate.getMonth() + 1).padStart(2, '0');
                const aEvento  = String(fechaDate.getFullYear());

                if (modoFecha === 'dia') {
                    if (dia  && dEvento !== dia)  return false;
                    if (mes  && mEvento !== mes)  return false;
                    if (anio && aEvento !== anio) return false;
                } else if (modoFecha === 'mes') {
                    if (mes  && mEvento !== mes)  return false;
                    if (anio && aEvento !== anio) return false;
                } else if (modoFecha === 'anio') {
                    if (anio && aEvento !== anio) return false;
                }
            }

            return true;
        });
    };

    // ── FILTROS DE DATOS ─────────────────────────────────────────
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
    const totalPendientes = pendientesAprobacion.length + pendientesEdicion.length + pendientesEliminacion.length;

    // Listas filtradas para mostrar
    const eventosActivosFiltrados       = aplicarFiltro(eventosActivos);
    const eventosFinalizadosFiltrados   = aplicarFiltro(eventosFinalizados);
    const eventosCanceladosFiltrados    = aplicarFiltro(eventosCancelados);
    const pendientesAprobacionFiltrados = aplicarFiltro(pendientesAprobacion);
    const pendientesEdicionFiltrados    = aplicarFiltro(pendientesEdicion);
    const pendientesEliminacionFiltrados = aplicarFiltro(pendientesEliminacion);
    const solicitudesBorradoresFiltrados = aplicarFiltro(solicitudesBorradores);

    // ── HELPERS ──────────────────────────────────────────────────
    const obtenerImagen = (item: ItemConImagen) => {
        if ('multimedia' in item && item.multimedia && item.multimedia.length > 0) {
            let mediaUrl = item.multimedia[0].url_archivo.replace(/\\/g, "/");
            if (mediaUrl.startsWith('http')) return mediaUrl;
            const cleanPath = mediaUrl.startsWith("/") ? mediaUrl.substring(1) : mediaUrl;
            
        const apiUrl = import.meta.env.VITE_API_URL;
        
        const baseUrl = apiUrl ? apiUrl.split('/api')[0] : "";

        return `${baseUrl}/${cleanPath}`;
        }

        const url = 'imagen_url' in item ? item.imagen_url : undefined;
        if (url && url.startsWith("http")) return url;
        return IMAGENES_TIPO[item.id_tipo] || IMAGENES_TIPO.default;
    };

    // ✅ MODIFICADO: acepta tercer parámetro esBorrador
    const handleEditar = (item: Evento | Solicitud, tipo: 'evento' | 'solicitud', esBorrador = false) => {
        setItemAEditar(item);
        setTipoEdicion(tipo);
        setEsBorradorEdicion(esBorrador);
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

    // ── FUNCIONES HELPER DE PAGINACIÓN ─────────────────────────
    const paginarLista = <T,>(lista: T[]): T[] => {
        const indiceUltimo = paginaActual * ITEMS_POR_PAGINA;
        const indicePrimero = indiceUltimo - ITEMS_POR_PAGINA;
        return lista.slice(indicePrimero, indiceUltimo);
    };

    const renderPaginacion = (totalItems: number) => {
        const totalPaginas = Math.ceil(totalItems / ITEMS_POR_PAGINA);
        if (totalPaginas <= 1) return null;

        return (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '40px', paddingBottom: '20px' }}>
                <button 
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual(paginaActual - 1)}
                    style={{ padding: '8px 16px', background: paginaActual === 1 ? '#333' : '#222', color: paginaActual === 1 ? '#666' : '#fff', border: '1px solid #444', borderRadius: '5px', cursor: paginaActual === 1 ? 'not-allowed' : 'pointer' }}
                >
                    Anterior
                </button>
                
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(numero => (
                    <button
                        key={numero}
                        onClick={() => setPaginaActual(numero)}
                        style={{ padding: '8px 16px', background: paginaActual === numero ? '#ccff00' : '#222', color: paginaActual === numero ? '#000' : '#fff', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer', fontWeight: paginaActual === numero ? 'bold' : 'normal' }}
                    >
                        {numero}
                    </button>
                ))}

                <button 
                    disabled={paginaActual === totalPaginas}
                    onClick={() => setPaginaActual(paginaActual + 1)}
                    style={{ padding: '8px 16px', background: paginaActual === totalPaginas ? '#333' : '#222', color: paginaActual === totalPaginas ? '#666' : '#fff', border: '1px solid #444', borderRadius: '5px', cursor: paginaActual === totalPaginas ? 'not-allowed' : 'pointer' }}
                >
                    Siguiente
                </button>
            </div>
        );
    };

    // ── RENDERS DE CARDS ─────────────────────────────────────────

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
                    <div className="card-header"><h3>{evento.nombre_evento}</h3></div>
                    <div className="card-info">
                        <div className="info-item"><span className="icon">📅</span> {fechaLimpia}</div>
                        <div className="info-item"><span className="icon">📍</span> {evento.ubicacion}</div>
                        <div className="info-cupo">👥 Cupo: {evento.cupo_maximo || 'Ilimitado'}</div>
                    </div>
                    <div className="card-actions">
                        <button onClick={() => handleVerDetalle(evento)} className="btn-ver-detalle" title="Ver detalles completos">
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
                                {/* ✅ MODIFICADO: pasa true para que el modal envíe con enviar=true */}
                                <button onClick={() => handleEditar(solicitud, 'solicitud', true)} className="btn-editar">
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
                    <img 
                        src={obtenerImagen(solicitud)} 
                        alt={solicitud.nombre_evento} 
                        className="card-img"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGENES_TIPO.default; }} 
                    />
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
                    <img 
                        src={obtenerImagen(solicitud)} 
                        alt={solicitud.nombre_evento} 
                        className="card-img" 
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGENES_TIPO.default; }}
                    />
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

    // ── EMPTY STATE ──────────────────────────────────────────────
    const EmptyState = ({ icon, title, subtitle, showCreate = false }: {
        icon: string; title: string; subtitle?: string; showCreate?: boolean;
    }) => (
        <div className="empty-state">
            <div className="empty-state-icon">{icon}</div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
            {showCreate && (
                <Link to={getRutaCreacion()} className="btn-crear-empty">
                    + Crear evento
                </Link>
            )}
        </div>
    );

    // ── RENDER PRINCIPAL ─────────────────────────────────────────
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
                    <Link to={getRutaCreacion()} className="btn-crear-header">
                        + Crear evento
                    </Link>
                </div>

                <div className="mis-eventos-tabs">
                    <button className={`tab-btn ${vistaActiva === 'activos' ? 'active' : ''}`} onClick={() => setVistaActiva('activos')}>
                        Activos
                        {eventosActivos.length > 0 && <span className="tab-count">{eventosActivos.length}</span>}
                    </button>
                    <button className={`tab-btn ${vistaActiva === 'pendientes' ? 'active' : ''}`} onClick={() => setVistaActiva('pendientes')}>
                        Pendientes
                        {totalPendientes > 0 && <span className="tab-count tab-count--alert">{totalPendientes}</span>}
                    </button>
                    <button className={`tab-btn ${vistaActiva === 'historial' ? 'active' : ''}`} onClick={() => setVistaActiva('historial')}>
                        Historial
                        {(eventosFinalizados.length + eventosCancelados.length) > 0 && (
                            <span className="tab-count">{eventosFinalizados.length + eventosCancelados.length}</span>
                        )}
                    </button>
                    <button className={`tab-btn ${vistaActiva === 'borradores' ? 'active' : ''}`} onClick={() => setVistaActiva('borradores')}>
                        Borradores
                        {solicitudesBorradores.length > 0 && <span className="tab-count">{solicitudesBorradores.length}</span>}
                    </button>
                </div>

                <div className="mis-eventos-main">
                    {error && <p className="error-msg">{error}</p>}

                    {/* BUSCADOR — aparece en todas las tabs */}
                    {!loading && (
                        <BuscadorEventos
                            onBuscar={(filtro) => setFiltroActivo(filtro)}
                            onLimpiar={() => setFiltroActivo(null)}
                            hayFiltroActivo={hayFiltroActivo}
                        />
                    )}

                    {/* ACTIVOS */}
                    {vistaActiva === 'activos' && (
                        loading ? <div className="loading-state">Cargando...</div>
                        : eventosActivosFiltrados.length === 0
                            ? <EmptyState
                                icon="🚴"
                                title={hayFiltroActivo ? "No hay eventos que coincidan con la búsqueda" : "No tenés eventos activos"}
                                subtitle={hayFiltroActivo ? undefined : "¡Creá tu primer evento y compartilo con la comunidad!"}
                                showCreate={!hayFiltroActivo}
                              />
                            : <> 
                                <div className="grid-eventos">
                                    {paginarLista(eventosActivosFiltrados).map(e => renderEventoCard(e, true))}
                                </div>
                                {renderPaginacion(eventosActivosFiltrados.length)}
                              </>
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
                                        pendientesAprobacionFiltrados.length === 0
                                            ? <EmptyState icon="✅" title={hayFiltroActivo ? "No hay resultados para la búsqueda" : "No hay solicitudes pendientes de aprobación"} />
                                            : <> 
                                                <div className="grid-eventos">
                                                    {paginarLista(pendientesAprobacionFiltrados).map(renderSolicitudCard)}
                                                </div>
                                                {renderPaginacion(pendientesAprobacionFiltrados.length)}
                                            </>
                                    )}
                                    {filtroPendientes === 'edicion' && (
                                        pendientesEdicionFiltrados.length === 0
                                            ? <EmptyState icon="✏️" title={hayFiltroActivo ? "No hay resultados para la búsqueda" : "No hay solicitudes de edición pendientes"} />
                                            : <> 
                                                <div className="grid-eventos">
                                                    {paginarLista(pendientesEdicionFiltrados).map(renderSolicitudEdicionCard)}
                                                </div>
                                                {renderPaginacion(pendientesEdicionFiltrados.length)}
                                            </>
                                    )}
                                    {filtroPendientes === 'eliminacion' && (
                                        pendientesEliminacionFiltrados.length === 0
                                            ? <EmptyState icon="🗑️" title={hayFiltroActivo ? "No hay resultados para la búsqueda" : "No hay solicitudes de cancelación pendientes"} />
                                            : <> 
                                                <div className="grid-eventos">
                                                    {paginarLista(pendientesEliminacionFiltrados).map(renderSolicitudEliminacionCard)}
                                                </div>
                                                {renderPaginacion(pendientesEliminacionFiltrados.length)}
                                            </>
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
                                        eventosFinalizadosFiltrados.length === 0
                                            ? <EmptyState icon="🏁" title={hayFiltroActivo ? "No hay resultados para la búsqueda" : "No hay eventos finalizados"}
                                                subtitle={hayFiltroActivo ? undefined : "Los eventos cuya fecha ya pasó van a aparecer acá."} />
                                            : <>
                                                <div className="grid-eventos">
                                                    {paginarLista(eventosFinalizadosFiltrados).map(e => renderEventoCard(e))}
                                                </div>
                                                {renderPaginacion(eventosFinalizadosFiltrados.length)}
                                              </>
                                    )}
                                    {filtroHistorial === 'cancelados' && (
                                        eventosCanceladosFiltrados.length === 0
                                            ? <EmptyState icon="🚫" title={hayFiltroActivo ? "No hay resultados para la búsqueda" : "No hay eventos cancelados"} />
                                            : <>
                                                <div className="grid-eventos">
                                                    {paginarLista(eventosCanceladosFiltrados).map(e => renderEventoCard(e))}
                                                </div>
                                                {renderPaginacion(eventosCanceladosFiltrados.length)}
                                              </>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {/* BORRADORES */}
                    {vistaActiva === 'borradores' && (
                        loading ? <div className="loading-state">Cargando...</div>
                        : solicitudesBorradoresFiltrados.length === 0
                            ? <EmptyState icon="📝"
                                title={hayFiltroActivo ? "No hay resultados para la búsqueda" : "No tenés borradores guardados"}
                                subtitle={hayFiltroActivo ? undefined : "Cuando guardes un evento sin enviar, va a aparecer acá."} />
                            : <>
                                <div className="grid-eventos">
                                    {paginarLista(solicitudesBorradoresFiltrados).map(renderSolicitudCard)}
                                </div>
                                {renderPaginacion(solicitudesBorradoresFiltrados.length)}
                              </>
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
                    onClose={() => { setModalEditar(false); setItemAEditar(null); setEsBorradorEdicion(false); }}
                    item={itemAEditar}
                    tipo={tipoEdicion}
                    esBorrador={esBorradorEdicion}
                    onSuccess={() => { showToast('Cambios guardados correctamente', 'success'); cargarDatos(); }}
                    onShowToast={showToast}
                />
            )}

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