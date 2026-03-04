import { useEffect, useState } from 'react';
import { X } from "lucide-react"; 

interface ModalPerfilOrganizadorProps {  
  organizador?: any; 
  onClose: () => void;
}

export function ModalPerfilOrganizador({ organizador, onClose }: ModalPerfilOrganizadorProps) {
  const [animate, setAnimate] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('perfil');
  const [noteInput, setNoteInput] = useState<string>('');
  const [notas, setNotas] = useState([
    { id: 1, author: 'Admin', date: '15 feb 2026', text: 'El organizador externo canceló 2 eventos seguidos en diciembre por baja ocupación. Hablar con él sobre estrategias de difusión antes de que cree nuevos eventos.' }
  ]);
  const [selectedCat, setSelectedCat] = useState<string>('gold');
  
  // --- NUEVO ESTADO PARA OCULTAR/MOSTRAR EL GLOSARIO ---
  const [showGlossary, setShowGlossary] = useState<boolean>(false);

  useEffect(() => {
    if (organizador) {
      setTimeout(() => setAnimate(true), 100);
      if ((organizador.rol === 'Administrador' || organizador.rol === 'Supervisor') && activeTab === 'categoria') {
        setActiveTab('perfil');
      }
    } else {
      setAnimate(false);
    }
  }, [organizador, activeTab]);

  if (!organizador) return null;

  const isInternal = organizador.rol === 'Administrador' || organizador.rol === 'Supervisor'; 

  const stats = { 
    activos: Number(organizador.activos) || 0, 
    finalizados: Number(organizador.finalizados) || 0, 
    total_eventos: Number(organizador.total_eventos) || 0,
    recaudacion: Number(organizador.recaudacion_total) || 0 
  };
  
  const cancelados = stats.total_eventos - stats.activos - stats.finalizados;
  const totalCerrados = stats.finalizados + cancelados;
  const tasaExito = totalCerrados > 0 ? Math.round((stats.finalizados / totalCerrados) * 100) : 0;
  const isAlertaRoja = tasaExito < 50 && totalCerrados > 0; 

  // Ganancia real: 100% internos, 10% externos
  const gananciaPlataforma = isInternal ? stats.recaudacion : stats.recaudacion * 0.10;

  const colorGold = "#f59e0b"; 
  const colorAlert = "#ef4444"; 
  const colorSuccess = "#10b981"; 
  const colorInternal = "#3b82f6"; 

  const badgeBg = isInternal ? `rgba(59, 130, 246, 0.1)` : `rgba(245, 158, 11, 0.1)`;
  const badgeBorder = isInternal ? `rgba(59, 130, 246, 0.3)` : `rgba(245, 158, 11, 0.3)`;
  const badgeColor = isInternal ? colorInternal : colorGold;
  const badgeIcon = isInternal ? "🏠" : "🏢";
  const badgeText = isInternal ? "Producción Propia" : "Organización Externa";

  const handleSaveNote = () => {
    if (!noteInput.trim()) return;
    setNotas([{
      id: Date.now(),
      author: 'Admin',
      date: new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }),
      text: noteInput
    }, ...notas]);
    setNoteInput('');
  };

  const handleDeleteNote = (id: number) => {
    setNotas(notas.filter(n => n.id !== id));
  };

  const categorias = [
    { id: 'bronze', icono: '🥉', titulo: 'Bronze', desc: 'Menos de 5 eventos finalizados', color: '#b45309' },
    { id: 'silver', icono: '🥈', titulo: 'Silver', desc: '5+ eventos o $200k+ recaudación', color: '#94a3b8' },
    { id: 'gold', icono: '🥇', titulo: 'Gold', desc: '10+ eventos o $500k+ recaudación', color: colorGold },
    { id: 'platinum', icono: '💎', titulo: 'Platinum', desc: '20+ eventos o $1M+ recaudación', color: '#06b6d4' }
  ];

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(13, 15, 26, 0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)", padding: "20px", overflowY: "auto" }}>
      
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Syne:wght@700;800&display=swap');
          
          .custom-modal::-webkit-scrollbar { width: 6px; }
          .custom-modal::-webkit-scrollbar-track { background: transparent; }
          .custom-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
          
          .action-btn { background: #1a1d2e; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px; cursor: pointer; text-align: left; transition: all 0.2s; display: flex; flex-direction: column; gap: 6px; position: relative; overflow: hidden; outline: none; }
          .action-btn:hover { border-color: rgba(245,158,11,0.4); transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
          .action-btn.selected { background: rgba(245,158,11,0.1); border-color: ${colorGold}; box-shadow: 0 4px 15px rgba(245,158,11,0.15); transform: translateY(-2px); }
          
          .btn-primary { flex: 2; padding: 12px; border: none; border-radius: 12px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Syne', sans-serif; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;}
          .btn-primary:hover:not(:disabled) { transform: translateY(-1px); }
          .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }

          .btn-whatsapp { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 20px rgba(16,185,129,0.3); }
          .btn-whatsapp:hover { box-shadow: 0 8px 28px rgba(16,185,129,0.5); }

          .btn-internal { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 4px 20px rgba(59,130,246,0.3); }
          .btn-internal:hover { box-shadow: 0 8px 28px rgba(59,130,246,0.5); }

          .tab-btn { flex: 1; padding: 10px; border-radius: 8px; font-size: 12px; font-weight: 600; border: none; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
          
          .glosario-btn:hover { background: rgba(255,255,255,0.05) !important; }
        `}
      </style>

      <div className="custom-modal" style={{ background: "#12141f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", position: "relative", boxShadow: "0 40px 80px rgba(0,0,0,0.6)", opacity: animate ? 1 : 0, transform: animate ? "translateY(0) scale(1)" : "translateY(32px) scale(0.97)", transition: "all 0.4s", fontFamily: "'DM Sans', sans-serif" }}>
        
        <button onClick={onClose} style={{ position: "absolute", top: "24px", right: "24px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}>
          <span style={{ color: "#ffffff", fontSize: "16px", fontWeight: "bold", lineHeight: 1 }}>✕</span>
        </button>

        <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: badgeBg, border: `1px solid ${badgeBorder}`, borderRadius: "100px", padding: "4px 12px 4px 8px", marginBottom: "14px" }}>
            <span>{badgeIcon}</span>
            <p style={{ fontSize: "11px", fontWeight: 600, color: badgeColor, textTransform: "uppercase", margin: 0 }}>{badgeText}</p>
          </div>
          
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 4px 0", fontFamily: "'Syne', sans-serif", lineHeight: 1.2 }}>{organizador.organizador || 'Empresa Sin Nombre'}</h2>
          
          <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
            <span>✉️ {organizador.email || 'Sin email'}</span>
            {!isInternal && (
              <>
                <span style={{ display: "inline-block", width: "4px", height: "4px", background: "rgba(255,255,255,0.2)", borderRadius: "50%" }}></span>
                <strong style={{ color: colorGold }}>🥇 Socio Gold</strong>
              </>
            )}
          </div>
        </div>

        <div style={{ padding: "20px 28px 10px" }}>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <button onClick={() => setActiveTab('perfil')} className="tab-btn" style={{ background: activeTab === 'perfil' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'perfil' ? '#fff' : 'rgba(255,255,255,0.4)' }}>
              📊 Perfil
            </button>
            <button onClick={() => setActiveTab('notas')} className="tab-btn" style={{ background: activeTab === 'notas' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'notas' ? '#fff' : 'rgba(255,255,255,0.4)' }}>
              📝 Notas {notas.length > 0 && <span style={{ background: "rgba(255,255,255,0.15)", padding: "2px 6px", borderRadius: "10px", fontSize: "10px" }}>{notas.length}</span>}
            </button>
            {!isInternal && (
              <button onClick={() => setActiveTab('categoria')} className="tab-btn" style={{ background: activeTab === 'categoria' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeTab === 'categoria' ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                🏅 Categoría
              </button>
            )}
          </div>
        </div>

        <div style={{ paddingBottom: "20px" }}>
          {activeTab === 'perfil' && (
            <div style={{ animation: "fadeIn 0.3s ease" }}>
              
              {isAlertaRoja && (
                <div style={{ margin: "10px 28px 20px", padding: "14px 16px", borderRadius: "12px", borderLeft: `3px solid ${colorAlert}`, background: `rgba(239, 68, 68, 0.08)`, display: "flex", gap: "12px" }}>
                    <span style={{ fontSize: "18px", marginTop: "1px" }}>⚠️</span>
                    <div>
                        <strong style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "3px", color: colorAlert }}>
                          Tasa de finalización crítica ({tasaExito}%)
                        </strong>
                        <p style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                          De {totalCerrados} eventos que dejaron de estar activos, <strong style={{color:"#fff"}}>{cancelados} fueron cancelados</strong>. Requiere revisión comercial urgente.
                        </p>
                    </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "rgba(255,255,255,0.06)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ background: "#12141f", padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "14px", marginBottom: "2px" }}>💰</span>
                      <span style={{ fontSize: "18px", fontWeight: 800, lineHeight: 1, fontFamily: "'Syne', sans-serif", color: colorSuccess }}>${(gananciaPlataforma / 1000).toFixed(1)}k</span>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.3, textTransform: "uppercase" }}>Histórico Real</span>
                  </div>
                  <div style={{ background: "#12141f", padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "14px", marginBottom: "2px" }}>📈</span>
                      <span style={{ fontSize: "18px", fontWeight: 800, lineHeight: 1, fontFamily: "'Syne', sans-serif", color: isInternal ? colorInternal : colorGold }}>${stats.finalizados > 0 ? (gananciaPlataforma / stats.finalizados / 1000).toFixed(1) : 0}k</span>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.3, textTransform: "uppercase" }}>Promedio Éxito</span>
                  </div>
                  <div style={{ background: "#12141f", padding: "18px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <span style={{ fontSize: "14px", marginBottom: "2px" }}>🎯</span>
                      <span style={{ fontSize: "18px", fontWeight: 800, lineHeight: 1, fontFamily: "'Syne', sans-serif", color: isAlertaRoja ? colorAlert : colorSuccess }}>{tasaExito}%</span>
                      <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.3, textTransform: "uppercase" }}>Tasa Comercial</span>
                  </div>
              </div>

              {/* --- ACORDEÓN: GLOSARIO DE MÉTRICAS --- */}
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <button 
                  className="glosario-btn"
                  onClick={() => setShowGlossary(!showGlossary)}
                  style={{ 
                    width: "100%", background: "rgba(0,0,0,0.1)", border: "none", padding: "12px 28px", 
                    display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: "bold", color: "rgba(255,255,255,0.6)" }}>📖 VER GLOSARIO DE MÉTRICAS</span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", transform: showGlossary ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s ease" }}>
                    ▼
                  </span>
                </button>

                {showGlossary && (
                  <div style={{ padding: "0 28px 16px", background: "rgba(0,0,0,0.1)", animation: "fadeIn 0.3s ease" }}>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "11px", color: "rgba(255,255,255,0.5)", display: "flex", flexDirection: "column", gap: "6px", lineHeight: 1.4 }}>
                      <li><strong style={{color:"#fff"}}>Histórico Real:</strong> Ganancia NETA para nuestra plataforma. <span style={{color: badgeColor}}>{isInternal ? 'Por ser un evento propio, se contabiliza el 100% de lo recaudado.' : 'Por ser organizador externo, se contabiliza solo el 10% de comisión.'}</span></li>
                      <li><strong style={{color:"#fff"}}>Promedio Éxito:</strong> Lo que ganamos en promedio por cada evento finalizado.</li>
                      <li><strong style={{color:"#fff"}}>Tasa Comercial:</strong> Porcentaje de eventos finalizados con éxito vs los que se cancelaron.</li>
                    </ul>
                  </div>
                )}
              </div>
              {/* --------------------------------------- */}

              <div style={{ padding: "20px 28px 10px" }}>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 12px 0" }}>Desglose de Eventos</p>
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "13px" }}>
                      <span style={{ color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "14px" }}>🚀</span> Activos a futuro</span>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, background: "rgba(255,255,255,0.07)", color: "#fff" }}>{stats.activos}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "13px" }}>
                      <span style={{ color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "14px" }}>✅</span> Finalizados exitosos</span>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, background: "rgba(16,185,129,0.12)", color: colorSuccess }}>{stats.finalizados}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", fontSize: "13px" }}>
                      <span style={{ color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "14px" }}>❌</span> Cancelados</span>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "100px", fontSize: "12px", fontWeight: 700, background: "rgba(239,68,68,0.12)", color: colorAlert }}>{cancelados}</span>
                  </div>
                </div>
              </div>

              {/* FOOTER ACTION DINÁMICO */}
              <div style={{ padding: "20px 28px", display: "flex" }}>
                  {isInternal ? (
                     <button className="btn-primary btn-internal" style={{ width: "100%" }}>
                       💬 Mensaje Interno (Equipo)
                     </button>
                  ) : (
                     <button className="btn-primary btn-whatsapp" style={{ width: "100%" }}>
                       💬 Contactar Socio por WhatsApp
                     </button>
                  )}
              </div>

            </div>
          )}

          {/* PANEL 2: NOTAS */}
          {activeTab === 'notas' && (
            <div style={{ padding: "10px 28px 20px", display: "flex", flexDirection: "column", gap: "16px", animation: "fadeIn 0.3s ease" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
                💡 <strong style={{color:"#fff"}}>Privadas.</strong> El organizador no tiene acceso a este historial de seguimiento.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "250px", overflowY: "auto", paddingRight: "4px" }} className="custom-modal">
                {notas.length === 0 ? (
                   <div style={{ textAlign: "center", padding: "40px 20px", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                      <span style={{ fontSize: "24px" }}>📝</span>
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "8px" }}>No hay notas registradas aún.</p>
                   </div>
                ) : (
                  notas.map(nota => (
                    <div key={nota.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "14px", position: "relative" }}>
                        <button onClick={() => handleDeleteNote(nota.id)} style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}><X size={12}/></button>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", paddingRight: "16px" }}>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#a78bfa" }}>{nota.author}</span>
                            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{nota.date}</span>
                        </div>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.5 }}>{nota.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "16px" }}>
                <textarea 
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Escribí un comentario, alerta o seguimiento..."
                  style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "12px", color: "#fff", fontSize: "13px", resize: "none", height: "80px", outline: "none", fontFamily: "'DM Sans', sans-serif", marginBottom: "12px" }}
                />
                <button 
                  onClick={handleSaveNote}
                  disabled={!noteInput.trim()}
                  className="btn-primary"
                  style={{ width: "100%", background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}
                >
                  ✏️ Guardar Nota Interna
                </button>
              </div>
            </div>
          )}

          {/* PANEL 3: CATEGORÍA (Solo se renderiza si es externo) */}
          {activeTab === 'categoria' && !isInternal && (
            <div style={{ padding: "10px 28px 20px", display: "flex", flexDirection: "column", gap: "16px", animation: "fadeIn 0.3s ease" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.5 }}>
                 El sistema calcula el rango automáticamente cada lunes. Usá este panel <strong style={{color:"#fff"}}>solo para excepciones comerciales</strong>.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {categorias.map(cat => (
                      <button 
                          key={cat.id}
                          className={`action-btn ${selectedCat === cat.id ? 'selected' : ''}`} 
                          onClick={() => setSelectedCat(cat.id)}
                          style={{ flexDirection: "row", alignItems: "center", gap: "16px", padding: "12px 16px" }}
                      >
                          <span style={{ fontSize: "28px" }}>{cat.icono}</span>
                          <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "14px", fontWeight: 700, color: selectedCat === cat.id ? cat.color : "#fff", marginBottom: "2px" }}>
                                  {cat.titulo} {selectedCat === cat.id && <span style={{ fontSize:"10px", background: "rgba(255,255,255,0.1)", padding:"2px 6px", borderRadius:"10px", marginLeft:"4px", color:"#fff" }}>Actual</span>}
                              </div>
                              <div style={{ fontSize: "11px", color: selectedCat === cat.id ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)" }}>
                                  {cat.desc}
                              </div>
                          </div>
                      </button>
                  ))}
              </div>

              <div style={{ marginTop: "8px" }}>
                 <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "12px", fontSize: "11px", color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: "12px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                    Al forzar una categoría, el algoritmo ignorará las métricas reales del organizador por <strong style={{color:"#fff"}}>30 días</strong>.
                 </div>
                 <button onClick={() => setActiveTab('perfil')} className="btn-primary" style={{ width: "100%" }}>
                    ⚙️ Aplicar Override de Categoría
                 </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}