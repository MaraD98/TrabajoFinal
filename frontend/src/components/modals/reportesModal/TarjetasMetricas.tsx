
interface TarjetasMetricasProps {
  // Datos para Tarjeta Eventos
  totalEventosGlobal: number;
  eventosFuturos: number;
  eventosPasados: number;
  eventosPropiosCount: number;
  eventosExternosCount: number;
  onAbrirModalEventos: () => void;
  onVerPropios?: () => void;
  onVerExternos?: () => void;

  // Datos para Tarjeta Participantes
  totalConfirmadas: number;
  totalPendientes: number;
  promedioParticipantes: number | string;
  ocupacionGlobal: number | string;
  onAbrirModalParticipantes: () => void;

  // Datos para Tarjeta Financiera (solo se muestra si es super admin)
  usuarioRol: number;
  totalRecaudadoGlobal: number;
  recaudadoPropios: number;
  recaudadoExternos: number;
  cantidadGratuitos: number;
  cantidadPagos: number;
  onAbrirModalFinanciero: () => void;
}

export function TarjetasMetricas({
  // Desestructuración Eventos
  totalEventosGlobal,
  eventosFuturos,
  eventosPasados,
  eventosPropiosCount,
  eventosExternosCount,
  onAbrirModalEventos,
  onVerPropios,
  onVerExternos,
  
  // Desestructuración Participantes
  totalConfirmadas,
  totalPendientes,
  promedioParticipantes,
  ocupacionGlobal,
  onAbrirModalParticipantes,

  // Desestructuración Financiera
  usuarioRol,
  totalRecaudadoGlobal,
  cantidadGratuitos,
  cantidadPagos,
  recaudadoPropios,
  recaudadoExternos,
  onAbrirModalFinanciero,
}: TarjetasMetricasProps) {

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px", width: "100%" }}>
        
        {/* TARJETA 1: GESTIÓN DE EVENTOS */}
        <div className="grafico-card" style={{ margin: 0 }}>
          <div className="grafico-card__header">
            <h3>📅 Total Eventos del Sistema</h3>
            <button onClick={onAbrirModalEventos} className="btn-export" style={{ backgroundColor: "#3b82f6", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              Ver Análisis
            </button>
          </div>
          <div className="grafico-card__body" style={{ flexDirection: "column", gap: "15px", display: "flex", padding: "20px" }}>
            
            <div style={{ textAlign: "center", padding: "15px", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "1rem", textTransform: "uppercase" }}>Eventos Creados</p>
              <h2 style={{ margin: "5px 0 0 0", color: "#f8fafc", fontSize: "3rem", textShadow: "0 2px 10px rgba(255,255,255,0.1)" }}>
                {totalEventosGlobal}
              </h2>
              <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "15px", fontSize: "0.9rem", flexWrap: "wrap" }}>
                <span style={{ color: "#3b82f6", backgroundColor: "rgba(59, 130, 246, 0.1)", padding: "5px 10px", borderRadius: "20px" }}>
                  🚀 {eventosFuturos} Próximos
                </span>
                <span style={{ color: "#94a3b8", backgroundColor: "rgba(148, 163, 184, 0.1)", padding: "5px 10px", borderRadius: "20px" }}>
                  ✅ {eventosPasados} Finalizados
                </span>
                
                {/* 🏷️ NUEVA Etiqueta de Diagnóstico Rápido */}
                {totalEventosGlobal > 0 && (
                  <span style={{ 
                    color: eventosExternosCount > eventosPropiosCount ? "#34d399" : "#f59e0b", 
                    backgroundColor: eventosExternosCount > eventosPropiosCount ? "rgba(52, 211, 153, 0.1)" : "rgba(245, 158, 11, 0.1)", 
                    padding: "5px 10px", 
                    borderRadius: "20px",
                    border: `1px solid ${eventosExternosCount > eventosPropiosCount ? "rgba(52, 211, 153, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                    fontWeight: "bold"
                  }}>
                    {eventosExternosCount > eventosPropiosCount ? "▶ Mayoría Externos" : "▶ Mayoría Propios"}
                  </span>
                )}
              </div>
            </div>

            <details style={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #334155", padding: "15px", cursor: "pointer" }}>
              <summary style={{ fontWeight: "bold", color: "#f8fafc", outline: "none", fontSize: "1rem" }}>
                📊 Origen de los Eventos <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "normal" }}>(Clic para expandir)</span>
              </summary>
              
              {/* CONTENEDOR FLEX PRINCIPAL */}
              <div style={{ display: "flex", justifyContent: "space-around", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #334155" }}>
                
                {/* BOTÓN PROPIOS */}
                <div 
                  onClick={onVerPropios}
                  title="Ver lista de eventos propios"
                  style={{ textAlign: "center", cursor: "pointer", padding: "10px", borderRadius: "8px", flex: 1, transition: "all 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(139, 92, 246, 0.15)"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    <h3 style={{ margin: 0, color: "#8b5cf6", fontSize: "1.5rem" }}>{eventosPropiosCount}</h3>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>Propios 🔍</p>
                </div>

                <div style={{ width: "1px", backgroundColor: "#334155", margin: "0 10px" }}></div>
                
                {/* BOTÓN EXTERNOS */}
                <div 
                  onClick={onVerExternos}
                  title="Ver lista de eventos externos"
                  style={{ textAlign: "center", cursor: "pointer", padding: "10px", borderRadius: "8px", flex: 1, transition: "all 0.2s" }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "rgba(234, 179, 8, 0.15)"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                    <h3 style={{ margin: 0, color: "#eab308", fontSize: "1.5rem" }}>{eventosExternosCount}</h3>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>Externos 🔍</p>
                </div>

              </div>
            </details>
          </div>
        </div>

        {/* TARJETA 2: PARTICIPANTES Y AUDIENCIA */}
        <div className="grafico-card" style={{ margin: 0 }}>
          <div className="grafico-card__header">
            <h3>👥 Estado de Inscripciones</h3>
            <button onClick={onAbrirModalParticipantes} className="btn-export" style={{ backgroundColor: "#8b5cf6", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              Ver Ocupación
            </button>
          </div>
          <div className="grafico-card__body" style={{ flexDirection: "column", gap: "15px", display: "flex", padding: "20px" }}>
            
            <div style={{ textAlign: "center", padding: "15px", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "1rem", textTransform: "uppercase" }}>Inscripciones Confirmadas</p>
              <h2 style={{ margin: "5px 0 0 0", color: "#4ade80", fontSize: "3rem", textShadow: "0 2px 10px rgba(74, 222, 128, 0.2)" }}>
                {totalConfirmadas}
              </h2>
              
              <div style={{ display: "flex", justifyContent: "center", gap: "15px", marginTop: "15px", fontSize: "0.9rem", flexWrap: "wrap" }}>
                <span style={{ color: "#f97316", backgroundColor: "rgba(249, 115, 22, 0.1)", padding: "5px 10px", borderRadius: "20px" }}>
                  ⏳ {totalPendientes} Reservas sin pagar
                </span>
                
                {/* 🏷️ NUEVA Etiqueta de Diagnóstico: Nivel de Ocupación */}
                <span style={{ 
                  color: Number(ocupacionGlobal) >= 70 ? "#10b981" : Number(ocupacionGlobal) >= 40 ? "#f59e0b" : "#ef4444", 
                  backgroundColor: Number(ocupacionGlobal) >= 70 ? "rgba(16, 185, 129, 0.1)" : Number(ocupacionGlobal) >= 40 ? "rgba(245, 158, 11, 0.1)" : "rgba(239, 68, 68, 0.1)", 
                  padding: "5px 10px", 
                  borderRadius: "20px",
                  border: `1px solid ${Number(ocupacionGlobal) >= 70 ? "rgba(16, 185, 129, 0.3)" : Number(ocupacionGlobal) >= 40 ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                  fontWeight: "bold"
                }}>
                  {Number(ocupacionGlobal) >= 70 ? "🔥 Alta Demanda" : Number(ocupacionGlobal) >= 40 ? "⚡ Demanda Media" : "🧊 Baja Demanda"}
                </span>
              </div>
            </div>

            <details style={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #334155", padding: "15px", cursor: "pointer" }}>
              <summary style={{ fontWeight: "bold", color: "#f8fafc", outline: "none", fontSize: "1rem" }}>
                📈 Nivel de Ocupación <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "normal" }}>(Clic para expandir)</span>
              </summary>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px", paddingTop: "15px", borderTop: "1px solid #334155" }}>
                
                {/* 📊 NUEVA BARRA DE PROGRESO DE OCUPACIÓN */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Ocupación Global del Sistema</span>
                    <span style={{ color: Number(ocupacionGlobal) >= 70 ? "#10b981" : Number(ocupacionGlobal) >= 40 ? "#f59e0b" : "#ef4444", fontWeight: "bold", fontSize: "0.9rem" }}>
                      {ocupacionGlobal}%
                    </span>
                  </div>
                  <div style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "10px", height: "8px", overflow: "hidden" }}>
                    <div style={{ 
                      width: `${Number(ocupacionGlobal)}%`, 
                      backgroundColor: Number(ocupacionGlobal) >= 70 ? "#10b981" : Number(ocupacionGlobal) >= 40 ? "#f59e0b" : "#ef4444", 
                      height: "100%", 
                      borderRadius: "10px",
                      transition: "width 1s ease-in-out"
                    }}></div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", backgroundColor: "rgba(56, 189, 248, 0.05)", padding: "10px", borderRadius: "8px" }}>
                    <h3 style={{ margin: 0, color: "#38bdf8", fontSize: "1.5rem" }}>{promedioParticipantes}</h3>
                    <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>Promedio de inscriptos por evento</p>
                </div>

              </div>
            </details>
          </div>
        </div>
      </div>

      {/* TARJETA 3: ANÁLISIS FINANCIERO GLOBAL (Condicional por rol) */}
      {usuarioRol <= 2 && (
        <div className="grafico-card" style={{ width: "100%" }}>
          <div className="grafico-card__header">
            <h3>💰 REGISTRO DE INGRESOS</h3>
            <button
              onClick={onAbrirModalFinanciero}
              className="btn-export"
              style={{ backgroundColor: "#10b981", color: "#fff", border: "none", padding: "8px 15px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
            >
              Ver Detalles de Ingresos
            </button>
          </div>

          <div className="grafico-card__body" style={{ flexDirection: "column", gap: "15px", display: "flex" }}>
            <div style={{ textAlign: "center", padding: "20px", backgroundColor: "#1e293b", borderRadius: "8px", border: "1px solid #334155" }}>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "1px" }}>INGRESOS NETOS DE PLATAFORMA</p>
              <h2 style={{ margin: "5px 0 0 0", color: "#fbbf24", fontSize: "3rem", textShadow: "0 2px 10px rgba(251, 191, 36, 0.2)" }}>
                ${totalRecaudadoGlobal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </h2>
              <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "15px", fontSize: "1rem" }}>
                <span style={{ color: "#4ade80", backgroundColor: "rgba(74, 222, 128, 0.1)", padding: "5px 10px", borderRadius: "20px" }}>
                  🎟️ {cantidadGratuitos} Eventos Gratuitos
                </span>
                <span style={{ color: "#f87171", backgroundColor: "rgba(248, 113, 113, 0.1)", padding: "5px 10px", borderRadius: "20px" }}>
                  💳 {cantidadPagos} Eventos Pagos
                </span>
              </div>
            </div>

            <details style={{ backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #334155", padding: "15px", cursor: "pointer" }}>
              <summary style={{ fontWeight: "bold", color: "#f8fafc", outline: "none", fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "10px" }}>
                📊 Desglose de Ingresos Netos <span style={{ fontSize: "0.8rem", color: "#94a3b8", fontWeight: "normal" }}>(Clic para expandir)</span>
              </summary>

              <div style={{ display: "flex", justifyContent: "space-around", marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #334155" }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "1rem" }}>Eventos Propios (100%)</p>
                  <h3 style={{ margin: "5px 0 0 0", color: "#8b5cf6", fontSize: "1.8rem" }}>
                    ${recaudadoPropios.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div style={{ width: "1px", backgroundColor: "#334155" }}></div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "1rem" }}>Eventos Externos (10% Comis.)</p>
                  <h3 style={{ margin: "5px 0 0 0", color: "#3b82f6", fontSize: "1.8rem" }}>
                    ${recaudadoExternos.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </h3>
                </div>
              </div>
            </details>
          </div>
        </div>
      )}
    </>
  );
}