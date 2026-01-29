import React, { useState, useEffect } from "react";
import '../styles/gestion-pagos.css';

const API_URL = import.meta.env.VITE_API_URL;
const ENDPOINT_INSCRIPCIONES = `${API_URL}/inscripciones`;

// --- 1. DICCIONARIOS DE TRADUCCIÓN ---
// Como el backend manda números (ID), nosotros ponemos los nombres acá.
const TIPO_MAP: Record<number, string> = {
  1: "Carrera",
  2: "Paseo",
  3: "Entrenamiento",
  4: "Cicloturismo"
};

const NIVEL_MAP: Record<number, string> = {
  1: "Básico",
  2: "Intermedio",
  3: "Avanzado"
};

// --- 2. INTERFACES ACTUALIZADAS ---
interface Evento {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string; 
  id_tipo: number;       // Recibimos el ID
  id_dificultad: number; // Recibimos el ID
  // Estos dos los calculamos nosotros en el frontend:
  tipo_nombre_calculado?: string; 
  nivel_nombre_calculado?: string;
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

  // Estados de Inputs
  const [inputBusqueda, setInputBusqueda] = useState("");
  const [inputTipo, setInputTipo] = useState("");
  const [inputNivel, setInputNivel] = useState("");
  const [inputFechaInicio, setInputFechaInicio] = useState("");
  const [inputFechaFin, setInputFechaFin] = useState("");

