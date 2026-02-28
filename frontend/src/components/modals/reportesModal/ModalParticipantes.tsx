
interface ModalParticipantesProps {
  isOpen: boolean;
  onClose: () => void;
  eventos: any[];
}

export function ModalParticipantes({ isOpen, onClose, eventos }: ModalParticipantesProps) {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.85)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "60px", paddingBottom: "20px" }}>
      <div style={{ backgroundColor: "#0f172a", padding: "25px", borderRadius: "12px", width: "95%", maxWidth: "1000px", border: "1px solid #8b5cf6", color: "#f8fafc", boxShadow: "0 10px 30px rgba(139, 92, 246, 0.2)", maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, color: "#a78bfa", display: "flex", alignItems: "center", gap: "10px" }}>👥 Radar de Ocupación por Evento</h2>
            <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>Métricas de inscripciones confirmadas vs cupo máximo disponible.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "10px" }}>
          <table className="tabla-reportes-custom">
            <thead style={{ position: "sticky", top: 0, backgroundColor: "#0f172a", zIndex: 10 }}>
              <tr>
                <th>Evento</th>
                <th style={{ textAlign: "center" }}>Reservas sin pago</th>
                <th style={{ textAlign: "center" }}>Confirmados</th>
                <th style={{ textAlign: "center" }}>Cupo Max</th>
                <th style={{ textAlign: "right" }}>Nivel de Ocupación</th>
              </tr>
            </thead>
            <tbody>
              {[...eventos].sort((a, b) => (b.tasa_ocupacion || 0) - (a.tasa_ocupacion || 0)).map((evt: any, idx: number) => {
                
                // Usamos los nombres correctos que vienen de "top_ocupacion"
                const nombre = evt.nombre_evento;
                const pendientes = Number(evt.reservados_no_pagos) || 0;
                const confirmados = Number(evt.inscriptos_pagos) || 0;
                const cupo = Number(evt.cupo_maximo) || 0;
                const porcentaje = evt.tasa_ocupacion ? Number(evt.tasa_ocupacion).toFixed(0) : "0";
                
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: "bold", color: "#fff" }}>{nombre}</td>
                    <td style={{ textAlign: "center", color: "#f97316" }}>
                      {pendientes > 0 ? `${pendientes} pend.` : "-"}
                    </td>
                    <td style={{ textAlign: "center", color: "#4ade80", fontWeight: "bold", fontSize: "1.1rem" }}>
                      {confirmados}
                    </td>
                    <td style={{ textAlign: "center", color: "#94a3b8" }}>
                      {cupo > 0 ? cupo : "Ilimitado"}
                    </td>
                    <td style={{ textAlign: "right", minWidth: "150px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
                        <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{porcentaje}%</span>
                        <div style={{ width: "80px", height: "8px", backgroundColor: "#1e293b", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${Math.min(100, Number(porcentaje))}%`, height: "100%", backgroundColor: Number(porcentaje) >= 90 ? "#ef4444" : "#8b5cf6" }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}