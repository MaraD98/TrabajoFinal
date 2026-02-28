
interface ModalAdminEventoProps {
  evento: any | null;
  onClose: () => void;
}

export function ModalAdminEvento({ evento, onClose }: ModalAdminEventoProps) {
  // Si no hay evento seleccionado, no se renderiza nada
  if (!evento) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "600px", border: "1px solid #334155", color: "#f8fafc", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>
          <h3 style={{ margin: 0, color: "#fff" }}>Detalles del Evento</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
        </div>
        
        {/* Grilla de información */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "0.95rem" }}>
          <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Evento:</strong> <br/>{evento.nombre}</p>
          <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Organizador:</strong> <br/>{evento.organizador}</p>
          <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Fecha:</strong> <br/>{evento.fecha_evento ? evento.fecha_evento.split('-').reverse().join('-') : "-"}</p>
          <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Tipo:</strong> <br/>{evento.tipo}</p>
          <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Ubicación:</strong> <br/>{evento.ubicacion || "Sin ubicación"}</p>
          <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Distancia:</strong> <br/>{evento.distancia_km} km</p>
        </div>

        <h4 style={{ marginTop: "25px", marginBottom: "10px", color: "#cbd5e1" }}>Desglose de Inscripciones</h4>
        
        {/* Tarjetitas de estado de reservas */}
        <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#0f172a", padding: "15px", borderRadius: "8px", border: "1px solid #334155" }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#fff" }}>{evento.cupo_maximo || "∞"}</span>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>Cupo Máximo</p>
          </div>
          <div style={{ textAlign: "center", flex: 1, borderLeft: "1px solid #334155", borderRight: "1px solid #334155" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4ade80" }}>{evento.inscripciones_confirmadas || 0}</span>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>Pagos Confirmados</p>
          </div>
          <div style={{ textAlign: "center", flex: 1 }}>
            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#fbbf24" }}>
              {Math.max(0, (evento.reservas_totales || 0) - (evento.inscripciones_confirmadas || 0))}
            </span>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>Reservas Pendientes</p>
          </div>
        </div>

      </div>
    </div>
  );
}