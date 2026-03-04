import { useEffect, useState } from 'react';

interface ModalTermometroProps {
    evento: any | null;
    onClose: () => void;
}

export function ModalTermometro({ evento, onClose }: ModalTermometroProps) {
    const [animate, setAnimate] = useState(false);
    // NUEVO ESTADO: Guarda qué acciones seleccionó el usuario
    const [accionesSeleccionadas, setAccionesSeleccionadas] = useState<string[]>([]);

    useEffect(() => {
        if (evento) {
            setTimeout(() => setAnimate(true), 100);
            setAccionesSeleccionadas([]); // Limpia las selecciones al abrir un nuevo evento
        } else {
            setAnimate(false);
        }
    }, [evento]);

    if (!evento) return null;

    // --- CÁLCULOS REALES BASADOS EN TUS DATOS ---
    const ocupacion = evento.tasa_ocupacion || 0;
    const cupoMaximo = evento.cupo_maximo || 1;
    const inscriptos = evento.total_ocupado || 0;
    const disponibles = Math.max(0, cupoMaximo - inscriptos);
    const pagosConfirmados = evento.inscriptos_pagos || 0;
    const reservasSinPagar = evento.reservados_no_pagos || 0;

    let diasRestantes = 0;
    let textoDias = "Fecha pasada o no definida";
    
    if (evento.fecha_evento) {
        const fechaEvt = new Date(evento.fecha_evento);
        const hoy = new Date();

        // Forzamos ambas fechas exactamente a la medianoche local para hacer una resta limpia
        fechaEvt.setHours(0, 0, 0, 0);
        hoy.setHours(0, 0, 0, 0);

        const diferenciaTiempo = fechaEvt.getTime() - hoy.getTime();
        diasRestantes = Math.round(diferenciaTiempo / (1000 * 3600 * 24));

        if (diasRestantes > 0) {
            textoDias = `Faltan ${diasRestantes} días`;
        } else if (diasRestantes === 0) {
            textoDias = "¡Es hoy!";
        } else {
            textoDias = `Pasó hace ${Math.abs(diasRestantes)} días`;
        }
    }

    // --- COLORES ---
    const colorNaranja = "#ff641e"; // El naranja original para la UI principal

    // --- LÓGICA DE DIAGNÓSTICO INTELIGENTE ---
    let iconoDiagnostico = "✅";
    let textoDiagnostico = "";
    let tituloDiagnostico = "Excelente proyección";
    let colorDiagnostico = "#34d399"; // Verde (Solo para el cuadrito de diagnóstico)

    if (diasRestantes > 0) {
        if (ocupacion >= 90) {
            iconoDiagnostico = "🔥";
            textoDiagnostico = "El evento está prácticamente lleno. Es un éxito rotundo. Podrías considerar abrir cupos extra o planificar una segunda edición.";
            colorDiagnostico = "#34d399";
        } else if (ocupacion >= 50 && diasRestantes > 7) {
            iconoDiagnostico = "👍";
            textoDiagnostico = "Viene a buen ritmo. Con la tendencia actual, es muy probable alcanzar la meta antes de la fecha límite.";
            colorDiagnostico = "#60a5fa"; // Azul
        } else if (ocupacion < 50 && diasRestantes <= 7) {
            iconoDiagnostico = "⚠️";
            tituloDiagnostico = "Alerta de baja ocupación";
            textoDiagnostico = `Con ${diasRestantes} días restantes y solo el ${ocupacion}% de ocupación, el evento está en zona de alerta. Sin acciones activas, es poco probable llegar al 100%. Se recomienda actuar esta semana.`;
            colorDiagnostico = "#f59e0b"; // Amarillo/Naranja
        } else if (ocupacion < 30 && diasRestantes <= 15) {
             iconoDiagnostico = "⚠️";
             tituloDiagnostico = "Atención requerida";
             textoDiagnostico = "El ritmo de inscripción es más lento de lo esperado. Sería prudente lanzar campañas de recordatorio esta semana.";
             colorDiagnostico = "#f59e0b";
        } else {
             // ACÁ REEMPLAZAMOS EL "EN DESARROLLO" POR TU TEXTO EXACTO DINÁMICO
             iconoDiagnostico = "⚠️";
             tituloDiagnostico = "Diagnóstico automático";
             textoDiagnostico = `A solo ${diasRestantes} días del evento, la ocupación es baja (${ocupacion}%). Se requiere acción comercial inmediata para evitar pérdidas.`;
             colorDiagnostico = "#f59e0b";
        }
    } else {
         iconoDiagnostico = "🏁";
         tituloDiagnostico = "Evento Finalizado";
         textoDiagnostico = `El evento cerró con un ${ocupacion}% de ocupación total. Analizá estas métricas para mejorar futuras ediciones.`;
         colorDiagnostico = "#94a3b8"; // Gris
    }

    const radio = 35;
    const circunferencia = 2 * Math.PI * radio;
    const offset = animate ? circunferencia - (ocupacion / 100) * circunferencia : circunferencia;

    // --- LISTA DE ACCIONES DINÁMICAS ---
    const accionesDisponibles = [
        { id: "urgencia", icono: "📣", titulo: "Campaña urgencia", desc: `Manda email con "últimos ${disponibles > 0 ? disponibles : 'pocos'} lugares"` },
        { id: "promo", icono: "🎁", titulo: "Promo por tiempo", desc: "Descuento del 10% válido solo por 48 hs" },
        { id: "referidos", icono: "👥", titulo: "Referidos", desc: "Beneficio a inscriptos que traigan un amigo" },
        { id: "redes", icono: "📱", titulo: "Story en redes", desc: "Conteo regresivo con sticker de registro" }
    ];

    const toggleAccion = (id: string) => {
        setAccionesSeleccionadas(prev => 
            prev.includes(id) ? prev.filter(accionId => accionId !== id) : [...prev, id]
        );
    };

    const handleIniciarCampana = () => {
        if (accionesSeleccionadas.length === 0) {
            alert("⚠️ Seleccioná al menos una acción para iniciar la campaña.");
            return;
        }

        const nombresAcciones = accionesSeleccionadas.map(id => accionesDisponibles.find(a => a.id === id)?.titulo);
        alert(`🚀 INICIANDO CAMPAÑA...\n\nRedirigiendo al panel de marketing para ejecutar:\n👉 ${nombresAcciones.join('\n👉 ')}`);
    };

    return (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(13, 15, 26, 0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)", padding: "20px", overflowY: "auto" }}>
            
            <style>
                {`
                    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.7); } }
                    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap');
                    
                    .custom-modal::-webkit-scrollbar { width: 6px; }
                    .custom-modal::-webkit-scrollbar-track { background: transparent; }
                    .custom-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    
                    /* Tarjeta de acción NORMAL */
                    .action-btn { background: #1a1d2e; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px; cursor: pointer; text-align: left; transition: all 0.2s; display: flex; flex-direction: column; gap: 6px; position: relative; overflow: hidden; outline: none; }
                    .action-btn:hover { border-color: rgba(255,100,30,0.4); transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
                    
                    /* Tarjeta de acción SELECCIONADA */
                    .action-btn.selected { background: rgba(255,100,30,0.1); border-color: ${colorNaranja}; box-shadow: 0 4px 15px rgba(255,100,30,0.15); transform: translateY(-2px); }
                    
                    .btn-primary { flex: 2; padding: 12px; background: linear-gradient(135deg, ${colorNaranja}, #ff4500); border: none; border-radius: 12px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; box-shadow: 0 4px 20px rgba(255,100,30,0.3); display: flex; align-items: center; justify-content: center; gap: 8px;}
                    .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(255,100,30,0.5); }
                    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }
                `}
            </style>

            <div className="custom-modal" style={{ background: "#12141f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", position: "relative", boxShadow: "0 40px 80px rgba(0,0,0,0.6)", opacity: animate ? 1 : 0, transform: animate ? "translateY(0) scale(1)" : "translateY(32px) scale(0.97)", transition: "all 0.4s", fontFamily: "'DM Sans', sans-serif" }}>
                {/* BOTÓN CERRAR SUPERIOR CON LA X DE TEXTO */}
                <button onClick={onClose} style={{ position: "absolute", top: "24px", right: "24px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}>
                <span style={{ color: "#ffffff", fontSize: "16px", fontWeight: "bold", lineHeight: 1 }}>✕</span>
                </button>
                {/* HEADER */}
                <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: `rgba(255,100,30,0.1)`, border: `1px solid rgba(255,100,30,0.3)`, borderRadius: "100px", padding: "4px 12px 4px 8px", marginBottom: "14px" }}>
                        <span>{evento.es_pago ? "💳" : "🎟️"}</span>
                        <p style={{ fontSize: "11px", fontWeight: 600, color: colorNaranja, textTransform: "uppercase", margin: 0 }}>Seguimiento de Evento</p>
                    </div>
                    <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#fff", margin: 0, fontFamily: "'Syne', sans-serif", lineHeight: 1.2 }}>{evento.nombre_evento}</h2>
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginTop: "4px", margin: 0 }}>Panel de ocupación y diagnóstico en tiempo real</p>
                </div>

                {/* URGENCY BAR */}
                <div style={{ background: `linear-gradient(90deg, rgba(255,100,30,0.15), rgba(255,100,30,0.05))`, borderTop: `1px solid rgba(255,100,30,0.2)`, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 28px", display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "rgba(255,200,150,0.7)" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: colorNaranja, animation: animate ? "pulse 1.5s ease-in-out infinite" : "none" }}></div>
                    <span>⏱</span>
                    <span>{textoDias} — {diasRestantes > 0 ? `quedan ${disponibles} cupos disponibles` : `el evento está cerrado`}</span>
                </div>

                {/* HERO DONUT & PROGRESS */}
                <div style={{ padding: "24px 28px", display: "flex", alignItems: "center", gap: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ position: "relative", width: "88px", height: "88px", flexShrink: 0 }}>
                        <svg viewBox="0 0 88 88" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                            <circle cx="44" cy="44" r={radio} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                            <circle cx="44" cy="44" r={radio} fill="none" stroke={colorNaranja} strokeWidth="8" strokeLinecap="round" strokeDasharray={circunferencia} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1.2s ease 0.2s" }} />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: "20px", fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "'Syne', sans-serif" }}>{ocupacion}%</span>
                            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: "2px" }}>Ocupado</span>
                        </div>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: "14px", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", marginBottom: "6px", fontFamily: "'Syne', sans-serif", margin: 0 }}>Ocupación actual</h3>
                        <div style={{ height: "6px", background: "rgba(255,255,255,0.07)", borderRadius: "100px", overflow: "hidden", marginBottom: "10px" }}>
                            <div style={{ height: "100%", width: animate ? `${ocupacion}%` : "0%", background: `linear-gradient(90deg, ${colorNaranja}, #ff8c42)`, transition: "width 1s ease 0.3s" }}></div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                            <span>0%</span>
                            <strong style={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{inscriptos} de {cupoMaximo} inscriptos</strong>
                            <span>100%</span>
                        </div>
                    </div>
                </div>

                {/* STATS GRID */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ background: "#12141f", padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontSize: "18px", marginBottom: "2px" }}>🎟️</span>
                        <span style={{ fontSize: "22px", fontWeight: 800, lineHeight: 1, fontFamily: "'Syne', sans-serif", color: colorNaranja }}>{ocupacion}%</span>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.3 }}>Ocupación actual</span>
                    </div>
                    <div style={{ background: "#12141f", padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontSize: "18px", marginBottom: "2px" }}>🟢</span>
                        <span style={{ fontSize: "22px", fontWeight: 800, lineHeight: 1, fontFamily: "'Syne', sans-serif", color: "#60a5fa" }}>{disponibles}</span>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.3 }}>Cupos disponibles</span>
                    </div>
                    <div style={{ background: "#12141f", padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontSize: "18px", marginBottom: "2px" }}>📅</span>
                        <span style={{ fontSize: "22px", fontWeight: 800, lineHeight: 1, fontFamily: "'Syne', sans-serif", color: "#fff" }}>{diasRestantes > 0 ? diasRestantes : 0}d</span>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.3 }}>Días para el evento</span>
                    </div>
                </div>

                {/* DETAIL TABLE */}
                <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "13px" }}>
                        <span style={{ color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "14px" }}>✅</span> Pagos confirmados</span>
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, background: "rgba(52,211,153,0.12)", color: "#34d399" }}>{pagosConfirmados} personas</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "13px" }}>
                        <span style={{ color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "14px" }}>⏳</span> Reservas sin pagar</span>
                        <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "100px", fontSize: "11px", fontWeight: 700, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}>{reservasSinPagar} pendientes</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", fontSize: "13px" }}>
                        <span style={{ color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "14px" }}>🏁</span> Cupo máximo total</span>
                        <span style={{ fontWeight: 600, color: "#fff" }}>{cupoMaximo} lugares</span>
                    </div>
                </div>

                {/* DIAGNOSTIC CON SU PROPIO COLOR SEMÁNTICO */}
                <div style={{ margin: "20px 20px 0", padding: "14px 16px", borderRadius: "12px", borderLeft: `3px solid ${colorDiagnostico}`, background: `rgba(${colorDiagnostico === '#f59e0b' ? '245,158,11' : (colorDiagnostico === '#34d399' ? '52,211,153' : (colorDiagnostico === '#94a3b8' ? '148,163,184' : '96,165,250'))},0.08)`, display: "flex", gap: "12px" }}>
                    <span style={{ fontSize: "18px", marginTop: "1px" }}>{iconoDiagnostico}</span>
                    <div>
                        <strong style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "3px", color: colorDiagnostico }}>{tituloDiagnostico}</strong>
                        <p style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(255,255,255,0.55)", margin: 0 }}>{textoDiagnostico}</p>
                    </div>
                </div>

                <div style={{ height: "16px" }}></div>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.05)", margin: "0 20px" }}></div>

                {/* ════ ACCIONES SELECCIONABLES ════ */}
                <div style={{ padding: "20px 20px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", padding: "0 8px" }}>
                        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                            💡 Seleccioná acciones a implementar
                        </p>
                        <span style={{ fontSize: "10px", color: colorNaranja, fontWeight: 700, background: "rgba(255,100,30,0.1)", padding: "2px 8px", borderRadius: "10px" }}>
                            {accionesSeleccionadas.length} seleccionadas
                        </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                        {accionesDisponibles.map(accion => (
                            <button 
                                key={accion.id}
                                className={`action-btn ${accionesSeleccionadas.includes(accion.id) ? 'selected' : ''}`} 
                                onClick={() => toggleAccion(accion.id)}
                            >
                                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                                    <span style={{ fontSize: "20px" }}>{accion.icono}</span>
                                    {accionesSeleccionadas.includes(accion.id) && <span style={{ color: colorNaranja, fontSize: "14px" }}>✔</span>}
                                </div>
                                <span style={{ fontSize: "12px", fontWeight: 600, color: accionesSeleccionadas.includes(accion.id) ? "#fff" : "rgba(255,255,255,0.8)", lineHeight: 1.2 }}>
                                    {accion.titulo}
                                </span>
                                <span style={{ fontSize: "10px", color: accionesSeleccionadas.includes(accion.id) ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.3)", lineHeight: 1.3 }}>
                                    {accion.desc}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* FOOTER CON BOTÓN INTELIGENTE */}
                <div style={{ padding: "20px", display: "flex", gap: "10px" }}>
                    <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }} onMouseOver={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"} onMouseOut={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}>
                        Cerrar Panel
                    </button>
                    <button 
                        className="btn-primary" 
                        onClick={handleIniciarCampana}
                        disabled={accionesSeleccionadas.length === 0}
                    >
                        🚀 {accionesSeleccionadas.length > 0 ? `Iniciar ${accionesSeleccionadas.length} acción${accionesSeleccionadas.length > 1 ? 'es' : ''}` : 'Seleccioná una acción'}
                    </button>
                </div>

            </div>
        </div>
    );
}