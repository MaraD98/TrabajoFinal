import { useState, useEffect } from 'react';
import '../styles/notificaciones.css';
import { getMisNotificaciones, marcarNotificacionLeida } from '../services/notificacion-service';
import type { Notificacion } from '../services/notificacion-service';
import { useNavigate } from 'react-router-dom';
import { Navbar } from './navbar';
import { Footer } from './footer';

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'leidas' | 'no-leidas'>('todas');
  const [selectedNotif, setSelectedNotif] = useState<number | null>(null);
  const navigate = useNavigate();

  // 📡 Cargar notificaciones al montar el componente
  useEffect(() => {
    cargarNotificaciones(); 
    console.log("NOTIFICACIONES FRONTEND notificaciones:", notificaciones);
    // Configurar intervalo para refrescar cada 30 seg (30000 ms)
    const intervalo = setInterval(() => {
      // Solo refrescamos si no está cargando ya para evitar parpadeos
      if (!loading) {
         // Hacemos una versión silenciosa de cargarNotificaciones
         // para no activar el spinner grande cada vez
         getMisNotificaciones()
           .then(data => setNotificaciones(data))
           .catch(err => console.error("Error polling", err));
      }
    }, 30000);

    // Limpiar intervalo al salir de la página
    return () => clearInterval(intervalo);
  }, [navigate]); // Agregamos dependencias

  const cargarNotificaciones = async () => {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) {
              navigate("/login");
              return;
        }
    try {
      setLoading(true);
      // Usamos el servicio
      const data = await getMisNotificaciones(); 
      setNotificaciones(data);
    } catch (error) {
      console.error('Error al cargar notificaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  // 📌 Marcar como leída
  const marcarComoLeida = async (id: number) => {
    try {
      // Usamos el servicio
      await marcarNotificacionLeida(id);
      
      setNotificaciones(prev =>
        prev.map(notif =>
          notif.id_notificacion === id ? { ...notif, leida: true } : notif
        )
      );
    } catch (error) {
      console.error('Error al marcar notificación:', error);
    }
  };

  // 🔄 Filtrar notificaciones
  const notificacionesFiltradas = notificaciones.filter(notif => {
    if (filter === 'leidas') return notif.leida;
    if (filter === 'no-leidas') return !notif.leida;
    return true;
  });

  // 📊 Contador de no leídas
  const noLeidas = notificaciones.filter(n => !n.leida).length;

  // 📅 Formatear fecha
  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = ahora.getTime() - date.getTime();
    
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'Hace un momento';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias < 7) return `Hace ${dias}d`;
    
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short',
      year: date.getFullYear() !== ahora.getFullYear() ? 'numeric' : undefined
    });
  };

  // 🎨 Obtener icono según el estado
  const obtenerIcono = (notif: Notificacion) => {
    // Aquí puedes personalizar según id_estado_solicitud
    if (notif.mensaje.toLowerCase().includes('aprobad')) return '✅';
    if (notif.mensaje.toLowerCase().includes('rechazad')) return '❌';
    if (notif.mensaje.toLowerCase().includes('pendiente')) return '⏳';
    if (notif.mensaje.toLowerCase().includes('event')) return '🎉';
    return '📢';
  };

  return (
    <div className="notificaciones-page-layout">
      <Navbar /> 
      {/* 🎯 Header */}
      <main className="notificaciones-content-wrapper">
      <div className="notif-header">
        <div className="notif-title-section">
          <h1 className="notif-title">Notificaciones</h1>
          {noLeidas > 0 && (
            <div className="notif-badge-header">
              {noLeidas}
            </div>
          )}
        </div>
        
        <button 
          className="notif-refresh-btn"
          onClick={cargarNotificaciones}
          disabled={loading}
        >
          <svg 
            className={`refresh-icon ${loading ? 'spinning' : ''}`} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>
      </div>

      {/* 🎛️ Filtros */}
      <div className="notif-filters">
        <button 
          className={`filter-btn ${filter === 'todas' ? 'active' : ''}`}
          onClick={() => setFilter('todas')}
        >
          Todas ({notificaciones.length})
        </button>
        <button 
          className={`filter-btn ${filter === 'no-leidas' ? 'active' : ''}`}
          onClick={() => setFilter('no-leidas')}
        >
          No leídas ({noLeidas})
        </button>
        <button 
          className={`filter-btn ${filter === 'leidas' ? 'active' : ''}`}
          onClick={() => setFilter('leidas')}
        >
          Leídas ({notificaciones.length - noLeidas})
        </button>
      </div>

      {/* 📋 Lista de notificaciones */}
      <div className="notif-list">
        {loading ? (
          <div className="notif-loading">
            <div className="loading-spinner"></div>
            <p>Cargando notificaciones...</p>
          </div>
        ) : notificacionesFiltradas.length === 0 ? (
          <div className="notif-empty">
            <div className="empty-icon">🔔</div>
            <h3>No hay notificaciones</h3>
            <p>
              {filter === 'no-leidas' 
                ? '¡Estás al día! No tienes notificaciones nuevas.' 
                : filter === 'leidas'
                ? 'No hay notificaciones leídas aún.'
                : 'Cuando recibas notificaciones aparecerán aquí.'}
            </p>
          </div>
        ) : (
          notificacionesFiltradas.map((notif, index) => (
            <div
              key={notif.id_notificacion}
              className={`notif-card ${!notif.leida ? 'unread' : ''} ${
                selectedNotif === notif.id_notificacion ? 'selected' : ''
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => {
                setSelectedNotif(notif.id_notificacion);
                if (!notif.leida) {
                  marcarComoLeida(notif.id_notificacion);
                }
              }}
            >
              {/* Indicador de no leída */}
              {!notif.leida && <div className="unread-indicator"></div>}

              {/* Icono */}
              <div className="notif-icon">
                {obtenerIcono(notif)}
              </div>

              {/* Contenido */}
              <div className="notif-content">
                <p className="notif-mensaje">{notif.mensaje}</p>
                <div className="notif-meta">
                  <span className="notif-fecha">
                    {formatearFecha(notif.fecha_creacion)}
                  </span>
                  {!notif.leida && (
                    <span className="notif-status">Nueva</span>
                  )}
                </div>
              </div>

              {/* Acción */}
              {!notif.leida && (
                <button
                  className="notif-mark-read"
                  onClick={(e) => {
                    e.stopPropagation();
                    marcarComoLeida(notif.id_notificacion);
                  }}
                  title="Marcar como leída"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </button>
              )}
            </div>
          ))
        )}
      </div>
      </main>
      <Footer />
    </div>
  );
};
