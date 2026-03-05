import { useState } from "react";

interface ModalListaEventosProps {
  isOpen: boolean;
  onClose: () => void;
  eventos: any[];
  titulo: string;
}

export function ModalListaEventos({ isOpen, onClose, eventos, titulo }: ModalListaEventosProps) {
  const [sortCol, setSortCol] = useState<string>("fecha_evento");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (!isOpen) return null;

  const hoyStr = new Date().toISOString().split('T')[0];

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const sortIcon = (col: string) => {
    if (sortCol !== col) return <span style={{ color: "#475569", marginLeft: "5px" }}>↕️</span>;
    return <span style={{ marginLeft: "5px" }}>{sortDir === "asc" ? "🔼" : "🔽"}</span>;
  };

  const thStyle = (col: string): React.CSSProperties => ({
    cursor: "pointer",
    userSelect: "none",
    backgroundColor: sortCol === col ? "rgba(59, 130, 246, 0.08)" : "transparent",
    transition: "background-color 0.2s"
  });

  const eventosSorted = [...eventos].sort((a, b) => {
    switch (sortCol) {
      case "fecha_evento": {
        const tA = new Date(a.fecha_evento || "").getTime() || 0;
        const tB = new Date(b.fecha_evento || "").getTime() || 0;
        return sortDir === "asc" ? tA - tB : tB - tA;
      }
      case "nombre": {
        const vA = (a.nombre || "").toLowerCase();
        const vB = (b.nombre || "").toLowerCase();
        return sortDir === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      case "tipo": {
        const vA = (a.tipo || "").toLowerCase();
        const vB = (b.tipo || "").toLowerCase();
        return sortDir === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      case "pertenencia": {
        const vA = (a.pertenencia || "").toLowerCase();
        const vB = (b.pertenencia || "").toLowerCase();
        return sortDir === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      case "estado": {
        // Próximos (1) antes que Finalizados (0) en desc
        const vA = a.fecha_evento >= hoyStr ? 1 : 0;
        const vB = b.fecha_evento >= hoyStr ? 1 : 0;
        return sortDir === "asc" ? vA - vB : vB - vA;
      }
      default:
        return 0;
    }
  });

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.85)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "60px", paddingBottom: "20px" }}>
      <div style={{ backgroundColor: "#0f172a", padding: "25px", borderRadius: "12px", width: "95%", maxWidth: "1000px", border: "1px solid #3b82f6", color: "#f8fafc", boxShadow: "0 10px 30px rgba(59, 130, 246, 0.2)", maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, color: "#3b82f6", display: "flex", alignItems: "center", gap: "10px" }}>📅 {titulo}</h2>
            <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>Listado detallado de los eventos creados por el usuario.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "10px" }}>
          <table className="tabla-reportes-custom">
            <thead style={{ position: "sticky", top: 0, backgroundColor: "#0f172a", zIndex: 10 }}>
              <tr>
                <th onClick={() => handleSort("fecha_evento")} style={thStyle("fecha_evento")}>
                  Fecha {sortIcon("fecha_evento")}
                </th>
                <th onClick={() => handleSort("nombre")} style={thStyle("nombre")}>
                  Evento {sortIcon("nombre")}
                </th>
                <th onClick={() => handleSort("tipo")} style={thStyle("tipo")}>
                  Tipo {sortIcon("tipo")}
                </th>
                <th style={{ textAlign: "center", ...thStyle("pertenencia") }}>
                  Origen 
                </th>
                <th onClick={() => handleSort("estado")} style={{ textAlign: "center", ...thStyle("estado") }}>
                  Estado {sortIcon("estado")}
                </th>
              </tr>
            </thead>
            <tbody>
              {eventosSorted.map((evt: any, idx: number) => {
                const esFuturo = evt.fecha_evento >= hoyStr;
                return (
                  <tr key={idx}>
                    <td style={{ color: "#cbd5e1", whiteSpace: "nowrap" }}>
                      {evt.fecha_evento ? evt.fecha_evento.split('-').reverse().join('-') : "-"}
                    </td>
                    <td style={{ fontWeight: "bold", color: "#fff" }}>{evt.nombre}</td>
                    <td><span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{evt.tipo} - {evt.dificultad}</span></td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{
                        backgroundColor: evt.pertenencia === "Propio" ? "rgba(139, 92, 246, 0.2)" : "rgba(234, 179, 8, 0.2)",
                        color: evt.pertenencia === "Propio" ? "#8b5cf6" : "#eab308",
                        padding: "3px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold"
                      }}>
                        {evt.pertenencia}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {esFuturo
                        ? <span style={{ color: "#3b82f6" }}>🚀 Próximo</span>
                        : <span style={{ color: "#64748b" }}>✅ Finalizado</span>
                      }
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