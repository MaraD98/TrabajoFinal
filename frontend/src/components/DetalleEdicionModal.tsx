import '../styles/detalle-edicion-modal.css';

interface CambioDetalle {
  anterior: string | number | null;
  nuevo: string | number | null;
  valor_real: any;
}

interface SolicitudEdicion {
  id_solicitud_edicion: number;
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  ubicacion: string;
  id_tipo: number;
  cambios_propuestos: Record<string, CambioDetalle>;
  fecha_solicitud: string;
  usuario_solicitante: string;
  estado: string;
}

interface DetalleEdicionModalProps {
  show: boolean;
  solicitud: SolicitudEdicion | null;
  onClose: () => void;
  onAprobar: (idEvento: number, nombreEvento: string) => void;
  onRechazar: (idEvento: number, nombreEvento: string) => void;
}

const NOMBRES_CAMPOS: Record<string, string> = {
  nombre_evento: 'Nombre del Evento',
  fecha_evento: 'Fecha',
  ubicacion: 'Ubicación',
  descripcion: 'Descripción',
  costo_participacion: 'Costo de Participación',
  id_tipo: 'Tipo de Evento',
  id_dificultad: 'Dificultad',
  cupo_maximo: 'Cupo Máximo',
  lat: 'Latitud',
  lng: 'Longitud',
};

const TIPOS_EVENTO: Record<number, string> = {
  1: 'Carrera',
  2: 'Paseo',
  3: 'Entrenamiento',
  4: 'Cicloturismo',
};

const DIFICULTADES: Record<number, string> = {
  1: 'Principiante',
  2: 'Intermedio',
  3: 'Avanzado',
  4: 'Experto',
};

const formatearValor = (campo: string, valor: any): string => {
  if (valor === null || valor === undefined) return 'Sin especificar';
  
  if (campo === 'id_tipo') {
    return TIPOS_EVENTO[Number(valor)] || `Tipo ${valor}`;
  }
  
  if (campo === 'id_dificultad') {
    return DIFICULTADES[Number(valor)] || `Dificultad ${valor}`;
  }
  
  if (campo === 'fecha_evento') {
    try {
      return new Date(valor).toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return String(valor);
    }
  }
  
  if (campo === 'costo_participacion') {
    return `$${Number(valor).toLocaleString('es-AR')}`;
  }
  
  if (campo === 'cupo_maximo') {
    return valor === 0 || valor === null ? 'Ilimitado' : `${valor} personas`;
  }
  
  return String(valor);
};

export default function DetalleEdicionModal({ 
  show, 
  solicitud, 
  onClose, 
  onAprobar, 
  onRechazar 
}: DetalleEdicionModalProps) {
  if (!show || !solicitud) return null;

  const cambiosArray = Object.entries(solicitud.cambios_propuestos || {});
  const fechaSolicitud = new Date(solicitud.fecha_solicitud).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 9998,
        }}
      />

      {/* Modal centrado con transform desde el primer render */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '700px',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: '#1a1a1a',
          borderRadius: '12px',
          border: '1px solid #2a2a2a',
          fontFamily: 'Montserrat, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '24px',
          borderBottom: '1px solid #2a2a2a',
          background: '#0f0f0f',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderRadius: '12px 12px 0 0',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff' }}>✏️ Solicitud de Edición</h2>
            <p style={{ margin: '4px 0 0 0', color: '#ccff00', fontSize: '0.9rem' }}>{solicitud.nombre_evento}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a8a8a8',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Info general */}
          <div style={{
            background: '#0f0f0f',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            border: '1px solid #2a2a2a',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>📅 Solicitado:</span>
              <span style={{ color: '#fff', fontSize: '0.85rem' }}>{fechaSolicitud}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>👤 Usuario:</span>
              <span style={{ color: '#fff', fontSize: '0.85rem' }}>{solicitud.usuario_solicitante}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>🔢 Cambios:</span>
              <span style={{ color: '#fff', fontSize: '0.85rem' }}>{cambiosArray.length} campo{cambiosArray.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Cambios propuestos */}
          <div>
            <h3 style={{ margin: '0 0 16px 0', color: '#ccff00', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cambios Propuestos:
            </h3>

            {cambiosArray.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center' }}>No hay cambios registrados</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cambiosArray.map(([campo, cambio]) => (
                  <div key={campo} style={{
                    background: '#0f0f0f',
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    padding: '16px',
                  }}>
                    <p style={{ margin: '0 0 12px 0', color: '#ccff00', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                      {NOMBRES_CAMPOS[campo] || campo}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
                      <div style={{ background: '#3a1a1a', border: '1px solid #ef444433', borderRadius: '6px', padding: '10px' }}>
                        <p style={{ margin: '0 0 4px 0', color: '#ef4444', fontSize: '0.72rem', fontWeight: '600' }}>ANTERIOR:</p>
                        <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                          {formatearValor(campo, cambio.anterior)}
                        </p>
                      </div>
                      <span style={{ color: '#666', fontSize: '1.2rem' }}>→</span>
                      <div style={{ background: '#0f2a1a', border: '1px solid #10b98133', borderRadius: '6px', padding: '10px' }}>
                        <p style={{ margin: '0 0 4px 0', color: '#10b981', fontSize: '0.72rem', fontWeight: '600' }}>NUEVO:</p>
                        <p style={{ margin: 0, color: '#6ee7b7', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                          {formatearValor(campo, cambio.nuevo)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 24px',
          borderTop: '1px solid #2a2a2a',
          background: '#0f0f0f',
          borderRadius: '0 0 12px 12px',
          position: 'sticky',
          bottom: 0,
        }}>
          <button
            onClick={() => { onRechazar(solicitud.id_evento, solicitud.nombre_evento); onClose(); }}
            style={{
              padding: '10px 24px',
              background: 'transparent',
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#ef4444',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            ✕ Rechazar
          </button>
          <button
            onClick={() => { onAprobar(solicitud.id_evento, solicitud.nombre_evento); onClose(); }}
            style={{
              padding: '10px 24px',
              background: '#ccff00',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            ✓ Aprobar Cambios
          </button>
        </div>
      </div>
    </>
  );
}