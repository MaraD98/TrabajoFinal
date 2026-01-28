import React, { useState, useEffect } from 'react';

// --- CONFIGURACIÓN ---
const API_URL = import.meta.env.VITE_API_URL; 
const ENDPOINT_INSCRIPCIONES = `${API_URL}/inscripciones`; 
const ENDPOINT_CONFIRMAR = `${API_URL}/inscripciones/confirmar-pago`;

interface Reserva {
  id_reserva: number;
  usuario_email: string; 
  nombre_evento: string;
  estado_reserva: 'Pendiente de Pago' | 'Confirmado' | 'Cancelado';
  monto: number;
  fecha_inscripcion?: string; 
}

const TablaGestionPagos: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  
  // Filtros
  const [filtroTexto, setFiltroTexto] = useState("");
  const [mostrarSoloPendientes, setMostrarSoloPendientes] = useState<boolean>(true);

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    try {
      setCargando(true);
      const response = await fetch(ENDPOINT_INSCRIPCIONES);
      if (response.ok) {
        setReservas(await response.json()); 
      }
    } catch (error) {
      console.error("Error cargando pagos:", error);
    } finally {
      setCargando(false);
    }
  };

  const handleConfirmarPago = async (id: number, monto: number) => {
    if(!confirm(`¿Confirmar recepción de $${monto}?`)) return;
    
    try {
      const response = await fetch(`${ENDPOINT_CONFIRMAR}/${id}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        cargarReservas(); // Recargamos para ver que el dinero pasó a "Cobrado"
      } else {
        alert("Error al procesar el cobro.");
      }
    } catch (error) {
      alert("Error de conexión.");
    }
  };

  // --- LÓGICA DE DATOS ---
  // 1. Filtrado
  const reservasFiltradas = reservas.filter((res) => {
    const texto = filtroTexto.toLowerCase();
    const matchTexto = (res.usuario_email?.toLowerCase() || '').includes(texto) || res.id_reserva.toString().includes(texto);
    const matchEstado = mostrarSoloPendientes ? res.estado_reserva === 'Pendiente de Pago' : true;
    
    // Ocultamos cancelados en la caja para no hacer ruido
    return matchTexto && matchEstado && res.estado_reserva !== 'Cancelado';
  });

  // 2. Cálculos de Dinero (KPIs)
  const totalCobrado = reservas
    .filter(r => r.estado_reserva === 'Confirmado')
    .reduce((acc, curr) => acc + curr.monto, 0);

  const totalPendiente = reservas
    .filter(r => r.estado_reserva === 'Pendiente de Pago')
    .reduce((acc, curr) => acc + curr.monto, 0);

  if (cargando) {
    return <div className="p-10 text-center text-gray-500 animate-pulse">Cargando la caja...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8 font-sans">
      
      {/* HEADER CAJA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
            Caja y Tesorería 💰
          </h1>
          <p className="text-gray-500 mt-1">Gestión de cobros y validación de pagos.</p>
        </div>

        {/* SWITCH DE VISTA */}
        <div className="bg-gray-900 p-1 rounded-lg border border-gray-800 flex">
          <button 
            onClick={() => setMostrarSoloPendientes(true)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${mostrarSoloPendientes ? 'bg-yellow-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            Por Cobrar
          </button>
          <button 
            onClick={() => setMostrarSoloPendientes(false)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${!mostrarSoloPendientes ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            Historial Completo
          </button>
        </div>
      </div>

      {/* TARJETAS DE DINERO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Tarjeta 1: Lo que falta cobrar */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-yellow-500 text-6xl font-bold">$</div>
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pendiente de Ingreso</h3>
          <p className="text-4xl font-bold text-yellow-400 mt-2">${totalPendiente}</p>
          <p className="text-sm text-gray-600 mt-1">Dinero en espera de confirmación</p>
        </div>

        {/* Tarjeta 2: Lo que ya entró */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-green-500 text-6xl font-bold">$</div>
          <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Recaudado</h3>
          <p className="text-4xl font-bold text-green-400 mt-2">${totalCobrado}</p>
          <p className="text-sm text-gray-600 mt-1">Pagos confirmados exitosamente</p>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="mb-6">
        <input 
          type="text" 
          placeholder="🔎 Buscar por email o ID de reserva..." 
          className="w-full bg-gray-900 border border-gray-800 text-white p-3 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
        />
      </div>

      {/* TABLA DE COBROS */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-gray-950 text-gray-400 uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 border-b border-gray-800">ID</th>
              <th className="p-4 border-b border-gray-800">Cliente</th>
              <th className="p-4 border-b border-gray-800">Evento</th>
              <th className="p-4 border-b border-gray-800 text-right">Monto</th>
              <th className="p-4 border-b border-gray-800 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {reservasFiltradas.length > 0 ? (
              reservasFiltradas.map((res) => (
                <tr key={res.id_reserva} className="hover:bg-gray-800/50 transition-colors group">
                  <td className="p-4 text-gray-500 font-mono">#{res.id_reserva}</td>
                  <td className="p-4 font-medium text-white">{res.usuario_email}</td>
                  <td className="p-4 text-gray-400">{res.nombre_evento}</td>
                  <td className="p-4 text-right font-mono text-lg text-white">
                    ${res.monto}
                  </td>
                  <td className="p-4 text-right">
                    {res.estado_reserva === 'Pendiente de Pago' ? (
                      <button 
                        onClick={() => handleConfirmarPago(res.id_reserva, res.monto)}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-xs font-bold shadow-lg shadow-green-900/20 transform active:scale-95 transition-all"
                      >
                        COBRAR 💵
                      </button>
                    ) : (
                      <span className="text-green-500 text-xs font-bold border border-green-900 bg-green-900/20 px-3 py-1 rounded-full">
                        PAGADO
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <span className="text-3xl mb-2">✨</span>
                    <p>No hay cobros pendientes aquí.</p>
                  </div>
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