import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/admin-dashboard.css';
import logoWakeUp from '../assets/wakeup-logo.png';

// ============================================================================
// TIPOS
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

interface Evento {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  ubicacion: string;
  id_estado: number;
  id_usuario: number;
  descripcion?: string;
  costo_participacion?: number;
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
  tipo_evento: string;
  nivel_dificultad: string;
  fecha_inscripcion: string;
  estado_reserva: string;
  monto: number;
}

type Vista = 'pendientes' | 'activos' | 'historial' | 'pagos' | 'inscriptos';
type FilterType = 'todos' | 'finalizados' | 'eliminados';

// ============================================================================
// FUNCIÓN DE NORMALIZACIÓN (Como en inicio)
// ============================================================================
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
const AdminDashboard: React.FC = () => {
  // Estados
  const [vistaActual, setVistaActual] = useState<Vista>('pendientes');
  const [solicitudesAlta, setSolicitudesAlta] = useState<SolicitudAlta[]>([]);
  const [solicitudesBaja, setSolicitudesBaja] = useState<SolicitudBaja[]>([]);
  const [eventosActivos, setEventosActivos] = useState<Evento[]>([]);
  const [historialEventos, setHistorialEventos] = useState<HistorialItem[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  
  // Búsqueda única y estado de filtrado
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('todos');
  
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Modal de pago
  const [pagoModal, setPagoModal] = useState<{
    show: boolean;
    reserva: Reserva | null;
  }>({ show: false, reserva: null });

  // ============================================================================
  // EFECTOS
  // ============================================================================
  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaActual]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ============================================================================
  // CARGA DE DATOS
  // ============================================================================
  const cargarDatos = async () => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (vistaActual === 'pendientes') {
        const resAlta = await axios.get('http://localhost:8000/api/v1/admin/solicitudes/pendientes', config);
        setSolicitudesAlta(resAlta.data.map((s: any) => ({ ...s, tipo: 'alta' })));
        
        const resBaja = await axios.get('http://localhost:8000/api/v1/admin/bajas/pendientes', config);
        setSolicitudesBaja(resBaja.data.map((s: any) => ({ ...s, tipo: 'baja' })));
      } else if (vistaActual === 'activos') {
        const res = await axios.get('http://localhost:8000/api/v1/eventos/', config);
        setEventosActivos(res.data.filter((e: Evento) => e.id_estado === 3));
      } else if (vistaActual === 'historial') {
        const res = await axios.get('http://localhost:8000/api/v1/admin/historial-eliminaciones', config);
        setHistorialEventos(res.data);
      } else if (vistaActual === 'pagos' || vistaActual === 'inscriptos') {
        const res = await axios.get('http://localhost:8000/api/v1/inscripciones', config);
        setReservas(res.data);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      mostrarToast('Error al cargar los datos', 'error');
    }
  };

  // ============================================================================
  // HANDLERS DE ACCIONES
  // ============================================================================
  const handleAprobarAlta = async (idSolicitud: number) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(
        `http://localhost:8000/api/v1/admin/solicitudes/${idSolicitud}/revisar`,
        { id_estado_solicitud: 3 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      mostrarToast('✅ Solicitud aprobada y evento publicado', 'success');
      cargarDatos();
    } catch (error) {
      mostrarToast('❌ Error al aprobar la solicitud', 'error');
    }
  };

  const handleRechazarAlta = async (idSolicitud: number) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(
        `http://localhost:8000/api/v1/admin/solicitudes/${idSolicitud}/revisar`,
        { id_estado_solicitud: 4 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      mostrarToast('❌ Solicitud rechazada', 'success');
      cargarDatos();
    } catch (error) {
      mostrarToast('❌ Error al rechazar', 'error');
    }
  };

  const handleAprobarBaja = async (idEvento: number) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(
        `http://localhost:8000/api/v1/admin/bajas/${idEvento}/aprobar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      mostrarToast('✅ Solicitud de baja aprobada', 'success');
      cargarDatos();
    } catch (error) {
      mostrarToast('❌ Error al aprobar la baja', 'error');
    }
  };

  const handleRechazarBaja = async (idEvento: number) => {
    const token = localStorage.getItem('token');
    try {
      await axios.patch(
        `http://localhost:8000/api/v1/admin/bajas/${idEvento}/rechazar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      mostrarToast('❌ Solicitud de baja rechazada', 'success');
      cargarDatos();
    } catch (error) {
      mostrarToast('❌ Error al rechazar la baja', 'error');
    }
  };

  const handleDepurarFinalizado = async (idEvento: number) => {
    setConfirmModal({
      show: true,
      title: '⚠️ Confirmar Depuración',
      message: '¿Estás seguro de depurar este evento finalizado?',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        try {
          await axios.delete(
            `http://localhost:8000/api/v1/admin/eventos/${idEvento}/depurar?motivo=Depuración`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          mostrarToast('🗑️ Evento depurado', 'success');
          cargarDatos();
        } catch (error) {
          mostrarToast('❌ Error al depurar', 'error');
        }
        setConfirmModal(null);
      }
    });
  };

  const handleRestaurarCancelado = async (idEvento: number) => {
    setConfirmModal({
      show: true,
      title: '🔄 Confirmar Restauración',
      message: '¿Deseas restaurar este evento?',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        try {
          await axios.patch(
            `http://localhost:8000/api/v1/eliminacion/admin/restaurar/${idEvento}`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
          );
          mostrarToast('♻️ Evento restaurado', 'success');
          cargarDatos();
        } catch (error) {
          mostrarToast('❌ Error al restaurar', 'error');
        }
        setConfirmModal(null);
      }
    });
  };

  const handleDepurarEliminado = async (idEvento: number) => {
    setConfirmModal({
      show: true,
      title: '🗑️ Confirmar Depuración',
      message: '¿Estás seguro de depurar este evento?',
      onConfirm: async () => {
        const token = localStorage.getItem('token');
        try {
          await axios.delete(
            `http://localhost:8000/api/v1/admin/eventos/${idEvento}/depurar?motivo=Depuración permanente`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          mostrarToast('🗑️ Evento depurado', 'success');
          cargarDatos();
        } catch (error) {
          mostrarToast('❌ Error al depurar', 'error');
        }
        setConfirmModal(null);
      }
    });
  };

  const abrirModalPago = (reserva: Reserva) => {
    setPagoModal({ show: true, reserva });
  };

  const handleConfirmarPago = async () => {
    if (!pagoModal.reserva) return;

    const token = localStorage.getItem('token');
    try {
      await axios.post(
        `http://localhost:8000/api/v1/inscripciones/confirmar-pago/${pagoModal.reserva.id_reserva}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPagoModal({ show: false, reserva: null });
      mostrarToast('💰 Pago confirmado', 'success');
      cargarDatos();
    } catch (error) {
      mostrarToast('❌ Error al confirmar', 'error');
      setPagoModal({ show: false, reserva: null });
    }
  };

  // ============================================================================
  // UTILIDADES
  // ============================================================================
  const mostrarToast = (mensaje: string, tipo: 'success' | 'error') => {
    setToast({ mensaje, tipo });
  };

  const exportarCSV = (datos: any[], nombre: string) => {
    if (datos.length === 0) {
      mostrarToast('No hay datos para exportar', 'error');
      return;
    }
    const headers = Object.keys(datos[0]);
    const csvContent = [
      headers.join(','),
      ...datos.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // ============================================================================
  // FILTRADO CON BÚSQUEDA NORMALIZADA
  // ============================================================================
  const filtrarDatos = <T extends { nombre_evento?: string; motivo?: string; ubicacion?: string; usuario_nombre?: string; usuario_email?: string }>(
    datos: T[]
  ): T[] => {
    if (!searchQuery.trim()) return datos;
    
    const queryNormalizada = normalizeText(searchQuery);
    
    return datos.filter(item => {
      const campos = [
        item.nombre_evento,
        item.motivo,
        item.ubicacion,
        item.usuario_nombre,
        item.usuario_email
      ].filter(Boolean);
      
      return campos.some(campo => 
        normalizeText(campo || '').includes(queryNormalizada)
      );
    });
  };

  const filtrarHistorial = (): HistorialItem[] => {
    let filtrado = historialEventos;
    
    if (filterType === 'finalizados') {
      filtrado = historialEventos.filter(h => h.estado.includes('Finalizado'));
    } else if (filterType === 'eliminados') {
      filtrado = historialEventos.filter(h => h.estado.includes('Cancelado') || h.estado.includes('Depurado'));
    }
    
    return filtrarDatos(filtrado);
  };

  // ============================================================================
  // COMPONENTES
  // ============================================================================
  const ToastNotification = () => {
    if (!toast) return null;
    return (
      <div className={`toast-notification toast-${toast.tipo}`}>
        <span>{toast.mensaje}</span>
        <button onClick={() => setToast(null)}>✕</button>
      </div>
    );
  };

  const ConfirmModal = () => {
    if (!confirmModal?.show) return null;
    return (
      <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <h3>{confirmModal.title}</h3>
          <p>{confirmModal.message}</p>
          <div className="modal-actions">
            <button className="btn-cancelar" onClick={() => setConfirmModal(null)}>
              Cancelar
            </button>
            <button className="btn-confirmar" onClick={confirmModal.onConfirm}>
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ModalConfirmarPago = () => {
    if (!pagoModal.show || !pagoModal.reserva) return null;
    const { reserva } = pagoModal;

    return (
      <div className="modal-overlay" onClick={() => setPagoModal({ show: false, reserva: null })}>
        <div className="modal-pago" onClick={e => e.stopPropagation()}>
          <div className="modal-pago-header">
            <div className="modal-pago-icon">💵</div>
            <h2>CONFIRMAR PAGO RECIBIDO</h2>
          </div>
          <div className="modal-pago-body">
            <div className="detalle-row">
              <span>RESERVA ID:</span>
              <span>#{reserva.id_reserva}</span>
            </div>
            <div className="detalle-row">
              <span>USUARIO:</span>
              <span>{reserva.usuario_email}</span>
            </div>
            <div className="detalle-row">
              <span>EVENTO:</span>
              <span>{reserva.nombre_evento}</span>
            </div>
            <div className="detalle-row detalle-monto">
              <span>MONTO:</span>
              <span>${reserva.monto}</span>
            </div>
          </div>
          <div className="modal-pago-warning">
            <span>⚠️</span>
            <p>Esta acción marcará el pago como confirmado</p>
          </div>
          <div className="modal-pago-actions">
            <button className="btn-cancelar" onClick={() => setPagoModal({ show: false, reserva: null })}>
              CANCELAR
            </button>
            <button className="btn-confirmar-pago" onClick={handleConfirmarPago}>
              ✅ CONFIRMAR
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // VISTAS
  // ============================================================================
  const PendientesView = () => {
    const altasFiltradas = filtrarDatos(solicitudesAlta);
    const bajasFiltradas = filtrarDatos(solicitudesBaja);

    return (
      <>
        <div className="section-header">
          <h2>📋 Solicitudes Pendientes</h2>
          <div className="toolbar">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button className="btn-export" onClick={() => exportarCSV([...altasFiltradas, ...bajasFiltradas], 'pendientes')}>
              📂 Exportar
            </button>
          </div>
        </div>

        <div className="seccion-solicitudes">
          <h3 className="titulo-seccion">📝 Solicitudes de Publicación ({altasFiltradas.length})</h3>
          <div className="tabla-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Evento</th>
                  <th>Fecha</th>
                  <th>Ubicación</th>
                  <th>Usuario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {altasFiltradas.length > 0 ? (
                  altasFiltradas.map(s => (
                    <tr key={s.id_solicitud}>
                      <td>{s.id_solicitud}</td>
                      <td>{s.nombre_evento}</td>
                      <td>{s.fecha_evento}</td>
                      <td>{s.ubicacion}</td>
                      <td>ID: {s.id_usuario}</td>
                      <td>
                        <div className="actions-inline">
                          <button className="btn-aprobar" onClick={() => handleAprobarAlta(s.id_solicitud)}>
                            ✅ Aprobar
                          </button>
                          <button className="btn-rechazar" onClick={() => handleRechazarAlta(s.id_solicitud)}>
                            ❌ Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="empty-row">Sin solicitudes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="seccion-solicitudes">
          <h3 className="titulo-seccion">🗑️ Solicitudes de Eliminación ({bajasFiltradas.length})</h3>
          <div className="tabla-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Evento</th>
                  <th>Motivo</th>
                  <th>Fecha</th>
                  <th>Solicitante</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {bajasFiltradas.length > 0 ? (
                  bajasFiltradas.map(s => (
                    <tr key={s.id_eliminacion}>
                      <td>{s.id_evento}</td>
                      <td>{s.nombre_evento}</td>
                      <td>{s.motivo}</td>
                      <td>{s.fecha_solicitud}</td>
                      <td>{s.usuario_solicitante}</td>
                      <td>
                        <div className="actions-inline">
                          <button className="btn-aprobar" onClick={() => handleAprobarBaja(s.id_evento)}>
                            ✅ Aprobar
                          </button>
                          <button className="btn-rechazar" onClick={() => handleRechazarBaja(s.id_evento)}>
                            ❌ Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="empty-row">Sin solicitudes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const ActivosView = () => {
    const filtrados = filtrarDatos(eventosActivos);
    return (
      <>
        <div className="section-header">
          <h2>✅ Eventos Activos</h2>
          <div className="toolbar">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button className="btn-export" onClick={() => exportarCSV(filtrados, 'activos')}>
              📂 Exportar
            </button>
          </div>
        </div>
        <div className="tabla-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Evento</th>
                <th>Fecha</th>
                <th>Ubicación</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(e => (
                <tr key={e.id_evento}>
                  <td>{e.id_evento}</td>
                  <td>{e.nombre_evento}</td>
                  <td>{e.fecha_evento}</td>
                  <td>{e.ubicacion}</td>
                  <td><span className="badge badge-success">✅ Publicado</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const HistorialView = () => {
    const filtrados = filtrarHistorial();
    return (
      <>
        <div className="section-header">
          <h2>📖 Historial de Eventos</h2>
          <div className="toolbar">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="filter-buttons">
              <button className={`filter-btn ${filterType === 'todos' ? 'active' : ''}`} onClick={() => setFilterType('todos')}>
                TODOS
              </button>
              <button className={`filter-btn ${filterType === 'finalizados' ? 'active' : ''}`} onClick={() => setFilterType('finalizados')}>
                FINALIZADOS
              </button>
              <button className={`filter-btn ${filterType === 'eliminados' ? 'active' : ''}`} onClick={() => setFilterType('eliminados')}>
                ELIMINADOS
              </button>
            </div>
            <button className="btn-export" onClick={() => exportarCSV(filtrados, 'historial')}>
              📂 Exportar
            </button>
          </div>
        </div>
        <div className="tabla-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Evento</th>
                <th>Fecha</th>
                <th>Motivo</th>
                <th>Por</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(item => {
                const esFinalizado = item.estado.includes('Finalizado');
                const esCancelado = item.estado.includes('Cancelado') && !item.estado.includes('Depurado');
                const esDepurado = item.estado.includes('Depurado');

                return (
                  <tr key={item.id_evento}>
                    <td>{item.id_evento}</td>
                    <td>{item.nombre_evento}</td>
                    <td>{item.fecha_eliminacion}</td>
                    <td>{item.motivo}</td>
                    <td>{item.eliminado_por}</td>
                    <td>
                      {esFinalizado && <span className="badge badge-finalizado">🏁 Finalizado</span>}
                      {esCancelado && <span className="badge badge-cancelado">🗑️ Cancelado</span>}
                      {esDepurado && <span className="badge badge-depurado">💀 Depurado</span>}
                    </td>
                    <td>
                      {esFinalizado && (
                        <button className="btn-depurar" onClick={() => handleDepurarFinalizado(item.id_evento)}>
                          🗑️ Depurar
                        </button>
                      )}
                      {esCancelado && (
                        <div className="actions-inline">
                          <button className="btn-restaurar" onClick={() => handleRestaurarCancelado(item.id_evento)}>
                            ♻️ Restaurar
                          </button>
                          <button className="btn-depurar" onClick={() => handleDepurarEliminado(item.id_evento)}>
                            🗑️ Depurar
                          </button>
                        </div>
                      )}
                      {esDepurado && <span className="text-muted">Sin acciones</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const PagosView = () => {
    const pendientes = reservas.filter(r => r.estado_reserva === 'Pendiente');
    const filtrados = filtrarDatos(pendientes);
    
    return (
      <>
        <div className="section-header">
          <h2>💳 Gestión de Pagos</h2>
          <div className="toolbar">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button className="btn-export" onClick={() => exportarCSV(filtrados, 'pagos')}>
              📂 Exportar
            </button>
          </div>
        </div>
        <div className="tabla-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Email</th>
                <th>Evento</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(r => (
                <tr key={r.id_reserva}>
                  <td>{r.id_reserva}</td>
                  <td>{r.usuario_nombre}</td>
                  <td>{r.usuario_email}</td>
                  <td>{r.nombre_evento}</td>
                  <td>${r.monto}</td>
                  <td><span className="badge badge-warning">⏳ Pendiente</span></td>
                  <td>
                    <button className="btn-confirmar-pago" onClick={() => abrirModalPago(r)}>
                      ✅ Confirmar Pago
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const InscriptosView = () => {
    const confirmadas = reservas.filter(r => r.estado_reserva === 'Confirmada');
    const filtrados = filtrarDatos(confirmadas);
    
    return (
      <>
        <div className="section-header">
          <h2>👥 Inscriptos</h2>
          <div className="toolbar">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button className="btn-export" onClick={() => exportarCSV(filtrados, 'inscriptos')}>
              📂 Exportar
            </button>
          </div>
        </div>
        <div className="tabla-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Email</th>
                <th>Evento</th>
                <th>Fecha Inscripción</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(r => (
                <tr key={r.id_reserva}>
                  <td>{r.id_reserva}</td>
                  <td>{r.usuario_nombre}</td>
                  <td>{r.usuario_email}</td>
                  <td>{r.nombre_evento}</td>
                  <td>{r.fecha_inscripcion}</td>
                  <td>${r.monto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="admin-container">
      <ToastNotification />
      <ConfirmModal />
      <ModalConfirmarPago />

      {/* Navbar */}
      <nav className="admin-navbar">
        <Link to="/" className="navbar-logo">
          <img src={logoWakeUp} alt="Wake Up Bikes" />
        </Link>
        <Link to="/" className="btn-volver">Volver al Inicio</Link>
      </nav>

      <div className="admin-layout">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <h2 className="sidebar-title">Panel Admin</h2>
          <button
            className={`sidebar-btn ${vistaActual === 'pendientes' ? 'active' : ''}`}
            onClick={() => { setVistaActual('pendientes'); setSearchQuery(''); }}
          >
            <span className="icon">📋</span>
            <span>Pendientes</span>
          </button>
          <button
            className={`sidebar-btn ${vistaActual === 'activos' ? 'active' : ''}`}
            onClick={() => { setVistaActual('activos'); setSearchQuery(''); }}
          >
            <span className="icon">✅</span>
            <span>Eventos Activos</span>
          </button>
          <button
            className={`sidebar-btn ${vistaActual === 'historial' ? 'active' : ''}`}
            onClick={() => { setVistaActual('historial'); setSearchQuery(''); setFilterType('todos'); }}
          >
            <span className="icon">📖</span>
            <span>Historial</span>
          </button>
          <button
            className={`sidebar-btn ${vistaActual === 'pagos' ? 'active' : ''}`}
            onClick={() => { setVistaActual('pagos'); setSearchQuery(''); }}
          >
            <span className="icon">💳</span>
            <span>Gestión Pagos</span>
          </button>
          <button
            className={`sidebar-btn ${vistaActual === 'inscriptos' ? 'active' : ''}`}
            onClick={() => { setVistaActual('inscriptos'); setSearchQuery(''); }}
          >
            <span className="icon">👥</span>
            <span>Inscriptos</span>
          </button>
        </aside>

        {/* Main */}
        <main className="admin-main">
          {vistaActual === 'pendientes' && <PendientesView />}
          {vistaActual === 'activos' && <ActivosView />}
          {vistaActual === 'historial' && <HistorialView />}
          {vistaActual === 'pagos' && <PagosView />}
          {vistaActual === 'inscriptos' && <InscriptosView />}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;