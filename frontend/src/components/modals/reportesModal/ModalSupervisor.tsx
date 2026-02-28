
// Definimos la forma del objeto que maneja tu modal de supervisor
export interface ModalDashboardState {
  isOpen: boolean;
  title: string;
  data: any[];
}

interface ModalSupervisorProps {
  modal: ModalDashboardState;
  onClose: () => void;
}

export function ModalSupervisor({ modal, onClose }: ModalSupervisorProps) {
  // Si no está abierto, no renderizamos nada
  if (!modal.isOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center" }}>
      {/* Cambiamos el fondo a un azul noche oscuro (#1e293b) para que la letra clara se lea perfecto */}
      <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "800px", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", border: "1px solid #334155" }}>
        
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "2px solid #334155", paddingBottom: "10px" }}>
          {/* Título en color blanco/hielo */}
          <h3 style={{ margin: 0, color: "#f8fafc" }}>{modal.title}</h3>
          {/* Botón de cerrar en gris claro */}
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
        </div>

        {modal.data.length > 0 ? (
          <table className="tabla-reportes-custom">
            <thead>
              <tr>
                <th style={{ color: "#f8fafc" }}>Evento</th>
                <th style={{ color: "#f8fafc" }}>Fecha</th>
                <th style={{ color: "#f8fafc" }}>Responsable</th>
                <th style={{ color: "#f8fafc" }}>Pertenencia</th>
              </tr>
            </thead>
            <tbody>
              {modal.data.map((evt: any) => (
                <tr key={evt.id_evento} style={{ borderBottom: "1px solid #334155" }}>
                  <td style={{ fontWeight: "bold", color: "#e2e8f0" }}>{evt.nombre_evento}</td>
                  <td style={{ color: "#cbd5e1" }}>
                    {evt.fecha_evento && evt.fecha_evento !== "Sin fecha" 
                      ? evt.fecha_evento.split('-').reverse().join('-') 
                      : evt.fecha_evento}
                  </td>
                  <td style={{ color: "#cbd5e1" }}>{evt.responsable}</td>
                  <td>
                    <span className="badge-tipo" style={{ 
                        backgroundColor: evt.pertenencia === "Propio" ? "#8b5cf6" : "#f59e0b",
                        color: "#ffffff"
                    }}>
                        {evt.pertenencia}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "1.1rem" }}>No hay eventos para mostrar en esta categoría.</p>
        )}
      </div>
    </div>
  );
}