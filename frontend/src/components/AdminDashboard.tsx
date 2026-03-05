import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import Toast from './modals/Toast';
import ConfirmModal from './modals/ConfirmModal';
import InputModal from './modals/InputModal';
import DetalleEdicionModal from './DetalleEdicionModal';
// ✅ Ahora usa el mismo modal con mapa que mis-eventos
import EditEventModal from './EditEventModal';
import EventoDetalleModal from './modals/EventoDetalleModal';
import SolicitudBajaModal from './modals/SolicitudBajaModal';
import '../styles/admin-dashboard.css';

// ============================================================================
// TIPOS
// ============================================================================
interface SolicitudAlta {
  id_solicitud: number;
  nombre_evento: string;
  fecha_evento: string;
  fecha_solicitud: string;
  ubicacion: string;
  id_usuario: number;
  usuario?: { email: string; id_usuario: number; nombre_y_apellido: string };
  tipo: 'alta';
  id_tipo?: number;
  nombre_tipo?: string;
  id_dificultad?: number;
  nombre_dificultad?: string;
  costo_participacion?: number;
  cupo_maximo?: number;
  id_evento?: number;
}

interface SolicitudBaja {
  id_eliminacion: number;
  id_evento: number;
  nombre_evento: string;
  motivo: string;
  fecha_solicitud: string;
  usuario_solicitante: string;
  tipo: 'baja';
  fecha_evento?: string;
}

interface SolicitudEdicion {
  id_solicitud_edicion: number;
  id_evento: number;
  nombre_evento: string;
  cambios_propuestos: Record<string, {
    anterior: string | number | null;
    nuevo: string | number | null;
    valor_real: any;
  }>;
  fecha_solicitud: string;
  usuario_solicitante: string;
  tipo: 'edicion';
  fecha_evento: string;
  ubicacion: string;
  id_tipo: number;
  estado: string;
}

interface Evento {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  ubicacion: string;
  id_estado: number;
  id_usuario: number;
  costo_participacion?: number;
  descripcion?: string;
  id_tipo?: number;
  id_dificultad?: number;
  cupo_maximo?: number;
  lat?: number | null;
  lng?: number | null;
  email_usuario?: string;
}

interface HistorialItem {
  id_evento: number;
  nombre_evento: string;
  fecha_eliminacion: string;
  motivo: string;
  eliminado_por: string;
  estado: string;
  tipo_eliminacion: string;
}

interface Reserva {
  id_reserva: number;
  usuario_nombre: string;
  usuario_email: string;
  nombre_evento: string;
  fecha_evento: string;
  fecha_inscripcion: string;
  estado_reserva: string;
  monto: number;
}