  // Estados de Filtros (Solo se actualizan al dar click en BUSCAR)
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    busqueda: "", tipo: "", nivel: "", fechaInicio: "", fechaFin: ""
  });

  const tiposEventoOpciones = ['Carrera', 'Paseo', 'Entrenamiento', 'Cicloturismo'];
  const nivelesOpciones = ['Básico', 'Intermedio', 'Avanzado'];

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
        
        // --- MAPEADO DE DATOS (EL ARREGLO ESTÁ ACÁ) ---
        const reservasMapeadas: Reserva[] = data.map((item: any) => {
            // El backend a veces manda el evento dentro de "evento" o plano en "item"
            const eventoData = item.evento || item; 

            // 1. FECHA: Usamos fecha_evento directo del objeto.
            const fechaReal = eventoData.fecha_evento || "2099-01-01";

            // 2. IDs: Capturamos los números
            const idTipo = eventoData.id_tipo || 1;
            const idNivel = eventoData.id_dificultad || 1;

            // 3. TRADUCCIÓN: Convertimos ID -> Texto usando los mapas de arriba
            const nombreTipo = TIPO_MAP[idTipo] || "General";
            const nombreNivel = NIVEL_MAP[idNivel] || "Básico";

            return {
                id_reserva: item.id_reserva,
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
                    id_tipo: idTipo,
                    id_dificultad: idNivel,
                    // Guardamos los nombres traducidos para mostrarlos fácil
                    tipo_nombre_calculado: nombreTipo,
                    nivel_nombre_calculado: nombreNivel
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
          tipo: inputTipo,
          nivel: inputNivel,
          fechaInicio: inputFechaInicio,
          fechaFin: inputFechaFin
      });
  };

  const handleLimpiar = () => {
      setInputBusqueda(""); setInputTipo(""); setInputNivel("");
      setInputFechaInicio(""); setInputFechaFin("");
      setFiltrosAplicados({ busqueda: "", tipo: "", nivel: "", fechaInicio: "", fechaFin: "" });
  };

  // --- LÓGICA DE FILTRADO ---
  const inscriptosFiltrados = reservas.filter((reserva) => {
    const { busqueda, tipo, nivel, fechaInicio, fechaFin } = filtrosAplicados;
    const termino = busqueda.toLowerCase();
    
    // Buscador general
    const coincideBusqueda = 
      reserva.id_reserva.toString().includes(termino) ||
      reserva.usuario.email.toLowerCase().includes(termino) ||
      (reserva.usuario.nombre || "").toLowerCase().includes(termino);

    // Filtros exactos (comparando con el nombre traducido)
    const coincideTipo = tipo === "" || reserva.evento.tipo_nombre_calculado === tipo;
    const coincideNivel = nivel === "" || reserva.evento.nivel_nombre_calculado === nivel;

    // Filtros de fecha (sobre la fecha del evento)
    const fechaEvento = new Date(reserva.evento.fecha_evento);
    const cumpleInicio = !fechaInicio || fechaEvento >= new Date(fechaInicio);
    
    let cumpleFin = true;
    if (fechaFin) {
        const fin = new Date(fechaFin);
        fin.setHours(23, 59, 59); // Incluir todo el día final
        cumpleFin = fechaEvento <= fin;
    }

    return coincideBusqueda && coincideTipo && coincideNivel && cumpleInicio && cumpleFin;
  });

  return (
    <div className="pagos-container">
      <div className="pagos-header">
        <div className="pagos-title">
             <h1>👥 Reporte de Inscriptos</h1>
             <p>Visualizá y filtrá todos los usuarios confirmados.</p>
        </div>
        <div style={{marginTop: '10px'}}>
             <span className="badge-estado" style={{background: '#00d4ff', color: '#000'}}>
                Total: {inscriptosFiltrados.length} registros
             </span>
        </div>
      </div>

      <div style={{ 
          backgroundColor: '#1e1e1e', padding: '20px', borderRadius: '12px', 
          marginBottom: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end',
          border: '1px solid #333'
      }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{color: '#aaa', fontSize: '0.9em', display:'block', marginBottom:'5px'}}>🔍 Buscar</label>
          <input type="text" placeholder="ID, Email..." value={inputBusqueda} onChange={(e) => setInputBusqueda(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white'}} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{color: '#aaa', fontSize: '0.9em', display:'block', marginBottom:'5px'}}>🚴 Tipo</label>
          <select value={inputTipo} onChange={(e) => setInputTipo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white'}}>
            <option value="">Todos</option>
            {tiposEventoOpciones.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{color: '#aaa', fontSize: '0.9em', display:'block', marginBottom:'5px'}}>📊 Nivel</label>
          <select value={inputNivel} onChange={(e) => setInputNivel(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white'}}>
            <option value="">Todos</option>
            {nivelesOpciones.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
           <label style={{color: '#aaa', fontSize: '0.9em', display:'block', marginBottom:'5px'}}>📅 Desde</label>
           <input type="date" value={inputFechaInicio} onChange={(e) => setInputFechaInicio(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white'}} />
        </div>
        <div>
           <label style={{color: '#aaa', fontSize: '0.9em', display:'block', marginBottom:'5px'}}>📅 Hasta</label>
           <input type="date" value={inputFechaFin} onChange={(e) => setInputFechaFin(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #444', background: '#222', color: 'white'}} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleBuscar} style={{ padding: '10px 20px', background: '#007bff', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '42px' }}>BUSCAR</button>
            <button onClick={handleLimpiar} style={{ padding: '10px 20px', background: '#444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', height: '42px' }}>Limpiar</button>
        </div>
      </div>

      <div className="tabla-container">
        {loading ? <div style={{textAlign:'center', padding:'20px'}}>Cargando...</div> : 
         inscriptosFiltrados.length === 0 ? <div style={{textAlign:'center', padding:'20px', color:'#888'}}>Sin resultados.</div> : (
            <table className="tabla-pagos">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Usuario</th>
                    <th>Evento (Fecha Carrera)</th>
                    <th>Inscripción</th>
                    <th>Tipo / Nivel</th> 
                    <th>Monto</th>
                </tr>
                </thead>
                <tbody>
                {inscriptosFiltrados.map((reserva) => (
                    <tr key={reserva.id_reserva}>
                    <td style={{fontWeight:'bold', color: '#aaa'}}>#{reserva.id_reserva}</td>
                    <td>
                        <div style={{display:'flex', flexDirection:'column'}}>
                            <span style={{color: '#fff', fontWeight:'bold'}}>{reserva.usuario.email}</span>
                            <span style={{fontSize:'0.85em', color:'#aaa'}}>{reserva.usuario.nombre} {reserva.usuario.apellido}</span>
                        </div>
                    </td>
                    <td>
                        <div style={{fontWeight: 'bold', color: '#fff'}}>{reserva.evento.nombre_evento}</div>
                        {/* AQUI MOSTRAMOS LA FECHA REAL */}
                        <div style={{fontSize:'0.8em', color:'#4caf50'}}>
                            🏁 {reserva.evento.fecha_evento}
                        </div>
                    </td>
                    <td><span style={{fontSize:'0.9em', color:'#aaa'}}>{new Date(reserva.fecha_inscripcion).toLocaleDateString()}</span></td>
                    <td>
                        {/* AQUI MOSTRAMOS LOS NOMBRES TRADUCIDOS */}
                        <span style={{display:'block', fontSize:'0.9em', fontWeight: 'bold'}}>{reserva.evento.tipo_nombre_calculado}</span>
                        <span style={{display:'inline-block', fontSize:'0.75em', marginTop: '4px', padding: '2px 6px', borderRadius: '4px', background: '#333', color:'#ccc'}}>
                            {reserva.evento.nivel_nombre_calculado}
                        </span>
                    </td>
                    <td className="monto-cell">${reserva.monto_total}</td>
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