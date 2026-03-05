import { useState } from "react";

export interface FiltroTorta {
  titulo: string;
  valor: string;
  filtroKey: string;
}

interface ModalFiltroTortaProps {
  filtro: any;
  onClose: () => void;
  eventos: any[];
  usuarioRol: number;
}

export function ModalFiltroTorta({ filtro, onClose, eventos, usuarioRol }: ModalFiltroTortaProps) {
  const [sortCol, setSortCol] = useState<string>("fecha_evento");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (!filtro) return null;

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

  const eventosFiltrados = eventos.filter((e: any) => {
    if (filtro.valor === "TODOS") return true;
    const valorEvento = String(e[filtro.filtroKey] || "").trim().toLowerCase();
    const valorFiltro = String(filtro.valor || "").trim().toLowerCase();
    return valorEvento === valorFiltro;
  });

  const eventosSorted = [...eventosFiltrados].sort((a, b) => {
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
      case "filtroKey": {
        const vA = (a[filtro.filtroKey] || "").toLowerCase();
        const vB = (b[filtro.filtroKey] || "").toLowerCase();
        return sortDir === "asc" ? vA.localeCompare(vB) : vB.localeCompare(vA);
      }
      case "inscriptos": {
        const vA = Number(a.inscripciones_confirmadas ?? a.reservas ?? 0);
        const vB = Number(b.inscripciones_confirmadas ?? b.reservas ?? 0);
        return sortDir === "asc" ? vA - vB : vB - vA;
      }
      case "recaudacion": {
        const vA = Number(a.monto_recaudado ?? (( a.inscripciones_confirmadas ?? a.reservas ?? 0) * (a.costo_participacion || 0)));
        const vB = Number(b.monto_recaudado ?? ((b.inscripciones_confirmadas ?? b.reservas ?? 0) * (b.costo_participacion || 0)));
        return sortDir === "asc" ? vA - vB : vB - vA;
      }
      default:
        return 0;
    }
  });

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.85)", zIndex: 999999,
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      paddingTop: "50px", paddingBottom: "20px"
    }}>
      <div style={{
        backgroundColor: "#0f172a", padding: "25px", borderRadius: "12px",
        width: "95%", maxWidth: "1000px", border: "1px solid #334155",
        color: "#f8fafc", boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column"
      }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, color: "#fff" }}>{filtro.titulo}</h2>
            <span style={{ backgroundColor: "#3b82f6", padding: "4px 12px", borderRadius: "15px", fontSize: "0.85rem", marginTop: "10px", display: "inline-block" }}>
              Filtro: {filtro.valor === "TODOS" ? "Todos los eventos" : filtro.valor}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "#94a3b8" }}>&times;</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "10px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ position: "sticky", top: 0, backgroundColor: "#0f172a", zIndex: 10 }}>
              <tr>
                <th onClick={() => handleSort("nombre")} style={{ padding: "12px", borderBottom: "1px solid #334155", ...thStyle("nombre") }}>
                  Evento {sortIcon("nombre")}
                </th>
                <th onClick={() => handleSort("fecha_evento")} style={{ padding: "12px", borderBottom: "1px solid #334155", ...thStyle("fecha_evento") }}>
                  Fecha {sortIcon("fecha_evento")}
                </th>

                {usuarioRol < 3 && (
                  <th style={{ padding: "12px", borderBottom: "1px solid #334155" }}>
                    Origen
                  </th>
                )}

                <th onClick={() => handleSort("filtroKey")} style={{ padding: "12px", borderBottom: "1px solid #334155", textAlign: "center", ...thStyle("filtroKey") }}>
                  {filtro.filtroKey === "tipo" ? "Tipo" : filtro.filtroKey === "dificultad" ? "Dificultad" : "Organizador"} {sortIcon("filtroKey")}
                </th>

                <th onClick={() => handleSort("inscriptos")} style={{ padding: "12px", borderBottom: "1px solid #334155", textAlign: "center", ...thStyle("inscriptos") }}>
                  Inscriptos {sortIcon("inscriptos")}
                </th>
                <th onClick={() => handleSort("recaudacion")} style={{ padding: "12px", borderBottom: "1px solid #334155", textAlign: "right", ...thStyle("recaudacion") }}>
                  Recaudación {sortIcon("recaudacion")}
                </th>
              </tr>
            </thead>
            <tbody>
              {eventosSorted.map((evt: any, idx: number) => {
                const inscriptos = evt.inscripciones_confirmadas ?? evt.reservas ?? 0;
                const recaudacion = evt.monto_recaudado ?? (inscriptos * (evt.costo_participacion || 0));

                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #1e293b" }}>
                    <td style={{ padding: "12px", fontWeight: "bold", color: "#fff" }}>{evt.nombre}</td>
                    <td style={{ padding: "12px" }}>
                      {evt.fecha_evento
                        ? evt.fecha_evento.split('-').reverse().join('-')
                        : "-"
                      }
                    </td>

                    {usuarioRol < 3 && (
                      <td style={{ padding: "12px" }}>
                        <span style={{ color: evt.pertenencia === "Propio" ? "#8b5cf6" : "#f59e0b", fontWeight: "bold" }}>
                          {evt.pertenencia || "Sin Pertenencia"}
                        </span>
                      </td>
                    )}

                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <span style={{ background: "#1e293b", padding: "4px 8px", borderRadius: "4px" }}>
                        {filtro.filtroKey === "tipo" ? (evt.tipo || "Sin Tipo") :
                         filtro.filtroKey === "dificultad" ? (evt.dificultad || "Sin Dificultad") :
                         (evt.organizador || "Sin Organizador")}
                      </span>
                    </td>

                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <span style={{ color: "#4ade80", fontWeight: "bold" }}>{inscriptos}</span> / {evt.cupo_maximo || "∞"}
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: "bold", color: "#fbbf24" }}>
                      ${Number(recaudacion).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {eventosFiltrados.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
              No hay eventos con {filtro.filtroKey}: <b>{filtro.valor}</b>.
              <br /><small>(Revisá si los datos están llegando del backend)</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}