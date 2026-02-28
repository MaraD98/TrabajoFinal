
interface ModalFinancieroProps {
  isOpen: boolean;
  onClose: () => void;
  eventos: any[];
}

export function ModalFinanciero({ isOpen, onClose, eventos }: ModalFinancieroProps) {
  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.85)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "60px", paddingBottom: "20px" }}>
        <div style={{ backgroundColor: "#0f172a", padding: "25px", borderRadius: "12px", width: "95%", maxWidth: "1000px", border: "1px solid #10b981", color: "#f8fafc", boxShadow: "0 10px 30px rgba(16, 185, 129, 0.2)", maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", flexShrink: 0 }}>
                <div>
                    <h2 style={{ margin: 0, color: "#10b981", display: "flex", alignItems: "center", gap: "10px" }}>
                      💰 Reporte Detallado de Ingresos
                    </h2>
                    <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>Desglose financiero de todos los eventos registrados.</p>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "10px" }}>
                <table className="tabla-reportes-custom">
                    <thead style={{ position: "sticky", top: 0, backgroundColor: "#0f172a", zIndex: 10 }}>
                        <tr>
                            <th>Evento</th>
                            <th>Organizador</th>
                            <th>Origen</th>
                            <th style={{ textAlign: "center" }}>Ticket ($)</th>
                            <th style={{ textAlign: "center" }}>Pagantes</th>
                            <th style={{ textAlign: "right", color: "#fbbf24" }}>Total Recaudado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Ordenamos los eventos para que los que más recaudaron salgan primero */}
                        {[...eventos]
                            .sort((a, b) => Number(b.monto_recaudado) - Number(a.monto_recaudado))
                            .map((evt: any, idx: number) => (
                            <tr key={idx} style={{ backgroundColor: Number(evt.monto_recaudado) > 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                                <td style={{ fontWeight: "bold", color: "#fff" }}>{evt.nombre}</td>
                                <td>{evt.organizador}</td>
                                <td>
                                    <span style={{ 
                                      color: evt.pertenencia === "Propio" ? "#8b5cf6" : "#3b82f6", 
                                      border: `1px solid ${evt.pertenencia === "Propio" ? "#8b5cf6" : "#3b82f6"}`,
                                      padding: "2px 8px", borderRadius: "12px", fontSize: "0.8rem" 
                                    }}>
                                        {evt.pertenencia}
                                    </span>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                    {Number(evt.costo_participacion) === 0 ? 
                                      <span style={{ color: "#94a3b8" }}>Gratis</span> : 
                                      `$${Number(evt.costo_participacion).toLocaleString('es-AR')}`}
                                </td>
                                <td style={{ textAlign: "center", color: "#4ade80" }}>
                                    {evt.inscripciones_confirmadas}
                                </td>
                                <td style={{ textAlign: "right", fontWeight: "bold", color: Number(evt.monto_recaudado) > 0 ? "#fbbf24" : "#64748b", fontSize: "1.1rem" }}>
                                    ${Number(evt.monto_recaudado).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {eventos.length === 0 && (
                    <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                        No hay datos financieros registrados en el sistema.
                    </div>
                )}
            </div>

        </div>
    </div>
  );
}