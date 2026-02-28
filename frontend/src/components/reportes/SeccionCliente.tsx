import { useState } from "react";
import type { ReporteData } from "../../pages/reportes-page"; 

// ─── Componentes auxiliares exclusivos del Cliente ────────────────────────────

function EstadoBadge({ estado }: { estado: number }) {
  const config: Record<number, { txt: string; bg: string; clr: string }> = {
    1: { txt: "Pendiente", bg: "#fbbf2422", clr: "#fbbf24" },
    2: { txt: "Confirmada", bg: "#4ade8022", clr: "#4ade80" },
    3: { txt: "Cancelada", bg: "#f8717122", clr: "#f87171" },
  };
  const s = config[estado] || { txt: "Desconocido", bg: "#333", clr: "#888" };
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: "12px",
        fontSize: "0.7rem",
        fontWeight: "bold",
        background: s.bg,
        color: s.clr,
        border: `1px solid ${s.clr}44`,
        textTransform: "uppercase",
      }}
    >
      {s.txt}
    </span>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      style={{
        background: "#1a1a1a",
        padding: "16px",
        borderRadius: "12px",
        border: `1px solid ${color}44`,
        flex: "1 1 200px",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.75rem", color: "#888", textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: "1.2rem", fontWeight: "bold", color: "#fff" }}>
        {value}
      </p>
    </div>
  );
}

// ─── Componente Principal del Cliente ─────────────────────────────────────────

interface SeccionClienteProps {
  reporteData: ReporteData;
  onExportarCSV: (tipo: string) => void;
  exportando?: string | null;
}

export function SeccionCliente({ reporteData, onExportarCSV, exportando }: SeccionClienteProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const fmt = (val: number) => new Intl.NumberFormat("es-AR").format(val);
  const fmtPeso = (val: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(val);
  const fmtFecha = (f?: string) => (f ? new Date(f).toLocaleDateString("es-AR") : "-");

  const inscripciones = reporteData.mis_inscripciones ?? [];
  
  // Lógica de filtrado original (¡con las variables correctas!)
  const filtradas = inscripciones.filter((i: any) => {
    const mb = i.evento_nombre?.toLowerCase().includes(busqueda.toLowerCase());
    const me = !filtroEstado || i.estado_id === Number(filtroEstado);
    return mb && me;
  });

  // Estadísticas originales calculadas correctamente
  const stats = [
    { label: "Total Inscripciones", value: fmt(inscripciones.length), color: "#4ade80" },
    { label: "Confirmadas", value: fmt(inscripciones.filter((i: any) => i.estado_id === 2).length), color: "#60a5fa" },
    { label: "Pendientes", value: fmt(inscripciones.filter((i: any) => i.estado_id === 1).length), color: "#fbbf24" },
    { label: "Total Gastado", value: fmtPeso(inscripciones.reduce((acc: number, curr: any) => acc + (curr.costo || 0), 0)), color: "#a78bfa" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "20px" }}>
      
      {/* ─── Tarjetas de Resumen ─── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ─── Contenedor de la Tabla ─── */}
      <div className="grafico-card grafico-card--wide" style={{ background: "#1a1a1a", borderRadius: "16px", border: "1px solid #333", padding: "24px", overflowX: "auto" }}>
        
        <div className="grafico-card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#fff" }}>🎟️ Mis Inscripciones</h3>
          <button 
            className="reportes-alert__retry" 
            onClick={() => onExportarCSV("mis_inscripciones")} 
            disabled={exportando === "mis_inscripciones"}
            style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
          >
            {exportando === "mis_inscripciones" ? "⏳ Generando..." : "⬇ Descargar CSV"}
          </button>
        </div>
        
        <div className="grafico-card__body">
          {/* Filtros */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
            <input 
              type="text" 
              className="reportes-input" 
              placeholder="🔍 Buscar evento..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)} 
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #444", background: "#252525", color: "#fff", flex: "1 1 200px" }}
            />
            <select 
              value={filtroEstado} 
              onChange={e => setFiltroEstado(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #444", background: "#252525", color: "#fff" }}
            >
              <option value="">Todos los estados</option>
              <option value="1">Pendiente</option>
              <option value="2">Confirmada</option>
              <option value="3">Cancelada</option>
            </select>
          </div>
          
          {/* Tabla */}
          <div className="table-responsive">
            {filtradas.length > 0 ? (
               <table className="tabla-reportes-custom" style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #333", textAlign: "left" }}>
                    <th style={{ padding: "12px", color: "#888" }}>Evento</th>
                    <th style={{ padding: "12px", color: "#888" }}>Fecha</th>
                    <th style={{ padding: "12px", color: "#888" }}>Costo</th>
                    <th style={{ padding: "12px", color: "#888" }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((ins: any, idx: number) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #333" }}>
                      <td style={{ padding: "12px", color: "#fff" }}>
                        <strong>{ins.evento_nombre}</strong><br/>
                        <small style={{color: "#888"}}>{ins.tipo}</small>
                      </td>
                      <td style={{ padding: "12px", color: "#ccc" }}>{fmtFecha(ins.fecha_evento)}</td>
                      <td style={{ padding: "12px", color: "#fbbf24", fontWeight: "bold" }}>
                        {ins.costo > 0 ? fmtPeso(ins.costo) : "Gratis"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <EstadoBadge estado={ins.estado_id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "#888", textAlign: "center", padding: "20px" }}>
                No se encontraron inscripciones con esos filtros.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}