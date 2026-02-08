import React from 'react';

interface InputModalProps {
  show: boolean;
  title: string;
  message: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
  required?: boolean;
}

const InputModal: React.FC<InputModalProps> = ({
  show,
  title,
  message,
  placeholder = 'Escribe aquí...',
  value,
  onChange,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  required = true
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
    info: '✏️'
  };

  const handleConfirm = () => {
    if (required && !value.trim()) {
      return; // No hacer nada si es requerido y está vacío
    }
    onConfirm();
  };

  return (
    <>
      <style>{`
        .input-modal-overlay {
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

        .input-modal-content {
          background: #1a1a1a;
          border-radius: 12px;
          padding: 0;
          max-width: 550px;
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

        .input-modal-header {
          padding: 24px;
          border-bottom: 2px solid;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .input-modal-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .input-modal-icon {
          font-size: 2rem;
        }

        .input-modal-header h3 {
          margin: 0;
          font-size: 1.4rem;
          font-weight: 600;
        }

        .input-modal-close {
          background: transparent;
          border: none;
          color: #888;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 4px 8px;
          transition: color 0.2s;
        }

        .input-modal-close:hover {
          color: #fff;
        }

        .input-modal-body {
          padding: 24px;
        }

        .input-modal-body p {
          margin: 0 0 16px 0;
          color: #ccc;
          font-size: 1rem;
          line-height: 1.6;
        }

        .input-modal-textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          background: #0a0a0a;
          border: 2px solid #333;
          border-radius: 8px;
          color: #fff;
          font-size: 1rem;
          font-family: 'Montserrat', sans-serif;
          resize: vertical;
          transition: border-color 0.2s;
        }

        .input-modal-textarea:focus {
          outline: none;
          border-color: #666;
        }

        .input-modal-textarea::placeholder {
          color: #666;
        }

        .input-modal-footer {
          padding: 20px 24px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          border-top: 1px solid #333;
        }

        .btn-input-cancel,
        .btn-input-confirm {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Montserrat', sans-serif;
        }

        .btn-input-cancel {
          background: #333;
          color: #fff;
        }

        .btn-input-cancel:hover {
          background: #444;
        }

        .btn-input-confirm {
          color: #fff;
        }

        .btn-input-confirm:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .btn-input-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="input-modal-overlay" onClick={onCancel}>
        <div className="input-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="input-modal-header" style={{ borderColor: typeColors[type] }}>
            <div className="input-modal-header-left">
              <div className="input-modal-icon" style={{ color: typeColors[type] }}>
                {typeIcons[type]}
              </div>
              <h3 style={{ color: typeColors[type] }}>{title}</h3>
            </div>
            <button className="input-modal-close" onClick={onCancel}>✕</button>
          </div>
          
          <div className="input-modal-body">
            <p>{message}</p>
            <textarea
              className="input-modal-textarea"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="input-modal-footer">
            <button className="btn-input-cancel" onClick={onCancel}>
              {cancelText}
            </button>
            <button
              className="btn-input-confirm"
              onClick={handleConfirm}
              disabled={required && !value.trim()}
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

export default InputModal;