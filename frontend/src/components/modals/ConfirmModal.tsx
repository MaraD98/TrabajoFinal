import React from 'react';

interface ConfirmModalProps {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  show,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'warning'
}) => {
  if (!show) return null;

  const typeColors = {
    warning: '#ff8533',
    danger: '#ff4444',
    info: '#4da6ff'
  };

  const typeIcons = {
    warning: '⚠️',
    danger: '🗑️',
    info: 'ℹ️'
  };

  return (
    <>
      <style>{`
        .confirm-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }

        .confirm-modal-content {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 0;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
          animation: modalFadeIn 0.3s ease;
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .confirm-modal-header {
          padding: 24px;
          border-bottom: 2px solid;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .confirm-modal-icon {
          font-size: 2rem;
        }

        .confirm-modal-header h3 {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 600;
        }

        .confirm-modal-body {
          padding: 24px;
        }

        .confirm-modal-body p {
          margin: 0;
          color: #ccc;
          font-size: 1rem;
          line-height: 1.6;
        }

        .confirm-modal-footer {
          padding: 20px 24px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          border-top: 1px solid #333;
        }

        .btn-confirm-cancel,
        .btn-confirm-action {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Montserrat', sans-serif;
        }

        .btn-confirm-cancel {
          background: #333;
          color: #fff;
        }

        .btn-confirm-cancel:hover {
          background: #444;
        }

        .btn-confirm-action {
          color: #fff;
        }

        .btn-confirm-action:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      <div className="confirm-modal-overlay" onClick={onCancel}>
        <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-modal-header" style={{ borderColor: typeColors[type] }}>
            <div className="confirm-modal-icon" style={{ color: typeColors[type] }}>
              {typeIcons[type]}
            </div>
            <h3 style={{ color: typeColors[type] }}>{title}</h3>
          </div>
          
          <div className="confirm-modal-body">
            <p>{message}</p>
          </div>
          
          <div className="confirm-modal-footer">
            <button className="btn-confirm-cancel" onClick={onCancel}>
              {cancelText}
            </button>
            <button
              className="btn-confirm-action"
              onClick={onConfirm}
              style={{ background: typeColors[type] }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConfirmModal;