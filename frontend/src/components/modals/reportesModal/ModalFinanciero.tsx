import { useState } from "react";

interface ModalFinancieroProps {
  isOpen: boolean;
  onClose: () => void;
  eventos: any[];
}

export function ModalFinanciero({ isOpen, onClose, eventos }: ModalFinancieroProps) {
  const [sortCol, setSortCol] = useState<string>("_montoCalculado");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  if (!isOpen) return null;

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
    backgroundColor: sortCol === col ? "rgba(16, 185, 129, 0.08)" : "transparent",
    transition: "background-color 0.2s"
  });

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.85)", zIndex: 999999, display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "60px", paddingBottom: "20px" }}>
      <div style={{ backgroundColor: "#0f172a", padding: "25px", borderRadius: "12px", width: "95%", maxWidth: "1050px", border: "1px solid #10b981", color: "#f8fafc", boxShadow: "0 10px 30px rgba(16, 185, 129, 0.2)", maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, color: "#10b981", display: "flex", alignItems: "center", gap: "10px" }}>
              💰 Reporte Detallado de Ingresos
            </h2>
            <p style={{ margin: "5px 0 0 0", color: "#94a3b8" }}>Listado detallado de ingresos netos y estado de cupos por evento.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "10px" }}>
          <table className="tabla-reportes-custom">
            <thead style={{ position: "sticky", top: 0, backgroundColor: "#0f172a", zIndex: 10 }}>
              <tr>
                <th onClick={() => handleSort("nombre")} style={thStyle("nombre")}>
                  Evento {sortIcon("nombre")}
                </th>
                <th onClick={() => handleSort("pertenencia")} style={{ textAlign: "center", ...thStyle("pertenencia") }}>
                  Origen {sortIcon("pertenencia")}
                </th>
                {/* NUEVA COLUMNA: ESTADO */}
                <th onClick={() => handleSort("_estado")} style={{ textAlign: "center", ...thStyle("_estado") }}>
                  Estado {sortIcon("_estado")}
                </th>
                <th onClick={() => handleSort("costo_participacion")} style={{ textAlign: "center", ...thStyle("costo_participacion") }}>
                  Valor Unit. ($) {sortIcon("costo_participacion")}
                </th>
                <th onClick={() => handleSort("cupo_maximo")} style={{ textAlign: "center", ...thStyle("cupo_maximo") }}>
                  Cupo Máx. {sortIcon("cupo_maximo")}
                </th>
                <th onClick={() => handleSort("reservas")} style={{ textAlign: "center", ...thStyle("reservas") }}>
                  Inscriptos {sortIcon("reservas")}
                </th>
                <th onClick={() => handleSort("_montoCalculado")} style={{ textAlign: "right", color: sortCol === "_montoCalculado" ?  "#4ade80" : "#4aed80", ...thStyle("_montoCalculado") }}>
                  Recaudacion Total {sortIcon("_montoCalculado")}
                </th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const limpiarMonto = (valor: any): number => {
                  if (typeof valor === 'number') return valor;
                  if (!valor) return 0;
                  const limpio = valor.toString().replace(/\./g, '').replace('$', '').replace(',', '.').trim();
                  return parseFloat(limpio) || 0;
                };

                // Calculamos la fecha de hoy una sola vez
                const hoyStr = new Date().toISOString().split('T')[0];

                return [...eventos]
                  .map((evt: any) => {
                    const costo = limpiarMonto(evt.costo_participacion);
                    const pagantes = Number(evt.reservas) || 0;
                    const montoCalculado = evt.pertenencia === "Propio"
                      ? costo * pagantes
                      : costo * pagantes * 0.10;
                    
                    // Calculamos el estado comparando fechas
                    const estado = (!evt.fecha_evento || evt.fecha_evento === "Sin fecha" || evt.fecha_evento >= hoyStr) 
                      ? "Proximo" 
                      : "Finalizado";

                    return { ...evt, _montoCalculado: montoCalculado, _estado: estado };
                  })
                  .sort((a, b) => {
                    let valA = a[sortCol];
                    let valB = b[sortCol];

                    if (sortCol === "costo_participacion") {
                      valA = limpiarMonto(valA);
                      valB = limpiarMonto(valB);
                    }

                    if (typeof valA === 'string' && typeof valB === 'string') {
                      return sortDir === "asc"
                        ? valA.localeCompare(valB)
                        : valB.localeCompare(valA);
                    }

                    valA = Number(valA) || 0;
                    valB = Number(valB) || 0;

                    return sortDir === "asc" ? valA - valB : valB - valA;
                  })
                  .map((evt: any, idx: number) => (
                    <tr key={idx} style={{ backgroundColor: evt._montoCalculado > 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>

                      <td style={{ fontWeight: "bold", color: "#fff" }}>{evt.nombre}</td>

                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          color: evt.pertenencia === "Propio" ? "#8b5cf6" : "#f59e0b",
                          border: `1px solid ${evt.pertenencia === "Propio" ? "#8b5cf6" : "#f59e0b"}`,
                          padding: "2px 8px", borderRadius: "12px", fontSize: "0.8rem"
                        }}>
                          {evt.pertenencia}
                        </span>
                      </td>

                      {/* CELDA DE ESTADO */}
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          backgroundColor: evt._estado === "Proximo" ? "rgba(16, 185, 129, 0.1)" : "rgba(148, 163, 184, 0.1)",
                          color: evt._estado === "Proximo" ? "#10b981" : "#94a3b8",
                          padding: "4px 8px", 
                          borderRadius: "4px", 
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          display: "inline-block",
                          minWidth: "90px"
                        }}>
                          {evt._estado === "Proximo" ? "🟢 Proximo" : "🏁 Finalizado"}
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {limpiarMonto(evt.costo_participacion) === 0
                          ? <span style={{ color: "#94a3b8" }}>Gratis</span>
                          : `$${limpiarMonto(evt.costo_participacion).toLocaleString('es-AR')}`
                        }
                      </td>

                      <td style={{ textAlign: "center" }}>
                        {evt.cupo_maximo
                          ? <span style={{ color: "#cbd5e1", fontWeight: "bold" }}>{evt.cupo_maximo}</span>
                          : <span style={{ color: "#64748b" }}>∞</span>
                        }
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span style={{ color: "#4ade80", fontWeight: "bold" }}>{evt.reservas || 0}</span>
                        <span style={{ color: "#64748b", fontSize: "0.85rem" }}> / {evt.cupo_maximo || "∞"}</span>
                      </td>

                      <td style={{ textAlign: "right", fontWeight: "bold", color: evt._montoCalculado > 0 ? "#fbbf24" : "#64748b", fontSize: "1.1rem" }}>
                        ${evt._montoCalculado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </td>

                    </tr>
                  ));
              })()}
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