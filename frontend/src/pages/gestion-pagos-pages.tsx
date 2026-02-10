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

// ========== MODAL DE CONFIRMACIÓN ELEGANTE ==========
interface ModalConfirmarPagoProps {
  show: boolean;
  reserva: Reserva | null;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const ModalConfirmarPago: React.FC<ModalConfirmarPagoProps> = ({ show, reserva, onConfirm, onCancel, loading }) => {
  if (!show || !reserva) return null;

  return (
    <div className="modal-overlay-pago" onClick={onCancel}>
      <div className="modal-content-pago" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-pago">
          <div className="modal-icon-pago">💵</div>
          <h3>CONFIRMAR PAGO RECIBIDO</h3>
        </div>
        
        <div className="modal-body-pago">
          <div className="detalle-pago">
            <div className="detalle-item">
              <span className="detalle-label">Reserva ID:</span>
              <span className="detalle-valor">#{reserva.id_reserva}</span>
            </div>
            <div className="detalle-item">
              <span className="detalle-label">Usuario:</span>
              <span className="detalle-valor">{reserva.usuario_email}</span>
            </div>
            <div className="detalle-item">
              <span className="detalle-label">Evento:</span>
              <span className="detalle-valor">{reserva.nombre_evento}</span>
            </div>
            <div className="detalle-item destacado">
              <span className="detalle-label">Monto:</span>
              <span className="detalle-valor monto-grande">${reserva.monto}</span>
            </div>
          </div>
          
          <div className="advertencia-pago">
            <span className="icono-advertencia">⚠️</span>
            <p>Esta acción marcará el pago como confirmado y no se puede deshacer.</p>
          </div>
        </div>
        
        <div className="modal-footer-pago">
          <button 
            className="btn-modal-cancelar" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button 
            className="btn-modal-confirmar" 
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-pago"></span>
                Procesando...
              </>
            ) : (
              '✓ Confirmar Pago'
            )}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay-pago {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeInOverlay 0.3s ease;
        }

        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content-pago {
          background: #1a1a1a;
          border: 2px solid #333;
          border-radius: 16px;
          width: 90%;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(204, 255, 0, 0.15);
          animation: slideUpModal 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: hidden;
        }

