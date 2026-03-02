
interface ModalPerfilOrganizadorProps {
    organizador: any | null;
    onClose: () => void;
}

export function ModalPerfilOrganizador({ organizador, onClose }: ModalPerfilOrganizadorProps) {
    if (!organizador) return null;

    // 1. Cálculos de Inteligencia de Negocio (Frontend)
    const totalEventos = organizador.total_eventos || 1; // Evitamos dividir por cero
    const promedioPorEvento = organizador.recaudacion_total / totalEventos;
    const tasaFinalizacion = Math.round((organizador.finalizados / totalEventos) * 100);

    // 2. Sistema de "Gamificación" o Categorización de Clientes (VIP)
    let nivel = "Bronce";
    let colorNivel = "#cd7f32"; // Bronce
    let iconoNivel = "🥉";

    if (organizador.recaudacion_total >= 1000000) {
        nivel = "Platinum";
        colorNivel = "#e5e4e2"; // Platinum
        iconoNivel = "💎";
    } else if (organizador.recaudacion_total >= 500000) {
        nivel = "Gold";
        colorNivel = "#fbbf24"; // Oro
        iconoNivel = "🥇";
    } else if (organizador.recaudacion_total >= 100000) {
        nivel = "Silver";
        colorNivel = "#94a3b8"; // Plata
        iconoNivel = "🥈";
    }

    return (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div className="modal-content" style={{ backgroundColor: "#1e293b", padding: "25px", borderRadius: "12px", width: "500px", border: "1px solid #334155", color: "#f8fafc", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" }}>
                
                {/* ════ ENCABEZADO Y MEDALLA ════ */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #334155", paddingBottom: "15px", marginBottom: "20px" }}>
                    <div>
                        <h3 style={{ margin: "0 0 5px 0", fontSize: "1.4rem", color: "#38bdf8" }}>
                            {organizador.organizador}
                        </h3>
                        <span style={{ backgroundColor: organizador.rol === "Organización Externa" ? "#8b5cf6" : "#3b82f6", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", color: "white" }}>
                            {organizador.rol}
                        </span>
                        <div style={{ marginTop: "8px", fontSize: "0.9rem", color: "#94a3b8" }}>
                            📧 {organizador.email}
                        </div>
                    </div>
                    
                    {/* Tarjeta de Nivel VIP */}
                    <div style={{ textAlign: "center", backgroundColor: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "8px", border: `1px solid ${colorNivel}` }}>
                        <div style={{ fontSize: "2rem", lineHeight: "1" }}>{iconoNivel}</div>
                        <div style={{ fontSize: "0.75rem", fontWeight: "bold", color: colorNivel, marginTop: "5px", textTransform: "uppercase" }}>
                            Socio {nivel}
                        </div>
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    
                    {/* ════ BLOQUE 1: RENDIMIENTO FINANCIERO ════ */}
                    <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#0f172a", padding: "15px", borderRadius: "8px" }}>
                        <div style={{ flex: 1 }}>
                            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Recaudación Histórica</span>
                            <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#4ade80" }}>
                                ${organizador.recaudacion_total.toLocaleString("es-AR")}
                            </div>
                        </div>
                        <div style={{ flex: 1, textAlign: "right", borderLeft: "1px solid #334155" }}>
                            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Promedio por Evento</span>
                            <div style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#f8fafc" }}>
                                ${promedioPorEvento.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                            </div>
                        </div>
                    </div>

                    {/* ════ BLOQUE 2: HISTORIAL OPERATIVO ════ */}
                    <div style={{ backgroundColor: "#0f172a", padding: "15px", borderRadius: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                            <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Tasa de Finalización:</span>
                            <strong style={{ color: tasaFinalizacion >= 70 ? "#4ade80" : "#f59e0b" }}>{tasaFinalizacion}%</strong>
                        </div>
                        
                        {/* Barra de progreso de finalización */}
                        <div style={{ width: "100%", height: "8px", backgroundColor: "#334155", borderRadius: "4px", overflow: "hidden", marginBottom: "15px" }}>
                            <div style={{ width: `${tasaFinalizacion}%`, height: "100%", backgroundColor: tasaFinalizacion >= 70 ? "#4ade80" : "#f59e0b" }} />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ color: "#94a3b8" }}>Activos</div>
                                <div style={{ fontWeight: "bold", color: "#38bdf8", fontSize: "1.1rem" }}>{organizador.activos}</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ color: "#94a3b8" }}>Finalizados</div>
                                <div style={{ fontWeight: "bold", color: "#f8fafc", fontSize: "1.1rem" }}>{organizador.finalizados}</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                                <div style={{ color: "#94a3b8" }}>Total Histórico</div>
                                <div style={{ fontWeight: "bold", color: "#f8fafc", fontSize: "1.1rem" }}>{organizador.total_eventos}</div>
                            </div>
                        </div>
                    </div>

                    {/* ════ BLOQUE 3: ACCIONES ════ */}
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                        <a 
                            href={`mailto:${organizador.email}?subject=Contacto desde Plataforma de Eventos`}
                            style={{ flex: 1, textAlign: "center", padding: "10px", backgroundColor: "#38bdf8", color: "#0f172a", textDecoration: "none", borderRadius: "6px", fontWeight: "bold", transition: "0.2s" }}
                        >
                            ✉️ Contactar Socio
                        </a>
                        <button 
                            onClick={onClose}
                            style={{ flex: 1, padding: "10px", backgroundColor: "#334155", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}
                        >
                            Cerrar Panel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}