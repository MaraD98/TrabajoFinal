import React, { useState, useEffect } from "react";
import '../styles/gestion-pagos.css'; // Asegúrate que este apunte a tu CSS nuevo

const API_URL = import.meta.env.VITE_API_URL;
const ENDPOINT_INSCRIPCIONES = `${API_URL}/inscripciones`;

// --- INTERFACES SIMPLIFICADAS (Sin Tipo ni Nivel) ---
interface Evento {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string; 
}

interface Usuario {
  email: string;
  nombre?: string;
  apellido?: string;
}

interface Reserva {
  id_reserva: number;
  fecha_inscripcion: string;
  monto_total: number;
  usuario: Usuario;
  evento: Evento;
}

const PanelInscriptos: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Inputs (Solo Buscador y Fechas)
  const [inputBusqueda, setInputBusqueda] = useState("");
  const [inputFechaInicio, setInputFechaInicio] = useState("");
  const [inputFechaFin, setInputFechaFin] = useState("");

  // Estados de Filtros Aplicados
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    busqueda: "", fechaInicio: "", fechaFin: ""
  });

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(ENDPOINT_INSCRIPCIONES, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // --- MAPEADO DE DATOS ---
        const reservasMapeadas: Reserva[] = data.map((item: any) => {
            const eventoData = item.evento || item; 
            const fechaReal = eventoData.fecha_evento || "2099-01-01";

            return {
                id_reserva: item.id_reserva,
                // Manejo robusto de fechas
                fecha_inscripcion: item.fecha_creacion || item.fecha_reserva || new Date().toISOString(),
                monto_total: item.monto || item.monto_total || 0,
                usuario: {
                    email: item.usuario_email || item.usuario?.email || "Sin Email",
                    nombre: item.usuario_nombre || item.usuario?.nombre || "",
                    apellido: item.usuario_apellido || item.usuario?.apellido || ""
                },
                evento: {
                    id_evento: eventoData.id_evento || 0,
                    nombre_evento: eventoData.nombre_evento || "Evento Desconocido",
                    fecha_evento: fechaReal,
                }
            };
        });

        setReservas(reservasMapeadas);
      }
    } catch (error) {
      console.error("Error cargando inscriptos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
      setFiltrosAplicados({
          busqueda: inputBusqueda,
          fechaInicio: inputFechaInicio,
          fechaFin: inputFechaFin
      });
  };

  const handleLimpiar = () => {
      setInputBusqueda(""); 
      setInputFechaInicio(""); 
      setInputFechaFin("");
      setFiltrosAplicados({ busqueda: "", fechaInicio: "", fechaFin: "" });
  };

  // --- LÓGICA DE FILTRADO ---
  const inscriptosFiltrados = reservas.filter((reserva) => {
    const { busqueda, fechaInicio, fechaFin } = filtrosAplicados;
    const termino = busqueda.toLowerCase();
    
    // Buscador general (ID, Email, Nombre, Evento)
    const coincideBusqueda = 
      reserva.id_reserva.toString().includes(termino) ||
      reserva.usuario.email.toLowerCase().includes(termino) ||
      (reserva.usuario.nombre || "").toLowerCase().includes(termino) ||
      reserva.evento.nombre_evento.toLowerCase().includes(termino);

    // Filtros de fecha (sobre la fecha del evento)
    const fechaEvento = new Date(reserva.evento.fecha_evento);
    const cumpleInicio = !fechaInicio || fechaEvento >= new Date(fechaInicio);
    
    let cumpleFin = true;
    if (fechaFin) {
        const fin = new Date(fechaFin);
        fin.setHours(23, 59, 59);
        cumpleFin = fechaEvento <= fin;
    }

    return coincideBusqueda && cumpleInicio && cumpleFin;
  });

  return (
    <div className="pagos-container">
      
      {/* HEADER CON TÍTULO Y TOTAL */}
      <div className="pagos-header">
        <div className="pagos-title-block">
             <h1>👥 Reporte de Inscriptos</h1>
             <p>Visualizá y filtrá todos los usuarios confirmados.</p>
        </div>
        <div className="badge-total-registros">
             Total: {inscriptosFiltrados.length} Registros
        </div>
      </div>

      {/* FILTROS (Sin Tipo ni Nivel) */}
      <div className="filtros-wrapper">
        
        <div className="filtro-group">
          <label>🔍 Buscar</label>
          <input 
            type="text" 
            className="input-dark"
            placeholder="ID, Email, Evento..." 
            value={inputBusqueda} 
            onChange={(e) => setInputBusqueda(e.target.value)} 
          />
        </div>
        
        <div className="filtro-group">
           <label>📅 Desde</label>
           <input 
             type="date" 
             className="input-dark"
             value={inputFechaInicio} 
             onChange={(e) => setInputFechaInicio(e.target.value)} 
           />
        </div>
        
        <div className="filtro-group">
           <label>📅 Hasta</label>
           <input 
             type="date" 
             className="input-dark"
             value={inputFechaFin} 
             onChange={(e) => setInputFechaFin(e.target.value)} 
           />
        </div>
        
        <div className="filtro-actions">
            <button className="btn-buscar" onClick={handleBuscar}>BUSCAR</button>
            <button className="btn-limpiar" onClick={handleLimpiar}>X</button>
        </div>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="tabla-container">
        {loading ? (
            <div className="tabla-mensaje">Cargando datos...</div>
        ) : inscriptosFiltrados.length === 0 ? (
            <div className="tabla-mensaje">Sin resultados.</div>
        ) : (
            <table className="tabla-pagos">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Evento (Fecha Carrera)</th>
                    <th>Fecha Inscripción</th>
                    {/* COLUMNA TIPO/NIVEL ELIMINADA */}
                    <th>Monto</th>
                </tr>
                </thead>
                <tbody>
                {inscriptosFiltrados.map((reserva) => (
                    <tr key={reserva.id_reserva}>
                    <td className="col-id">#{reserva.id_reserva}</td>
                    
                    <td>
                        <div className="user-cell">
                            <span className="user-email">{reserva.usuario.email}</span>
                            <span className="user-name">{reserva.usuario.nombre} {reserva.usuario.apellido}</span>
                        </div>
                    </td>
                    
                    <td>
                        <div className="event-cell">
                            <span className="event-name">{reserva.evento.nombre_evento}</span>
                            <span className="event-date">
                                🏁 {reserva.evento.fecha_evento}
                            </span>
                        </div>
                    </td>
                    
                    <td>{new Date(reserva.fecha_inscripcion).toLocaleDateString()}</td>
                    
                    {/* CELDA TIPO/NIVEL ELIMINADA */}

                    <td className="col-monto">${reserva.monto_total}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        )}
      </div>
    </div>
  );
};

export default PanelInscriptos;