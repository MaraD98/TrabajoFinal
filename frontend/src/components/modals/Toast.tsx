import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const icons = { 
    success: '✅', 
    error: '❌', 
    info: 'ℹ️' 
  };
  
  const colors = { 
    success: '#00cc66', 
    error: '#ff4444', 
    info: '#4da6ff' 
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .toast-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #0a0a0a;
          border-radius: 8px;
          padding: 16px 20px;
          min-width: 300px;
          max-width: 500px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8);
          z-index: 10000;
          animation: slideInRight 0.3s ease;
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Montserrat', sans-serif;
        }
        
        .toast-icon {
          font-size: 1.5rem;
        }
        
        .toast-message {
          color: #fff;
          flex: 1;
          font-size: 0.95rem;
          font-weight: 500;
        }
        
        .toast-close {
          background: transparent;
          border: none;
          color: #888;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 4px 8px;
          transition: color 0.2s;
        }
        
        .toast-close:hover {
          color: #fff;
        }
      `}</style>
      
      <div 
        className="toast-container" 
        style={{ borderColor: colors[type], borderWidth: '2px', borderStyle: 'solid' }}
      >
        <span className="toast-icon">{icons[type]}</span>
        <span className="toast-message">{message}</span>
        <button onClick={onClose} className="toast-close">✕</button>
      </div>
    </>
  );
};

export default Toast;