// src/pages/eventos-page.tsx
import { useState, useEffect } from "react";
import { getEventos } from "../services/eventos";
import CancelEventModal from "../components/CancelEventModal";
import "../styles/eventos-page.css"; 

export default function EventosPage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Lógica del modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(0);

  // Cargar la lista al entrar
  const cargarEventos = async () => {
    try {
      setLoading(true);
      const data = await getEventos();
      // Aseguramos que data sea un array, si la API devuelve null o error, usamos []
      setEventos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando eventos:", error);
      setEventos([]); // En caso de error, dejamos la lista vacía para que no rompa
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEventos();
  }, []);

  const clickEliminar = (id: number) => {
    setSelectedId(id);
    setModalOpen(true);
  };

  return (
    <div className="page-container" style={{ padding: "20px" }}>
      <h1>Listado de Eventos</h1>

      {/* LÓGICA DE RENDERIZADO: */}
      
      {/* 1. Si está cargando... */}
      {loading ? (
        <p>Cargando eventos...</p>

      /* 2. Si NO está cargando, pero la lista está VACÍA (length 0)... */
      ) : eventos.length === 0 ? (
        <div style={{ textAlign: "center", marginTop: "50px", color: "white" }}>
          <h2>No hay eventos creados.</h2>
          <p>Ve a la sección de "Crear Evento" para comenzar.</p>
        </div>

      /* 3. Si NO está cargando y SÍ hay eventos... mostramos la grilla */
      ) : (
        <div className="grid-eventos" style={{ display: "grid", gap: "20px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {eventos.map((evento) => (
            <div key={evento.id} className="card-evento" style={{ border: "1px solid #444", padding: "20px", borderRadius: "10px" }}>
              <h3>{evento.nombre_evento}</h3>
              <p>{evento.fecha_evento} - {evento.ubicacion}</p>
              
              {/* Etiqueta de estado */}
              <div style={{ marginBottom: "10px" }}>
                Estado: <strong>{evento.estado}</strong>
              </div>

              {/* Botón de Cancelar (Solo si no está cancelado ya) */}
              {evento.estado !== 'CANCELADO' && (
                <button 
                  onClick={() => clickEliminar(evento.id)}
                  style={{ backgroundColor: "#d32f2f", color: "white", border: "none", padding: "8px 16px", cursor: "pointer", borderRadius: "5px" }}
                >
                  Cancelar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* El componente modal vive aquí, invisible hasta que se active */}
      <CancelEventModal 
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        idEvento={selectedId}
        onSuccess={cargarEventos} 
      />
    </div>
  );
}