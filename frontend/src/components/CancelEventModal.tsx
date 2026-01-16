import { useState } from "react";
import { cancelarEventoPropio, solicitarBajaEvento, adminEliminarEvento } from "../services/eventos";
import "../styles/eventos-page.css"; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  idEvento: number;
  tipoAccion: 'PROPIO' | 'SOLICITUD' | 'ADMIN' | null; 
  onSuccess: () => void;
}

export default function CancelEventModal({ isOpen, onClose, idEvento, tipoAccion, onSuccess }: Props) {
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    // Para Admin y Solicitud, pedimos motivo obligatorio. 
    // Si quisieras que el Admin borre sin motivo, podrías quitar esta validación, 
    // pero siempre es bueno dejar registro.
    if (!motivo.trim()) {
        alert("Por favor, ingresa un motivo para confirmar.");
        return;
    }

    try {
      setCargando(true);
      
      if (tipoAccion === 'PROPIO') {
        await cancelarEventoPropio(idEvento, motivo);
        alert("Evento cancelado correctamente.");
      } else if (tipoAccion === 'SOLICITUD') {
        await solicitarBajaEvento(idEvento, motivo);
        alert("Solicitud enviada correctamente.");
      } else if (tipoAccion === 'ADMIN') {
        await adminEliminarEvento(idEvento, motivo);
        alert("Evento eliminado permanentemente.");
      }
      
      setMotivo(""); 
      onSuccess(); 
      onClose();   

    } catch (error: any) {
      console.error(error);
      const mensajeError = error.response?.data?.detail || "Error al procesar la solicitud.";
      alert("Error: " + mensajeError);
    } finally {
      setCargando(false);
    }
  };

  // --- LÓGICA DE TEXTOS (HU 4.4) ---
  let titulo = "¿Confirmar acción?";
  let pregunta = "¿Está seguro de realizar esta acción?";
  let botonTexto = "Confirmar";
  
  if (tipoAccion === 'PROPIO') {
    titulo = "Cancelar mi Evento";
    pregunta = "¿Está seguro que desea cancelar su evento? Esta acción no se puede deshacer y se notificará a los inscritos.";
    botonTexto = "Sí, Cancelar Evento";
  } 
  else if (tipoAccion === 'SOLICITUD') {
    titulo = "Reportar / Solicitar Baja";
    pregunta = "¿Está seguro que desea reportar este evento para que sea dado de baja por un administrador?";
    botonTexto = "Enviar Solicitud";
  } 
  else if (tipoAccion === 'ADMIN') {
    // TEXTO EXACTO DE LA HU 4.4
    titulo = "Eliminar Evento (Administrador)";
    pregunta = "¿Está seguro que desea eliminar este evento? Esta acción borrará el evento permanentemente del sistema.";
    botonTexto = "Sí, Eliminar";
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title" style={{ color: tipoAccion === 'ADMIN' ? '#d32f2f' : 'white' }}>
            {titulo}
        </h3>
        
        {/* Aquí está la confirmación visual de la HU 4.4 */}
        <p className="modal-text" style={{ fontSize: '1.1rem', marginBottom: '20px' }}>
          {pregunta}
        </p>

        <div className="modal-field">
          <label>Motivo (Requerido):</label>
          <textarea
            className="modal-textarea"
            placeholder="Escribe la razón aquí..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={cargando}
          />
        </div>

        <div className="modal-actions">
          {/* Botón de Cancelar la acción (El usuario se arrepiente) */}
          <button className="btn-secondary" onClick={onClose} disabled={cargando}>
            Cancelar / Volver
          </button>
          
          {/* Botón de Confirmación Explícita */}
          <button 
            className="btn-danger" 
            onClick={handleConfirm}
            disabled={!motivo.trim() || cargando}
            style={{ backgroundColor: tipoAccion === 'ADMIN' ? '#d32f2f' : undefined }}
          >
            {cargando ? "Procesando..." : botonTexto}
          </button>
        </div>
      </div>
    </div>
  );
}