// ============================================================================
// HOOK GENÉRICO DE ORDENAMIENTO
// ============================================================================
function useSortableTable<T>(data: T[], defaultKey: keyof T, defaultDir: 'asc' | 'desc' = 'asc') {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(defaultDir);

  const toggle = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...data].sort((a, b) => {
    let valA: any = a[sortKey];
    let valB: any = b[sortKey];
    if (typeof valA === 'string') {
      const da = new Date(valA).getTime();
      const db = new Date(valB as string).getTime();
      if (!isNaN(da) && !isNaN(db)) return sortDir === 'asc' ? da - db : db - da;
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDir === 'asc' ? valA - valB : valB - valA;
    }
    const sA = String(valA ?? '').toLowerCase();
    const sB = String(valB ?? '').toLowerCase();
    if (sA < sB) return sortDir === 'asc' ? -1 : 1;
    if (sA > sB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const arrow = (key: keyof T) =>
    sortKey !== key ? ' ⇅' : sortDir === 'asc' ? ' ↑' : ' ↓';

  const thStyle = (key: keyof T, align: 'left' | 'center' | 'right' = 'left'): React.CSSProperties => ({
    textAlign: align,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    color: sortKey === key ? '#ccff00' : undefined,
  });

  return { sorted, toggle, arrow, thStyle };
}

// ============================================================================
// Convierte el string de estado del historial → id_estado numérico
// ============================================================================
const estadoStringToIdEstado = (estado: string): number => {
  const s = estado.toLowerCase();
  if (s.includes('definitivo')) return 6;
  if (s.includes('eliminado')) return 5;
  if (s.includes('finalizado')) return 4;
  return 3;
};

// ============================================================================
// Helper: normaliza la fecha del evento al formato YYYY-MM-DD
// que necesita el input[type=date] del modal de edición
// ============================================================================
const normalizarFechaEvento = (evento: Evento): Evento => {
  let fecha = evento.fecha_evento || '';
  // "DD-MM-YYYY" → "YYYY-MM-DD"
  if (/^\d{2}-\d{2}-\d{4}$/.test(fecha)) {
    const [dd, mm, yyyy] = fecha.split('-');
    fecha = `${yyyy}-${mm}-${dd}`;
  }
  // "YYYY-MM-DDTHH:mm:ss" → "YYYY-MM-DD"
  if (fecha.includes('T')) {
    fecha = fecha.split('T')[0];
  }
  return { ...evento, fecha_evento: fecha };
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
const AdminDashboard: React.FC = () => {
  const [vistaActual, setVistaActual] = useState<'pendientes' | 'activos' | 'historial' | 'pagos' | 'inscriptos'>('pendientes');
  const [solicitudesAlta, setSolicitudesAlta] = useState<SolicitudAlta[]>([]);
  const [solicitudesBaja, setSolicitudesBaja] = useState<SolicitudBaja[]>([]);
  const [solicitudesEdicion, setSolicitudesEdicion] = useState<SolicitudEdicion[]>([]);
  const [eventosActivos, setEventosActivos] = useState<Evento[]>([]);
  const [historialEventos, setHistorialEventos] = useState<HistorialItem[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'finalizados' | 'eliminados'>('todos');
  const [searchActivos, setSearchActivos] = useState('');
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean; title: string; message: string; onConfirm: () => void; type: 'warning' | 'danger' | 'info';
  }>({ show: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });
  const [inputModal, setInputModal] = useState<{
    show: boolean; title: string; message: string; value: string; onConfirm: (value: string) => void; type: 'warning' | 'danger' | 'info';
  }>({ show: false, title: '', message: '', value: '', onConfirm: () => {}, type: 'warning' });
  const [pagoModal, setPagoModal] = useState<{ show: boolean; reserva: Reserva | null }>({ show: false, reserva: null });
  const [detalleEdicionModal, setDetalleEdicionModal] = useState<{ show: boolean; solicitud: SolicitudEdicion | null }>({ show: false, solicitud: null });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Podés cambiar esto a 15, 20, etc.

  // ✅ Estado del modal de edición adaptado al nuevo modal (isOpen + item)
  const [editModal, setEditModal] = useState<{ isOpen: boolean; evento: Evento | null }>({ isOpen: false, evento: null });

  const [detalleEventoId, setDetalleEventoId] = useState<number | null>(null);
  const [detalleEventoEstado, setDetalleEventoEstado] = useState<number | null>(null);

  // 👇 NUEVO: modal de detalle para solicitud de alta (reutiliza EventoDetalleModal)
  const [detalleAltaId, setDetalleAltaId] = useState<number | null>(null);

  // 👇 NUEVO: modal de detalle para solicitud de baja
  const [detalleBajaModal, setDetalleBajaModal] = useState<{ show: boolean; solicitud: SolicitudBaja | null }>({
    show: false, solicitud: null
  });

  // Hooks de ordenamiento
  const altaSort = useSortableTable(solicitudesAlta, 'nombre_evento');
  const bajaSort = useSortableTable(solicitudesBaja, 'nombre_evento');
  const edicionSort = useSortableTable(solicitudesEdicion, 'nombre_evento');
  const activosSort = useSortableTable(eventosActivos, 'id_evento', 'desc');
  const historialSort = useSortableTable(historialEventos, 'nombre_evento');
  const pagosSort = useSortableTable(reservas.filter(r => r.estado_reserva === 'Pendiente'), 'nombre_evento');
  const inscriptosSort = useSortableTable(reservas.filter(r => r.estado_reserva === 'Confirmada'), 'nombre_evento');

  // CONSTANTE URL
  const API_URL = import.meta.env.VITE_API_URL;

  // Helpers modales
  const showToast = (mensaje: string, tipo: 'success' | 'error' | 'info') => setToast({ mensaje, tipo });
  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'warning' | 'danger' | 'info' = 'warning') =>
    setConfirmModal({ show: true, title, message, onConfirm, type });
  const hideConfirm = () => setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });
  const showInputModal = (title: string, message: string, onConfirm: (value: string) => void, type: 'warning' | 'danger' | 'info' = 'warning') =>
    setInputModal({ show: true, title, message, value: '', onConfirm, type });
  const hideInputModal = () => setInputModal({ show: false, title: '', message: '', value: '', onConfirm: () => {}, type: 'warning' });

  useEffect(() => {
    cargarDatos();
    setSearchTerm('');
  }, [vistaActual]);

  const cargarDatos = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (vistaActual === 'pendientes') {
        const [resAlta, resBaja, resEdicion] = await Promise.all([
          axios.get(`${API_URL}/admin/solicitudes/pendientes`, config),
          axios.get(`${API_URL}/admin/bajas/pendientes`, config),
          axios.get(`${API_URL}/edicion-eventos/solicitudes-edicion-pendientes`, config)
        ]);
        setSolicitudesAlta(Array.isArray(resAlta.data) ? resAlta.data.map((s: any) => ({ ...s, tipo: 'alta' })) : []);
        setSolicitudesBaja(Array.isArray(resBaja.data) ? resBaja.data.map((s: any) => ({ ...s, tipo: 'baja' })) : []);
        setSolicitudesEdicion(Array.isArray(resEdicion.data) ? resEdicion.data.map((s: any) => ({ ...s, tipo: 'edicion' })) : []);
      } else if (vistaActual === 'activos') {
        const res = await axios.get(`${API_URL}/eventos/`, config);
        setEventosActivos(Array.isArray(res.data) ? res.data.filter((e: Evento) => e.id_estado === 3) : []);
      } else if (vistaActual === 'historial') {
        const res = await axios.get(`${API_URL}/admin/historial-eliminaciones`, config);
        setHistorialEventos(Array.isArray(res.data) ? res.data : []);
      } else if (vistaActual === 'pagos' || vistaActual === 'inscriptos') {
        const res = await axios.get(`${API_URL}/inscripciones`, config);
        setReservas(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error(error);
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecargar = () => { cargarDatos(); showToast('Datos actualizados', 'success'); };
  const handlePrint = () => window.print();
  const handleExportCSV = (datos: any[], nombre: string) => {
    if (!datos || !datos.length) return showToast('Sin datos para exportar', 'error');
    const headers = Object.keys(datos[0]);
    const csv = [headers.join(','), ...datos.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `${nombre}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // Handlers altas
  const handleAprobarAlta = (id: number) =>
    showConfirm('Aprobar Solicitud', '¿Estás seguro de aprobar esta solicitud y publicar el evento?', async () => {
      try {
        await axios.patch(`${API_URL}/admin/solicitudes/${id}/revisar`, { id_estado_solicitud: 3 }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        showToast('Solicitud aprobada correctamente', 'success'); cargarDatos();
      } catch { showToast('Error al aprobar solicitud', 'error'); }
      hideConfirm();
    }, 'info');

  const handleRechazarAlta = (id: number) =>
    showConfirm('Rechazar Solicitud', '¿Estás seguro de rechazar esta solicitud?', async () => {
      try {
        await axios.patch(`${API_URL}/admin/solicitudes/${id}/revisar`, { id_estado_solicitud: 4 }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        showToast('Solicitud rechazada', 'info'); cargarDatos();
      } catch { showToast('Error al rechazar solicitud', 'error'); }
      hideConfirm();
    }, 'warning');

  // Handlers bajas
  const handleAprobarBaja = (id: number) =>
    showConfirm('Aprobar Eliminación', '¿Estás seguro de eliminar este evento?', async () => {
      try {
        await axios.patch(`${API_URL}/admin/bajas/${id}/aprobar`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        showToast('Evento eliminado correctamente', 'success'); cargarDatos();
      } catch { showToast('Error al aprobar baja', 'error'); }
      hideConfirm();
    }, 'danger');

  const handleRechazarBaja = (id: number) =>
    showConfirm('Rechazar Eliminación', '¿Rechazar esta solicitud y mantener el evento activo?', async () => {
      try {
        await axios.patch(`${API_URL}/admin/bajas/${id}/rechazar`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        showToast('Solicitud rechazada. Evento continúa publicado', 'success'); cargarDatos();
      } catch { showToast('Error al rechazar baja', 'error'); }
      hideConfirm();
    }, 'info');

  // Handlers ediciones
  const handleAprobarEdicion = (idEvento: number, nombreEvento: string) =>
    showConfirm('Aprobar Edición', `¿Aprobar los cambios propuestos para "${nombreEvento}"?`, async () => {
      try {
        await axios.patch(`${API_URL}/edicion-eventos/${idEvento}/aprobar-edicion`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        showToast('Cambios aprobados y aplicados al evento', 'success'); cargarDatos();
      } catch (error: any) { showToast(error.response?.data?.detail || 'Error al aprobar edición', 'error'); }
      hideConfirm();
    }, 'info');

  const handleRechazarEdicion = (idEvento: number, nombreEvento: string) =>
    showConfirm('Rechazar Edición', `¿Rechazar los cambios propuestos para "${nombreEvento}"? El evento mantendrá su versión anterior.`, async () => {
      try {
        await axios.patch(`${API_URL}/edicion-eventos/${idEvento}/rechazar-edicion`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        showToast('Cambios rechazados. Evento sin modificar', 'info'); cargarDatos();
      } catch (error: any) { showToast(error.response?.data?.detail || 'Error al rechazar edición', 'error'); }
      hideConfirm();
    }, 'warning');

  const handleEliminarEvento = (id: number, nombre: string) =>
    showInputModal('🗑️ Cancelar Evento', `Estás a punto de cancelar el evento "${nombre}". Ingresa el motivo:`, async (motivo) => {
      try {
        await axios.post(`${API_URL}/eliminacion/admin/eliminar/${id}`, { motivo }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        showToast('Evento cancelado correctamente', 'success'); cargarDatos();
      } catch (error: any) { showToast(error.response?.data?.detail || 'Error al cancelar evento', 'error'); }
      hideInputModal();
    }, 'danger');

  const handleDepurarEvento = (id: number, nombre: string) =>
    showInputModal('⚠️ Eliminar Evento Definitivamente', `Esta acción eliminará PERMANENTEMENTE el evento "${nombre}" de la base de datos. Ingresa el motivo:`, async (motivo) => {
      try {
        await axios.delete(`${API_URL}/eliminacion/admin/depurar/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, data: { motivo } });
        showToast('Evento depurado definitivamente', 'success'); cargarDatos();
      } catch (error: any) { showToast(error.response?.data?.detail || 'Error al depurar evento', 'error'); }
      hideInputModal();
    }, 'danger');

  const handleRestaurarEvento = (id: number, nombre: string) =>
    showConfirm('♻️ Restaurar Evento', `¿Estás seguro de restaurar "${nombre}"? Volverá a estar publicado y activo.`, async () => {
      try {
        await axios.patch(`${API_URL}/eliminacion/admin/restaurar/${id}`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        showToast('Evento restaurado y publicado', 'success'); cargarDatos();
      } catch (error: any) { showToast(error.response?.data?.detail || 'Error al restaurar evento', 'error'); }
      hideConfirm();
    }, 'info');

  const handleConfirmarPago = async () => {
    if (!pagoModal.reserva) return;
    try {
      await axios.post(`${API_URL}/inscripciones/confirmar-pago/${pagoModal.reserva.id_reserva}`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      showToast('Pago confirmado correctamente', 'success');
      setPagoModal({ show: false, reserva: null }); cargarDatos();
    } catch { showToast('Error al confirmar pago', 'error'); }
  };

  // Filtros
  const normalize = (s: string) => s ? s.toLowerCase().trim() : '';

  const filtrarHistorial = () => {
    let res = historialSort.sorted;
    if (filterType === 'finalizados') res = res.filter(h => normalize(h.estado) === 'finalizado');
    if (filterType === 'eliminados') res = res.filter(h => normalize(h.estado).includes('eliminado'));
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      res = res.filter(h =>
        (h.nombre_evento || '').toLowerCase().includes(q) ||
        (h.eliminado_por || '').toLowerCase().includes(q) ||
        (h.fecha_eliminacion || '').toLowerCase().includes(q) ||
        (h.estado || '').toLowerCase().includes(q)
      );
    }
    return res;
  };

  const filtrarPorSearch = <T extends Record<string, any>>(lista: T[]): T[] => {
    if (!searchTerm) return lista;
    const q = searchTerm.toLowerCase().trim();

    return lista.filter(item => {
      // Función recursiva que busca en cada rinconcito del objeto
      const buscarEnValores = (valor: any): boolean => {
        if (valor === null || valor === undefined) return false;
        
        // Si es un objeto (ej: el objeto "usuario" que tiene el email), nos metemos adentro
        if (typeof valor === 'object') {
          return Object.values(valor).some(v => buscarEnValores(v));
        }

        const strValor = String(valor).toLowerCase();

        // Chequeo especial para las fechas:
        // Si el string parece una fecha ISO (tiene guiones), intentamos formatearla para comparar
        if (strValor.includes('-') && !isNaN(Date.parse(strValor))) {
          try {
            const fechaFormateada = formatFecha(strValor as string).toLowerCase();
            if (fechaFormateada.includes(q)) return true;
          } catch (e) { /* ignorar error si no se pudo formatear */ }
        }

        // Búsqueda de texto normal
        return strValor.includes(q);
      };

      // Le pasamos el item completo a nuestra función exploradora
      return buscarEnValores(item);
    });
  };

  const esRestaurable = (estado: string) => normalize(estado)=== 'eliminado';
  const esDepurable = (estado: string) => !normalize(estado).includes('definitivo');

  const getBadgeClass = (estado: string) => {
    const s = normalize(estado);
    if (s.includes('definitivo')) return 'badge-estado-depurado';
    if (s.includes('eliminado')) return 'badge-estado-eliminado';
    if (['finalizado', 'confirmada'].includes(s)) return 'badge-estado-finalizado';
    return 'badge-estado-default';
  };

  const formatearCampo = (campo: string): string => {
    const mapeo: Record<string, string> = {
      nombre_evento: 'Nombre', fecha_evento: 'Fecha', ubicacion: 'Ubicación',
      descripcion: 'Descripción', costo_participacion: 'Costo', id_tipo: 'Tipo',
      id_dificultad: 'Dificultad', cupo_maximo: 'Cupo',
    };
    return mapeo[campo] || campo;
  };

  const obtenerResumenCambios = (cambios: Record<string, any>): string => {
    const cantidad = Object.keys(cambios).length;
    const campos = Object.keys(cambios).slice(0, 2).map(formatearCampo).join(', ');
    return cantidad > 2 ? `${campos} y ${cantidad - 2} más` : campos;
  };

  const formatFecha = (fecha: string): string => {
    if (!fecha) return '—';
    // Ya está en DD-MM-YYYY, devolver tal cual
    if (/^\d{2}-\d{2}-\d{4}$/.test(fecha)) return fecha;
    // Cortar hora: "YYYY-MM-DD HH:mm:ss" o "YYYY-MM-DDTHH:mm:ss"
    const soloFecha = fecha.split('T')[0].split(' ')[0];
    // Convertir YYYY-MM-DD → DD-MM-YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) {
      const [anio, mes, dia] = soloFecha.split('-');
      return `${dia}-${mes}-${anio}`;
    }
    // Fallback: parsear con Date
    const d = new Date(soloFecha);
    if (isNaN(d.getTime())) return fecha;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}-${mes}-${anio}`;
  };

  // CONSTANTES Y FILTRADOS PARA PAGINACIÓN -----------------------------------------------------
  // 1. Primero filtramos
const activosFiltrados = activosSort.sorted.filter(e => {
  if (!searchActivos) return true;
  const q = searchActivos.toLowerCase();
  const nombre = e.nombre_evento?.toLowerCase() || '';
  const creador = (e.email_usuario || '').toLowerCase();
  const fecha = e.fecha_evento ? String(e.fecha_evento).toLowerCase() : '';
  return nombre.includes(q) || creador.includes(q) || fecha.includes(q);
});

// 2. Calculamos los índices para cortar el arreglo
const totalPagesActivos = Math.ceil(activosFiltrados.length / itemsPerPage);
const indexOfLastActivo = currentPage * itemsPerPage;
const indexOfFirstActivo = indexOfLastActivo - itemsPerPage;

// 3. Cortamos los elementos que van en la página actual
const currentActivos = activosFiltrados.slice(indexOfFirstActivo, indexOfLastActivo);
// Paginación Pendientes: Altas
const [currentPageAltas, setCurrentPageAltas] = useState(1);
const itemsPerPageAltas = 10;
const altasFiltradas = filtrarPorSearch(altaSort.sorted);
const totalPagesAltas = Math.ceil(altasFiltradas.length / itemsPerPageAltas);
const indexOfLastAlta = currentPageAltas * itemsPerPageAltas;
const indexOfFirstAlta = indexOfLastAlta - itemsPerPageAltas;
const currentAltas = altasFiltradas.slice(indexOfFirstAlta, indexOfLastAlta);

// Paginación Pendientes: Ediciones
const [currentPageEdiciones, setCurrentPageEdiciones] = useState(1);
const itemsPerPageEdiciones = 10;
const edicionesFiltradas = filtrarPorSearch(edicionSort.sorted);
const totalPagesEdiciones = Math.ceil(edicionesFiltradas.length / itemsPerPageEdiciones);
const indexOfLastEdicion = currentPageEdiciones * itemsPerPageEdiciones;
const indexOfFirstEdicion = indexOfLastEdicion - itemsPerPageEdiciones;
const currentEdiciones = edicionesFiltradas.slice(indexOfFirstEdicion, indexOfLastEdicion);

// Paginación Pendientes: Bajas
const [currentPageBajas, setCurrentPageBajas] = useState(1);
const itemsPerPageBajas = 10;
const bajasFiltradas = filtrarPorSearch(bajaSort.sorted);
const totalPagesBajas = Math.ceil(bajasFiltradas.length / itemsPerPageBajas);
const indexOfLastBaja = currentPageBajas * itemsPerPageBajas;
const indexOfFirstBaja = indexOfLastBaja - itemsPerPageBajas;
const currentBajas = bajasFiltradas.slice(indexOfFirstBaja, indexOfLastBaja);

// Paginación Historial
const [currentPageHistorial, setCurrentPageHistorial] = useState(1);
const itemsPerPageHistorial = 15; // Podés ajustarlo, puse 15 por ser historial
const historialFiltrado = filtrarHistorial(); // Asumo que esto ya maneja la búsqueda y ordenamiento
const totalPagesHistorial = Math.ceil(historialFiltrado.length / itemsPerPageHistorial);
const indexOfLastHistorialItem = currentPageHistorial * itemsPerPageHistorial;
const indexOfFirstHistorialItem = indexOfLastHistorialItem - itemsPerPageHistorial;
const currentHistorial = historialFiltrado.slice(indexOfFirstHistorialItem, indexOfLastHistorialItem);

// Paginación Pagos
const [currentPagePagos, setCurrentPagePagos] = useState(1);
const itemsPerPagePagos = 10;
const pagosFiltrados = filtrarPorSearch(pagosSort.sorted);
const totalPagesPagos = Math.ceil(pagosFiltrados.length / itemsPerPagePagos);
const indexOfLastPago = currentPagePagos * itemsPerPagePagos;
const indexOfFirstPago = indexOfLastPago - itemsPerPagePagos;
const currentPagos = pagosFiltrados.slice(indexOfFirstPago, indexOfLastPago);

// Paginación Inscriptos
const [currentPageInscriptos, setCurrentPageInscriptos] = useState(1);
const itemsPerPageInscriptos = 10;
const inscriptosFiltrados = filtrarPorSearch(inscriptosSort.sorted);
const totalPagesInscriptos = Math.ceil(inscriptosFiltrados.length / itemsPerPageInscriptos);
const indexOfLastInscripto = currentPageInscriptos * itemsPerPageInscriptos;
const indexOfFirstInscripto = indexOfLastInscripto - itemsPerPageInscriptos;
const currentInscriptos = inscriptosFiltrados.slice(indexOfFirstInscripto, indexOfLastInscripto);

// FIN DE CONSTANTES Y FILTRADOS PARA PAGINACIÓN -----------------------------------------------------

  const formatCosto = (costo?: number) =>
    costo != null ? `$${Number(costo).toLocaleString('es-AR')}` : '—';

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className='contenttotal'>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>

        <aside className="admin-sidebar">
          <h2 className="admin-title">Panel Admin</h2>
          <nav className="admin-nav">
            <button className={vistaActual === 'pendientes' ? 'active' : ''} onClick={() => setVistaActual('pendientes')}>📋 Pendientes</button>
            <button className={vistaActual === 'activos' ? 'active' : ''} onClick={() => {setVistaActual('activos'); setCurrentPage(1); }}>✅ Activos</button>
            <button className={vistaActual === 'historial' ? 'active' : ''} onClick={() => setVistaActual('historial')}>📖 Historial Eliminados/Finalizados</button>
            <button className={vistaActual === 'pagos' ? 'active' : ''} onClick={() => setVistaActual('pagos')}>💳 Pagos Pendientes</button>
            <button className={vistaActual === 'inscriptos' ? 'active' : ''} onClick={() => setVistaActual('inscriptos')}>👥 Pagos Confirmados</button>
          </nav>
        </aside>

        <main className="admin-main-content">
          {/* VISTA PENDIENTES */}
          {vistaActual === 'pendientes' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>📋 Solicitudes Pendientes</h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input 
                      type="text" 
                      className="search-input-admin" 
                      placeholder="Buscar por nombre, email o fecha..." 
                      value={searchTerm} 
                      onChange={e => {
                        setSearchTerm(e.target.value);
                        // Resetear las 3 paginaciones al buscar
                        setCurrentPageAltas(1);
                        setCurrentPageEdiciones(1);
                        setCurrentPageBajas(1);
                      }} 
                    />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV([...solicitudesAlta, ...solicitudesBaja, ...solicitudesEdicion], 'Pendientes')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️</button>
                  </div>
                </div>
              </div>

              {/* ALTAS */}
              <div className="seccion-solicitudes">
                <h3>📝 Altas ({solicitudesAlta.length})</h3>
                <table className="data-table-admin">
                    <thead>
                      <tr>
                        <th style={altaSort.thStyle('nombre_evento')} onClick={() => altaSort.toggle('nombre_evento')}>Evento{altaSort.arrow('nombre_evento')}</th>
                        <th style={altaSort.thStyle('fecha_evento')} onClick={() => altaSort.toggle('fecha_evento')}>Fecha Evento{altaSort.arrow('fecha_evento')}</th>
                        <th style={altaSort.thStyle('id_usuario')} onClick={() => altaSort.toggle('id_usuario')}>Solicitante{altaSort.arrow('id_usuario')}</th>
                        <th style={{ textAlign: 'left', cursor: 'default' }}>Fecha Solicitud</th>
                        <th style={{ textAlign: 'left', cursor: 'default' }}>Tipo / Dificultad</th>
                        <th style={{ textAlign: 'center', cursor: 'default' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>🔄 Cargando solicitudes...</td></tr>
                      ) : altasFiltradas.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No hay solicitudes de alta pendientes</td></tr>
                      ) : (
                        currentAltas.map(s => (
                          <tr key={s.id_solicitud}>
                            <td style={{ textAlign: 'left', fontWeight: 600 }}>
                              <small style={{ color: '#888' }}>#{s.id_solicitud}</small> {s.nombre_evento}
                            </td>
                            <td style={{ textAlign: 'left' }}>{formatFecha(s.fecha_evento)}</td>
                            <td style={{ textAlign: 'left' }}><small>{s.usuario?.email || `#${s.id_usuario}`}</small></td>
                            <td style={{ textAlign: 'left' }}><small style={{ color: '#888' }}>{formatFecha(s.fecha_solicitud || '') || '—'}</small></td>
                            <td style={{ textAlign: 'left' }}>
                              <small style={{ color: '#a8a8a8' }}>
                                {s.nombre_tipo || (s.id_tipo ? `Tipo #${s.id_tipo}` : '—')}
                                {(s.nombre_dificultad || s.id_dificultad) ? ` · ${s.nombre_dificultad || `Dif. #${s.id_dificultad}`}` : ''}
                              </small>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button className="btn-ver-detalle-admin" onClick={() => setDetalleAltaId(s.id_solicitud)} title="Ver detalles del evento" style={{ marginRight: '6px' }}>👁️</button>
                              <button className="btn-aprobar-admin" onClick={() => handleAprobarAlta(s.id_solicitud)} title="Aprobar">✓</button>
                              <button className="btn-rechazar-admin" onClick={() => handleRechazarAlta(s.id_solicitud)} title="Rechazar">✕</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                </table>
                {/* Controles Paginación Altas */}
                {totalPagesAltas > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '15px' }}>
                    <button 
                      onClick={() => setCurrentPageAltas(prev => Math.max(prev - 1, 1))}
                      disabled={currentPageAltas === 1}
                      style={{ padding: '6px 12px', borderRadius: '4px', background: currentPageAltas === 1 ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPageAltas === 1 ? 'not-allowed' : 'pointer' }}
                    >◀</button>
                    <span style={{ color: '#e0e0e0', fontSize: '0.9em' }}>{currentPageAltas} / {totalPagesAltas}</span>
                    <button 
                      onClick={() => setCurrentPageAltas(prev => Math.min(prev + 1, totalPagesAltas))}
                      disabled={currentPageAltas === totalPagesAltas}
                      style={{ padding: '6px 12px', borderRadius: '4px', background: currentPageAltas === totalPagesAltas ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPageAltas === totalPagesAltas ? 'not-allowed' : 'pointer' }}
                    >▶</button>
                  </div>
                )}
              </div>

              {/* EDICIONES */}
              <div className="seccion-solicitudes" style={{ marginTop: '30px' }}>
                <h3 style={{ color: '#4a9eff' }}>✏️ Ediciones ({solicitudesEdicion.length})</h3>
                <table className="data-table-admin">
                    <thead>
                      <tr>
                        <th style={edicionSort.thStyle('nombre_evento')} onClick={() => edicionSort.toggle('nombre_evento')}>Evento{edicionSort.arrow('nombre_evento')}</th>
                        <th style={edicionSort.thStyle('fecha_evento')} onClick={() => edicionSort.toggle('fecha_evento')}>Fecha Evento{edicionSort.arrow('fecha_evento')}</th>
                        <th style={edicionSort.thStyle('usuario_solicitante')} onClick={() => edicionSort.toggle('usuario_solicitante')}>Solicitante{edicionSort.arrow('usuario_solicitante')}</th>
                        <th style={edicionSort.thStyle('fecha_solicitud')} onClick={() => edicionSort.toggle('fecha_solicitud')}>Fecha Solicitud{edicionSort.arrow('fecha_solicitud')}</th>
                        <th style={{ textAlign: 'left', cursor: 'default', width: '22%' }}>Cambios</th>
                        <th style={{ textAlign: 'center', cursor: 'default' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>🔄 Cargando solicitudes...</td></tr>
                      ) : edicionesFiltradas.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No hay solicitudes de edición pendientes</td></tr>
                      ) : (
                        currentEdiciones.map(s => (
                          <tr key={s.id_solicitud_edicion} style={{ cursor: 'pointer' }}
                            onClick={() => setDetalleEdicionModal({ show: true, solicitud: s })}
                            title="Click para ver detalles"
                          >
                            <td style={{ textAlign: 'left', fontWeight: 600 }}>
                              <small style={{ color: '#888' }}>#{s.id_evento}</small> {s.nombre_evento}
                            </td>
                            <td style={{ textAlign: 'left' }}>{formatFecha(s.fecha_evento)}</td>
                            <td style={{ textAlign: 'left' }}><small>{s.usuario_solicitante}</small></td>
                            <td style={{ textAlign: 'left' }}><small style={{ color: '#888' }}>{formatFecha(s.fecha_solicitud)}</small></td>
                            <td style={{ textAlign: 'left' }}>
                              <small style={{ color: '#a8a8a8' }}>{obtenerResumenCambios(s.cambios_propuestos || {})}</small>
                              <br />
                              <span style={{ fontSize: '0.75rem', color: '#ccff00', fontWeight: 'bold' }}>
                                {Object.keys(s.cambios_propuestos || {}).length} cambio{Object.keys(s.cambios_propuestos || {}).length !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <button className="btn-ver-detalle-admin" onClick={() => setDetalleEdicionModal({ show: true, solicitud: s })} title="Ver detalles" style={{ marginRight: '8px' }}>👁️</button>
                              <button className="btn-aprobar-admin" onClick={e => { e.stopPropagation(); handleAprobarEdicion(s.id_evento, s.nombre_evento); }} title="Aprobar">✓</button>
                              <button className="btn-rechazar-admin" onClick={e => { e.stopPropagation(); handleRechazarEdicion(s.id_evento, s.nombre_evento); }} title="Rechazar">✕</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                </table>
                {/* Controles Paginación Ediciones */}
                {totalPagesEdiciones > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '15px' }}>
                    <button 
                      onClick={() => setCurrentPageEdiciones(prev => Math.max(prev - 1, 1))}
                      disabled={currentPageEdiciones === 1}
                      style={{ padding: '6px 12px', borderRadius: '4px', background: currentPageEdiciones === 1 ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPageEdiciones === 1 ? 'not-allowed' : 'pointer' }}
                    >◀</button>
                    <span style={{ color: '#e0e0e0', fontSize: '0.9em' }}>{currentPageEdiciones} / {totalPagesEdiciones}</span>
                    <button 
                      onClick={() => setCurrentPageEdiciones(prev => Math.min(prev + 1, totalPagesEdiciones))}
                      disabled={currentPageEdiciones === totalPagesEdiciones}
                      style={{ padding: '6px 12px', borderRadius: '4px', background: currentPageEdiciones === totalPagesEdiciones ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPageEdiciones === totalPagesEdiciones ? 'not-allowed' : 'pointer' }}
                    >▶</button>
                  </div>
                )}
              </div>

              {/* BAJAS */}
              <div className="seccion-solicitudes" style={{ marginTop: '30px', paddingBottom: '20px' }}>
                <h3 style={{ color: '#fc8181' }}>🗑️ Bajas ({solicitudesBaja.length})</h3>
                <table className="data-table-admin">
                    <thead>
                      <tr>
                        <th style={bajaSort.thStyle('nombre_evento')} onClick={() => bajaSort.toggle('nombre_evento')}>Evento{bajaSort.arrow('nombre_evento')}</th>
                        <th style={bajaSort.thStyle('usuario_solicitante')} onClick={() => bajaSort.toggle('usuario_solicitante')}>Solicitante{bajaSort.arrow('usuario_solicitante')}</th>
                        <th style={bajaSort.thStyle('fecha_solicitud')} onClick={() => bajaSort.toggle('fecha_solicitud')}>Fecha Solicitud{bajaSort.arrow('fecha_solicitud')}</th>
                        <th style={{ textAlign: 'left', cursor: 'default' }}>Motivo</th>
                        <th style={{ textAlign: 'center', cursor: 'default' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>🔄 Cargando solicitudes...</td></tr>
                      ) : bajasFiltradas.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No hay solicitudes de baja pendientes</td></tr>
                      ) : (
                        currentBajas.map(s => (
                          <tr key={s.id_eliminacion} style={{ cursor: 'pointer' }} onClick={() => setDetalleBajaModal({ show: true, solicitud: s })} title="Click para ver detalles">
                            <td style={{ textAlign: 'left', fontWeight: 600 }}>
                              <small style={{ color: '#888' }}>#{s.id_evento}</small> {s.nombre_evento}
                            </td>
                            <td style={{ textAlign: 'left' }}><small>{s.usuario_solicitante}</small></td>
                            <td style={{ textAlign: 'left' }}><small style={{ color: '#888' }}>{formatFecha(s.fecha_solicitud)}</small></td>
                            <td style={{ textAlign: 'left' }}>
                              <small style={{ color: '#fc8181' }}>
                                {s.motivo && s.motivo.length > 60 ? s.motivo.substring(0, 60) + '...' : s.motivo}
                              </small>
                            </td>
                            <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                              <button className="btn-ver-detalle-admin" onClick={() => setDetalleBajaModal({ show: true, solicitud: s })} title="Ver motivo completo" style={{ marginRight: '6px' }}>👁️</button>
                              <button className="btn-aprobar-admin" onClick={() => handleAprobarBaja(s.id_evento)} title="Aprobar baja">✓</button>
                              <button className="btn-rechazar-admin" onClick={() => handleRechazarBaja(s.id_evento)} title="Rechazar baja">✕</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                </table>
                {/* Controles Paginación Bajas */}
                {totalPagesBajas > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '15px' }}>
                    <button 
                      onClick={() => setCurrentPageBajas(prev => Math.max(prev - 1, 1))}
                      disabled={currentPageBajas === 1}
                      style={{ padding: '6px 12px', borderRadius: '4px', background: currentPageBajas === 1 ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPageBajas === 1 ? 'not-allowed' : 'pointer' }}
                    >◀</button>
                    <span style={{ color: '#e0e0e0', fontSize: '0.9em' }}>{currentPageBajas} / {totalPagesBajas}</span>
                    <button 
                      onClick={() => setCurrentPageBajas(prev => Math.min(prev + 1, totalPagesBajas))}
                      disabled={currentPageBajas === totalPagesBajas}
                      style={{ padding: '6px 12px', borderRadius: '4px', background: currentPageBajas === totalPagesBajas ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPageBajas === totalPagesBajas ? 'not-allowed' : 'pointer' }}
                    >▶</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA ACTIVOS */}
          {vistaActual === 'activos' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>✅ Eventos Activos ({eventosActivos.length})</h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input 
                      type="text" 
                      className="search-input-admin" 
                      placeholder="Buscar por nombre, creador o fecha..."
                      value={searchActivos} 
                      onChange={e => {
                        setSearchActivos(e.target.value);
                        setCurrentPage(1); // 🚀 Reset al buscar
                      }} 
                    />
                  </div>
                  <div className="action-buttons-inline">
                    {searchActivos && (
                      <button className="btn-search-admin" onClick={() => setSearchActivos('')}>✕ Limpiar</button>
                    )}
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV(eventosActivos, 'Activos')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️</button>
                  </div>
                </div>
              </div>
              <table className="data-table-admin">
                <thead>
                  <tr>
                    <th style={activosSort.thStyle('id_evento')} onClick={() => activosSort.toggle('id_evento')}>ID{activosSort.arrow('id_evento')}</th>
                    <th style={activosSort.thStyle('nombre_evento')} onClick={() => activosSort.toggle('nombre_evento')}>Evento{activosSort.arrow('nombre_evento')}</th>
                    <th style={activosSort.thStyle('id_usuario')} onClick={() => activosSort.toggle('id_usuario')}>Creador{activosSort.arrow('id_usuario')}</th>
                    <th style={activosSort.thStyle('fecha_evento')} onClick={() => activosSort.toggle('fecha_evento')}>Fecha{activosSort.arrow('fecha_evento')}</th>
                    <th style={{ textAlign: 'center', cursor: 'default' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                    {loading ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>🔄 Cargando datos...</td></tr>
                    ) : activosFiltrados.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No hay eventos activos.</td></tr>
                    ) : (
                      // 🚀 Usamos currentActivos en lugar de toda la lista
                      currentActivos.map(e => (
                        <tr key={e.id_evento}>
                          <td style={{ textAlign: 'left', color: '#888' }}>#{e.id_evento}</td>
                          <td style={{ textAlign: 'left', fontWeight: 600 }}>{e.nombre_evento}</td>
                          <td style={{ textAlign: 'left' }}><small style={{ color: '#888' }}>{e.email_usuario || `#${e.id_usuario}`}</small></td>
                          <td style={{ textAlign: 'left' }}>{formatFecha(e.fecha_evento)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                            className="btn-ver-detalle-admin"
                            onClick={() => { setDetalleEventoId(e.id_evento); setDetalleEventoEstado(3); }}
                            title="Ver detalles"
                            style={{ marginRight: '8px' }}
                          >👁️ Ver más</button>
                          {/* ✅ Abre el nuevo modal con mapa: normaliza fecha y pasa como 'evento' */}
                          <button
                            className="btn-editar-admin"
                            onClick={() => setEditModal({ isOpen: true, evento: normalizarFechaEvento(e) })}
                            title="Editar"
                            style={{ marginRight: '8px' }}
                          >✏️ Editar</button>
                          <button className="btn-rechazar-admin" onClick={() => handleEliminarEvento(e.id_evento, e.nombre_evento)}>🗑️ Eliminar</button>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                    </table>

                  {totalPagesActivos > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', paddingBottom: '20px' }}>
                      <button 
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        style={{ padding: '8px 16px', borderRadius: '6px', background: currentPage === 1 ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                      >
                        ◀ Anterior
                      </button>
                      
                      <span style={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                        Página {currentPage} de {totalPagesActivos}
                      </span>
                      
                      <button 
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPagesActivos))}
                        disabled={currentPage === totalPagesActivos}
                        style={{ padding: '8px 16px', borderRadius: '6px', background: currentPage === totalPagesActivos ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPage === totalPagesActivos ? 'not-allowed' : 'pointer' }}
                      >
                        Siguiente ▶
                      </button>
                    </div>
                  )}
            </div> 
          )} 

          {/* VISTA HISTORIAL */}
          {vistaActual === 'historial' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>📖 Historial Eliminados/Finalizados ({historialFiltrado.length})</h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input 
                      type="text" 
                      className="search-input-admin" 
                      placeholder="Buscar por nombre, email o fecha..." 
                      value={searchTerm} 
                      onChange={e => {
                        setSearchTerm(e.target.value);
                        setCurrentPageHistorial(1); // Reset al buscar
                      }} 
                    />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="filter-buttons-admin">
                    <button onClick={() => { setFilterType('todos'); setCurrentPageHistorial(1); }}>Todos</button>
                    <button onClick={() => { setFilterType('finalizados'); setCurrentPageHistorial(1); }}>Final.</button>
                    <button onClick={() => { setFilterType('eliminados'); setCurrentPageHistorial(1); }}>Elim.</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV(historialFiltrado, 'Historial')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️</button>
                  </div>
                </div>
              </div>
              <table className="data-table-admin">
                <thead>
                  <tr>
                    <th style={historialSort.thStyle('nombre_evento')} onClick={() => historialSort.toggle('nombre_evento')}>Evento{historialSort.arrow('nombre_evento')}</th>
                    <th style={historialSort.thStyle('motivo')} onClick={() => historialSort.toggle('motivo')}>Motivo{historialSort.arrow('motivo')}</th>
                    <th style={historialSort.thStyle('fecha_eliminacion')} onClick={() => historialSort.toggle('fecha_eliminacion')}>Fecha{historialSort.arrow('fecha_eliminacion')}</th>
                    <th style={historialSort.thStyle('estado', 'center')} onClick={() => historialSort.toggle('estado')}>Estado{historialSort.arrow('estado')}</th>
                    <th style={{ textAlign: 'center', cursor: 'default' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>🔄 Cargando historial...</td></tr>
                  ) : currentHistorial.length === 0 ? (
                     <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No hay registros en el historial.</td></tr>
                  ) : (
                    currentHistorial.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'left' }}><strong>{item.nombre_evento}</strong></td>
                        <td style={{ textAlign: 'left' }}>{item.motivo}</td>
                        <td style={{ textAlign: 'left' }}><small style={{ color: '#888' }}>{formatFecha(item.fecha_eliminacion)}</small></td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge-estado-small ${getBadgeClass(item.estado)}`}>{item.estado}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="action-buttons-inline">
                            <button
                              className="btn-ver-detalle-admin"
                              onClick={() => {
                                setDetalleEventoId(item.id_evento);
                                setDetalleEventoEstado(estadoStringToIdEstado(item.estado));
                              }}
                              title="Ver detalles"
                              style={{ marginRight: '6px' }}
                            >👁️</button>
                            {esRestaurable(item.estado) && (
                              <button className="btn-restaurar-admin" title="Restaurar" onClick={() => handleRestaurarEvento(item.id_evento, item.nombre_evento)}>♻️</button>
                            )}
                            {esDepurable(item.estado) && (
                              <button className="btn-depurar-admin" title="Eliminar Definitivamente" onClick={() => handleDepurarEvento(item.id_evento, item.nombre_evento)}>🧹</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Controles Paginación Historial */}
              {totalPagesHistorial > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', paddingBottom: '20px' }}>
                  <button 
                    onClick={() => setCurrentPageHistorial(prev => Math.max(prev - 1, 1))}
                    disabled={currentPageHistorial === 1}
                    style={{ padding: '8px 16px', borderRadius: '6px', background: currentPageHistorial === 1 ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPageHistorial === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ◀ Anterior
                  </button>
                  
                  <span style={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                    Página {currentPageHistorial} de {totalPagesHistorial}
                  </span>
                  
                  <button 
                    onClick={() => setCurrentPageHistorial(prev => Math.min(prev + 1, totalPagesHistorial))}
                    disabled={currentPageHistorial === totalPagesHistorial}
                    style={{ padding: '8px 16px', borderRadius: '6px', background: currentPageHistorial === totalPagesHistorial ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPageHistorial === totalPagesHistorial ? 'not-allowed' : 'pointer' }}
                  >
                    Siguiente ▶
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VISTA PAGOS */}
          {vistaActual === 'pagos' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>💳 Pagos Pendientes</h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input 
                      type="text" 
                      className="search-input-admin" 
                      placeholder="Buscar por nombre, email o fecha..." 
                      value={searchTerm} 
                      onChange={e => {
                        setSearchTerm(e.target.value);
                        setCurrentPagePagos(1); // Reset de página al buscar
                      }} 
                    />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV(reservas, 'Pagos')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️</button>
                  </div>
                </div>
              </div>
              <table className="data-table-admin">
                <thead>
                  <tr>
                    <th style={pagosSort.thStyle('usuario_nombre')} onClick={() => pagosSort.toggle('usuario_nombre')}>Cliente{pagosSort.arrow('usuario_nombre')}</th>
                    <th style={pagosSort.thStyle('usuario_email')} onClick={() => pagosSort.toggle('usuario_email')}>Email{pagosSort.arrow('usuario_email')}</th>
                    <th style={pagosSort.thStyle('nombre_evento')} onClick={() => pagosSort.toggle('nombre_evento')}>Evento{pagosSort.arrow('nombre_evento')}</th>
                    <th style={pagosSort.thStyle('fecha_evento')} onClick={() => pagosSort.toggle('fecha_evento')}>Fecha Evento{pagosSort.arrow('fecha_evento')}</th>
                    <th style={pagosSort.thStyle('monto', 'center')} onClick={() => pagosSort.toggle('monto')}>Monto{pagosSort.arrow('monto')}</th>
                    <th style={pagosSort.thStyle('fecha_inscripcion')} onClick={() => pagosSort.toggle('fecha_inscripcion')}>F. Inscripción{pagosSort.arrow('fecha_inscripcion')}</th>
                    <th style={pagosSort.thStyle('estado_reserva', 'center')} onClick={() => pagosSort.toggle('estado_reserva')}>Estado{pagosSort.arrow('estado_reserva')}</th>
                    <th style={{ textAlign: 'center', cursor: 'default' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>🔄 Cargando datos...</td></tr>
                  ) : currentPagos.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No hay pagos pendientes</td></tr>
                  ) : (
                    currentPagos.map(r => (
                      <tr key={r.id_reserva}>
                        <td style={{ textAlign: 'left' }}>{r.usuario_nombre}</td>
                        <td style={{ textAlign: 'left' }}>{r.usuario_email}</td>
                        <td style={{ textAlign: 'left' }}>{r.nombre_evento}</td>
                        <td style={{ textAlign: 'left' }}><small>{formatFecha(r.fecha_evento)}</small></td>
                        <td style={{ textAlign: 'center' }}><strong>{formatCosto(r.monto)}</strong></td>
                        <td style={{ textAlign: 'left' }}><small style={{ color: '#888' }}>{formatFecha(r.fecha_inscripcion)}</small></td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge-estado-small ${getBadgeClass(r.estado_reserva)}`}>{r.estado_reserva}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn-confirmar-pago-admin" onClick={() => setPagoModal({ show: true, reserva: r })}>Confirmar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Controles Paginación Pagos */}
              {totalPagesPagos > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', paddingBottom: '20px' }}>
                  <button 
                    onClick={() => setCurrentPagePagos(prev => Math.max(prev - 1, 1))}
                    disabled={currentPagePagos === 1}
                    style={{ padding: '8px 16px', borderRadius: '6px', background: currentPagePagos === 1 ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPagePagos === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ◀ Anterior
                  </button>
                  
                  <span style={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                    Página {currentPagePagos} de {totalPagesPagos}
                  </span>
                  
                  <button 
                    onClick={() => setCurrentPagePagos(prev => Math.min(prev + 1, totalPagesPagos))}
                    disabled={currentPagePagos === totalPagesPagos}
                    style={{ padding: '8px 16px', borderRadius: '6px', background: currentPagePagos === totalPagesPagos ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPagePagos === totalPagesPagos ? 'not-allowed' : 'pointer' }}
                  >
                    Siguiente ▶
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VISTA INSCRIPTOS */}
          {vistaActual === 'inscriptos' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>👥 Pagos Confirmados</h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input 
                      type="text" 
                      className="search-input-admin" 
                      placeholder="Buscar por nombre, email o fecha..." 
                      value={searchTerm} 
                      onChange={e => {
                        setSearchTerm(e.target.value);
                        setCurrentPageInscriptos(1); // Reset de página al buscar
                      }} 
                    />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar}>🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV(reservas, 'Inscriptos')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️</button>
                  </div>
                </div>
              </div>
              <table className="data-table-admin">
                <thead>
                  <tr>
                    <th style={inscriptosSort.thStyle('usuario_nombre')} onClick={() => inscriptosSort.toggle('usuario_nombre')}>Cliente{inscriptosSort.arrow('usuario_nombre')}</th>
                    <th style={inscriptosSort.thStyle('usuario_email')} onClick={() => inscriptosSort.toggle('usuario_email')}>Email{inscriptosSort.arrow('usuario_email')}</th>
                    <th style={inscriptosSort.thStyle('nombre_evento')} onClick={() => inscriptosSort.toggle('nombre_evento')}>Evento{inscriptosSort.arrow('nombre_evento')}</th>
                    <th style={inscriptosSort.thStyle('fecha_evento')} onClick={() => inscriptosSort.toggle('fecha_evento')}>Fecha Evento{inscriptosSort.arrow('fecha_evento')}</th>
                    <th style={inscriptosSort.thStyle('fecha_inscripcion')} onClick={() => inscriptosSort.toggle('fecha_inscripcion')}>F. Inscripción{inscriptosSort.arrow('fecha_inscripcion')}</th>
                    <th style={inscriptosSort.thStyle('estado_reserva', 'center')} onClick={() => inscriptosSort.toggle('estado_reserva')}>Estado{inscriptosSort.arrow('estado_reserva')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>🔄 Cargando datos...</td></tr>
                  ) : currentInscriptos.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No hay inscriptos confirmados</td></tr>
                  ) : (
                    currentInscriptos.map(r => (
                      <tr key={r.id_reserva}>
                        <td style={{ textAlign: 'left' }}>{r.usuario_nombre}</td>
                        <td style={{ textAlign: 'left' }}><small>{r.usuario_email}</small></td>
                        <td style={{ textAlign: 'left' }}>{r.nombre_evento}</td>
                        <td style={{ textAlign: 'left' }}><small>{formatFecha(r.fecha_evento)}</small></td>
                        <td style={{ textAlign: 'left' }}><small style={{ color: '#888' }}>{formatFecha(r.fecha_inscripcion)}</small></td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge-estado-small badge-estado-finalizado">{r.estado_reserva}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Controles Paginación Inscriptos */}
              {totalPagesInscriptos > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px', paddingBottom: '20px' }}>
                  <button 
                    onClick={() => setCurrentPageInscriptos(prev => Math.max(prev - 1, 1))}
                    disabled={currentPageInscriptos === 1}
                    style={{ padding: '8px 16px', borderRadius: '6px', background: currentPageInscriptos === 1 ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPageInscriptos === 1 ? 'not-allowed' : 'pointer' }}
                  >
                    ◀ Anterior
                  </button>
                  
                  <span style={{ color: '#e0e0e0', fontWeight: 'bold' }}>
                    Página {currentPageInscriptos} de {totalPagesInscriptos}
                  </span>
                  
                  <button 
                    onClick={() => setCurrentPageInscriptos(prev => Math.min(prev + 1, totalPagesInscriptos))}
                    disabled={currentPageInscriptos === totalPagesInscriptos}
                    style={{ padding: '8px 16px', borderRadius: '6px', background: currentPageInscriptos === totalPagesInscriptos ? '#333' : '#4a9eff', color: '#fff', border: 'none', cursor: currentPageInscriptos === totalPagesInscriptos ? 'not-allowed' : 'pointer' }}
                  >
                    Siguiente ▶
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
      <Footer />

      {/* MODALES */}
      {toast && <Toast message={toast.mensaje} type={toast.tipo} onClose={() => setToast(null)} />}

      <ConfirmModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={hideConfirm}
        type={confirmModal.type}
      />

      <InputModal
        show={inputModal.show}
        title={inputModal.title}
        message={inputModal.message}
        value={inputModal.value}
        onChange={(value) => setInputModal({ ...inputModal, value })}
        onConfirm={() => { inputModal.onConfirm(inputModal.value); hideInputModal(); }}
        onCancel={hideInputModal}
        type={inputModal.type}
      />

      <DetalleEdicionModal
        show={detalleEdicionModal.show}
        solicitud={detalleEdicionModal.solicitud}
        onClose={() => setDetalleEdicionModal({ show: false, solicitud: null })}
        onAprobar={handleAprobarEdicion}
        onRechazar={handleRechazarEdicion}
      />

      {/* ✅ Nuevo modal unificado con mapa — props: isOpen, item, tipo, onClose, onSuccess, onShowToast */}
      {editModal.isOpen && editModal.evento && (
        <EditEventModal
          isOpen={editModal.isOpen}
          item={{
            ...editModal.evento,
            costo_participacion: editModal.evento.costo_participacion ?? 0,
            id_tipo: editModal.evento.id_tipo ?? 1,
            id_dificultad: editModal.evento.id_dificultad ?? 1,
            cupo_maximo: editModal.evento.cupo_maximo ?? 0,
            descripcion: editModal.evento.descripcion ?? '',
          }}
          tipo="evento"
          onClose={() => setEditModal({ isOpen: false, evento: null })}
          onSuccess={() => { showToast('Evento actualizado correctamente', 'success'); cargarDatos(); }}
          onShowToast={showToast}
        />
      )}

      {/* Modal detalle evento (activos, historial y también altas) */}
      <EventoDetalleModal
        eventoId={detalleEventoId ?? detalleAltaId}
        idEstado={detalleEventoEstado ?? 2}
        onClose={() => {
          setDetalleEventoId(null);
          setDetalleEventoEstado(null);
          setDetalleAltaId(null);
        }}
      />

      {/* Modal detalle solicitud de baja */}
      <SolicitudBajaModal
        show={detalleBajaModal.show}
        solicitud={detalleBajaModal.solicitud}
        onClose={() => setDetalleBajaModal({ show: false, solicitud: null })}
        onAprobar={handleAprobarBaja}
        onRechazar={handleRechazarBaja}
      />

      {pagoModal.show && pagoModal.reserva && (
        <div className="modal-pago-overlay" onClick={() => setPagoModal({ show: false, reserva: null })}>
          <div className="modal-pago-content" onClick={e => e.stopPropagation()}>
            <div className="modal-pago-header"><h2>Confirmar Pago</h2></div>
            <div className="modal-pago-detalles">
              <p>Evento: {pagoModal.reserva.nombre_evento}</p>
              <p>Monto: <b>{formatCosto(pagoModal.reserva.monto)}</b></p>
            </div>
            <div className="modal-pago-actions">
              <button className="btn-cancelar-pago" onClick={() => setPagoModal({ show: false, reserva: null })}>Cancelar</button>
              <button className="btn-confirmar-pago" onClick={handleConfirmarPago}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;