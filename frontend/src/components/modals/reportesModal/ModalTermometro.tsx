interface ModalTermometroProps {
    evento: any | null;
    onClose: () => void;
}

export function ModalTermometro({ evento, onClose }: ModalTermometroProps) {
    if (!evento) return null;

    // 1. Verificación de Fechas y Días restantes
    const hoy = new Date();
    const tieneFecha = evento.fecha_evento && evento.fecha_evento !== "Sin fecha";
    let diasRestantes = 0;
    let yaPaso = false;

    if (tieneFecha) {
        // timeZone: "UTC" para que los días den exactos
        const fechaEvento = new Date(evento.fecha_evento + 'T00:00:00Z'); 
        const diffTime = fechaEvento.getTime() - hoy.getTime();
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        yaPaso = diasRestantes < 0;
    }

    // 2. Lógica del Diagnóstico (Semáforo)
    let alertaColor = "#4ade80"; // Verde
    let alertaMensaje = "El ritmo de inscripción es bueno o el evento tiene buena ocupación.";

    if (!tieneFecha) {
        alertaColor = "#94a3b8";
        alertaMensaje = "Este evento no tiene una fecha programada.";
    } else if (yaPaso) {
        alertaColor = "#94a3b8"; // Gris
        alertaMensaje = "Este evento ya finalizó.";
    } else {
        if (evento.tasa_ocupacion < 40 && diasRestantes <= 15) {
            alertaColor = "#ef4444"; // Rojo Crítico
            alertaMensaje = `¡Crítico! Faltan solo ${diasRestantes} días y la ocupación está por debajo del 40%. Sugerimos acción urgente de marketing.`;
        } else if (evento.tasa_ocupacion < 50 && diasRestantes <= 30) {
            alertaColor = "#f59e0b"; // Naranja Advertencia
            alertaMensaje = `Advertencia: Faltan ${diasRestantes} días y la ocupación está a la mitad.`;
        }
    }

    // 3. Cálculos matemáticos con los nombres reales de tu Base de Datos
    const cuposDisponibles = evento.cupo_maximo - evento.total_ocupado;

    return (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div className="modal-content" style={{ backgroundColor: "#1e293b", padding: "25px", borderRadius: "12px", width: "450px", border: "1px solid #334155", color: "#f8fafc" }}>
                
                <h3 style={{ margin: "0 0 15px 0", color: "#38bdf8" }}>📊 Detalle de Ocupación</h3>
                <h4 style={{ margin: "0 0 20px 0", fontSize: "1.2rem", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>
                    {evento.nombre_evento}
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    
                    {/* ════ BLOQUE 1: MÉTRICAS RÁPIDAS ════ */}
                    <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#0f172a", padding: "15px", borderRadius: "8px" }}>
                        <div style={{ textAlign: "center" }}>
                            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Ocupación</span>
                            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: evento.tasa_ocupacion < 40 ? "#ef4444" : "#4ade80" }}>
                                {evento.tasa_ocupacion}%
                            </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Disponibles</span>
                            <div style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                                {cuposDisponibles >= 0 ? cuposDisponibles : 0}
                            </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Faltan</span>
                            <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: yaPaso ? "#94a3b8" : "#38bdf8" }}>
                                {!tieneFecha ? "-" : (yaPaso ? "Pasó" : `${diasRestantes} d`)}
                            </div>
                        </div>
                    </div>

                    {/* ════ BLOQUE 2: DESGLOSE DE INSCRIPCIONES (¡Aprovechamos tus datos!) ════ */}
                    <div style={{ backgroundColor: "#0f172a", padding: "12px", borderRadius: "8px", fontSize: "0.9rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span style={{ color: "#94a3b8" }}>Pagos confirmados:</span>
                            <strong>{evento.inscriptos_pagos}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span style={{ color: "#94a3b8" }}>Reservas sin pagar:</span>
                            <strong style={{ color: evento.reservados_no_pagos > 0 ? "#f59e0b" : "inherit"}}>{evento.reservados_no_pagos}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #334155", paddingTop: "5px", marginTop: "5px" }}>
                            <span style={{ color: "#94a3b8" }}>Cupo Máximo Total:</span>
                            <strong>{evento.cupo_maximo}</strong>
                        </div>
                    </div>

                    {/* ════ BLOQUE 3: DIAGNÓSTICO DEL SISTEMA ════ */}
                    <div style={{ padding: "12px", borderLeft: `5px solid ${alertaColor}`, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "4px" }}>
                        <strong style={{ color: alertaColor }}>Diagnóstico Automático:</strong>
                        <p style={{ margin: "5px 0 0 0", fontSize: "0.9rem", lineHeight: "1.4" }}>
                            {alertaMensaje}
                        </p>
                    </div>

                    <button 
                        onClick={onClose}
                        style={{ marginTop: "10px", padding: "10px", backgroundColor: "#334155", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#475569"}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#334155"}
                    >
                        Cerrar Panel
                    </button>
                </div>
            </div>
        </div>
    );
}