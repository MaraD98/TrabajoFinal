import { useState, useEffect } from "react";
import { AdminService } from '../services/admin-service';
import type { 
  SolicitudAlta, 
  SolicitudBaja, 
  EventoActivo, 
  EventoEliminado 
} from "../types/admin-types";

const AdminDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState('pendientes');
  const [solicitudesAlta, setSolicitudesAlta] = useState<SolicitudAlta[]>([]);
  const [solicitudesBaja, setSolicitudesBaja] = useState<SolicitudBaja[]>([]);
  const [eventosActivos, setEventosActivos] = useState<EventoActivo[]>([]);
  const [historialEliminados, setHistorialEliminados] = useState<EventoEliminado[]>([]);
  const [loading, setLoading] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    cargarDatos();
  }, [activeView]);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeView === 'pendientes') {
        await cargarSolicitudesAlta();
        await cargarSolicitudesBaja();
      } else if (activeView === 'activos') {
        await cargarEventosActivos();
      } else if (activeView === 'historial') {
        await cargarHistorial();
      }
    } catch (error: any) {
      console.error('Error cargando datos:', error);
      setError(error.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const cargarSolicitudesAlta = async () => {
    try {
      const data = await AdminService.obtenerSolicitudesPendientes();
      setSolicitudesAlta(data);
    } catch (error: any) {
      console.error('Error cargando solicitudes de alta:', error);
      setSolicitudesAlta([]);
    }
  };

  const cargarSolicitudesBaja = async () => {
    try {
      const data = await AdminService.obtenerBajasPendientes();
      setSolicitudesBaja(data);
    } catch (error: any) {
      console.error('Error cargando solicitudes de baja:', error);
      setSolicitudesBaja([]);
    }
  };

  const cargarEventosActivos = async () => {
    try {
      const data = await AdminService.obtenerEventosActivos();
      setEventosActivos(data);
    } catch (error: any) {
      console.error('Error cargando eventos activos:', error);
      setEventosActivos([]);
    }
  };

  const cargarHistorial = async () => {
    try {
      const data = await AdminService.obtenerHistorialEliminaciones();
      setHistorialEliminados(data);
    } catch (error: any) {
      console.error('Error cargando historial:', error);
      setHistorialEliminados([]);
    }
  };

  const handleAprobarAlta = async (idSolicitud: number) => {
    if (!confirm('¿Aprobar esta solicitud y publicar el evento?')) return;
    
    try {
      await AdminService.aprobarSolicitud(idSolicitud);
      alert('✅ Solicitud aprobada y evento publicado');
      cargarDatos();
    } catch (error) {
      alert('❌ Error al aprobar solicitud');
      console.error(error);
    }
  };

  const handleRechazarAlta = async (idSolicitud: number) => {
    const motivo = prompt('Motivo del rechazo:');
    if (!motivo) return;
    
    try {
      await AdminService.rechazarSolicitud(idSolicitud, motivo);
      alert('❌ Solicitud rechazada');
      cargarDatos();
    } catch (error) {
      alert('❌ Error al rechazar solicitud');
      console.error(error);
    }
  };

  const handleEliminarEvento = async (idEliminacion: number, idEvento: number) => {
    if (!confirm('¿Confirmar la eliminación de este evento?')) return;
    
    try {
      await AdminService.aprobarBaja(idEliminacion, idEvento);
      alert('🗑️ Evento eliminado correctamente (Soft Delete)');
      cargarDatos();
    } catch (error: any) {
      const mensaje = error.response?.data?.detail || 'Error al eliminar evento';
      alert(`❌ Error: ${mensaje}`);
      console.error(error);
    }
  };

  const handleMantenerEvento = async (idEliminacion: number, idEvento: number) => {
    if (!confirm('¿Rechazar la solicitud de baja y mantener el evento activo?')) return;
    
    try {
      await AdminService.rechazarBaja(idEliminacion, idEvento);
      alert('✅ Evento restaurado a Publicado');
      cargarDatos();
    } catch (error: any) {
      const mensaje = error.response?.data?.detail || 'Error al rechazar baja';
      alert(`❌ Error: ${mensaje}`);
      console.error(error);
    }
  };

  const PendientesView = () => (
    <>
      {error && (
        <div style={{
          background: '#fee2e2',
          color: '#991b1b',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          ⚠️ Error: {error}
        </div>
      )}
      
      <div className="card-section">
        <div className="section-header-inline">
          <h2 className="section-subtitle">
            📋 Solicitudes de Alta ({solicitudesAlta.length})
          </h2>
        </div>
        
        {solicitudesAlta.length === 0 ? (
          <div className="empty-state">
            No hay solicitudes pendientes de aprobación
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>EVENTO</th>
                  <th>USUARIO</th>
                  <th>FECHA EV.</th>
                  <th>UBICACIÓN</th>
                  <th>TIPO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {solicitudesAlta.map((sol) => (
                  <tr key={sol.id_solicitud}>
                    <td>{sol.id_solicitud}</td>
                    <td className="td-evento">{sol.nombre_evento}</td>
                    <td>{sol.usuario?.email || 'N/A'}</td>
                    <td>{sol.fecha_evento}</td>
                    <td>{sol.ubicacion}</td>
                    <td>{sol.tipo_evento?.nombre || 'N/A'}</td>
                    <td className="td-acciones">
                      <button 
                        className="btn-action btn-aprobar"
                        onClick={() => handleAprobarAlta(sol.id_solicitud)}
                        title="Aprobar y publicar"
                      >
                        ✓
                      </button>
                      <button 
                        className="btn-action btn-rechazar"
                        onClick={() => handleRechazarAlta(sol.id_solicitud)}
                        title="Rechazar"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-section baja-section">
        <div className="section-header-inline">
          <h2 className="section-subtitle">
            🗑️ Solicitudes de Baja ({solicitudesBaja.length})
          </h2>
        </div>
        
        {solicitudesBaja.length === 0 ? (
          <div className="empty-state">
            No hay solicitudes de baja pendientes
          </div>
        ) : (
          <div className="table-responsive">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>EVENTO</th>
                  <th>MOTIVO BAJA</th>
                  <th>SOLICITANTE</th>
                  <th>FECHA SOLICITUD</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {solicitudesBaja.map((baja) => (
                  <tr key={baja.id_eliminacion}>
                    <td>{baja.id_eliminacion}</td>
                    <td className="td-evento">{baja.nombre_evento}</td>
                    <td className="td-motivo">{baja.motivo}</td>
                    <td>{baja.usuario_solicitante}</td>
                    <td>{baja.fecha_solicitud}</td>
                    <td className="td-acciones">
                      <button 
                        className="btn-eliminar"
                        onClick={() => handleEliminarEvento(baja.id_eliminacion, baja.id_evento)}
                      >
                        Eliminar
                      </button>
                      <button 
                        className="btn-mantener"
                        onClick={() => handleMantenerEvento(baja.id_eliminacion, baja.id_evento)}
                      >
                        Mantener
                      </button>
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
    <div className="card-section">
      <div className="section-header-inline">
        <h2 className="section-subtitle">
          ✅ Eventos Activos ({eventosActivos.length})
        </h2>
        <a href="/admin/eventos/nuevo" className="btn-crear-evento">
          + Crear Evento
        </a>
      </div>
      
      {eventosActivos.length === 0 ? (
        <div className="empty-state">No hay eventos activos</div>
      ) : (
        <div className="grid-eventos">
          {eventosActivos.map((evento) => (
            <div key={evento.id_evento} className="evento-card-admin">
              <div className="card-img-wrapper-admin">
                <img 
                  src="https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400" 
                  alt={evento.nombre_evento}
                  className="card-img-admin"
                />
                <span className="tipo-badge-admin">
                  {evento.tipo_evento?.nombre || 'Evento'}
                </span>
              </div>
              
              <div className="card-content-admin">
                <h3>{evento.nombre_evento}</h3>
                <p className="evento-fecha">📅 {evento.fecha_evento}</p>
                <p className="evento-ubicacion">📍 {evento.ubicacion}</p>
                <p className="evento-costo">💵 ${evento.costo_participacion}</p>
                
                <div className="card-actions">
                  <button className="btn-editar">Editar</button>
                  <button className="btn-ver">Ver Detalles</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const HistorialView = () => (
    <div className="card-section">
      <div className="section-header-inline">
        <h2 className="section-subtitle">
          📜 Historial de Eliminaciones ({historialEliminados.length})
        </h2>
      </div>
      
      {historialEliminados.length === 0 ? (
        <div className="empty-state">
          No hay registros en el historial
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>EVENTO</th>
                <th>FECHA ELIMINACIÓN</th>
                <th>MOTIVO</th>
                <th>ELIMINADO POR</th>
                <th>ESTADO</th>
                <th>TIPO</th>
              </tr>
            </thead>
            <tbody>
              {historialEliminados.map((evento, index) => (
                <tr key={`${evento.id_evento}-${index}`}>
                  <td>{evento.id_evento}</td>
                  <td className="td-evento">{evento.nombre_evento}</td>
                  <td>{new Date(evento.fecha_eliminacion).toLocaleString('es-AR')}</td>
                  <td className="td-motivo">{evento.motivo}</td>
                  <td>{evento.eliminado_por}</td>
                  <td>
                    <span className={`badge-estado ${evento.tipo_eliminacion}`}>
                      {evento.estado}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-tipo ${evento.tipo_eliminacion}`}>
                      {evento.tipo_eliminacion === 'soft_delete' ? '🔄 Soft' : 
                       evento.tipo_eliminacion === 'hard_delete' ? '⚠️ Hard' : 
                       '❌ Físico'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-dashboard">
      <nav className="admin-navbar">
        <div className="navbar-brand">
          <span className="brand-icon">⚡</span>
          <h1>Panel Admin</h1>
        </div>
        
        <div className="user-menu-container">
          <button 
            className="user-menu-trigger"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
          >
            <span className="user-name">{currentUser.nombre || 'ADMIN'}</span>
            <span className="arrow-icon">{userMenuOpen ? '▲' : '▼'}</span>
          </button>
          
          {userMenuOpen && (
            <div className="user-dropdown">
              <div className="dropdown-header">{currentUser.rol || 'Administrador'}</div>
              <a href="/perfil" className="dropdown-item">Mi Perfil</a>
              <a href="/configuracion" className="dropdown-item">Configuración</a>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout-button">
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <button 
            className={`sidebar-btn ${activeView === 'pendientes' ? 'active' : ''}`}
            onClick={() => setActiveView('pendientes')}
          >
            <span className="btn-icon">📋</span>
            <span className="btn-text">Pendientes</span>
            <span className="badge-count">
              {solicitudesAlta.length + solicitudesBaja.length}
            </span>
          </button>
          
          <button 
            className={`sidebar-btn ${activeView === 'activos' ? 'active' : ''}`}
            onClick={() => setActiveView('activos')}
          >
            <span className="btn-icon">🟢</span>
            <span className="btn-text">Activos</span>
          </button>
          
          <button 
            className={`sidebar-btn ${activeView === 'historial' ? 'active' : ''}`}
            onClick={() => setActiveView('historial')}
          >
            <span className="btn-icon">🔴</span>
            <span className="btn-text">Historial</span>
          </button>
        </aside>

        <main className="main-content">
          <div className="content-header">
            <h1 className="page-title">Gestión de Eventos</h1>
            <button className="btn-refresh" onClick={cargarDatos}>
              ↻ Refrescar Datos
            </button>
          </div>

          {loading ? (
            <div className="loading-state">Cargando datos...</div>
          ) : (
            <>
              {activeView === 'pendientes' && <PendientesView />}
              {activeView === 'activos' && <ActivosView />}
              {activeView === 'historial' && <HistorialView />}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;