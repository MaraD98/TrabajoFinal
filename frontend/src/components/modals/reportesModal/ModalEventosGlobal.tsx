
interface ModalEventosGlobalProps {
  isOpen: boolean;
  onClose: () => void;
  eventos: any[];
}

export function ModalEventosGlobal({ isOpen, onClose, eventos }: ModalEventosGlobalProps) {
  if (!isOpen) return null;

  // Calculamos hoyStr adentro del modal para que no tengas que pasarlo como prop
  const hoyStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.85)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "60px", paddingBottom: "20px" }}>
      <div style={{ backgroundColor: "#0f172a", padding: "25px", borderRadius: "12px", width: "95%", maxWidth: "1000px", border: "1px solid #3b82f6", color: "#f8fafc", boxShadow: "0 10px 30px rgba(59, 130, 246, 0.2)", maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, color: "#3b82f6", display: "flex", alignItems: "center", gap: "10px" }}>📅 Directorio Global de Eventos</h2>
            <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>Listado completo de todas las actividades registradas en el sistema.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "10px" }}>
          <table className="tabla-reportes-custom">
            <thead style={{ position: "sticky", top: 0, backgroundColor: "#0f172a", zIndex: 10 }}>
              <tr>
                <th>Fecha</th>
                <th>Evento</th>
                <th>Organizador</th>
                <th>Modalidad</th>
                <th style={{ textAlign: "center" }}>Origen</th>
                <th style={{ textAlign: "center" }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {[...eventos].sort((a, b) => new Date(b.fecha_evento).getTime() - new Date(a.fecha_evento).getTime()).map((evt: any, idx: number) => {
                const esFuturo = evt.fecha_evento >= hoyStr;
                return (
                  <tr key={idx}>
                    <td style={{ color: "#cbd5e1", whiteSpace: "nowrap" }}>{evt.fecha_evento ? evt.fecha_evento.split('-').reverse().join('-') : "-"}</td>
                    <td style={{ fontWeight: "bold", color: "#fff" }}>{evt.nombre}</td>
                    <td>{evt.organizador}</td>
                    <td><span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{evt.tipo} - {evt.dificultad}</span></td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ backgroundColor: evt.pertenencia === "Propio" ? "rgba(139, 92, 246, 0.2)" : "rgba(234, 179, 8, 0.2)", color: evt.pertenencia === "Propio" ? "#8b5cf6" : "#eab308", padding: "3px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold" }}>
                        {evt.pertenencia}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {esFuturo ? <span style={{ color: "#3b82f6" }}>🚀 Próximo</span> : <span style={{ color: "#64748b" }}>✅ Finalizado</span>}
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