import { useState } from "react";
import { cancelarEventoPropio } from "../services/eventos";
import "../styles/eventos-page.css"; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
  idEvento: number;
  onSuccess: () => void; // Para avisar que se borró y recargar la lista
}

export default function CancelEventModal({ isOpen, onClose, idEvento, onSuccess }: Props) {
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!motivo.trim()) return;

    try {
      setCargando(true);
      // Llamamos a la función que ya tienes en tu servicio
      await cancelarEventoPropio(idEvento, motivo);
      
      alert("Evento cancelado correctamente.");
      setMotivo(""); 
      onSuccess(); // Avisamos al padre (la lista) para que se actualice
      onClose();   // Cerramos el modal
    } catch (error) {
      console.error(error);
      alert("Error al cancelar el evento. Verifica tu conexión o permisos.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">¿Cancelar Evento?</h3>
        <p className="modal-text">
          Esta acción cambiará el estado del evento a "CANCELADO" y notificará a los participantes.
        </p>

        <div className="modal-field">
          <label>Motivo de la cancelación *</label>
          <textarea
            className="modal-textarea"
            placeholder="Ej: Malas condiciones climáticas, fuerza mayor..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={cargando}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={cargando}>
            Volver
          </button>
          <button 
            className="btn-danger" 
            onClick={handleConfirm}
            disabled={!motivo.trim() || cargando}
          >
            {cargando ? "Procesando..." : "Confirmar Cancelación"}
          </button>
        </div>
      </div>
    </div>
  );
}