// src/components/modals/EventoDetalleModal.tsx
// Modal de detalle de evento - encaja con el tema dark existente (Montserrat, #1a1a1a, #ccff00)

import { useState, useEffect } from 'react';

interface EventoDetalle {
  id_evento: number;
  nombre_evento: string;
  descripcion?: string;
  fecha_evento: string;
  ubicacion: string;
  costo_participacion: number;
  cupo_maximo?: number;
  cupos_disponibles?: number | null;
  inscriptos?: number;
  id_tipo?: number;
  id_dificultad?: number;
  id_estado: number;
  organizador_nombre?: string;
  organizador_email?: string;
  lat?: number | null;
  lng?: number | null;
}

const NOMBRES_TIPO: Record<number, string> = {
  1: 'Carrera', 2: 'Paseo', 3: 'Entrenamiento', 4: 'Cicloturismo'
};
const NOMBRES_DIFICULTAD: Record<number, string> = {
  1: 'Principiante', 2: 'Intermedio', 3: 'Avanzado', 4: 'Experto'
};
const COLORES_DIFICULTAD: Record<number, string> = {
  1: '#4ade80', 2: '#facc15', 3: '#fb923c', 4: '#f87171'
};

interface Props {
  eventoId: number | null;
  onClose: () => void;
  eventoPreview?: { nombre_evento: string; fecha_evento: string } | null;
  // Opcional: si se pasa, oculta el botón "Ver en Calendario" para eventos no activos
  idEstado?: number | null;
}

