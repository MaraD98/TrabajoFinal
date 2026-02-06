import { useState, useEffect } from "react";
import { AdminService } from '../services/admin-service';
import type { 
  SolicitudAlta, 
  SolicitudBaja, 
  EventoActivo, 
  EventoEliminado,
  EventoFinalizado 
} from "../types/admin-types";
import { adminEliminarEvento } from '../services/eventos';
import '../styles/admin-dashboard.css';

// ========== COMPONENTE DE TOAST ==========
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const colors = { success: '#00cc66', error: '#ff4444', info: '#4da6ff' };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#0a0a0a',
      border: `2px solid ${colors[type]}`,
      borderRadius: '8px',
      padding: '16px 20px',
      minWidth: '300px',
      maxWidth: '500px',
      boxShadow: `0 10px 30px rgba(0, 0, 0, 0.8)`,
      zIndex: 10000,
      animation: 'slideInRight 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontFamily: 'Montserrat, sans-serif'
    }}>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <span style={{ fontSize: '1.5rem' }}>{icons[type]}</span>
      <span style={{ color: '#fff', flex: 1, fontSize: '0.95rem', fontWeight: '500' }}>{message}</span>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px' }}>✕</button>
    </div>
  );
};

// ========== MODAL DE CONFIRMACIÓN PERSONALIZADO ==========
interface ConfirmModalProps {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  show, 
  title, 
  message, 
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm, 
  onCancel,
  type = 'warning'
}) => {
  if (!show) return null;

  const typeColors = {
    warning: '#ff8533',
    danger: '#ff4444',
    info: '#4da6ff'
  };

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal-header" style={{ borderColor: typeColors[type] }}>
          <div className="confirm-modal-icon" style={{ color: typeColors[type] }}>
            {type === 'warning' && '⚠️'}
            {type === 'danger' && '🗑️'}
            {type === 'info' && 'ℹ️'}
          </div>
          <h3 style={{ color: typeColors[type] }}>{title}</h3>
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-footer">
          <button className="btn-confirm-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className="btn-confirm-action" 
            onClick={onConfirm}
            style={{ 
              background: typeColors[type]
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState('pendientes');
  const [solicitudesAlta, setSolicitudesAlta] = useState<SolicitudAlta[]>([]);
  const [solicitudesBaja, setSolicitudesBaja] = useState<SolicitudBaja[]>([]);
  const [eventosActivos, setEventosActivos] = useState<EventoActivo[]>([]);
  const [eventosFinalizados, setEventosFinalizados] = useState<EventoFinalizado[]>([]);
  const [eventosCancelados, setEventosCancelados] = useState<EventoEliminado[]>([]);
  const [eventosDepurados, setEventosDepurados] = useState<EventoEliminado[]>([]);
  const [loading, setLoading] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Modal de motivo
  const [motivoModal, setMotivoModal] = useState<{
    show: boolean;
    tipo: 'rechazar-alta' | 'eliminar-evento' | 'depurar-finalizado' | 'eliminar-definitivo' | null;
    id: number;
  }>({ show: false, tipo: null, id: 0 });
  const [motivoTexto, setMotivoTexto] = useState('');

  // ✅ NUEVO: Modal de confirmación
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'warning' | 'danger' | 'info';
  }>({ show: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  useEffect(() => {
    cargarDatos();
  }, [activeView]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'warning' | 'danger' | 'info' = 'warning') => {
    setConfirmModal({ show: true, title, message, onConfirm, type });
  };

  const hideConfirm = () => {
    setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {}, type: 'warning' });
  };

  const cargarDatos = async () => {
    setLoading(true);
    try {
      if (activeView === 'pendientes') {
        await Promise.all([cargarSolicitudesAlta(), cargarSolicitudesBaja()]);
      } else if (activeView === 'activos') {
        await cargarEventosActivos();
      } else if (activeView === 'finalizados') {
        await cargarEventosFinalizados();
      } else if (activeView === 'historial') {
        await cargarHistorial();
      }
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      showToast(error.message || 'Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cargarSolicitudesAlta = async () => {
    try {
      const data = await AdminService.obtenerSolicitudesPendientes();
      setSolicitudesAlta(data);
    } catch (error: any) {
      console.error('Error:', error);
      setSolicitudesAlta([]);
    }
  };

  const cargarSolicitudesBaja = async () => {
    try {
      const data = await AdminService.obtenerBajasPendientes();
      setSolicitudesBaja(data);
    } catch (error: any) {
      console.error('Error:', error);
      setSolicitudesBaja([]);
    }
  };

  const cargarEventosActivos = async () => {
    try {
      const data = await AdminService.obtenerEventosActivos();
      setEventosActivos(data);
    } catch (error: any) {
      console.error('Error:', error);
      setEventosActivos([]);
    }
  };

  const cargarEventosFinalizados = async () => {
    try {
      const data = await AdminService.obtenerEventosFinalizados();
      setEventosFinalizados(data);
    } catch (error: any) {
      console.error('Error:', error);
      setEventosFinalizados([]);
    }
  };

  const cargarHistorial = async () => {
    try {
      const historial = await AdminService.obtenerHistorialEliminaciones();
      const cancelados = historial.filter((e: EventoEliminado) => e.tipo_eliminacion === 'soft_delete');
      const depurados = historial.filter((e: EventoEliminado) => e.tipo_eliminacion === 'hard_delete');
      setEventosCancelados(cancelados);
      setEventosDepurados(depurados);
    } catch (error: any) {
      console.error('Error:', error);
      setEventosCancelados([]);
      setEventosDepurados([]);
    }
  };

  // ========== HANDLERS - ALTAS ==========
  
  const handleAprobarAlta = async (idSolicitud: number) => {
    showConfirm(
      'Aprobar Solicitud',
      '¿Estás seguro de aprobar esta solicitud y publicar el evento?',
      async () => {
        try {
          await AdminService.aprobarSolicitud(idSolicitud);
          showToast('Solicitud aprobada y evento publicado', 'success');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error al aprobar', 'error');
        }
        hideConfirm();
      },
      'info'
    );
  };

  const abrirModalRechazoAlta = (idSolicitud: number) => {
    setMotivoModal({ show: true, tipo: 'rechazar-alta', id: idSolicitud });
    setMotivoTexto('');
  };

  const handleRechazarAlta = async () => {
    if (!motivoTexto.trim()) {
      showToast('Debes ingresar un motivo', 'error');
      return;
    }
    try {
      await AdminService.rechazarSolicitud(motivoModal.id, motivoTexto);
      showToast('Solicitud rechazada', 'info');
      cerrarModal();
      cargarDatos();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Error', 'error');
    }
  };

  // ========== HANDLERS - BAJAS ==========
  
  const handleAprobarBaja = async (idEvento: number) => {
    showConfirm(
      'Confirmar Eliminación',
      '¿Estás seguro de eliminar este evento? ',
      async () => {
        try {
          await AdminService.aprobarBaja(idEvento);
          showToast('Evento eliminado correctamente', 'success');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error', 'error');
        }
        hideConfirm();
      },
      'danger'
    );
  };

  const handleRechazarBaja = async (idEvento: number) => {
    showConfirm(
      'Rechazar Solicitud de Baja',
      '¿Rechazar esta solicitud y mantener el evento activo?',
      async () => {
        try {
          await AdminService.rechazarBaja(idEvento);
          showToast('Solicitud rechazada. Evento continúa publicado', 'success');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error', 'error');
        }
        hideConfirm();
      },
      'info'
    );
  };

  // ========== HANDLERS - EVENTOS ACTIVOS ==========
  
  const abrirModalEliminarEvento = (idEvento: number) => {
    setMotivoModal({ show: true, tipo: 'eliminar-evento', id: idEvento });
    setMotivoTexto('');
  };

  const handleEliminarEventoActivo = async () => {
    if (!motivoTexto.trim()) {
      showToast('Debes ingresar un motivo', 'error');
      return;
    }
    
    // Cerrar el modal de motivo primero y guardar los valores
    const motivoGuardado = motivoTexto;
    const idEventoGuardado = motivoModal.id;
    cerrarModal();
    
    // Luego mostrar el modal de confirmación personalizado
    showConfirm(
      '⚠️ Confirmar Eliminación',
      '¿Estás seguro de eliminar este evento? Esta acción cancelará el evento.',
      async () => {
        try {
          await adminEliminarEvento(idEventoGuardado, motivoGuardado);
          showToast('Evento eliminado correctamente', 'success');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error', 'error');
        }
        hideConfirm();
      },
      'danger'
    );
  };

  // ========== HANDLERS - FINALIZADOS ==========
  
  const abrirModalDepurarFinalizado = (idEvento: number) => {
    setMotivoModal({ show: true, tipo: 'depurar-finalizado', id: idEvento });
    setMotivoTexto('');
  };

  const handleDepurarFinalizado = async () => {
    if (!motivoTexto.trim()) {
      showToast('Debes ingresar un motivo', 'error');
      return;
    }
    
    // Cerrar el modal de motivo primero y guardar los valores
    const motivoGuardado = motivoTexto;
    const idEventoGuardado = motivoModal.id;
    cerrarModal();
    
    // Luego mostrar el modal de confirmación personalizado
    showConfirm(
      '⚠️ ATENCIÓN - Depuración Permanente',
      '¿Estás seguro de depurar este evento? Esta acción eliminará el evento de forma PERMANENTE de la base de datos.',
      async () => {
        try {
          await AdminService.depurarEvento(idEventoGuardado, motivoGuardado);
          showToast('Evento depurado correctamente', 'success');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error', 'error');
        }
        hideConfirm();
      },
      'danger'
    );
  };

  // ========== HANDLERS - HISTORIAL ==========
  
  const handleRestaurarCancelado = async (idEvento: number) => {
    showConfirm(
      'Restaurar Evento',
      '¿Restaurar este evento y volver a publicarlo?',
      async () => {
        try {
          await AdminService.restaurarEvento(idEvento);
          showToast('Evento restaurado y publicado', 'success');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error', 'error');
        }
        hideConfirm();
      },
      'info'
    );
  };

  const abrirModalEliminarDefinitivo = (idEvento: number) => {
    setMotivoModal({ show: true, tipo: 'eliminar-definitivo', id: idEvento });
    setMotivoTexto('');
  };

  const handleEliminarDefinitivamente = async () => {
    if (!motivoTexto.trim()) {
      showToast('Debes ingresar un motivo', 'error');
      return;
    }

    // Cerrar el modal de motivo primero y guardar los valores
    const motivoGuardado = motivoTexto;
    const idEventoGuardado = motivoModal.id;
    cerrarModal();

    // Luego mostrar el modal de confirmación personalizado
    showConfirm(
      '⚠️ ADVERTENCIA - Eliminación Definitiva',
      'Esta acción eliminará el evento PERMANENTEMENTE de la base de datos y NO se podrá recuperar. ¿Estás seguro?',
      async () => {
        try {
          await AdminService.depurarEvento(idEventoGuardado, motivoGuardado);
          showToast('Evento eliminado definitivamente', 'success');
          cargarDatos();
        } catch (error: any) {
          showToast(error.response?.data?.detail || 'Error', 'error');
        }
        hideConfirm();
      },
      'danger'
    );
  };

  // ========== MODAL ==========
  
  const cerrarModal = () => {
    setMotivoModal({ show: false, tipo: null, id: 0 });
    setMotivoTexto('');
  };

  const confirmarAccionModal = () => {
    if (motivoModal.tipo === 'rechazar-alta') {
      handleRechazarAlta();
    } else if (motivoModal.tipo === 'eliminar-evento') {
      handleEliminarEventoActivo();
    } else if (motivoModal.tipo === 'depurar-finalizado') {
      handleDepurarFinalizado();
    } else if (motivoModal.tipo === 'eliminar-definitivo') {
      handleEliminarDefinitivamente();
    }
  };

  // ========== VISTAS ==========

  const PendientesView = () => (
    <>
      <div className="admin-card">
        <div className="card-header-admin">
          <h2 className="card-title-admin">
            📋 Solicitudes de Publicación
            {solicitudesAlta.length > 0 && <span className="badge-count-admin">{solicitudesAlta.length}</span>}
          </h2>
        </div>
        {solicitudesAlta.length === 0 ? (
          <div className="empty-state-admin">Sin solicitudes pendientes</div>
        ) : (
          <div className="table-wrapper-admin">
            <table className="data-table-admin">
              <thead>
                <tr>
                  <th>ID</th><th>Evento</th><th>Usuario</th><th>Fecha</th><th>Ubicación</th><th>Tipo</th><th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudesAlta.map((sol) => (
                  <tr key={sol.id_solicitud}>
                    <td className="text-muted-admin">{sol.id_solicitud}</td>
                    <td className="text-highlight-admin">{sol.nombre_evento}</td>
                    <td>{sol.usuario?.email || 'N/A'}</td>
                    <td>{new Date(sol.fecha_evento).toLocaleDateString('es-AR')}</td>
                    <td className="text-sm-admin">{sol.ubicacion}</td>
                    <td><span className="badge-admin">{sol.tipo_evento?.nombre || 'N/A'}</span></td>
                    <td className="actions-admin">
                      <button className="btn-icon-admin btn-success-admin" onClick={() => handleAprobarAlta(sol.id_solicitud)} title="Aprobar">✓</button>
                      <button className="btn-icon-admin btn-danger-admin" onClick={() => abrirModalRechazoAlta(sol.id_solicitud)} title="Rechazar">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card card-danger-admin">
        <div className="card-header-admin">
          <h2 className="card-title-admin">
            🗑️ Solicitudes de Eliminación
            {solicitudesBaja.length > 0 && <span className="badge-count-admin">{solicitudesBaja.length}</span>}
          </h2>
        </div>
        {solicitudesBaja.length === 0 ? (
          <div className="empty-state-admin">Sin solicitudes de baja</div>
        ) : (
          <div className="table-wrapper-admin">
            <table className="data-table-admin">
              <thead>
                <tr>
                  <th>ID</th><th>Evento</th><th>Motivo</th><th>Solicitante</th><th>Fecha Solicitud</th><th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudesBaja.map((baja) => (
                  <tr key={baja.id_eliminacion}>
                    <td className="text-muted-admin">{baja.id_evento}</td>
                    <td className="text-highlight-admin">{baja.nombre_evento}</td>
                    <td className="text-sm-admin">{baja.motivo}</td>
                    <td>{baja.usuario_solicitante}</td>
                    <td>{new Date(baja.fecha_solicitud).toLocaleString('es-AR')}</td>
                    <td className="actions-admin">
                      <button className="btn-sm-admin btn-danger-admin" onClick={() => handleAprobarBaja(baja.id_evento)}>Eliminar</button>
                      <button className="btn-sm-admin btn-success-admin" onClick={() => handleRechazarBaja(baja.id_evento)}>Mantener</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );

  const ActivosView = () => (
    <div className="admin-card">
      <div className="card-header-admin">
        <h2 className="card-title-admin">
          ✅ Eventos Activos
          {eventosActivos.length > 0 && <span className="badge-count-admin">{eventosActivos.length}</span>}
        </h2>
      </div>
      {eventosActivos.length === 0 ? (
        <div className="empty-state-admin">No hay eventos activos</div>
      ) : (
        <div className="table-wrapper-admin">
          <table className="data-table-admin">
            <thead>
              <tr>
                <th>ID</th><th>Evento</th><th>Fecha</th><th>Ubicación</th><th>Tipo</th><th>Costo</th><th>Cupo</th><th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventosActivos.map((evento) => (
                <tr key={evento.id_evento}>
                  <td className="text-muted-admin">{evento.id_evento}</td>
                  <td className="text-highlight-admin">{evento.nombre_evento}</td>
                  <td>{new Date(evento.fecha_evento).toLocaleDateString('es-AR')}</td>
                  <td className="text-sm-admin">{evento.ubicacion}</td>
                  <td><span className="badge-admin">{evento.tipo_evento?.nombre || 'N/A'}</span></td>
                  <td>${evento.costo_participacion}</td>
                  <td>{evento.cupo_maximo || '∞'}</td>
                  <td className="actions-admin">
                    <button className="btn-sm-admin btn-danger-admin" onClick={() => abrirModalEliminarEvento(evento.id_evento)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const FinalizadosView = () => (
    <div className="admin-card">
      <div className="card-header-admin">
        <h2 className="card-title-admin">
          🕐 Eventos Finalizados
          {eventosFinalizados.length > 0 && <span className="badge-count-admin">{eventosFinalizados.length}</span>}
        </h2>
      </div>
      <p className="info-text-admin">Eventos cuya fecha ya pasó. Puedes depurarlos para limpiar la base de datos.</p>
      {eventosFinalizados.length === 0 ? (
        <div className="empty-state-admin">No hay eventos finalizados</div>
      ) : (
        <div className="table-wrapper-admin">
          <table className="data-table-admin">
            <thead>
              <tr>
                <th>ID</th><th>Evento</th><th>Fecha</th><th>Ubicación</th><th>Tipo</th><th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {eventosFinalizados.map((evento) => (
                <tr key={evento.id_evento}>
                  <td className="text-muted-admin">{evento.id_evento}</td>
                  <td className="text-highlight-admin">{evento.nombre_evento}</td>
                  <td>{new Date(evento.fecha_evento).toLocaleDateString('es-AR')}</td>
                  <td className="text-sm-admin">{evento.ubicacion}</td>
                  <td><span className="badge-admin">{evento.tipo_evento?.nombre || 'N/A'}</span></td>
                  <td className="actions-admin">
                    <button className="btn-sm-admin btn-danger-admin" onClick={() => abrirModalDepurarFinalizado(evento.id_evento)} title="Depurar">
                      🗑️ Depurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const HistorialView = () => (
    <>
      <div className="admin-card">
        <div className="card-header-admin">
          <h2 className="card-title-admin">
            🔄 Eventos Cancelados 
            {eventosCancelados.length > 0 && <span className="badge-count-admin">{eventosCancelados.length}</span>}
          </h2>
        </div>
        <p className="info-text-admin">Eventos cancelados que pueden ser restaurados o eliminados definitivamente.</p>
        {eventosCancelados.length === 0 ? (
          <div className="empty-state-admin">No hay eventos cancelados</div>
        ) : (
          <div className="table-wrapper-admin">
            <table className="data-table-admin">
              <thead>
                <tr>
                  <th>ID</th><th>Evento</th><th>Fecha Eliminación</th><th>Motivo</th><th>Eliminado Por</th><th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {eventosCancelados.map((evento, i) => (
                  <tr key={`${evento.id_evento}-${i}`}>
                    <td className="text-muted-admin">{evento.id_evento}</td>
                    <td className="text-highlight-admin">{evento.nombre_evento}</td>
                    <td>{evento.fecha_eliminacion}</td>
                    <td className="text-sm-admin">{evento.motivo}</td>
                    <td>{evento.eliminado_por}</td>
                    <td className="actions-admin">
                      <button className="btn-sm-admin btn-success-admin" onClick={() => handleRestaurarCancelado(evento.id_evento)} title="Restaurar evento">
                        ♻️ Restaurar
                      </button>
                      <button className="btn-sm-admin btn-danger-admin" onClick={() => abrirModalEliminarDefinitivo(evento.id_evento)} title="Eliminar definitivamente">
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card">
        <div className="card-header-admin">
          <h2 className="card-title-admin">
            💀 Eventos Depurados 
            {eventosDepurados.length > 0 && <span className="badge-count-admin">{eventosDepurados.length}</span>}
          </h2>
        </div>
        <p className="info-text-admin">Registro permanente de eventos depurados. No se pueden restaurar.</p>
        {eventosDepurados.length === 0 ? (
          <div className="empty-state-admin">No hay eventos depurados</div>
        ) : (
          <div className="table-wrapper-admin">
            <table className="data-table-admin">
              <thead>
                <tr>
                  <th>ID</th><th>Evento</th><th>Fecha Depuración</th><th>Motivo</th><th>Depurado Por</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {eventosDepurados.map((evento, i) => (
                  <tr key={`${evento.id_evento}-${i}`}>
                    <td className="text-muted-admin">{evento.id_evento}</td>
                    <td className="text-highlight-admin">{evento.nombre_evento}</td>
                    <td>{evento.fecha_eliminacion}</td>
                    <td className="text-sm-admin">{evento.motivo}</td>
                    <td>{evento.eliminado_por}</td>
                    <td><span className="badge-depurado-admin">Depurado</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="admin-dashboard-container">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* ✅ MODAL DE CONFIRMACIÓN PERSONALIZADO */}
      <ConfirmModal 
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={hideConfirm}
        type={confirmModal.type}
      />

      <header className="admin-header-main">
        <div className="header-left-admin">
          <a href="/" className="btn-volver-inicio">← Volver al Inicio</a>
          <h1 className="admin-page-title">Panel de Administración</h1>
        </div>
        <div className="header-right-admin">
          <button className="btn-refresh-admin" onClick={cargarDatos}>↻ Refrescar</button>
          <div className="user-menu-container">
            <button className="user-menu-trigger" onClick={() => setUserMenuOpen(!userMenuOpen)}>
              <span className="user-name">{currentUser.nombre_y_apellido || currentUser.nombre || 'ADMIN'}</span>
              <span className="arrow-icon">{userMenuOpen ? '▲' : '▼'}</span>
            </button>
            {userMenuOpen && (
              <div className="user-dropdown">
                <div className="dropdown-header">{currentUser.email}</div>
                <a href="/perfil" className="dropdown-item">Mi Perfil</a>
                <button className="dropdown-item logout-button" onClick={handleLogout}>Cerrar Sesión</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="admin-layout-main">
        <aside className="admin-sidebar">
          <button className={`sidebar-btn-admin ${activeView === 'pendientes' ? 'active' : ''}`} onClick={() => setActiveView('pendientes')}>
            <span className="icon-admin">📋</span>
            <span className="text-admin">Pendientes</span>
            {(solicitudesAlta.length + solicitudesBaja.length) > 0 && <span className="badge-sidebar-admin">{solicitudesAlta.length + solicitudesBaja.length}</span>}
          </button>
          <button className={`sidebar-btn-admin ${activeView === 'activos' ? 'active' : ''}`} onClick={() => setActiveView('activos')}>
            <span className="icon-admin">✅</span>
            <span className="text-admin">Eventos Activos</span>
          </button>
          <button className={`sidebar-btn-admin ${activeView === 'finalizados' ? 'active' : ''}`} onClick={() => setActiveView('finalizados')}>
            <span className="icon-admin">🕐</span>
            <span className="text-admin">Finalizados</span>
            {eventosFinalizados.length > 0 && <span className="badge-sidebar-admin">{eventosFinalizados.length}</span>}
          </button>
          <button className={`sidebar-btn-admin ${activeView === 'historial' ? 'active' : ''}`} onClick={() => setActiveView('historial')}>
            <span className="icon-admin">📜</span>
            <span className="text-admin">Historial</span>
          </button>
        </aside>

        <main className="admin-main-content">
          {loading ? (
            <div className="loading-admin">
              <div className="spinner-admin"></div>
              <p>Cargando datos...</p>
            </div>
          ) : (
            <>
              {activeView === 'pendientes' && <PendientesView />}
              {activeView === 'activos' && <ActivosView />}
              {activeView === 'finalizados' && <FinalizadosView />}
              {activeView === 'historial' && <HistorialView />}
            </>
          )}
        </main>
      </div>

      {/* MODAL DE MOTIVO */}
      {motivoModal.show && (
        <div className="modal-overlay-admin" onClick={cerrarModal}>
          <div className="modal-content-admin" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-admin">
              <h3>
                {motivoModal.tipo === 'rechazar-alta' && '❌ Rechazar Solicitud'}
                {motivoModal.tipo === 'eliminar-evento' && '🗑️ Eliminar Evento'}
                {motivoModal.tipo === 'depurar-finalizado' && '⚠️ Depurar Evento'}
                {motivoModal.tipo === 'eliminar-definitivo' && '💀 Eliminación Definitiva'}
              </h3>
              <button className="modal-close-admin" onClick={cerrarModal}>✕</button>
            </div>
            <div className="modal-body-admin">
              <label className="modal-label-admin">Motivo (obligatorio):</label>
              <textarea 
                className="modal-textarea-admin" 
                placeholder="Describe la razón de esta acción..." 
                value={motivoTexto} 
                onChange={(e) => setMotivoTexto(e.target.value)} 
                rows={4} 
              />
            </div>
            <div className="modal-footer-admin">
              <button className="btn-modal-admin btn-cancel-admin" onClick={cerrarModal}>Cancelar</button>
              <button 
                className="btn-modal-admin btn-confirm-admin" 
                onClick={confirmarAccionModal} 
                disabled={!motivoTexto.trim()}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;