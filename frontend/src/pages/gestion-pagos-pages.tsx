import React, { useState, useEffect } from 'react';
import '../styles/gestion-pagos.css';

const API_URL = import.meta.env.VITE_API_URL; 
const ENDPOINT_INSCRIPCIONES = `${API_URL}/inscripciones`; 
const ENDPOINT_CONFIRMAR = `${API_URL}/inscripciones/confirmar-pago`;

interface Reserva {
  id_reserva: number;
  usuario_email: string; 
  nombre_evento: string;
  estado_reserva: string; // Lo dejo como string genérico para evitar errores
  monto: number;
}

const TablaGestionPagos: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    try {
      setCargando(true);
      const response = await fetch(ENDPOINT_INSCRIPCIONES);
      if (response.ok) {
        const data = await response.json();
        console.log("DATOS PUROS:", data); // Mirá la consola (F12) si la tabla sigue vacía
        setReservas(data); 
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setCargando(false);
    }
  };

  const handleConfirmarPago = async (id: number) => {
    if(!window.confirm("¿Confirmar pago recibido?")) return;
    
    try {
      const response = await fetch(`${ENDPOINT_CONFIRMAR}/${id}`, {
        method: 'POST', // O PUT, depende de tu backend, probá POST primero
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        alert("Pago registrado ✅");
        cargarReservas(); // Recarga la lista
      } else {
        alert("Error al confirmar.");
      }
    } catch (error) {
      alert("Error de conexión.");
    }
  };

  // FILTRO: Solo mostramos lo que tenga la palabra "pendiente" (sin importar mayúsculas)
  const pendientes = reservas.filter(r => {
    const estado = r.estado_reserva ? r.estado_reserva.toString().toLowerCase() : '';
    return estado.includes('pendiente');
  });

  if (cargando) return <div className="pagos-container"><p>Cargando...</p></div>;

  return (
    <div className="pagos-container">
      <div className="pagos-header">
        <div className="pagos-title">
          <h1>Pagos Pendientes</h1>
          <p>Confirmá las reservas que ya abonaron.</p>
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
            {pendientes.length > 0 ? (
              pendientes.map((res) => (
                <tr key={res.id_reserva}>
                  <td>#{res.id_reserva}</td>
                  <td>{res.usuario_email || 'Sin email'}</td>
                  <td>{res.nombre_evento || 'Evento ver detalle'}</td>
                  <td className="monto-cell">${res.monto}</td>
                  <td>
                    <span className="badge-estado pendiente">
                      {res.estado_reserva}
                    </span>
                  </td>
                  <td className="text-right">
                    <button 
                      onClick={() => handleConfirmarPago(res.id_reserva)}
                      className="btn-cobrar"
                    >
                      COBRAR 💵
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{textAlign: 'center', padding: '20px'}}>
                  <h3>¡Todo al día!</h3>
                  <p>No hay pagos pendientes para aprobar.</p>
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