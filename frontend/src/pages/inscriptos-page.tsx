import React, { useState, useEffect } from 'react';

// --- CONFIGURACIÓN ---
const API_URL = import.meta.env.VITE_API_URL; 
const ENDPOINT_INSCRIPCIONES = `${API_URL}/inscripciones`; 
const ENDPOINT_EVENTOS = `${API_URL}/eventos`;

interface Reserva {
  id_reserva: number;
  usuario_email: string; 
  nombre_evento: string; 
  estado_reserva: string;
  monto: number;
}

interface Evento {
  id: number;
  nombre: string;
  cupo_maximo: number;
}

const PanelInscriptos: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  
  // AQUÍ ESTABA EL ERROR: La definíamos pero no la usábamos. Ahora sí la vamos a usar.
  const [cargando, setCargando] = useState<boolean>(true);

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEvento, setFiltroEvento] = useState("");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      // Pedimos las dos cosas a la vez
      const [resReservas, resEventos] = await Promise.all([
        fetch(ENDPOINT_INSCRIPCIONES),
        fetch(ENDPOINT_EVENTOS)
      ]);
      
      if (resReservas.ok && resEventos.ok) {
        setReservas(await resReservas.json());
        setEventos(await resEventos.json());
      }
    } catch (error) { 
      console.error(error); 
    } finally { 
      // Cuando termina de cargar, apagamos el "Cargando"
      setCargando(false); 
    }
  };

  // Lógica de Filtros
  const listaFinal = reservas.filter((res) => {
    const texto = busqueda.toLowerCase();
    const matchTexto = (res.usuario_email?.toLowerCase() || '').includes(texto) || res.id_reserva.toString().includes(texto);
    const matchEvento = filtroEvento ? res.nombre_evento === filtroEvento : true;
    return matchTexto && matchEvento; 
  });

  // Cálculos
  const totalInscriptos = listaFinal.length;
  const cupoTotalReferencia = filtroEvento 
    ? eventos.find(e => e.nombre === filtroEvento)?.cupo_maximo || 0
    : eventos.reduce((acc, current) => acc + current.cupo_maximo, 0);

  // --- VISTA MIENTRAS CARGA (ESTO FALTABA) ---
  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <p className="text-xl animate-pulse">⏳ Cargando datos del sistema...</p>
      </div>
    );
  }

  // --- VISTA PRINCIPAL ---
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      
      {/* TÍTULO */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Panel de Inscriptos 📋
        </h1>
        <button onClick={cargarDatos} className="bg-gray-800 border border-gray-600 px-4 py-2 rounded hover:bg-gray-700">
          ↻ Actualizar
        </button>
      </div>

      {/* TARJETAS DE DATOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h3 className="text-gray-400 text-xs uppercase font-bold">Total en Lista</h3>
          <p className="text-4xl font-bold text-white mt-2">{totalInscriptos}</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
           <h3 className="text-gray-400 text-xs uppercase font-bold">Cupo Referencia</h3>
           <p className="text-4xl font-bold text-blue-400 mt-2">{cupoTotalReferencia}</p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gray-800 p-4 rounded-lg border border-gray-700">
        <input 
          type="text" 
          placeholder="🔍 Buscar por mail..." 
          className="bg-gray-900 border border-gray-600 text-white p-2 rounded flex-1 outline-none focus:border-blue-500"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select 
          className="bg-gray-900 border border-gray-600 text-white p-2 rounded flex-1 outline-none focus:border-blue-500"
          value={filtroEvento}
          onChange={e => setFiltroEvento(e.target.value)}
        >
          <option value="">-- Todos los Eventos --</option>
          {eventos.map(ev => <option key={ev.id} value={ev.nombre}>{ev.nombre}</option>)}
        </select>
      </div>

      {/* TABLA */}
      <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
            <tr>
              <th className="p-4">ID</th>
              <th className="p-4">Usuario</th>
              <th className="p-4">Evento</th>
              <th className="p-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {listaFinal.map(res => (
              <tr key={res.id_reserva} className="hover:bg-gray-700/50">
                <td className="p-4 text-gray-500">#{res.id_reserva}</td>
                <td className="p-4 font-medium">{res.usuario_email}</td>
                <td className="p-4 text-blue-300">{res.nombre_evento}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs border ${
                    res.estado_reserva === 'Confirmado' ? 'border-green-500 text-green-400' : 
                    res.estado_reserva === 'Cancelado' ? 'border-red-500 text-red-400' : 
                    'border-yellow-500 text-yellow-400'
                  }`}>
                    {res.estado_reserva}
                  </span>
                </td>
              </tr>
            ))}
            {listaFinal.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No hay inscriptos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PanelInscriptos;