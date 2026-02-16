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
      <div className="modal-overlay" onClick={onClose} />
      
      <div className="detalle-edicion-modal">
        <div className="modal-header">
          <div>
            <h2>✏️ Solicitud de Edición</h2>
            <p className="modal-subtitle">{solicitud.nombre_evento}</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="info-section">
            <div className="info-row">
              <span className="info-label">📅 Solicitado:</span>
              <span className="info-value">{fechaSolicitud}</span>
            </div>
            <div className="info-row">
              <span className="info-label">👤 Usuario:</span>
              <span className="info-value">{solicitud.usuario_solicitante}</span>
            </div>
            <div className="info-row">
              <span className="info-label">🔢 Cambios:</span>
              <span className="info-value">{cambiosArray.length} campo{cambiosArray.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="cambios-section">
            <h3>Cambios Propuestos:</h3>
            
            {cambiosArray.length === 0 ? (
              <div className="empty-state">
                <p>No hay cambios registrados</p>
              </div>
            ) : (
              <div className="cambios-lista">
                {cambiosArray.map(([campo, cambio]) => (
                  <div key={campo} className="cambio-item">
                    <div className="cambio-header">
                      <span className="campo-nombre">
                        {NOMBRES_CAMPOS[campo] || campo}
                      </span>
                    </div>
                    
                    <div className="cambio-valores">
                      <div className="valor-anterior">
                        <span className="valor-label">Anterior:</span>
                        <span className="valor-texto">
                          {formatearValor(campo, cambio.anterior)}
                        </span>
                      </div>
                      
                      <div className="arrow">→</div>
                      
                      <div className="valor-nuevo">
                        <span className="valor-label">Nuevo:</span>
                        <span className="valor-texto">
                          {formatearValor(campo, cambio.nuevo)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn-rechazar-modal"
            onClick={() => {
              onRechazar(solicitud.id_evento, solicitud.nombre_evento);
              onClose();
            }}
          >
            ✕ Rechazar
          </button>
          
          <button 
            className="btn-aprobar-modal"
            onClick={() => {
              onAprobar(solicitud.id_evento, solicitud.nombre_evento);
              onClose();
            }}
          >
            ✓ Aprobar Cambios
          </button>
        </div>
      </div>
    </>
  );
}