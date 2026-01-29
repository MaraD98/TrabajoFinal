import React, { useState, useEffect } from 'react';
import '../styles/gestion-pagos.css';

const API_URL = import.meta.env.VITE_API_URL; 
const ENDPOINT_INSCRIPCIONES = `${API_URL}/inscripciones`; 
const ENDPOINT_CONFIRMAR = `${API_URL}/inscripciones/confirmar-pago`;

interface Reserva {
  id_reserva: number;
  usuario_email: string; 
  nombre_evento: string;
  estado_reserva: string; 
  monto: number;
}

const TablaGestionPagos: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  
  // ESTADOS DE FILTRO
  const [filtro, setFiltro] = useState<number>(0); // 0: Todos, 1: Pendientes, 2: Confirmados
  const [busqueda, setBusqueda] = useState<string>(""); // <--- NUEVO ESTADO PARA EL BUSCADOR

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    try {
      setCargando(true);
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn("No se encontró token.");
        alert("Debes iniciar sesión para ver los pagos.");
        setCargando(false);
        return;
      }

      const response = await fetch(ENDPOINT_INSCRIPCIONES, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setReservas(data); 
      } else {
        console.error("Error del servidor:", response.status);
        if (response.status === 401) alert("Sesión expirada.");
      }

    } catch (error) {
      console.error("Error de conexión:", error);
    } finally {
      setCargando(false);
    }
  };

  const handleConfirmarPago = async (id: number) => {
    if(!window.confirm("¿Confirmar que recibiste el dinero?")) return;
    
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${ENDPOINT_CONFIRMAR}/${id}`, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert("¡Pago registrado con éxito! ✅");
        cargarReservas(); 
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.detail || "No se pudo confirmar"}`);
      }
    } catch (error) {
      alert("Error de conexión con el servidor.");
    }
  };

  // --- LÓGICA DE FILTRADO COMBINADA (Estado + Buscador) ---
  const reservasFiltradas = reservas.filter((r) => {
    // 1. Primero filtramos por ESTADO (Pendiente/Confirmado/Todos)
    let pasaFiltroEstado = true;
    if (filtro === 1) pasaFiltroEstado = r.estado_reserva.includes("Pendiente");
    if (filtro === 2) pasaFiltroEstado = r.estado_reserva === "Confirmado";

    // 2. Después filtramos por TEXTO (Buscador)
    const texto = busqueda.toLowerCase();
    const pasaBusqueda = 
        r.usuario_email.toLowerCase().includes(texto) || // Busca por email
        r.nombre_evento.toLowerCase().includes(texto) || // Busca por evento
        r.id_reserva.toString().includes(texto);         // Busca por ID

    return pasaFiltroEstado && pasaBusqueda;
  });

  if (cargando) return <div className="pagos-container"><p>Cargando listado...</p></div>;

  return (
    <div className="pagos-container">
      <div className="pagos-header">
        <div className="pagos-title">
          <h1>Gestión de Pagos</h1>
          <p>Control de inscripciones y confirmación de pagos.</p>
        </div>
      </div>

      {/* --- BARRA DE HERRAMIENTAS: BOTONES + BUSCADOR --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', marginTop: '10px' }}>
        
        {/* BUSCADOR */}
        <input 
          type="text" 
          placeholder="🔍 Buscar por email, evento o ID..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #444',
            backgroundColor: '#222',
            color: 'white',
            fontSize: '1rem',
            width: '100%',
            maxWidth: '500px'
          }}
        />

        {/* BOTONES DE FILTRO */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setFiltro(1)} 
            style={{
              padding: '10px 20px', cursor: 'pointer', borderRadius: '8px', border: 'none', fontWeight: 'bold',
              backgroundColor: filtro === 1 ? '#ffc107' : '#333', color: filtro === 1 ? '#000' : '#fff'
            }}
          >
            ⏳ Pendientes
          </button>
          <button 
            onClick={() => setFiltro(2)} 
            style={{
              padding: '10px 20px', cursor: 'pointer', borderRadius: '8px', border: 'none', fontWeight: 'bold',
              backgroundColor: filtro === 2 ? '#28a745' : '#333', color: '#fff'
            }}
          >
            ✅ Confirmados
          </button>
          <button 
            onClick={() => setFiltro(0)} 
            style={{
              padding: '10px 20px', cursor: 'pointer', borderRadius: '8px', border: 'none', fontWeight: 'bold',
              backgroundColor: filtro === 0 ? '#007bff' : '#333', color: '#fff'
            }}
          >
            📋 Todos
          </button>
        </div>
      </div>

      <div className="tabla-container">
        <table className="tabla-pagos">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Evento</th>
              <th>Monto</th>
              <th>Estado</th>
              <th className="text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {reservasFiltradas.length > 0 ? (
              reservasFiltradas.map((res) => (
                <tr key={res.id_reserva}>
                  <td>#{res.id_reserva}</td>
                  <td>{res.usuario_email || 'Usuario eliminado'}</td>
                  <td>{res.nombre_evento || 'Evento eliminado'}</td>
                  <td className="monto-cell">${res.monto}</td>
                  
                  {/* ESTADO CON COLOR */}
                  <td>
                    <span 
                      className={`badge-estado`}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '15px',
                        backgroundColor: res.estado_reserva === 'Confirmado' ? '#d4edda' : '#fff3cd',
                        color: res.estado_reserva === 'Confirmado' ? '#155724' : '#856404',
                        fontWeight: 'bold',
                        fontSize: '0.9em'
                      }}
                    >
                      {res.estado_reserva}
                    </span>
                  </td>

                  {/* ACCIÓN */}
                  <td className="text-right">
                    {res.estado_reserva.includes("Pendiente") ? (
                        <button 
                          onClick={() => handleConfirmarPago(res.id_reserva)}
                          style={{ 
                            cursor: 'pointer', backgroundColor: '#28a745', color: 'white', 
                            border: 'none', padding: '8px 12px', borderRadius: '5px', fontWeight: 'bold'
                          }}
                        >
                          COBRAR 💵
                        </button>
                    ) : (
                        <span style={{color: '#28a745', fontWeight: 'bold'}}>✅ Al día</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{textAlign: 'center', padding: '30px'}}>
                  {reservas.length > 0 ? (
                     <h3>No se encontraron resultados para tu búsqueda 🔍</h3>
                  ) : (
                     <h3>No hay reservas registradas en el sistema.</h3>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TablaGestionPagos;