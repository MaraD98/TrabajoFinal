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
  const [filtro, setFiltro] = useState<number>(0); 
  const [busqueda, setBusqueda] = useState<string>("");

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
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

  const handleExportarCSV = () => {
    if (reservasFiltradas.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }
    const headers = ["ID", "Usuario", "Evento", "Monto", "Estado"];
    const rows = reservasFiltradas.map(r => {
      const esPendiente = (r.estado_reserva || "").toLowerCase().includes("pendiente");
      return [
        r.id_reserva,
        r.usuario_email,
        r.nombre_evento,
        r.monto,
        esPendiente ? "Pendiente" : "Confirmado"
      ];
    });

    const csvContent = [
      headers.join(","), 
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "reporte_pagos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImprimir = () => {
    window.print();
  };

  // --- LÓGICA DE FILTRADO ---
  const reservasFiltradas = reservas.filter((r) => {
    const estadoStr = (r.estado_reserva || "").toLowerCase();
    const esPendiente = estadoStr.includes("pendiente");

    let pasaFiltroEstado = true;
    if (filtro === 1) pasaFiltroEstado = esPendiente;
    if (filtro === 2) pasaFiltroEstado = !esPendiente;

    const texto = busqueda.toLowerCase();
    const pasaBusqueda = 
        (r.usuario_email || "").toLowerCase().includes(texto) || 
        (r.nombre_evento || "").toLowerCase().includes(texto) || 
        r.id_reserva.toString().includes(texto);

    return pasaFiltroEstado && pasaBusqueda;
  });

  if (cargando) return <div className="pagos-container"><p style={{textAlign:'center', marginTop: '50px'}}>Cargando listado...</p></div>;

  return (
    <div className="pagos-container">
      <div className="pagos-header no-print">
        <div className="pagos-title">
          <h1>Gestión de Pagos</h1>
          <p>Control de inscripciones y confirmación de pagos.</p>
        </div>
      </div>

      {/* --- BARRA DE HERRAMIENTAS --- */}
      <div className="toolbar no-print">
        
        {/* BUSCADOR */}
        <input 
          type="text" 
          placeholder="🔍 Buscar por email, evento o ID..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-buscador" 
        />

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* BOTONES DE FILTRO */}
            <button onClick={() => setFiltro(1)} className={`btn-filtro ${filtro === 1 ? 'btn-amarillo' : 'btn-gris'}`}>
                ⏳ Pendientes
            </button>
            <button onClick={() => setFiltro(2)} className={`btn-filtro ${filtro === 2 ? 'btn-verde' : 'btn-gris'}`}>
                ✅ Confirmados
            </button>
            <button onClick={() => setFiltro(0)} className={`btn-filtro ${filtro === 0 ? 'btn-azul' : 'btn-gris'}`}>
                📋 Todos
            </button>

            {/* SEPARADOR */}
            <div style={{width: '1px', height: '30px', background: '#444', margin: '0 5px'}}></div>

            {/* BOTONES DE ACCIÓN */}
            <button onClick={handleExportarCSV} className="btn-accion-pago" title="Exportar a CSV">
                📂
            </button>
            <button onClick={handleImprimir} className="btn-accion-pago" title="Imprimir Listado">
                🖨️
            </button>
        </div>
      </div>

      <div className="tabla-container">
        <table className="tabla-pagos">
          <thead>
            <tr>
              {/* ACÁ SACAMOS LAS CLASES ALIGN, CSS LO HACE TODO */}
              <th>ID</th>
              <th>Usuario</th>
              <th>Evento</th>
              <th>Monto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {reservasFiltradas.length > 0 ? (
              reservasFiltradas.map((res) => {
                const esPendiente = (res.estado_reserva || "").toLowerCase().includes("pendiente");
                
                return (
                <tr key={res.id_reserva}>
                  <td className="cell-id">#{res.id_reserva}</td>
                  <td>{res.usuario_email || 'Usuario eliminado'}</td>
                  <td>{res.nombre_evento || 'Evento eliminado'}</td>
                  <td className="monto-cell">${res.monto}</td>
                  
                  <td>
                    {esPendiente ? (
                        <button 
                          onClick={() => handleConfirmarPago(res.id_reserva)}
                          className="btn-cobrar no-print"
                        >
                          COBRAR 💵
                        </button>
                    ) : (
                        <span className="badge-al-dia">
                            ✅ Al día
                        </span>
                    )}
                    <span className="only-print">
                        {esPendiente ? "PENDIENTE" : "PAGADO"}
                    </span>
                  </td>
                </tr>
              )})
            ) : (
              <tr>
                <td colSpan={5} style={{textAlign: 'center', padding: '40px', color: '#777'}}>
                  {reservas.length > 0 ? (
                      <h3>No se encontraron resultados 🔍</h3>
                   ) : (
                      <h3>No hay reservas registradas.</h3>
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