export default function EventoDetalleModal({ eventoId, onClose, eventoPreview, idEstado }: Props) {
  const [evento, setEvento] = useState<EventoDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventoId) {
      setEvento(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setEvento(null);

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // ✅ CORREGIDO: era /eventos/{id}/detalle (no existe), ahora es /eventos/{id}
    fetch(`${import.meta.env.VITE_API_URL}/eventos/${eventoId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then(data => setEvento(data))
      .catch(() => setError('No se pudo cargar el detalle del evento.'))
      .finally(() => setLoading(false));
  }, [eventoId]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!eventoId) return null;

  const formatFecha = (fecha: string) => {
    if (!fecha) return '—';
    try {
      // Forzar parseo como fecha local (sin zona horaria)
      // "2026-03-05" → [2026, 3, 5] → new Date(2026, 2, 5)
      const partes = fecha.split('T')[0].split('-').map(Number);
      const d = new Date(partes[0], partes[1] - 1, partes[2]);
      if (isNaN(d.getTime())) return fecha;
      return d.toLocaleDateString('es-AR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return fecha; }
  };

  const cupoLabel = () => {
    if (!evento) return '';
    if (!evento.cupo_maximo || evento.cupo_maximo === 0) return 'Ilimitado';
    if (evento.cupos_disponibles === null || evento.cupos_disponibles === undefined) return 'Ilimitado';
    if (evento.cupos_disponibles <= 0) return '⚠️ Sin cupos disponibles';
    return `${evento.cupos_disponibles} de ${evento.cupo_maximo} disponibles`;
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(6px)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease'
        }}
      />

      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '16px',
          width: '90%',
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 9999,
          fontFamily: 'Montserrat, sans-serif',
          animation: 'slideUp 0.3s ease',
          boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(204,255,0,0.05)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '2px solid #ccff00',
          background: '#0f0f0f',
          borderRadius: '14px 14px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          position: 'sticky', top: 0, zIndex: 10
        }}>
          <div>
            <p style={{ color: '#ccff00', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px 0', letterSpacing: '1px' }}>
              Detalle del Evento
            </p>
            <h2 style={{ margin: 0, fontSize: '1.3rem', color: '#fff', fontWeight: 800, lineHeight: 1.3 }}>
              {loading && eventoPreview
                ? eventoPreview.nombre_evento
                : evento?.nombre_evento || (loading ? 'Cargando...' : '—')}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: '#888', fontSize: '1.4rem', cursor: 'pointer',
              width: 32, height: 32, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, flexShrink: 0
            }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#666' }}>
              <div style={{
                width: 32, height: 32, border: '3px solid #2a2a2a',
                borderTopColor: '#ccff00', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p style={{ margin: 0 }}>Cargando detalles...</p>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
              borderRadius: 10, padding: '16px', color: '#f87171',
              textAlign: 'center'
            }}>
              ⚠️ {error}
            </div>
          )}

          {evento && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Badges tipo y dificultad */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {evento.id_tipo && (
                  <span style={{
                    background: 'rgba(204,255,0,0.1)', color: '#ccff00',
                    border: '1px solid rgba(204,255,0,0.3)',
                    borderRadius: 20, padding: '4px 12px',
                    fontSize: '0.75rem', fontWeight: 700
                  }}>
                    🚴 {NOMBRES_TIPO[evento.id_tipo] || 'Evento'}
                  </span>
                )}
                {evento.id_dificultad && (
                  <span style={{
                    background: 'rgba(0,0,0,0.3)',
                    color: COLORES_DIFICULTAD[evento.id_dificultad] || '#aaa',
                    border: `1px solid ${COLORES_DIFICULTAD[evento.id_dificultad] || '#444'}40`,
                    borderRadius: 20, padding: '4px 12px',
                    fontSize: '0.75rem', fontWeight: 700
                  }}>
                    ⚡ {NOMBRES_DIFICULTAD[evento.id_dificultad] || ''}
                  </span>
                )}
              </div>

              {/* Grid de datos */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 12
              }}>
                <InfoCard icon="📅" label="Fecha" value={formatFecha(evento.fecha_evento)} fullWidth />
                <InfoCard icon="📍" label="Ubicación" value={evento.ubicacion} fullWidth />
                <InfoCard
                  icon="💰"
                  label="Costo"
                  value={evento.costo_participacion === 0
                    ? 'Gratuito'
                    : `$${Number(evento.costo_participacion).toLocaleString('es-AR')}`}
                  highlight={evento.costo_participacion === 0}
                />
                <InfoCard icon="👥" label="Cupos" value={cupoLabel()} />
                {evento.inscriptos !== undefined && (
                  <InfoCard icon="✅" label="Inscriptos" value={`${evento.inscriptos} personas`} />
                )}
                {evento.organizador_nombre && (
                  <InfoCard icon="👤" label="Organizador" value={evento.organizador_nombre} />
                )}
              </div>

              {/* Descripción */}
              {evento.descripcion && (
                <div style={{
                  background: '#0f0f0f', border: '1px solid #2a2a2a',
                  borderRadius: 10, padding: 16
                }}>
                  <p style={{ color: '#ccff00', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 8px 0', letterSpacing: 1 }}>
                    📝 Descripción
                  </p>
                  <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
                    {evento.descripcion}
                  </p>
                </div>
              )}

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                {/* Solo muestra "Ver en Calendario" si el evento está activo (estado 3)
                    o si no se pasó id_estado (compatibilidad con admin dashboard) */}
                {(idEstado === undefined || idEstado === null || idEstado === 3) && (
                  <a
                    href={`/calendario?fecha=${evento.fecha_evento.split('T')[0]}&id=${evento.id_evento}`}
                    style={{
                      flex: 1, textAlign: 'center',
                      background: '#ccff00', color: '#000',
                      padding: '12px 0', borderRadius: 10,
                      fontWeight: 800, fontSize: '0.85rem',
                      textDecoration: 'none', textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Ver en Calendario
                  </a>
                )}
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, background: 'transparent',
                    border: '1px solid #333', color: '#888',
                    padding: '12px 0', borderRadius: 10,
                    fontWeight: 600, fontSize: '0.85rem',
                    cursor: 'pointer', textTransform: 'uppercase'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)) }
          to   { opacity: 1; transform: translate(-50%, -50%) }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}

// Sub-componente para cada dato
function InfoCard({
  icon, label, value, fullWidth = false, highlight = false
}: {
  icon: string; label: string; value: string;
  fullWidth?: boolean; highlight?: boolean;
}) {
  return (
    <div style={{
      background: '#0f0f0f', border: '1px solid #2a2a2a',
      borderRadius: 10, padding: '12px 14px',
      gridColumn: fullWidth ? '1 / -1' : undefined
    }}>
      <p style={{
        color: '#555', fontSize: '0.65rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 4px 0'
      }}>
        {icon} {label}
      </p>
      <p style={{
        color: highlight ? '#4ade80' : '#fff',
        fontSize: '0.9rem', fontWeight: 600, margin: 0
      }}>
        {value}
      </p>
    </div>
  );
}