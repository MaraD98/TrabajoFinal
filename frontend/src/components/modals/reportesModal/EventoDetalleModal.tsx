
// ─── Modal detalle de evento ──────────────────────────────────────────────────

export interface DetalleRecaudacion {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  monto: number;
  monto_unitario: number;
  inscriptos_count: number;
  inscriptos_confirmados: number;
  cupo_maximo: number | null;
  estado_evento: number;
  tipo: string;
  descripcion: string;
  ubicacion_completa: string;
  distancia_km: number;
}


export function EventoDetalleModal({
  evento,
  onClose,
}: {
  evento: DetalleRecaudacion;
  onClose: () => void;
}) {
  const estadoLabel: Record<number, string> = {
    1: "Borrador", 2: "Pendiente", 3: "Publicado",
    4: "Finalizado", 5: "Cancelado", 6: "Depurado por Admin",
  };
  const estadoColor: Record<number, string> = {
    3: "#4ade80", 4: "#60a5fa", 5: "#f87171", 2: "#fbbf24",
  };
  const color = estadoColor[evento.estado_evento] || "#888";

  

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
        zIndex: 9999, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a1a", border: "1px solid #333", borderRadius: "16px",
          padding: "32px", maxWidth: "600px", width: "100%",
          maxHeight: "85vh", overflowY: "auto", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            background: "none", border: "none", color: "#888",
            fontSize: "1.4rem", cursor: "pointer", lineHeight: 1,
          }}
        >
          ✕
        </button>

        <div
          style={{
            display: "inline-block", padding: "4px 12px", borderRadius: "20px",
            background: color + "22", border: `1px solid ${color}`,
            color, fontSize: "0.78rem", fontWeight: "bold", marginBottom: "12px",
          }}
        >
          {(estadoLabel[evento.estado_evento] || `Estado ${evento.estado_evento}`).toUpperCase()}
        </div>

        <h2 style={{ margin: "0 0 4px", fontSize: "1.4rem", color: "#fff" }}>
          {evento.nombre_evento}
        </h2>
        <p style={{ margin: "0 0 24px", color: "#888", fontSize: "0.9rem" }}>
          {evento.tipo}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "Fecha", value: new Date(evento.fecha_evento).toLocaleDateString("es-AR") },
            { label: "Distancia", value: `${evento.distancia_km} km` },
            {
              label: "Valor Unitario",
              value: evento.monto_unitario === 0
                ? "Gratuito"
                : `$${evento.monto_unitario.toLocaleString("es-AR")}`,
            },
            {
              label: "Cupo",
              value: evento.cupo_maximo
                ? `${evento.inscriptos_count} / ${evento.cupo_maximo}`
                : `${evento.inscriptos_count} inscriptos`,
            },
            { label: "Confirmados", value: `${evento.inscriptos_confirmados}` },
            { label: "Recaudado", value: `$${evento.monto.toLocaleString("es-AR")}` },
          ].map((item) => (
            <div
              key={item.label}
              style={{ background: "#252525", borderRadius: "8px", padding: "12px 16px" }}
            >
              <p style={{ margin: 0, color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {item.label}
              </p>
              <p style={{ margin: "4px 0 0", color: "#fff", fontWeight: "bold", fontSize: "1rem" }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {evento.ubicacion_completa && (
          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 6px", color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              📍 Ubicación
            </p>
            <p style={{ margin: 0, color: "#e0e0e0", fontSize: "0.9rem" }}>
              {evento.ubicacion_completa}
            </p>
          </div>
        )}

        {evento.descripcion && (
          <div>
            <p style={{ margin: "0 0 6px", color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              📝 Descripción
            </p>
            <p style={{ margin: 0, color: "#ccc", fontSize: "0.9rem", lineHeight: 1.6 }}>
              {evento.descripcion}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}