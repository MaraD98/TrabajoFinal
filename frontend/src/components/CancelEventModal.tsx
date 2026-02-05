import { useState } from "react";
import { cancelarEventoPropio, solicitarBajaEvento, adminEliminarEvento } from "../services/eventos";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  idEvento: number;
  tipoAccion: 'PROPIO' | 'SOLICITUD' | 'ADMIN' | null; 
  onSuccess: () => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

export default function CancelEventModal({ 
  isOpen, 
  onClose, 
  idEvento, 
  tipoAccion, 
  onSuccess,
  onShowToast
}: Props) {
  const [motivo, setMotivo] = useState("");
  const [cargando, setCargando] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!motivo.trim()) {
      if (onShowToast) {
        onShowToast("⚠️ Por favor, ingresa un motivo para continuar.", "error");
      }
      return;
    }

    try {
      setCargando(true);
      
      let respuesta;
      
      if (tipoAccion === 'PROPIO') {
        respuesta = await solicitarBajaEvento(idEvento, motivo);
      } else if (tipoAccion === 'SOLICITUD') {
        respuesta = await solicitarBajaEvento(idEvento, motivo);
      } else if (tipoAccion === 'ADMIN') {
        respuesta = await adminEliminarEvento(idEvento, motivo);
      }
      
      const mensaje = respuesta?.mensaje || respuesta?.detail || "✅ Operación realizada con éxito.";
      
      if (onShowToast) {
        onShowToast(mensaje, 'success');
      }

      setMotivo(""); 
      onSuccess(); 
      onClose();   

    } catch (error: any) {
      console.error('Error en CancelEventModal:', error);
      const mensajeError = error.response?.data?.detail || "❌ Error al procesar la solicitud.";
      
      if (onShowToast) {
        onShowToast(mensajeError, 'error');
      }
    } finally {
      setCargando(false);
    }
  };

  // Textos dinámicos según el tipo de acción
  let titulo = "¿Confirmar?";
  let pregunta = "¿Estás seguro?";
  let botonTexto = "Confirmar";
  let colorTema = "#ccff00";
  let iconoModal = "⚠️";
  
  if (tipoAccion === 'PROPIO') {
    titulo = "Solicitar Eliminación de Evento";
    pregunta = "Como usuario, no puedes eliminar eventos directamente. Esta acción enviará una SOLICITUD DE BAJA al administrador para su revisión. El evento permanecerá visible hasta que el admin apruebe o rechace tu solicitud.";
    botonTexto = "Enviar Solicitud";
    colorTema = "#f59e0b";
    iconoModal = "📧";
  } 
  else if (tipoAccion === 'SOLICITUD') {
    titulo = "Reportar Evento";
    pregunta = "¿Enviar solicitud de baja para este evento?";
    botonTexto = "Enviar Solicitud";
    colorTema = "#f59e0b";
    iconoModal = "🚩";
  } 
  else if (tipoAccion === 'ADMIN') {
    titulo = "Eliminar Evento (Administrador)";
    pregunta = "⚠️ Como Administrador, esta acción eliminará el evento inmediatamente (Soft Delete - Estado 5). El evento será cancelado y los participantes inscritos serán notificados.";
    botonTexto = "ELIMINAR AHORA";
    colorTema = "#ef4444";
    iconoModal = "🗑️";
  }

  return (
    <div className="modal-overlay-cancel" onClick={onClose}>
      <div className="modal-content-cancel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header-cancel" style={{ borderTopColor: colorTema }}>
          <div className="modal-title-wrapper">
            <span className="modal-icon" style={{ color: colorTema }}>{iconoModal}</span>
            <h3 className="modal-title-cancel" style={{ color: colorTema }}>
              {titulo}
            </h3>
          </div>
          <button className="modal-close-cancel" onClick={onClose} disabled={cargando}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body-cancel">
          <p className="modal-description">{pregunta}</p>

          <div className="modal-field-cancel">
            <label className="modal-label-cancel">
              Motivo <span className="required-star">*</span>
            </label>
            <textarea
              className="modal-textarea-cancel"
              placeholder="Describe la razón..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={cargando}
              rows={5}
              maxLength={1000}
            />
            <span className="modal-char-count">
              {motivo.length}/1000 caracteres
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer-cancel">
          <button 
            className="btn-modal-cancel btn-secondary-cancel" 
            onClick={onClose} 
            disabled={cargando}
          >
            Cancelar
          </button>
          <button 
            className="btn-modal-cancel btn-primary-cancel" 
            onClick={handleConfirm}
            disabled={!motivo.trim() || cargando}
            style={{ 
              backgroundColor: !motivo.trim() || cargando ? '#444' : colorTema,
              color: tipoAccion === 'ADMIN' ? 'white' : '#0a0a0a',
              cursor: !motivo.trim() || cargando ? 'not-allowed' : 'pointer'
            }}
          >
            {cargando ? (
              <>
                <span className="spinner-cancel"></span>
                Procesando...
              </>
            ) : (
              botonTexto
            )}
          </button>
        </div>
      </div>

      {/* Estilos inline para el modal */}
      <style>{`
        .modal-overlay-cancel {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeInOverlay 0.2s ease;
        }

        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-content-cancel {
          background: #1a1a1a;
          border: 2px solid #333;
          border-radius: 16px;
          width: 90%;
          max-width: 600px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8), 0 0 40px rgba(204, 255, 0, 0.1);
          animation: slideUpModal 0.3s ease;
        }

        @keyframes slideUpModal {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header-cancel {
          padding: 24px;
          background: #2a2a2a;
          border-bottom: 1px solid #333;
          border-top: 4px solid;
          border-radius: 14px 14px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-icon {
          font-size: 1.8rem;
          filter: drop-shadow(0 0 10px currentColor);
        }

        .modal-title-cancel {
          font-size: 1.3rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.5px;
          font-family: 'Montserrat', sans-serif;
        }

        .modal-close-cancel {
          background: transparent;
          border: none;
          color: #888;
          font-size: 1.5rem;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .modal-close-cancel:hover {
          background: #333;
          color: #fff;
        }

        .modal-close-cancel:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .modal-body-cancel {
          padding: 28px;
        }

        .modal-description {
          color: #ccc;
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 24px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.3);
          border-left: 3px solid #ccff00;
          border-radius: 6px;
          font-family: 'Montserrat', sans-serif;
        }

        .modal-field-cancel {
          margin-bottom: 0;
        }

        .modal-label-cancel {
          display: block;
          color: #fff;
          font-weight: 600;
          font-size: 0.9rem;
          margin-bottom: 10px;
          font-family: 'Montserrat', sans-serif;
        }

        .required-star {
          color: #ef4444;
          margin-left: 4px;
        }

        .modal-textarea-cancel {
          width: 100%;
          background: #0a0a0a;
          border: 1px solid #333;
          color: #fff;
          padding: 14px;
          border-radius: 10px;
          font-family: 'Montserrat', sans-serif;
          font-size: 0.9rem;
          line-height: 1.5;
          resize: vertical;
          transition: all 0.3s ease;
        }

        .modal-textarea-cancel:focus {
          outline: none;
          border-color: #ccff00;
          box-shadow: 0 0 0 3px rgba(204, 255, 0, 0.15);
        }

        .modal-textarea-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-char-count {
          display: block;
          text-align: right;
          font-size: 0.75rem;
          color: #666;
          margin-top: 6px;
        }

        .modal-footer-cancel {
          padding: 20px 24px;
          background: #2a2a2a;
          border-top: 1px solid #333;
          border-radius: 0 0 14px 14px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-modal-cancel {
          padding: 12px 28px;
          border: none;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Montserrat', sans-serif;
        }

        .btn-secondary-cancel {
          background: #333;
          color: #fff;
        }

        .btn-secondary-cancel:hover:not(:disabled) {
          background: #444;
        }

        .btn-secondary-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        .btn-primary-cancel:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4), 0 0 30px currentColor;
        }

        .spinner-cancel {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spinCancel 0.8s linear infinite;
        }

        @keyframes spinCancel {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .modal-content-cancel {
            width: 95%;
            margin: 20px;
          }

          .modal-header-cancel {
            padding: 20px;
          }

          .modal-title-cancel {
            font-size: 1.1rem;
          }

          .modal-icon {
            font-size: 1.5rem;
          }

          .modal-body-cancel {
            padding: 20px;
          }

          .modal-footer-cancel {
            flex-direction: column-reverse;
          }

          .btn-modal-cancel {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}