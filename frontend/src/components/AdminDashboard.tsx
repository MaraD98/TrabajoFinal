import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import '../styles/admin-dashboard.css';

// ============================================================================
// TIPOS E INTERFACES
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
  id_estado: number; // 3 = Publicado/Activo
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
  estado: string; // "Cancelado", "Finalizado", "Depurado", etc.
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

type FilterType = 'todos' | 'finalizados' | 'eliminados';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
const AdminDashboard: React.FC = () => {
  // --------------------------------------------------------------------------
  // ESTADOS
  // --------------------------------------------------------------------------
  const [vistaActual, setVistaActual] = useState<'pendientes' | 'activos' | 'historial' | 'pagos' | 'inscriptos'>('pendientes');
  
  // Datos
  const [solicitudesAlta, setSolicitudesAlta] = useState<SolicitudAlta[]>([]);
  const [solicitudesBaja, setSolicitudesBaja] = useState<SolicitudBaja[]>([]);
  const [eventosActivos, setEventosActivos] = useState<Evento[]>([]);
  const [historialEventos, setHistorialEventos] = useState<HistorialItem[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('todos');

  // UI (Modals/Toast)
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);
  
  // Modal de confirmación genérico (reutilizado por tus funciones)
  const [confirmModal, setConfirmModal] = useState<{ 
    show: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void; 
  } | null>(null);

  const [pagoModal, setPagoModal] = useState<{ show: boolean; reserva: Reserva | null; }>({ show: false, reserva: null });

  // --------------------------------------------------------------------------
  // EFECTOS
  // --------------------------------------------------------------------------
  useEffect(() => {
    cargarDatos();
    setSearchTerm(''); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaActual]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const mostrarToast = (mensaje: string, tipo: 'success' | 'error') => setToast({ mensaje, tipo });

  // --------------------------------------------------------------------------
  // CARGA DE DATOS
  // --------------------------------------------------------------------------
  const cargarDatos = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      if (vistaActual === 'pendientes') {
        const resAlta = await axios.get('http://localhost:8000/api/v1/admin/solicitudes/pendientes', config);
        setSolicitudesAlta(Array.isArray(resAlta.data) ? resAlta.data.map((s: any) => ({ ...s, tipo: 'alta' })) : []);
        
        const resBaja = await axios.get('http://localhost:8000/api/v1/admin/bajas/pendientes', config);
        setSolicitudesBaja(Array.isArray(resBaja.data) ? resBaja.data.map((s: any) => ({ ...s, tipo: 'baja' })) : []);
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
      console.error("Error cargando datos:", error);
      mostrarToast('Error de conexión o permisos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecargar = () => {
    cargarDatos();
    mostrarToast('Datos actualizados', 'success');
  };
  const handlePrint = () => window.print();
  const handleExportCSV = (datos: any[], nombre: string) => { /* ... lógica CSV ... */ };

  // ============================================================================ 
  //  TUS HANDLERS RESTAURADOS (Lógica exacta del código viejo)
  // ============================================================================ 

  // --- HANDLERS DE EVENTOS PENDIENTES ---
  const handleAprobarAlta = async (idSolicitud: number) => { 
    const token = localStorage.getItem('token'); 
    try { 
      await axios.patch( 
        `http://localhost:8000/api/v1/admin/solicitudes/${idSolicitud}/revisar`, 
        { id_estado_solicitud: 3 }, 
        { headers: { Authorization: `Bearer ${token}` } } 
      ); 
      mostrarToast('✅ Solicitud de ALTA aprobada y evento publicado', 'success'); 
      cargarDatos(); 
    } catch (error) { 
      console.error('Error:', error); 
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
      mostrarToast('❌ Solicitud de ALTA rechazada', 'success'); 
      cargarDatos(); 
    } catch (error) { 
      console.error('Error:', error); 
      mostrarToast('❌ Error al rechazar la solicitud', 'error'); 
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
      mostrarToast('✅ Solicitud de BAJA aprobada', 'success'); 
      cargarDatos(); 
    } catch (error) { 
      console.error('Error:', error); 
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
      mostrarToast('❌ Solicitud de BAJA rechazada', 'success'); 
      cargarDatos(); 
    } catch (error) { 
      console.error('Error:', error); 
      mostrarToast('❌ Error al rechazar la baja', 'error'); 
    } 
  }; 

  // --- HANDLERS DE HISTORIAL (TUS FUNCIONES) ---
  const handleDepurarFinalizado = async (idEvento: number) => { 
    setConfirmModal({ 
      show: true, 
      title: '⚠️ Confirmar Depuración', 
      message: '¿Estás seguro de que deseas depurar este evento finalizado? Esta acción cambiará su estado a DEPURADO (7).', 
      onConfirm: async () => { 
        const token = localStorage.getItem('token'); 
        try { 
          await axios.delete( 
            `http://localhost:8000/api/v1/admin/eventos/${idEvento}/depurar?motivo=Depuración de evento finalizado`, 
            { headers: { Authorization: `Bearer ${token}` } } 
          ); 
          mostrarToast('🗑️ Evento depurado correctamente', 'success'); 
          cargarDatos(); 
        } catch (error) { 
          console.error('Error:', error); 
          mostrarToast('❌ Error al depurar el evento', 'error'); 
        } 
        setConfirmModal(null); 
      } 
    }); 
  }; 
 
  const handleRestaurarCancelado = async (idEvento: number) => { 
    setConfirmModal({ 
      show: true, 
      title: '🔄 Confirmar Restauración', 
      message: '¿Deseas restaurar este evento? Volverá a estar PUBLICADO (estado 3).', 
      onConfirm: async () => { 
        const token = localStorage.getItem('token'); 
        try { 
          await axios.patch( 
            `http://localhost:8000/api/v1/eliminacion/admin/restaurar/${idEvento}`, 
            {}, 
            { headers: { Authorization: `Bearer ${token}` } } 
          ); 
          mostrarToast('♻️ Evento restaurado correctamente', 'success'); 
          cargarDatos(); 
        } catch (error) { 
          console.error('Error:', error); 
          mostrarToast('❌ Error al restaurar el evento', 'error'); 
        } 
        setConfirmModal(null); 
      } 
    }); 
  }; 
 
  const handleDepurarEliminado = async (idEvento: number) => { 
    setConfirmModal({ 
      show: true, 
      title: '🗑️ Confirmar Depuración Permanente', 
      message: '¿Estás seguro de depurar este evento eliminado? Pasará a estado DEPURADO (7).', 
      onConfirm: async () => { 
        const token = localStorage.getItem('token'); 
        try { 
          await axios.delete( 
            `http://localhost:8000/api/v1/admin/eventos/${idEvento}/depurar?motivo=Depuración permanente de evento eliminado`, 
            { headers: { Authorization: `Bearer ${token}` } } 
          ); 
          mostrarToast('🗑️ Evento depurado permanentemente', 'success'); 
          cargarDatos(); 
        } catch (error) { 
          console.error('Error:', error); 
          mostrarToast('❌ Error al depurar el evento', 'error'); 
        } 
        setConfirmModal(null); 
      } 
    }); 
  }; 

  // --- HANDLER ADICIONAL: SUSPENDER ACTIVO (Basado en tu lógica) ---
  const handleSuspenderActivo = async (idEvento: number) => { 
    setConfirmModal({ 
      show: true, 
      title: '⚠️ Confirmar Suspensión', 
      message: '¿Estás seguro de suspender este evento activo? Pasará a estado CANCELADO.', 
      onConfirm: async () => { 
        const token = localStorage.getItem('token'); 
        try { 
          // Usamos DELETE con motivo, igual que tus otras funciones de baja
          await axios.delete( 
            `http://localhost:8000/api/v1/admin/eventos/${idEvento}/depurar?motivo=Suspensión por Administrador`, 
            { headers: { Authorization: `Bearer ${token}` } } 
          ); 
          mostrarToast('⚠️ Evento suspendido correctamente', 'success'); 
          cargarDatos(); 
        } catch (error) { 
          console.error('Error:', error); 
          mostrarToast('❌ Error al suspender el evento', 'error'); 
        } 
        setConfirmModal(null); 
      } 
    }); 
  }; 

  // --- Pagos ---
  const handleConfirmarPago = async () => {
    if (!pagoModal.reserva) return;
    try {
      await axios.post(`http://localhost:8000/api/v1/inscripciones/confirmar-pago/${pagoModal.reserva.id_reserva}`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      mostrarToast('Pago confirmado', 'success'); setPagoModal({ show: false, reserva: null }); cargarDatos();
    } catch { mostrarToast('Error al confirmar pago', 'error'); }
  };

  // --------------------------------------------------------------------------
  // LÓGICA DE FILTROS Y ESTADOS
  // --------------------------------------------------------------------------
  const normalize = (str: string) => str ? str.toLowerCase().trim() : '';

  const filtrarHistorial = () => {
    let res = historialEventos;
    if (filterType === 'finalizados') res = res.filter(h => normalize(h.estado) === 'finalizado');
    if (filterType === 'eliminados') res = res.filter(h => {
        const s = normalize(h.estado);
        return s === 'cancelado' || s === 'eliminado' || s === 'baja' || s === 'depurado';
    });
    if (searchTerm) res = res.filter(h => h.nombre_evento.toLowerCase().includes(searchTerm.toLowerCase()));
    return res;
  };

  // Helpers para mostrar botones según el estado
  const esCancelado = (estado: string) => {
    const s = normalize(estado);
    return s === 'cancelado' || s === 'eliminado' || s === 'baja';
  };
  
  const esFinalizado = (estado: string) => normalize(estado) === 'finalizado';

  const getBadgeClass = (estado: string) => {
    const s = normalize(estado);
    if (['cancelado', 'rechazado', 'eliminado', 'baja'].includes(s)) return 'badge-estado-eliminado';
    if (s === 'depurado') return 'badge-estado-depurado';
    if (['finalizado', 'confirmada'].includes(s)) return 'badge-estado-finalizado';
    if (s === 'pendiente') return 'badge-estado-pendiente';
    return 'badge-estado-default';
  };

  const filtrarPendientesAlta = () => !searchTerm ? solicitudesAlta : solicitudesAlta.filter(s => s.nombre_evento.toLowerCase().includes(searchTerm.toLowerCase()));
  const filtrarPendientesBaja = () => !searchTerm ? solicitudesBaja : solicitudesBaja.filter(s => s.nombre_evento.toLowerCase().includes(searchTerm.toLowerCase()));
  const filtrarEventosActivos = () => !searchTerm ? eventosActivos : eventosActivos.filter(e => e.nombre_evento.toLowerCase().includes(searchTerm.toLowerCase()));
  const filtrarPagos = () => {
    const data = reservas.filter(r => r.estado_reserva === 'Pendiente');
    return !searchTerm ? data : data.filter(r => r.usuario_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || r.nombre_evento.toLowerCase().includes(searchTerm.toLowerCase()));
  };
  const filtrarInscriptos = () => {
    const data = reservas.filter(r => r.estado_reserva === 'Confirmada');
    return !searchTerm ? data : data.filter(r => r.usuario_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || r.nombre_evento.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0a0a0a' }}>
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
          {loading && <div style={{padding:'10px', textAlign:'center', color:'#888', fontStyle:'italic'}}>Cargando datos...</div>}

          {/* --- VISTA: PENDIENTES --- */}
          {vistaActual === 'pendientes' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>📋 Solicitudes Pendientes <span className="badge-count admin">{filtrarPendientesAlta().length + filtrarPendientesBaja().length}</span></h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input type="text" className="search-input-admin" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV([], 'Pendientes')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️ Imprimir</button>
                  </div>
                </div>
              </div>
              <div className="seccion-solicitudes">
                <h3 className="titulo-seccion-solicitud">📝 Altas ({filtrarPendientesAlta().length})</h3>
                <table className="data-table-admin">
                  <thead><tr><th>ID</th><th>Evento</th><th>Usuario</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {filtrarPendientesAlta().map(s => (
                      <tr key={`alta-${s.id_solicitud}`}>
                        <td>{s.id_solicitud}</td><td>{s.nombre_evento}</td><td>{s.id_usuario}</td>
                        <td><div className="action-buttons-inline"><button className="btn-aprobar-admin" onClick={() => handleAprobarAlta(s.id_solicitud)}>Aprobar</button><button className="btn-rechazar-admin" onClick={() => handleRechazarAlta(s.id_solicitud)}>Rechazar</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="seccion-solicitudes" style={{ marginTop: '20px' }}>
                <h3 className="titulo-seccion-solicitud" style={{color:'#fc8181'}}>🗑️ Bajas ({filtrarPendientesBaja().length})</h3>
                <table className="data-table-admin">
                  <thead><tr><th>Evento</th><th>Motivo</th><th>Solicitante</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {filtrarPendientesBaja().map((s, index) => (
                      <tr key={`baja-${s.id_eliminacion || index}`}>
                        <td>{s.nombre_evento}</td><td>{s.motivo}</td><td>{s.usuario_solicitante}</td>
                        <td><div className="action-buttons-inline"><button className="btn-aprobar-admin" onClick={() => handleAprobarBaja(s.id_evento)}>Aprobar</button><button className="btn-rechazar-admin" onClick={() => handleRechazarBaja(s.id_evento)}>Rechazar</button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- VISTA: ACTIVOS --- */}
          {vistaActual === 'activos' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>✅ Eventos Activos <span className="badge-count admin">{filtrarEventosActivos().length}</span></h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input type="text" className="search-input-admin" placeholder="Buscar evento..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV(eventosActivos, 'Activos')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️ Imprimir</button>
                  </div>
                </div>
              </div>
              <table className="data-table-admin">
                <thead><tr><th>ID</th><th>Nombre</th><th>Fecha</th><th>Ubicación</th><th>Costo</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filtrarEventosActivos().map(e => (
                    <tr key={`activo-${e.id_evento}`}>
                        <td>{e.id_evento}</td><td>{e.nombre_evento}</td><td>{e.fecha_evento}</td><td>{e.ubicacion}</td><td>${e.costo_participacion || 0}</td>
                        <td>
                          {/* SUSPENDER ACTIVO (Usa la lógica de depurar) */}
                          <button className="btn-rechazar-admin" style={{padding:'4px 8px', fontSize:'12px'}} onClick={() => handleSuspenderActivo(e.id_evento)}>⚠️ Suspender</button>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* --- VISTA: HISTORIAL --- */}
          {vistaActual === 'historial' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>📖 Historial <span className="badge-count admin">{filtrarHistorial().length}</span></h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input type="text" className="search-input-admin" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="filter-buttons-admin">
                    <button className={filterType === 'todos' ? 'active' : ''} onClick={() => setFilterType('todos')}>Todos</button>
                    <button className={filterType === 'finalizados' ? 'active' : ''} onClick={() => setFilterType('finalizados')}>Finalizados</button>
                    <button className={filterType === 'eliminados' ? 'active' : ''} onClick={() => setFilterType('eliminados')}>Eliminados</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV(filtrarHistorial(), 'Historial')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️ Imprimir</button>
                  </div>
                </div>
              </div>
              <table className="data-table-admin">
                <thead><tr><th>Evento</th><th>Motivo</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filtrarHistorial().map((item, idx) => (
                    <tr key={`hist-${item.id_evento}-${idx}`}>
                      <td><strong>{item.nombre_evento}</strong><br/><small>{item.fecha_eliminacion}</small></td>
                      <td>{item.motivo || '-'}</td>
                      <td><span className={`badge-estado-small ${getBadgeClass(item.estado)}`}>{item.estado}</span></td>
                      <td>
                        <div className="action-buttons-inline">
                            {/* SI ESTÁ CANCELADO/ELIMINADO -> RESTAURAR o DEPURAR */}
                            {esCancelado(item.estado) && (
                                <>
                                  <button className="btn-restaurar-admin" title="Restaurar" onClick={() => handleRestaurarCancelado(item.id_evento)}>♻️</button>
                                  <button className="btn-depurar-admin" title="Eliminar Definitivamente" onClick={() => handleDepurarEliminado(item.id_evento)}>🧹</button>
                                </>
                            )}
                            
                            {/* SI ESTÁ FINALIZADO -> DEPURAR */}
                            {esFinalizado(item.estado) && (
                                <button className="btn-depurar-admin" title="Depurar Finalizado" onClick={() => handleDepurarFinalizado(item.id_evento)}>🧹</button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* --- VISTA: PAGOS --- */}
          {vistaActual === 'pagos' && (
            <div className="admin-content-view">
              <div className="view-header">
                <h2>💳 Pagos Pendientes <span className="badge-count admin">{filtrarPagos().length}</span></h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input type="text" className="search-input-admin" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV(filtrarPagos(), 'Pagos_Pendientes')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️ Imprimir</button>
                  </div>
                </div>
              </div>
              <table className="data-table-admin">
                <thead><tr><th>Usuario</th><th>Evento</th><th>Monto</th><th>Acción</th></tr></thead>
                <tbody>
                  {filtrarPagos().map(r => (
                    <tr key={`pago-${r.id_reserva}`}>
                      <td>{r.usuario_email}</td><td>{r.nombre_evento}</td><td>${r.monto}</td>
                      <td><button className="btn-confirmar-pago-admin" onClick={() => setPagoModal({ show: true, reserva: r })}>Confirmar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* --- VISTA: INSCRIPTOS --- */}
          {vistaActual === 'inscriptos' && (
             <div className="admin-content-view">
             <div className="view-header">
                <h2>👥 Inscriptos Confirmados <span className="badge-count admin">{filtrarInscriptos().length}</span></h2>
                <div className="toolbar-admin">
                  <div className="search-form-admin">
                    <input type="text" className="search-input-admin" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button className="btn-search-admin">Buscar</button>
                  </div>
                  <div className="action-buttons-inline">
                    <button className="btn-print-admin" onClick={handleRecargar} title="Recargar">🔄</button>
                    <button className="btn-export-admin" onClick={() => handleExportCSV(filtrarInscriptos(), 'Inscriptos')}>📂 Excel</button>
                    <button className="btn-print-admin" onClick={handlePrint}>🖨️ Imprimir</button>
                  </div>
                </div>
             </div>
             <table className="data-table-admin">
               <thead><tr><th>Usuario</th><th>Evento</th><th>Estado</th></tr></thead>
               <tbody>
                 {filtrarInscriptos().map(r => (
                   <tr key={`insc-${r.id_reserva}`}>
                       <td>{r.usuario_nombre}</td><td>{r.nombre_evento}</td>
                       <td><span className={`badge-estado-small ${getBadgeClass(r.estado_reserva)}`}>{r.estado_reserva}</span></td>
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
      {toast && <div className={`toast-notification toast-${toast.tipo}`}>{toast.mensaje}</div>}
      
      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal?.show && (
        <div className="confirm-modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="confirm-modal-content" onClick={e => e.stopPropagation()}>
            <h3>{confirmModal.title}</h3>
            <p>{confirmModal.message}</p>
            <div className="confirm-modal-actions">
              <button className="btn-cancelar" onClick={() => setConfirmModal(null)}>Cancelar</button>
              <button className="btn-confirmar" onClick={confirmModal.onConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {pagoModal.show && pagoModal.reserva && (
        <div className="modal-pago-overlay" onClick={() => setPagoModal({ show: false, reserva: null })}>
          <div className="modal-pago-content" onClick={e => e.stopPropagation()}>
            <div className="modal-pago-header"><h2>CONFIRMAR PAGO</h2></div>
            <div className="modal-pago-detalles">
                <p>Evento: {pagoModal.reserva.nombre_evento}</p>
                <p>Monto: <b>${pagoModal.reserva.monto}</b></p>
            </div>
            <div className="modal-pago-actions">
                <button className="btn-cancelar-pago" onClick={() => setPagoModal({show:false, reserva:null})}>Cancelar</button>
                <button className="btn-confirmar-pago" onClick={handleConfirmarPago}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;