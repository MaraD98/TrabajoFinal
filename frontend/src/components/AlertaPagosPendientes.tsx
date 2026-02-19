// src/components/AlertaPagosPendientes.tsx
// Banner flotante de pagos pendientes - mismo estilo dark que el resto del proyecto

import { useState, useEffect } from 'react';

interface PagoPendiente {
  id_reserva: number;
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  costo_participacion: number;
  ubicacion: string;
}

export default function AlertaPagosPendientes() {
  const [pendientes, setPendientes] = useState<PagoPendiente[]>([]);
  const [expandido, setExpandido] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return;

    fetch(`${import.meta.env.VITE_API_URL}/inscripciones/mis-pagos-pendientes`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data) && data.length > 0) setPendientes(data); })
      .catch(() => {});
  }, []);

  if (pendientes.length === 0 || !visible) return null;

  const formatFecha = (f: string) => {
    try {
      return new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return f; }
  };

  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 8000,
        fontFamily: 'Montserrat, sans-serif',
        maxWidth: 340
      }}>
        {/* Panel expandido */}
        {expandido && (
          <div style={{
            marginBottom: 10,
            background: '#1a1a1a',
            border: '1px solid #f59e0b',
            borderRadius: 12,
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            overflow: 'hidden',
            animation: 'slideUpAlert 0.25s ease'
          }}>
            {/* Header panel */}
            <div style={{
              padding: '14px 16px',
              background: 'rgba(245,158,11,0.1)',
              borderBottom: '1px solid rgba(245,158,11,0.2)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: '0.85rem' }}>
                ⚠️ Pagos pendientes de confirmación
              </span>
              <button
                onClick={() => setExpandido(false)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1rem' }}
              >
                ▼
              </button>
            </div>

            {/* Lista */}
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {pendientes.map(p => (
                <div key={p.id_reserva} style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #222'
                }}>
                  <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 4px 0' }}>
                    {p.nombre_evento}
                  </p>
                  <p style={{ color: '#888', fontSize: '0.75rem', margin: '0 0 6px 0' }}>
                    📅 {formatFecha(p.fecha_evento)} · 📍 {p.ubicacion}
                  </p>
                  <span style={{
                    display: 'inline-block',
                    background: 'rgba(245,158,11,0.15)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245,158,11,0.3)',
                    borderRadius: 6, padding: '2px 8px',
                    fontSize: '0.75rem', fontWeight: 700
                  }}>
                    ${p.costo_participacion.toLocaleString('es-AR')} pendiente
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 16px',
              background: '#0f0f0f',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <a
                href="/perfil?tab=inscripciones"
                style={{
                  color: '#ccff00', fontSize: '0.8rem',
                  fontWeight: 700, textDecoration: 'none',
                  textTransform: 'uppercase', letterSpacing: '0.5px'
                }}
              >
                Ver mis inscripciones →
              </a>
              <button
                onClick={() => setVisible(false)}
                style={{
                  background: 'none', border: 'none',
                  color: '#555', cursor: 'pointer',
                  fontSize: '0.75rem'
                }}
              >
                Ocultar
              </button>
            </div>
          </div>
        )}

        {/* Badge compacto */}
        <button
          onClick={() => setExpandido(e => !e)}
          style={{
            background: expandido ? '#f59e0b' : '#1a1a1a',
            border: '2px solid #f59e0b',
            borderRadius: 24,
            padding: '10px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
            transition: 'all 0.2s ease',
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>⏰</span>
          <span style={{
            color: expandido ? '#000' : '#f59e0b',
            fontWeight: 800,
            fontSize: '0.82rem',
            fontFamily: 'Montserrat, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {pendientes.length === 1
              ? '1 pago pendiente'
              : `${pendientes.length} pagos pendientes`}
          </span>
          <span style={{ color: expandido ? '#000' : '#f59e0b', fontSize: '0.7rem' }}>
            {expandido ? '▼' : '▲'}
          </span>
        </button>
      </div>

      <style>{`
        @keyframes slideUpAlert {
          from { opacity: 0; transform: translateY(10px) }
          to   { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </>
  );
}