import { useEffect, useState } from 'react';

interface ModalEventosGlobalProps {
  isOpen: boolean;
  onClose: () => void;
  totalEventosGlobal: number;
  eventosFuturos: number;
  eventosPasados: number;
  eventosPropiosCount: number;
  eventosExternosCount: number;
}

export function ModalEventosGlobal({
  isOpen,
  onClose,
  totalEventosGlobal,
  eventosFuturos,
  eventosPasados,
  eventosPropiosCount,
  eventosExternosCount
}: ModalEventosGlobalProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setAnimate(true), 100);
    } else {
      setAnimate(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalValido = totalEventosGlobal > 0 ? totalEventosGlobal : 1;
  const porcentajePropios = Math.round((eventosPropiosCount / totalValido) * 100);
  const porcentajeExternos = Math.round((eventosExternosCount / totalValido) * 100);

  let iconoDiagnostico = "📊";
  let tituloDiagnostico = "Estado del Inventario";
  let textoDiagnostico = "";
  let colorDiagnostico = "#60a5fa";

  if (totalEventosGlobal === 0) {
    iconoDiagnostico = "⚠️";
    tituloDiagnostico = "Plataforma sin actividad";
    textoDiagnostico = "No hay eventos registrados. Urgente: Iniciar captación de organizadores externos.";
    colorDiagnostico = "#ef4444";
  } else if (eventosExternosCount > eventosPropiosCount) {
    iconoDiagnostico = "🚀";
    tituloDiagnostico = "Marketplace Saludable";
    textoDiagnostico = `Excelente nivel de adopción B2B. El ${porcentajeExternos}% de los eventos son creados por agrupaciones externas.`;
    colorDiagnostico = "#34d399";
  } else {
    iconoDiagnostico = "⚠️";
    tituloDiagnostico = "Dependencia Interna Alta";
    textoDiagnostico = `El ${porcentajePropios}% de la oferta depende de la administración. Se sugiere atraer clubes de ciclismo externos.`;
    colorDiagnostico = "#f59e0b";
  }

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(13, 15, 26, 0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)", padding: "20px" }}>
      
      <div style={{ background: "#12141f", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", width: "100%", maxWidth: "550px", position: "relative", boxShadow: "0 40px 80px rgba(0,0,0,0.6)", opacity: animate ? 1 : 0, transform: animate ? "translateY(0) scale(1)" : "translateY(32px) scale(0.97)", transition: "all 0.4s", fontFamily: "'DM Sans', sans-serif", maxHeight: "90vh", overflowY: "auto" }}>
        
        <button onClick={onClose} style={{ position: "absolute", top: "24px", right: "24px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, color: "#fff" }}>✕</button>

        <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(99, 102, 241, 0.1)", border: "1px solid rgba(99, 102, 241, 0.3)", borderRadius: "100px", padding: "4px 12px 4px 8px", marginBottom: "14px" }}>
            <p style={{ fontSize: "11px", fontWeight: 600, color: "#818cf8", textTransform: "uppercase", margin: 0 }}>🚴‍♂️ Reporte Global</p>
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: 0, fontFamily: "'Syne', sans-serif" }}>Eventos del Sistema</h2>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px", margin: 0 }}>Registro general de eventos y tipo de organizador</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1px", background: "rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ background: "#12141f", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "28px", fontWeight: 800, color: "#fff", fontFamily: "'Syne', sans-serif" }}>{totalEventosGlobal}</span>
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: "4px" }}>Total Eventos</span>
          </div>
          <div style={{ background: "#12141f", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "28px", fontWeight: 800, color: "#34d399", fontFamily: "'Syne', sans-serif" }}>{eventosFuturos}</span>
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: "4px" }}>Próximos</span>
          </div>
          <div style={{ background: "#12141f", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: "28px", fontWeight: 800, color: "rgba(255,255,255,0.3)", fontFamily: "'Syne', sans-serif" }}>{eventosPasados}</span>
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginTop: "4px" }}>Finalizados</span>
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <h3 style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: "12px", letterSpacing: "0.05em" }}>Adopción de la plataforma</h3>
          <div style={{ height: "10px", display: "flex", borderRadius: "100px", overflow: "hidden", marginBottom: "14px", background: "rgba(255,255,255,0.05)" }}>
            <div style={{ width: `${porcentajePropios}%`, background: "#8b5cf6" }}></div>
            <div style={{ width: `${porcentajeExternos}%`, background: "#f59e0b" }}></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "24px" }}>
            <span style={{ color: "#fff" }}><span style={{color:"#8b5cf6"}}>●</span> Propios: <strong>{eventosPropiosCount}</strong> ({porcentajePropios}%)</span>
            <span style={{ color: "#fff" }}><span style={{color:"#f59e0b"}}>●</span> Externos: <strong>{eventosExternosCount}</strong> ({porcentajeExternos}%)</span>
          </div>

          <div style={{ padding: "16px", borderRadius: "12px", borderLeft: `3px solid ${colorDiagnostico}`, background: `rgba(255,255,255,0.03)`, marginBottom: "24px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>{iconoDiagnostico}</span>
              <div>
                <strong style={{ display: "block", fontSize: "12px", color: colorDiagnostico, textTransform: "uppercase", marginBottom: "4px" }}>{tituloDiagnostico}</strong>
                <p style={{ fontSize: "12px", lineHeight: 1.5, color: "rgba(255,255,255,0.5)", margin: 0 }}>{textoDiagnostico}</p>
              </div>
            </div>
          </div>

          {/* DESPLEGABLE EXPLICATIVO (TIPO ACORDEÓN) */}
          <details style={{ background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <summary style={{ padding: "12px 16px", cursor: "pointer", fontSize: "13px", fontWeight: 600, color: "#818cf8", display: "flex", alignItems: "center", gap: "8px", listStyle: "none" }}>
              💡 ¿Qué significan estas métricas para nuestra administración?
            </summary>
            <div style={{ padding: "0 16px 16px", fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
              <div style={{ marginTop: "10px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
                
                <p style={{ margin: "0 0 10px 0" }}>
                  <strong style={{color: "#fff"}}>• Total Eventos (Crecimiento de la plataforma):</strong> 
                  <br/>Refleja la cantidad histórica de eventos registrados desde el inicio. Un número alto demuestra que el sistema tiene uso real y nos da un buen respaldo para generar confianza ante nuevos clubes o posibles patrocinadores.
                </p>
                
                <p style={{ margin: "0 0 10px 0" }}>
                  <strong style={{color: "#fff"}}>• Próximos (Actividad a futuro):</strong> 
                  <br/>Es nuestro indicador principal de ingresos. Si este número baja, sabemos que en los próximos meses entrará menos dinero por comisiones, lo que nos avisa a tiempo que debemos atraer nuevas carreras al sistema.
                </p>
                
                <p style={{ margin: "0" }}>
                  <strong style={{color: "#fff"}}>• Propios vs Externos (Modelo de trabajo):</strong> 
                  <br/>Nos muestra cómo estamos ganando dinero. Si predominan los eventos "Propios", significa que dependemos de nuestro propio esfuerzo y recursos para organizar carreras. Si predominan los "Externos", logramos que el sistema trabaje por nosotros, generando comisiones de forma automática.
                </p>

              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}