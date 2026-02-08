import React, { useState, useEffect } from "react";
import '../styles/inscripciones.css';
import { useAuth } from "../context/auth-context"; // 1. Importamos el hook de auth

const API_URL = import.meta.env.VITE_API_URL;
const ENDPOINT_INSCRIPCIONES = `${API_URL}/inscripciones`;

// --- INTERFACES ---
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
  usuario: Usuario;
  evento: Evento;
}

const PanelInscriptos: React.FC = () => {
  const { getToken, user } = useAuth(); // 2. Usamos el token y el usuario del contexto
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Inputs
  const [inputBusqueda, setInputBusqueda] = useState("");
  const [inputFechaInicio, setInputFechaInicio] = useState("");
  const [inputFechaFin, setInputFechaFin] = useState("");

  const [filtrosAplicados, setFiltrosAplicados] = useState({
    busqueda: "", fechaInicio: "", fechaFin: ""
  });

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    setLoading(true);
    const token = getToken(); // 3. Obtenemos el token correctamente (de session o local)
    
    if (!token) {
        console.error("No hay token disponible");
        setLoading(false);
        return;
    }

    try {
      const response = await fetch(ENDPOINT_INSCRIPCIONES, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const reservasMapeadas: Reserva[] = data.map((item: any) => {
            const eventoData = item.evento || item; 
            const fechaReal = eventoData.fecha_evento || "2099-01-01";
            return {
                id_reserva: item.id_reserva,
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
      } else if (response.status === 403) {
          // 4. Si el servidor dice que no tenés permiso
          alert("No tienes permisos para ver este reporte.");
      }
    } catch (error) {
      console.error("Error cargando inscriptos:", error);
    } finally {
      setLoading(false);
    }
  };

  // ... (el resto de las funciones handleBuscar, handleLimpiar, handleExportarCSV quedan igual)
  const handleBuscar = () => {
    setFiltrosAplicados({ busqueda: inputBusqueda, fechaInicio: inputFechaInicio, fechaFin: inputFechaFin });
  };

  const handleLimpiar = () => {
    setInputBusqueda(""); setInputFechaInicio(""); setInputFechaFin("");
    setFiltrosAplicados({ busqueda: "", fechaInicio: "", fechaFin: "" });
  };

  const inscriptosFiltrados = reservas.filter((reserva) => {
    const { busqueda, fechaInicio, fechaFin } = filtrosAplicados;
    const termino = busqueda.toLowerCase();
    
    const coincideBusqueda = 
      reserva.id_reserva.toString().includes(termino) ||
      reserva.usuario.email.toLowerCase().includes(termino) ||
      (reserva.usuario.nombre || "").toLowerCase().includes(termino) ||
      reserva.evento.nombre_evento.toLowerCase().includes(termino);

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

  const handleExportarCSV = () => {
    const cabeceras = ["ID", "Nombre", "Apellido", "Email", "Evento", "Fecha Carrera"];
    const filas = inscriptosFiltrados.map(r => [
        r.id_reserva, r.usuario.nombre, r.usuario.apellido, r.usuario.email, r.evento.nombre_evento, r.evento.fecha_evento
    ]);
    const csvContent = [cabeceras.join(","), ...filas.map(f => f.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "inscriptos_confirmados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImprimir = () => { window.print(); };

  return (
    <div className="inscripciones-container">
      <div className="header-top">
        <div className="title-block">
             <h1>👥 Reporte de Inscriptos</h1>
             <p>Bienvenido, {user?.nombre_y_apellido || 'Usuario'}. Visualizá los corredores.</p>
        </div>
        
        <div className="actions-block">
             <button className="btn-action btn-csv" onClick={handleExportarCSV} title="Exportar a Excel/CSV">📂</button>
             <button className="btn-action btn-print" onClick={handleImprimir} title="Imprimir Listado">🖨️</button>
             
             <div className="badge-count">
                 Total: {inscriptosFiltrados.length}
             </div>
        </div>
      </div>

      <div className="filtros-bar no-print">
        <div className="filtro-item item-grow">
          <label>🔍 Buscar Corredor / Evento</label>
          <input 
            type="text" className="input-custom" placeholder="ID, Nombre, Email..." 
            value={inputBusqueda} onChange={(e) => setInputBusqueda(e.target.value)} 
          />
        </div>
        <div className="filtro-item">
           <label>📅 Fecha Carrera Desde</label>
           <input type="date" className="input-custom" value={inputFechaInicio} onChange={(e) => setInputFechaInicio(e.target.value)} />
        </div>
        <div className="filtro-item">
           <label>📅 Fecha Carrera Hasta</label>
           <input type="date" className="input-custom" value={inputFechaFin} onChange={(e) => setInputFechaFin(e.target.value)} />
        </div>
        <div className="botones-filtro">
            <button className="btn-search" onClick={handleBuscar}>BUSCAR</button>
            <button className="btn-clear" onClick={handleLimpiar}>X</button>
        </div>
      </div>

      <div className="tabla-wrapper">
        {loading ? (
            <div className="loading-msg">Cargando datos...</div>
        ) : inscriptosFiltrados.length === 0 ? (
            <div className="empty-msg">No se encontraron inscriptos.</div>
        ) : (
            <table className="tabla-inscriptos">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Corredor</th>
                    <th>Evento (Fecha Carrera)</th>
                </tr>
                </thead>
                <tbody>
                {inscriptosFiltrados.map((reserva) => (
                    <tr key={reserva.id_reserva}>
                        <td className="cell-id">#{reserva.id_reserva}</td>
                        <td>
                            <div className="cell-user">
                                <span className="text-destacado">{reserva.usuario.nombre} {reserva.usuario.apellido}</span>
                                <span className="text-sub">{reserva.usuario.email}</span>
                            </div>
                        </td>
                        <td>
                            <div className="cell-event">
                                <span className="text-destacado">{reserva.evento.nombre_evento}</span>
                                <span className="fecha-carrera">🏁 {reserva.evento.fecha_evento}</span>
                            </div>
                        </td>
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