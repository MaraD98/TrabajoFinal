// Definimos la forma del objeto que maneja tu filtro
export interface FiltroTorta {
  titulo: string;
  valor: string;
  filtroKey: string;
}

interface ModalFiltroTortaProps {
  filtro: FiltroTorta | null;
  onClose: () => void;
  eventos: any[];
}

export function ModalFiltroTorta({ filtro, onClose, eventos }: ModalFiltroTortaProps) {

  // Si no hay filtro seleccionado, no renderizamos nada
  if (!filtro) return null;

  // Filtramos los eventos acá arriba para que el código quede más limpio
  const eventosFiltrados = eventos.filter((e: any) => 
    filtro.valor === "TODOS" || e[filtro.filtroKey] === filtro.valor
  );

  return (
    <div style={{ 
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%", 
      backgroundColor: "rgba(0,0,0,0.8)", zIndex: 999999, 
      display: "flex", justifyContent: "center", 
      alignItems: "flex-start", 
      paddingTop: "80px", 
      paddingBottom: "20px" 
    }}>
      <div style={{ 
        backgroundColor: "#0f172a", padding: "25px", borderRadius: "12px", 
        width: "95%", maxWidth: "900px", border: "1px solid #334155", 
        color: "#f8fafc", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", 
        maxHeight: "calc(100vh - 120px)", 
        display: "flex", flexDirection: "column" 
      }}>
          
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "15px", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, color: "#fff" }}>{filtro.titulo}</h2>
            <span className="badge-tipo" style={{ backgroundColor: "#3b82f6", marginTop: "10px", display: "inline-block" }}>
              Filtro: {filtro.valor === "TODOS" ? "Todos los eventos" : filtro.valor}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "2rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
        </div>

        {/* Contenedor de la tabla con SCROLL FORZADO */}
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "10px" }}>
          <table className="tabla-reportes-custom">
            <thead style={{ position: "sticky", top: 0, backgroundColor: "#0f172a", zIndex: 10 }}>
              <tr>
                <th>Evento</th>
                <th>Fecha</th>
                <th>Pertenencia</th>
                <th>{filtro.filtroKey === "tipo" ? "Tipo" : filtro.filtroKey === "dificultad" ? "Dificultad" : "Organizador"}</th>
                <th style={{ textAlign: "center" }}>Participantes</th>
                <th style={{ textAlign: "right" }}>Recaudación</th>
              </tr>
            </thead>
            <tbody>
              {eventosFiltrados.map((evt: any, idx: number) => {
                // 1. Buscamos inscriptos (según cómo venga del backend)
                const inscriptos = evt.inscripciones_confirmadas ?? evt.reservas ?? 0;
                
                // 2. Buscamos la recaudación (si no viene, la calculamos)
                const recaudacion = evt.monto_recaudado ?? (inscriptos * (evt.costo_participacion || 0));

                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: "bold", color: "#fff" }}>{evt.nombre}</td>
                    <td>{evt.fecha_evento ? evt.fecha_evento.split('-').reverse().join('-') : "-"}</td>
                    <td>
                      <span style={{ color: evt.pertenencia === "Propio" ? "#8b5cf6" : "#4b5563", fontWeight: "bold", fontSize: "0.85rem" }}>
                        {evt.pertenencia || "-"}
                      </span>
                    </td>
                    <td>{filtro.filtroKey === "tipo" ? evt.tipo : filtro.filtroKey === "dificultad" ? evt.dificultad : evt.organizador}</td>
                    
                    {/* APLICAMOS LA VARIABLE INSCRIPTOS */}
                    <td style={{ textAlign: "center" }}>
                      <span style={{ color: "#4ade80", fontWeight: "bold" }}>{inscriptos}</span> / {evt.cupo_maximo || "∞"}
                    </td>
                    
                    {/* APLICAMOS LA VARIABLE RECAUDACION */}
                    <td style={{ textAlign: "right", fontWeight: "bold", color: "#fbbf24" }}>
                      ${recaudacion.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {eventosFiltrados.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
              No hay eventos detallados que coincidan con este filtro.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}