import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/notificaciones-badge.css';
import { 
  getMisNotificaciones, 
  marcarNotificacionLeida
} from '../services/notificacion-service';
import type { Notificacion } from '../services/notificacion-service';

export const NotificacionesBadge = () => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Ref para cerrar el menú si clicamos fuera
  const badgeRef = useRef<HTMLDivElement>(null);

  // 📡 Cargar notificaciones
  const cargarNotificaciones = async () => {
    try {
      // Como es polling, a veces no queremos mostrar el spinner si ya hay datos
      // setLoading(true); <--- Opcional: quitarlo para que sea silencioso
      
      const data = await getMisNotificaciones();
      console.log("NOTIFICACIONES FRONTEND:", data);
      
      // Ordenar por fecha descendente y tomar las últimas 5
      // Nota: data.fecha_creacion viene como string del back
      const ultimas = data
        .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())
        .slice(0, 5);
        
      setNotificaciones(ultimas);
    } catch (error) {
      console.error('Error polling notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNotificaciones();
    // Polling cada 30 segundos
    const interval = setInterval(cargarNotificaciones, 30000);
    
    // Listener para cerrar dropdown al clicar fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarcarYRedirigir = async (id: number) => {
    try {
      await marcarNotificacionLeida(id);
      setShowDropdown(false);
      navigate('/notificaciones'); // Te lleva a la página completa
    } catch (error) {
      console.error('Error', error);
    }
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  const formatearFechaCorta = (fechaStr: string) => {
    const date = new Date(fechaStr);
    const ahora = new Date();
    const diffMin = Math.floor((ahora.getTime() - date.getTime()) / 60000);
    
    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `${diffHoras}h`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="notif-badge-container" ref={badgeRef}>
      <button
        className="notif-badge-btn"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Notificaciones"
      >
        <svg 
          className="bell-icon" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        
        {noLeidas > 0 && (
          <span className="notif-badge-count">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="notif-badge-dropdown">
          <div className="dropdown-header">
            <h3>Recientes</h3>
            <button 
              className="view-all-text-btn"
              onClick={() => {
                setShowDropdown(false);
                navigate('/notificaciones');
              }}
            >
              Ver todas
            </button>
          </div>

          <div className="dropdown-list">
            {loading ? (
              <div className="dropdown-loading">
                <div className="mini-spinner"></div>
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="dropdown-empty">
                <p>Sin novedades</p>
              </div>
            ) : (
              notificaciones.map(notif => (
                <div
                  key={notif.id_notificacion}
                  className={`dropdown-item ${!notif.leida ? 'unread' : ''}`}
                  onClick={() => handleMarcarYRedirigir(notif.id_notificacion)}
                >
                  <div className="item-content-row">
                     <p className="item-mensaje">{notif.mensaje}</p>
                     {!notif.leida && <span className="item-dot"></span>}
                  </div>
                  <span className="item-fecha">{formatearFechaCorta(notif.fecha_creacion)}</span>
                </div>
              ))
            )}
          </div>
          
          <div className="dropdown-footer">
             <span onClick={() => navigate('/notificaciones')}>Ir al panel completo</span>
          </div>
        </div>
      )}
    </div>
  );
};