import React from 'react';

interface SolicitudBaja {
  id_eliminacion: number;
  id_evento: number;
  nombre_evento: string;
  motivo: string;
  fecha_solicitud: string;
  usuario_solicitante: string;
  tipo: 'baja';
  fecha_evento?: string;
}

interface SolicitudBajaModalProps {
  show: boolean;
  solicitud: SolicitudBaja | null;
  onClose: () => void;
  onAprobar: (id: number) => void;
  onRechazar: (id: number) => void;
}

const SolicitudBajaModal: React.FC<SolicitudBajaModalProps> = ({
  show,
  solicitud,
  onClose,
  onAprobar,
  onRechazar,
}) => {
  if (!show || !solicitud) return null;

  return (
    <>
      <style>{`
        .baja-modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }

        .baja-modal-content {
          background: #1a1a1a;
          border-radius: 12px;
          width: 90%;
          max-width: 520px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.9);
          animation: bajaModalIn 0.25s ease;
          overflow: hidden;
        }

        @keyframes bajaModalIn {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }

        .baja-modal-header {
          background: linear-gradient(135deg, #2a1010, #1a1a1a);
          border-bottom: 2px solid #fc8181;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .baja-modal-header h3 {
          margin: 0;
          color: #fc8181;
          font-size: 1.2rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .baja-modal-close {
          background: transparent;
          border: none;
          color: #888;
          font-size: 1.4rem;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: color 0.2s, background 0.2s;
        }

        .baja-modal-close:hover {
          color: #fff;
          background: rgba(255,255,255,0.1);
        }

        .baja-modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .baja-info-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .baja-info-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #fc8181;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .baja-info-value {
          background: #0d0d0d;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 10px 14px;
          color: #fff;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .baja-motivo-value {
          background: rgba(252, 129, 129, 0.08);
          border: 1px solid rgba(252, 129, 129, 0.3);
          border-radius: 6px;
          padding: 14px;
          color: #fca5a5;
          font-size: 0.95rem;
          line-height: 1.6;
          white-space: pre-wrap;
          min-height: 80px;
        }

        .baja-modal-footer {
          padding: 16px 24px;
          border-top: 1px solid #2a2a2a;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .baja-btn-cancelar {
          padding: 10px 20px;
          background: transparent;
          border: 1px solid #555;
          color: #aaa;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .baja-btn-cancelar:hover {
          border-color: #888;
          color: #fff;
        }

        .baja-btn-rechazar {
          padding: 10px 20px;
          background: transparent;
          border: 1px solid #4a9eff;
          color: #4a9eff;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .baja-btn-rechazar:hover {
          background: rgba(74, 158, 255, 0.1);
        }

        .baja-btn-aprobar {
          padding: 10px 20px;
          background: #fc8181;
          border: none;
          color: #1a1a1a;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .baja-btn-aprobar:hover {
          background: #f87171;
          transform: translateY(-1px);
        }
      `}</style>

      <div className="baja-modal-overlay" onClick={onClose}>
        <div className="baja-modal-content" onClick={e => e.stopPropagation()}>

          <div className="baja-modal-header">
            <h3>🗑️ Solicitud de Eliminación</h3>
            <button className="baja-modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="baja-modal-body">
            <div className="baja-info-row">
              <span className="baja-info-label">Evento</span>
              <div className="baja-info-value">
                <small style={{ color: '#888' }}>#{solicitud.id_evento} · </small>
                <strong>{solicitud.nombre_evento}</strong>
              </div>
            </div>

            {solicitud.fecha_evento && (
              <div className="baja-info-row">
                <span className="baja-info-label">Fecha del Evento</span>
                <div className="baja-info-value">📅 {solicitud.fecha_evento}</div>
              </div>
            )}

            <div className="baja-info-row">
              <span className="baja-info-label">Solicitado por</span>
              <div className="baja-info-value">👤 {solicitud.usuario_solicitante}</div>
            </div>

            <div className="baja-info-row">
              <span className="baja-info-label">Fecha de Solicitud</span>
              <div className="baja-info-value">🕐 {solicitud.fecha_solicitud || '—'}</div>
            </div>

            <div className="baja-info-row">
              <span className="baja-info-label">⚠️ Motivo de Eliminación</span>
              <div className="baja-motivo-value">
                {solicitud.motivo || 'Sin motivo especificado.'}
              </div>
            </div>
          </div>

          <div className="baja-modal-footer">
            <button className="baja-btn-cancelar" onClick={onClose}>
              Cerrar
            </button>
            <button
              className="baja-btn-rechazar"
              onClick={() => { onRechazar(solicitud.id_evento); onClose(); }}
            >
              ✕ Rechazar Baja
            </button>
            <button
              className="baja-btn-aprobar"
              onClick={() => { onAprobar(solicitud.id_evento); onClose(); }}
            >
              🗑️ Aprobar Eliminación
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default SolicitudBajaModal;