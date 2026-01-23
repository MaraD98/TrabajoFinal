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
    if (!motivo.trim()) {
        alert("Por favor, ingresa un motivo para confirmar.");
        return;
    }

    try {
      setCargando(true);
      
      let respuesta;
      if (tipoAccion === 'PROPIO') {
        respuesta = await cancelarEventoPropio(idEvento, motivo);
      } else if (tipoAccion === 'SOLICITUD') {
        respuesta = await solicitarBajaEvento(idEvento, motivo);
      } else if (tipoAccion === 'ADMIN') {
        respuesta = await adminEliminarEvento(idEvento, motivo);
      }
      
      // Si el backend devuelve un mensaje, lo mostramos (opcional)
      if (respuesta?.mensaje || respuesta?.detail) {
          alert(respuesta.mensaje || respuesta.detail);
      } else {
          alert("Operación realizada con éxito.");
      }

      setMotivo(""); 
      onSuccess(); // Recargar lista
      onClose();   

    } catch (error: any) {
      console.error(error);
      // Extraer mensaje de error del backend (FastAPI suele devolver { detail: "..." })
      const mensajeError = error.response?.data?.detail || "Error al procesar la solicitud.";
      alert("⚠️ Error: " + mensajeError);
    } finally {
      setCargando(false);
    }
  };

  // --- TEXTOS VISUALES ---
 let titulo = "¿Confirmar?";
  let pregunta = "¿Seguro?";
  let botonTexto = "Confirmar";
  let colorTitulo = "white"; 
  
  if (tipoAccion === 'PROPIO') {
    titulo = "Solicitar Baja de Evento";
    // TEXTO CORREGIDO PARA TU LÓGICA:
    pregunta = "Como usuario, no puedes eliminar eventos directamente. Esta acción enviará una SOLICITUD DE BAJA al administrador. ¿Deseas continuar?";
    botonTexto = "Enviar Solicitud";
    colorTitulo = "#ccff00"; // Verde WakeUp
  } 
  else if (tipoAccion === 'SOLICITUD') {
    // ESTE CASO YA NO DEBERÍA OCURRIR SEGÚN TU REGLA 2, PERO LO DEJAMOS POR SEGURIDAD
    titulo = "Reportar Evento";
    pregunta = "¿Enviar solicitud de baja para este evento?";
    botonTexto = "Enviar Solicitud";
    colorTitulo = "#f39c12"; 
  } 
  else if (tipoAccion === 'ADMIN') {
    titulo = "Eliminar Evento (Admin)";
    pregunta = "⚠️ Como Administrador, esta acción eliminará el evento inmediatamente (Soft Delete - Estado 6).";
    botonTexto = "ELIMINAR AHORA";
    colorTitulo = "#ff4444"; 
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title" style={{ color: colorTitulo }}>{titulo}</h3>
        <p className="modal-text">{pregunta}</p>

        <div className="modal-field">
          <label>Motivo (Requerido):</label>
          <textarea
            className="modal-textarea"
            placeholder="Describe la razón..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={cargando}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={cargando}>
            Cancelar
          </button>
          <button 
            className="btn-danger" 
            onClick={handleConfirm}
            disabled={!motivo.trim() || cargando}
            style={{ 
                backgroundColor: tipoAccion === 'ADMIN' ? '#d32f2f' : undefined,
                color: tipoAccion === 'ADMIN' ? 'white' : undefined,
                border: tipoAccion === 'ADMIN' ? '1px solid red' : undefined
            }}
          >
            {cargando ? "Procesando..." : botonTexto}
          </button>
        </div>
      </div>
    </div>
  );
}