import React, { useState, useEffect } from "react";
import { AdminService } from "../services/admin-service";
import '../styles/inscripciones.css'; // 👈 IMPORTANTE: Asegúrate de que la ruta sea correcta

// Interfaces
interface TipoEvento { id: number; nombre: string; }
interface NivelDificultad { id: number; nombre: string; }
interface Evento {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  tipo_evento: TipoEvento;
  nivel_dificultad: NivelDificultad;
  ubicacion: string;
}
interface Usuario {
  id_usuario: number;
  email: string;
  nombre?: string;
  apellido?: string;
}
interface Reserva {
  id_reserva: number;
  estado: string;
  fecha_reserva: string;
  monto_total: number;
  usuario: Usuario;
  evento: Evento;
}

const PanelInscriptos: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroNivel, setFiltroNivel] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const tiposEventoOpciones = ['Carrera', 'Paseo', 'Entrenamiento', 'Cicloturismo'];
  const nivelesOpciones = ['Básico', 'Intermedio', 'Avanzado'];

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    setLoading(true);
    try {
      const data = await AdminService.obtenerTodasLasReservas(); 
      setReservas(data);
    } catch (error) {
      console.error("Error cargando inscriptos:", error);
    } finally {
      setLoading(false);
    }
  };

  const inscriptosFiltrados = reservas.filter((reserva) => {
    const termino = busqueda.toLowerCase();
    const coincideBusqueda = 
      reserva.id_reserva.toString().includes(termino) ||
      reserva.usuario.email.toLowerCase().includes(termino) ||
      (reserva.usuario.nombre && reserva.usuario.nombre.toLowerCase().includes(termino));

    const coincideTipo = filtroTipo === "" || reserva.evento.tipo_evento?.nombre === filtroTipo;
    const coincideNivel = filtroNivel === "" || reserva.evento.nivel_dificultad?.nombre === filtroNivel;

    const fechaEvento = new Date(reserva.evento.fecha_evento);
    let cumpleFechaInicio = true;
    if (fechaInicio) cumpleFechaInicio = fechaEvento >= new Date(fechaInicio);

    let cumpleFechaFin = true;
    if (fechaFin) {
      const fin = new Date(fechaFin);
      fin.setHours(23, 59, 59);
      cumpleFechaFin = fechaEvento <= fin;
    }

    return coincideBusqueda && coincideTipo && coincideNivel && cumpleFechaInicio && cumpleFechaFin;
  });

  const totalFiltrados = inscriptosFiltrados.length;
  const totalDineroVisible = inscriptosFiltrados.reduce((acc, curr) => acc + (curr.monto_total || 0), 0);

  return (
    <div className="card-section">
      <div className="section-header-inline">
        <h2 className="section-subtitle">
          👥 Reporte de Inscriptos
        </h2>
        <div className="badge-resumen">
          {totalFiltrados} registros
        </div>
      </div>

      {/* --- FILTROS --- */}
      <div className="filters-container">
        <div className="filter-group">
          <label className="filter-label">🔍 Buscar</label>
          <input
            type="text"
            placeholder="ID, Email o Nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">🚴 Tipo</label>
          <select 
            value={filtroTipo} 
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="filter-input"
          >
            <option value="">Todos</option>
            {tiposEventoOpciones.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">📊 Nivel</label>
          <select 
            value={filtroNivel} 
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="filter-input"
          >
            <option value="">Todos</option>
            {nivelesOpciones.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">📅 Desde</label>
          <input 
            type="date" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label className="filter-label">📅 Hasta</label>
          <input 
            type="date" 
            value={fechaFin} 
            onChange={(e) => setFechaFin(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
            <button 
                onClick={() => {
                    setBusqueda(""); setFiltroTipo(""); setFiltroNivel(""); setFechaInicio(""); setFechaFin("");
                }}
                className="btn-limpiar"
            >
                Limpiar
            </button>
        </div>
      </div>

      {/* --- TABLA --- */}
      {loading ? (
        <div className="loading-state">Cargando historial completo...</div>
      ) : inscriptosFiltrados.length === 0 ? (
        <div className="empty-state">
           No se encontraron reservas con estos filtros.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Evento</th>
                <th>Tipo</th>
                <th>Nivel</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inscriptosFiltrados.map((reserva) => (
                <tr key={reserva.id_reserva}>
                  <td style={{fontWeight:'bold'}}>#{reserva.id_reserva}</td>
                  <td>
                    <div className="user-cell">
                        <span className="user-email">{reserva.usuario.email}</span>
                        <span className="user-name">
                            {reserva.usuario.nombre} {reserva.usuario.apellido}
                        </span>
                    </div>
                  </td>
                  <td className="td-evento">{reserva.evento.nombre_evento}</td>
                  <td>
                    <span className="badge-tipo">
                        {reserva.evento.tipo_evento?.nombre || '-'}
                    </span>
                  </td>
                  <td>
                     <span style={{fontSize: '0.85rem', color: '#9ca3af'}}>
                        {reserva.evento.nivel_dificultad?.nombre || '-'}
                     </span>
                  </td>
                  <td>{reserva.evento.fecha_evento}</td>
                  <td>
                    <span className={`badge-estado ${reserva.estado.toLowerCase().replace(' ', '-')}`}>
                      {reserva.estado}
                    </span>
                  </td>
                  <td>
                    <button className="btn-ver" title="Ver detalle">👁️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="reporte-footer">
              <h4>📊 Resumen del Reporte Actual:</h4>
              <p>
                  Mostrando <strong>{totalFiltrados}</strong> inscripciones filtradas. 
                  Total recaudado en esta selección: <strong>${totalDineroVisible.toLocaleString()}</strong>.
              </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PanelInscriptos;