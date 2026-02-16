import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import Toast from './modals/Toast';
import ConfirmModal from './modals/ConfirmModal';
import InputModal from './modals/InputModal';
import DetalleEdicionModal from './DetalleEdicionModal';
import EditEventModal from './modals/EditEventModal';
import '../styles/admin-dashboard.css';

// ============================================================================
// 1. TIPOS
// ============================================================================
interface SolicitudAlta {
  id_solicitud: number;
  nombre_evento: string;
  fecha_evento: string;
  ubicacion: string;
  id_usuario: number;
  tipo: 'alta';
}

interface SolicitudBaja {
  id_eliminacion: number;
  id_evento: number;
  nombre_evento: string;
  motivo: string;
  fecha_solicitud: string;
  usuario_solicitante: string;
  tipo: 'baja';
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
  lat?: number;
  lng?: number;
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
// 2. COMPONENTE PRINCIPAL
// ============================================================================
const AdminDashboard: React.FC = () => {
  // --- Estados de Datos ---
  const [vistaActual, setVistaActual] = useState<'pendientes' | 'activos' | 'historial' | 'pagos' | 'inscriptos'>('pendientes');
  const [solicitudesAlta, setSolicitudesAlta] = useState<SolicitudAlta[]>([]);
  const [solicitudesBaja, setSolicitudesBaja] = useState<SolicitudBaja[]>([]);
  const [solicitudesEdicion, setSolicitudesEdicion] = useState<SolicitudEdicion[]>([]);
  const [eventosActivos, setEventosActivos] = useState<Evento[]>([]);
  const [historialEventos, setHistorialEventos] = useState<HistorialItem[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Estados de Filtros ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'finalizados' | 'eliminados'>('todos');

  // --- Estados UI (Modales) ---
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' | 'info' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'warning' | 'danger' | 'info';
  }>({ show: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });
  
  const [inputModal, setInputModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    value: string;
    onConfirm: (value: string) => void;
    type: 'warning' | 'danger' | 'info';
  }>({ show: false, title: '', message: '', value: '', onConfirm: () => {}, type: 'warning' });

  const [pagoModal, setPagoModal] = useState<{ show: boolean; reserva: Reserva | null }>({ show: false, reserva: null });
  
  const [detalleEdicionModal, setDetalleEdicionModal] = useState<{
    show: boolean;
    solicitud: SolicitudEdicion | null;
  }>({ show: false, solicitud: null });

  // ✅ NUEVO: Estado para modal de edición directa
  const [editModal, setEditModal] = useState<{ 
    show: boolean; 
    evento: Evento | null 
  }>({ show: false, evento: null });

  // --------------------------------------------------------------------------
  // HELPERS DE MODALES
  // --------------------------------------------------------------------------
  const showToast = (mensaje: string, tipo: 'success' | 'error' | 'info') => {
    setToast({ mensaje, tipo });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'warning' | 'danger' | 'info' = 'warning'
  ) => {
    setConfirmModal({ show: true, title, message, onConfirm, type });
  };

  const hideConfirm = () => {
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });
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

  // --------------------------------------------------------------------------
  // EFECTOS
  // --------------------------------------------------------------------------
  useEffect(() => {
    cargarDatos();
    setSearchTerm('');
  }, [vistaActual]);