        @keyframes slideUpModal {
          from {
            opacity: 0;
            transform: translateY(50px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header-pago {
          padding: 32px 28px 24px;
          background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
          border-bottom: 1px solid #333;
          border-top: 4px solid #ccff00;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .modal-icon-pago {
          font-size: 3rem;
          filter: drop-shadow(0 0 20px rgba(204, 255, 0, 0.5));
          animation: pulseIcon 2s ease-in-out infinite;
        }

        @keyframes pulseIcon {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .modal-header-pago h3 {
          font-size: 1.4rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #ccff00;
          margin: 0;
          text-align: center;
          font-family: 'Montserrat', sans-serif;
        }

        .modal-body-pago {
          padding: 28px;
        }

        .detalle-pago {
          background: #0a0a0a;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .detalle-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #222;
        }

        .detalle-item:last-child {
          border-bottom: none;
        }

        .detalle-item.destacado {
          background: rgba(204, 255, 0, 0.05);
          border-radius: 8px;
          padding: 16px 12px;
          margin-top: 8px;
        }

        .detalle-label {
          color: #888;
          font-size: 0.9rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detalle-valor {
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
        }

        .monto-grande {
          font-size: 1.8rem;
          color: #ccff00;
          font-weight: 800;
        }

        .advertencia-pago {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(255, 136, 51, 0.1);
          border: 1px solid rgba(255, 136, 51, 0.3);
          border-radius: 8px;
        }

        .icono-advertencia {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .advertencia-pago p {
          margin: 0;
          color: #ccc;
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .modal-footer-pago {
          padding: 20px 28px;
          background: #2a2a2a;
          border-top: 1px solid #333;
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .btn-modal-cancelar,
        .btn-modal-confirmar {
          padding: 14px 32px;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-family: 'Montserrat', sans-serif;
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          min-width: 140px;
        }

        .btn-modal-cancelar {
          background: transparent;
          border: 2px solid #666;
          color: #aaa;
        }

        .btn-modal-cancelar:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
          border-color: #fff;
          color: #fff;
        }

        .btn-modal-confirmar {
          background: #ccff00;
          color: #000;
        }

        .btn-modal-confirmar:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(204, 255, 0, 0.4);
        }

        .btn-modal-cancelar:disabled,
        .btn-modal-confirmar:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .spinner-pago {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0, 0, 0, 0.3);
          border-top-color: #000;
          border-radius: 50%;
          animation: spinPago 0.8s linear infinite;
        }

        @keyframes spinPago {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .modal-content-pago {
            width: 95%;
            margin: 20px;
          }

          .modal-header-pago {
            padding: 24px 20px 20px;
          }

          .modal-header-pago h3 {
            font-size: 1.1rem;
          }

          .modal-icon-pago {
            font-size: 2.5rem;
          }

          .modal-body-pago {
            padding: 20px;
          }

          .monto-grande {
            font-size: 1.5rem;
          }

          .modal-footer-pago {
            flex-direction: column-reverse;
            padding: 16px 20px;
          }

          .btn-modal-cancelar,
          .btn-modal-confirmar {
            width: 100%;
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};

const TablaGestionPagos: React.FC = () => {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  
  // Estados de filtro
  const [filtro, setFiltro] = useState<number>(0); 
  const [busqueda, setBusqueda] = useState<string>("");

  // Estados del modal
  const [modalOpen, setModalOpen] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState<Reserva | null>(null);
  const [procesando, setProcesando] = useState(false);

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

  const abrirModalConfirmacion = (reserva: Reserva) => {
    setReservaSeleccionada(reserva);
    setModalOpen(true);
  };

  const handleConfirmarPago = async () => {
    if (!reservaSeleccionada) return;

    setProcesando(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${ENDPOINT_CONFIRMAR}/${reservaSeleccionada.id_reserva}`, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert("¡Pago registrado con éxito! ✅");
        setModalOpen(false);
        setReservaSeleccionada(null);
        cargarReservas(); 
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.detail || "No se pudo confirmar"}`);
      }
    } catch (error) {
      alert("Error de conexión con el servidor.");
    } finally {
      setProcesando(false);
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

  // LÓGICA DE FILTRADO
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
          <h1>💰 Gestión de Pagos</h1>
          <p>Control de inscripciones y confirmación de pagos.</p>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS */}
      <div className="toolbar no-print">
        <input
          type="text"
          placeholder="🔍 Buscar por email, evento o ID..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-buscador"
        />

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setFiltro(1)} className={`btn-filtro ${filtro === 1 ? 'btn-amarillo' : 'btn-gris'}`}>
            ⏳ Pendientes
          </button>
          <button onClick={() => setFiltro(2)} className={`btn-filtro ${filtro === 2 ? 'btn-verde' : 'btn-gris'}`}>
            ✅ Confirmados
          </button>
          <button onClick={() => setFiltro(0)} className={`btn-filtro ${filtro === 0 ? 'btn-azul' : 'btn-gris'}`}>
            📋 Todos
          </button>

          <div style={{width: '1px', height: '30px', background: '#444', margin: '0 5px'}}></div>

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
                          onClick={() => abrirModalConfirmacion(res)}
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
                )
              })
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

      {/* Modal de Confirmación */}
      <ModalConfirmarPago
        show={modalOpen}
        reserva={reservaSeleccionada}
        onConfirm={handleConfirmarPago}
        onCancel={() => {
          setModalOpen(false);
          setReservaSeleccionada(null);
        }}
        loading={procesando}
      />
    </div>
  );
};

export default TablaGestionPagos;