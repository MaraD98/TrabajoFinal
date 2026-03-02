
interface ModalAdminEventoProps {
  evento: any | null;
  onClose: () => void;
}

export function ModalAdminEvento({ evento, onClose }: ModalAdminEventoProps) {
  // Si no hay evento seleccionado, no se renderiza nada
  if (!evento) return null;

  // --- LÓGICA DE NEGOCIO ---
  const recaudacionActual = evento.monto_recaudado || 0;
  const cupo = evento.cupo_maximo || 0;
  const valorUnitario = evento.costo_participacion || 0;
  
  // Recaudación si se llenara el cupo (solo si hay cupo definido)
  const recaudacionPotencial = cupo > 0 ? cupo * valorUnitario : recaudacionActual;
  
  // Comisión (10% si es externo, 100% si es propio)
  const esExterno = evento.pertenencia?.toLowerCase().includes("externo");
  const comisionEstimada = esExterno ? recaudacionActual * 0.10 : recaudacionActual;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", width: "95%", maxWidth: "550px", border: "1px solid #334155", color: "#f8fafc", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)" }}>
        
        {/* Cabecera */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>
          <div>
            <h3 style={{ margin: 0, color: "#fff" }}>Estimación de ingresos</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
        </div>
        
        {/* Grilla de información básica */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "0.9rem", marginBottom: "20px" }}>
          <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Evento:</strong> <br/>{evento.nombre}</p>
          <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Organizador:</strong> <br/>{evento.organizador}</p>
          <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Origen:</strong> <br/>
            <span style={{ color: esExterno ? "#94a3b8" : "#8b5cf6", fontWeight: "bold" }}>
                {evento.pertenencia} {esExterno ? "(Comisión 10%)" : "(Ingreso Directo)"}
            </span>
          </p>
          <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Valor unitario:</strong> <br/>${valorUnitario.toLocaleString('es-AR')}</p>
        </div>

        {/* Sección de Métricas de Venta */}
        <div style={{ backgroundColor: "#0f172a", padding: "15px", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "20px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "#3b82f6", textTransform: "uppercase" }}>Estado de Cupos</h4>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
             <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: "bold", fontSize: "1.2rem" }}>{evento.inscripciones_confirmadas}</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Confirmados</div>
             </div>
             <div style={{ textAlign: "center", flex: 1, borderLeft: "1px solid #334155", borderRight: "1px solid #334155" }}>
                <div style={{ color: "#fbbf24", fontWeight: "bold", fontSize: "1.2rem" }}>{Math.max(0, (evento.reservas_totales || 0) - (evento.inscripciones_confirmadas || 0))}</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Pendientes</div>
             </div>
             <div style={{ textAlign: "center", flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: "bold", fontSize: "1.2rem" }}>{cupo || "∞"}</div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Cupo Total</div>
             </div>
          </div>
        </div>

        {/* --- NUEVA SECCIÓN DE FINANZAS PARA LA TESIS --- */}
        <div style={{ backgroundColor: "#1e293b", padding: "15px", borderRadius: "8px", border: "1px dashed #3b82f6" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "#4ade80", textTransform: "uppercase" }}>Rendimiento Económico</h4>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.9rem" }}>Recaudación Actual:</span>
              <span style={{ fontWeight: "bold", color: "#4ade80" }}>${recaudacionActual.toLocaleString('es-AR')}</span>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.9rem" }}>Potencial de Venta (Cupo lleno):</span>
              <span style={{ color: "#94a3b8" }}>${recaudacionPotencial.toLocaleString('es-AR')}</span>
            </div>

            <hr style={{ border: "0", borderTop: "1px solid #334155", margin: "5px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#33415533", padding: "8px", borderRadius: "4px" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: "bold" }}>
                {esExterno ? "Ganancia Neta (Comisión):" : "Ganancia Neta (Propio):"}
              </span>
              <span style={{ fontWeight: "bold", color: "#fbbf24", fontSize: "1.1rem" }}>
                ${comisionEstimada.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          style={{ width: "100%", marginTop: "20px", padding: "10px", borderRadius: "6px", border: "none", backgroundColor: "#3b82f6", color: "white", fontWeight: "bold", cursor: "pointer" }}
        >
          Cerrar Detalles
        </button>

      </div>
    </div>
  );
}