  // --------------------------------------------------------------------------
  // CARGA DE DATOS
  // --------------------------------------------------------------------------
  const cargarDatos = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (vistaActual === 'pendientes') {
        const [resAlta, resBaja, resEdicion] = await Promise.all([
          axios.get('http://localhost:8000/api/v1/admin/solicitudes/pendientes', config),
          axios.get('http://localhost:8000/api/v1/admin/bajas/pendientes', config),
          axios.get('http://localhost:8000/api/v1/edicion-eventos/solicitudes-edicion-pendientes', config)
        ]);
        
        setSolicitudesAlta(Array.isArray(resAlta.data) ? resAlta.data.map((s: any) => ({ ...s, tipo: 'alta' })) : []);
        setSolicitudesBaja(Array.isArray(resBaja.data) ? resBaja.data.map((s: any) => ({ ...s, tipo: 'baja' })) : []);
        setSolicitudesEdicion(Array.isArray(resEdicion.data) ? resEdicion.data.map((s: any) => ({ ...s, tipo: 'edicion' })) : []);
      } 
      else if (vistaActual === 'activos') {
        const res = await axios.get('http://localhost:8000/api/v1/eventos/', config);
        setEventosActivos(Array.isArray(res.data) ? res.data.filter((e: Evento) => e.id_estado === 3) : []); 
      } 
      else if (vistaActual === 'historial') {
        const res = await axios.get('http://localhost:8000/api/v1/admin/historial-eliminaciones', config);
        setHistorialEventos(Array.isArray(res.data) ? res.data : []);
      } 
      else if (vistaActual === 'pagos' || vistaActual === 'inscriptos') {
        const res = await axios.get('http://localhost:8000/api/v1/inscripciones', config);
        setReservas(Array.isArray(res.data) ? res.data : []);
      }
    } catch (error) {
      console.error(error);
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecargar = () => { 
    cargarDatos(); 
    showToast('Datos actualizados', 'success'); 
  };
  
  const handlePrint = () => window.print();
  
  const handleExportCSV = (datos: any[], nombre: string) => {
    if (!datos || !datos.length) return showToast('Sin datos para exportar', 'error');
    const headers = Object.keys(datos[0]);
    const csv = [headers.join(','), ...datos.map(row => headers.map(h => `"${String(row[h]||'').replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); 
    link.href = url; 
    link.download = `${nombre}.csv`; 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
  };

  // --------------------------------------------------------------------------
  // HANDLERS - ALTAS Y BAJAS
  // --------------------------------------------------------------------------
  
  const handleAprobarAlta = (id: number) => {
    showConfirm(
      'Aprobar Solicitud',
      '¿Estás seguro de aprobar esta solicitud y publicar el evento?',
      async () => {
        try {
          await axios.patch(`http://localhost:8000/api/v1/admin/solicitudes/${id}/revisar`, 
            { id_estado_solicitud: 3 }, 
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          showToast('Solicitud aprobada correctamente', 'success');
          cargarDatos();
        } catch {
          showToast('Error al aprobar solicitud', 'error');
        }
        hideConfirm();
      },
      'info'
    );
  };

  const handleRechazarAlta = (id: number) => {
    showConfirm(
      'Rechazar Solicitud',
      '¿Estás seguro de rechazar esta solicitud?',
      async () => {
        try {
          await axios.patch(`http://localhost:8000/api/v1/admin/solicitudes/${id}/revisar`, 
            { id_estado_solicitud: 4 }, 
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          showToast('Solicitud rechazada', 'info');
          cargarDatos();
        } catch {
          showToast('Error al rechazar solicitud', 'error');
        }
        hideConfirm();
      },
      'warning'
    );
  };

  const handleAprobarBaja = (id: number) => {
    showConfirm(
      'Aprobar Eliminación',
      '¿Estás seguro de eliminar este evento?',
      async () => {
        try {
          await axios.patch(`http://localhost:8000/api/v1/admin/bajas/${id}/aprobar`, 
            {}, 
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          showToast('Evento eliminado correctamente', 'success');
          cargarDatos();
        } catch {
          showToast('Error al aprobar baja', 'error');
        }
        hideConfirm();
      },
      'danger'
    );
  };

  const handleRechazarBaja = (id: number) => {
    showConfirm(
      'Rechazar Eliminación',
      '¿Rechazar esta solicitud y mantener el evento activo?',
      async () => {
        try {
          await axios.patch(`http://localhost:8000/api/v1/admin/bajas/${id}/rechazar`, 
            {}, 
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          showToast('Solicitud rechazada. Evento continúa publicado', 'success');
          cargarDatos();
        } catch {
          showToast('Error al rechazar baja', 'error');
        }
        hideConfirm();
      },
      'info'
    );
  };

  // --------------------------------------------------------------------------
  // HANDLERS - EDICIONES
  // --------------------------------------------------------------------------
  const handleAprobarEdicion = (idEvento: number, nombreEvento: string) => {
    showConfirm(
      'Aprobar Edición',
      `¿Aprobar los cambios propuestos para "${nombreEvento}"?`,
      async () => {
        try {
          await axios.patch(
            `http://localhost:8000/api/v1/edicion-eventos/${idEvento}/aprobar-edicion`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          showToast('Cambios aprobados y aplicados al evento', 'success');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error al aprobar edición', 'error');
        }
        hideConfirm();
      },
      'info'
    );
  };

  const handleRechazarEdicion = (idEvento: number, nombreEvento: string) => {
    showConfirm(
      'Rechazar Edición',
      `¿Rechazar los cambios propuestos para "${nombreEvento}"? El evento mantendrá su versión anterior.`,
      async () => {
        try {
          await axios.patch(
            `http://localhost:8000/api/v1/eventos/${idEvento}/rechazar-edicion`,
            {},
            { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
          );
          showToast('Cambios rechazados. Evento sin modificar', 'info');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error al rechazar edición', 'error');
        }
        hideConfirm();
      },
      'warning'
    );
  };

  const handleEliminarEvento = (id: number, nombre: string) => {
    showInputModal(
      '🗑️ Cancelar Evento',
      `Estás a punto de cancelar el evento "${nombre}". Ingresa el motivo:`,
      async (motivo) => {
        try {
          const token = localStorage.getItem('token');
          await axios.post(
            `http://localhost:8000/api/v1/eliminacion/admin/eliminar/${id}`,
            { motivo },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          showToast('Evento cancelado correctamente', 'success');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error al cancelar evento', 'error');
        }
        hideInputModal();
      },
      'danger'
    );
  };

  const handleDepurarEvento = (id: number, nombre: string) => {
    showInputModal(
      '⚠️ Eliminar Evento Definitivamente',
      `Esta acción eliminará PERMANENTEMENTE el evento "${nombre}" de la base de datos. Ingresa el motivo:`,
      async (motivo) => {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(
            `http://localhost:8000/api/v1/eliminacion/admin/depurar/${id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              data: { motivo }
            }
          );
          showToast('Evento depurado definitivamente', 'success');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error al depurar evento', 'error');
        }
        hideInputModal();
      },
      'danger'
    );
  };

  const handleRestaurarEvento = (id: number, nombre: string) => {
    showConfirm(
      '♻️ Restaurar Evento',
      `¿Estás seguro de restaurar "${nombre}"? Volverá a estar publicado y activo.`,
      async () => {
        try {
          const token = localStorage.getItem('token');
          await axios.patch(
            `http://localhost:8000/api/v1/eliminacion/admin/restaurar/${id}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          showToast('Evento restaurado y publicado', 'success');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error al restaurar evento', 'error');
        }
        hideConfirm();
      },
      'info'
    );
  };

  const handleConfirmarPago = async () => {
    if (!pagoModal.reserva) return;
    try {
      await axios.post(
        `http://localhost:8000/api/v1/inscripciones/confirmar-pago/${pagoModal.reserva.id_reserva}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      showToast('Pago confirmado correctamente', 'success');
      setPagoModal({ show: false, reserva: null });
      cargarDatos();
    } catch {
      showToast('Error al confirmar pago', 'error');
    }
  };

  // --------------------------------------------------------------------------
  // FILTROS
  // --------------------------------------------------------------------------
  const normalize = (s: string) => s ? s.toLowerCase().trim() : '';

  const filtrarHistorial = () => {
    let res = historialEventos;
    
    if (filterType === 'finalizados') {
      res = res.filter(h => {
        const estado = normalize(h.estado);
        return estado === 'finalizado' && !estado.includes('depurado');
      });
    }
    
    if (filterType === 'eliminados') {
      res = res.filter(h => {
        const estado = normalize(h.estado);
        return estado.includes('cancelado') || estado.includes('depurado');
      });
    }
    
    if (searchTerm) {
      res = res.filter(h => h.nombre_evento.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    
    return res;
  };

  const filtrarGenerico = (lista: any[], campo: string) => {
    if (!searchTerm) return lista;
    return lista.filter(item => String(item[campo]).toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const esRestaurable = (estado: string) => {
    const s = normalize(estado);
    return s.includes('cancelado') && s.includes('soft delete');
  };

  const esDepurable = (estado: string) => {
    const s = normalize(estado);
    return !s.includes('depurado') && !s.includes('hard delete');
  };

  const getBadgeClass = (estado: string) => {
    const s = normalize(estado);
    if (s.includes('depurado') || s.includes('hard delete')) return 'badge-estado-depurado';
    if (s.includes('cancelado') || s.includes('soft delete')) return 'badge-estado-eliminado';
    if (['finalizado', 'confirmada'].includes(s)) return 'badge-estado-finalizado';
    return 'badge-estado-default';
  };

  // --------------------------------------------------------------------------
  // HELPERS PARA EDICIONES
  // --------------------------------------------------------------------------
  const formatearCampo = (campo: string): string => {
    const mapeo: Record<string, string> = {
      nombre_evento: 'Nombre',
      fecha_evento: 'Fecha',
      ubicacion: 'Ubicación',
      descripcion: 'Descripción',
      costo_participacion: 'Costo',
      id_tipo: 'Tipo',
      id_dificultad: 'Dificultad',
      cupo_maximo: 'Cupo',
    };
    return mapeo[campo] || campo;
  };

  const obtenerResumenCambios = (cambios: Record<string, any>): string => {
    const cantidad = Object.keys(cambios).length;
    const campos = Object.keys(cambios).slice(0, 2).map(formatearCampo).join(', ');
    return cantidad > 2 ? `${campos} y ${cantidad - 2} más` : campos;
  };

  const formatearFecha = (fecha: string): string => {
    try {
      return new Date(fecha).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className='contenttotal'>
      <Navbar />
      <div style={{ display: 'flex', flex: 1 }}>
        
        {/* SIDEBAR */}
        <aside className="admin-sidebar">
          <h2 className="admin-title">Panel Admin</h2>
          <nav className="admin-nav">
            <button className={vistaActual === 'pendientes' ? 'active' : ''} onClick={() => setVistaActual('pendientes')}>📋 Pendientes</button>
            <button className={vistaActual === 'activos' ? 'active' : ''} onClick={() => setVistaActual('activos')}>✅ Activos</button>
            <button className={vistaActual === 'historial' ? 'active' : ''} onClick={() => setVistaActual('historial')}>📖 Historial</button>
            <button className={vistaActual === 'pagos' ? 'active' : ''} onClick={() => setVistaActual('pagos')}>💳 Pagos</button>
            <button className={vistaActual === 'inscriptos' ? 'active' : ''} onClick={() => setVistaActual('inscriptos')}>👥 Inscriptos</button>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="admin-main-content">
          {loading && <div style={{ textAlign: 'center', padding: '10px', color: '#777' }}>Cargando datos...</div>}

          {/* VISTA PENDIENTES */}
          {vistaActual === 'pendientes' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>📋 Solicitudes Pendientes</h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input type="text" className="search-input-admin" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV([...solicitudesAlta, ...solicitudesBaja, ...solicitudesEdicion], 'Pendientes')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️</button>
                  </div>
                </div>
              </div>
              
              {/* SECCIÓN ALTAS */}
              <div className="seccion-solicitudes">
                <h3>📝 Altas</h3>
                <table className="data-table-admin">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Evento</th>
                      <th style={{ textAlign: 'left' }}>Usuario</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrarGenerico(solicitudesAlta, 'nombre_evento').map(s => (
                      <tr key={s.id_solicitud}>
                        <td style={{ textAlign: 'left' }}>{s.nombre_evento}</td>
                        <td style={{ textAlign: 'left' }}>{s.id_usuario}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn-aprobar-admin" onClick={() => handleAprobarAlta(s.id_solicitud)}>✓</button>
                          <button className="btn-rechazar-admin" onClick={() => handleRechazarAlta(s.id_solicitud)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* SECCIÓN EDICIONES */}
              <div className="seccion-solicitudes" style={{ marginTop: '20px' }}>
                <h3 style={{ color: '#4a9eff' }}>✏️ Ediciones</h3>
                <table className="data-table-admin">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', width: '30%' }}>Evento</th>
                      <th style={{ textAlign: 'left', width: '25%' }}>Cambios</th>
                      <th style={{ textAlign: 'left', width: '15%' }}>Usuario</th>
                      <th style={{ textAlign: 'left', width: '15%' }}>Fecha Solicitud</th>
                      <th style={{ textAlign: 'center', width: '15%' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrarGenerico(solicitudesEdicion, 'nombre_evento').length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                          No hay solicitudes de edición pendientes
                        </td>
                      </tr>
                    ) : (
                      filtrarGenerico(solicitudesEdicion, 'nombre_evento').map(s => (
                        <tr 
                          key={s.id_solicitud_edicion}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setDetalleEdicionModal({ show: true, solicitud: s })}
                          title="Click para ver detalles"
                        >
                          <td style={{ textAlign: 'left' }}>
                            <strong>{s.nombre_evento}</strong>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <small style={{ color: '#a8a8a8' }}>
                              {obtenerResumenCambios(s.cambios_propuestos || {})}
                            </small>
                            <br />
                            <span style={{ 
                              fontSize: '0.75rem', 
                              color: '#ccff00',
                              fontWeight: 'bold'
                            }}>
                              {Object.keys(s.cambios_propuestos || {}).length} cambio{Object.keys(s.cambios_propuestos || {}).length !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <small>{s.usuario_solicitante}</small>
                          </td>
                          <td style={{ textAlign: 'left' }}>
                            <small style={{ color: '#888' }}>
                              {formatearFecha(s.fecha_solicitud)}
                            </small>
                          </td>
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              className="btn-ver-detalle-admin" 
                              onClick={() => setDetalleEdicionModal({ show: true, solicitud: s })}
                              title="Ver detalles"
                              style={{ marginRight: '8px' }}
                            >
                              👁️
                            </button>
                            <button 
                              className="btn-aprobar-admin" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAprobarEdicion(s.id_evento, s.nombre_evento);
                              }}
                              title="Aprobar cambios"
                            >
                              ✓
                            </button>
                            <button 
                              className="btn-rechazar-admin" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRechazarEdicion(s.id_evento, s.nombre_evento);
                              }}
                              title="Rechazar cambios"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* SECCIÓN BAJAS */}
              <div className="seccion-solicitudes" style={{ marginTop: '20px' }}>
                <h3 style={{ color: '#fc8181' }}>🗑️ Bajas</h3>
                <table className="data-table-admin">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Evento</th>
                      <th style={{ textAlign: 'left' }}>Motivo</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrarGenerico(solicitudesBaja, 'nombre_evento').map(s => (
                      <tr key={s.id_eliminacion}>
                        <td style={{ textAlign: 'left' }}>{s.nombre_evento}</td>
                        <td style={{ textAlign: 'left' }}>{s.motivo}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn-aprobar-admin" onClick={() => handleAprobarBaja(s.id_evento)}>✓</button>
                          <button className="btn-rechazar-admin" onClick={() => handleRechazarBaja(s.id_evento)}>✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ✅ VISTA ACTIVOS - CON BOTÓN DE EDITAR */}
          {vistaActual === 'activos' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>✅ Eventos Activos ({eventosActivos.length})</h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input type="text" className="search-input-admin" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV(eventosActivos, 'Activos')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️</button>
                  </div>
                </div>
              </div>
              <table className="data-table-admin">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>ID</th>
                    <th style={{ textAlign: 'left' }}>Evento</th>
                    <th style={{ textAlign: 'left' }}>Fecha</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrarGenerico(eventosActivos, 'nombre_evento').map(e => (
                    <tr key={e.id_evento}>
                      <td style={{ textAlign: 'left' }}>{e.id_evento}</td>
                      <td style={{ textAlign: 'left' }}>{e.nombre_evento}</td>
                      <td style={{ textAlign: 'left' }}>{e.fecha_evento}</td>
                      <td style={{ textAlign: 'center' }}>
                        {/* ✅ BOTÓN DE EDITAR */}
                        <button 
                          className="btn-editar-admin" 
                          onClick={() => setEditModal({ show: true, evento: e })}
                          title="Editar evento"
                          style={{ marginRight: '8px' }}
                        >
                          ✏️ Editar
                        </button>
                        <button 
                          className="btn-rechazar-admin" 
                          onClick={() => handleEliminarEvento(e.id_evento, e.nombre_evento)}
                        >
                          🗑️ Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VISTA HISTORIAL */}
          {vistaActual === 'historial' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>📖 Historial ({filtrarHistorial().length})</h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input type="text" className="search-input-admin" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="filter-buttons-admin">
                    <button onClick={() => setFilterType('todos')}>Todos</button>
                    <button onClick={() => setFilterType('finalizados')}>Final.</button>
                    <button onClick={() => setFilterType('eliminados')}>Elim.</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV(filtrarHistorial(), 'Historial')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️</button>
                  </div>
                </div>
              </div>
              <table className="data-table-admin">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Evento</th>
                    <th style={{ textAlign: 'left' }}>Motivo</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrarHistorial().map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'left' }}>
                        <strong>{item.nombre_evento}</strong>
                        <br />
                        <small>{item.fecha_eliminacion}</small>
                      </td>
                      <td style={{ textAlign: 'left' }}>{item.motivo}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge-estado-small ${getBadgeClass(item.estado)}`}>
                          {item.estado}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-buttons-inline">
                          {esRestaurable(item.estado) && (
                            <button className="btn-restaurar-admin" title="Restaurar" onClick={() => handleRestaurarEvento(item.id_evento, item.nombre_evento)}>
                              ♻️
                            </button>
                          )}
                          {esDepurable(item.estado) && (
                            <button className="btn-depurar-admin" title="Eliminar Definitivamente" onClick={() => handleDepurarEvento(item.id_evento, item.nombre_evento)}>
                              🧹
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VISTA PAGOS */}
          {vistaActual === 'pagos' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>💳 Pagos Pendientes</h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input type="text" className="search-input-admin" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar}>🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV(reservas, 'Pagos')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️</button>
                  </div>
                </div>
              </div>
              <table className="data-table-admin">
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Usuario</th>
                    <th style={{ textAlign: 'left' }}>Evento</th>
                    <th style={{ textAlign: 'left' }}>Monto</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrarGenerico(reservas.filter(r => r.estado_reserva === 'Pendiente'), 'usuario_email').map(r => (
                    <tr key={r.id_reserva}>
                      <td style={{ textAlign: 'left' }}>{r.usuario_email}</td>
                      <td style={{ textAlign: 'left' }}>{r.nombre_evento}</td>
                      <td style={{ textAlign: 'left' }}>${r.monto}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btn-confirmar-pago-admin" onClick={() => setPagoModal({ show: true, reserva: r })}>
                          Confirmar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* VISTA INSCRIPTOS */}
          {vistaActual === 'inscriptos' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>👥 Inscriptos</h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input type="text" className="search-input-admin" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
                    <th style={{ textAlign: 'left' }}>Usuario</th>
                    <th style={{ textAlign: 'left' }}>Evento</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrarGenerico(reservas.filter(r => r.estado_reserva === 'Confirmada'), 'usuario_nombre').map(r => (
                    <tr key={r.id_reserva}>
                      <td style={{ textAlign: 'left' }}>{r.usuario_nombre}</td>
                      <td style={{ textAlign: 'left' }}>{r.nombre_evento}</td>
                      <td style={{ textAlign: 'center' }}>{r.estado_reserva}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
        onConfirm={() => {
          inputModal.onConfirm(inputModal.value);
          hideInputModal();
        }}
        onCancel={hideInputModal}
        type={inputModal.type}
      />

      {/* MODAL DE DETALLE DE EDICIÓN */}
      <DetalleEdicionModal
        show={detalleEdicionModal.show}
        solicitud={detalleEdicionModal.solicitud}
        onClose={() => setDetalleEdicionModal({ show: false, solicitud: null })}
        onAprobar={handleAprobarEdicion}
        onRechazar={handleRechazarEdicion}
      />

      {/* ✅ MODAL DE EDICIÓN DIRECTA */}
      <EditEventModal
        show={editModal.show}
        evento={editModal.evento}
        onClose={() => setEditModal({ show: false, evento: null })}
        onSuccess={() => {
          showToast('Evento actualizado correctamente', 'success');
          cargarDatos();
        }}
      />

      {/* MODAL PAGO */}
      {pagoModal.show && pagoModal.reserva && (
        <div className="modal-pago-overlay" onClick={() => setPagoModal({ show: false, reserva: null })}>
          <div className="modal-pago-content" onClick={e => e.stopPropagation()}>
            <div className="modal-pago-header"><h2>Confirmar Pago</h2></div>
            <div className="modal-pago-detalles">
              <p>Evento: {pagoModal.reserva.nombre_evento}</p>
              <p>Monto: <b>${pagoModal.reserva.monto}</b></p>
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