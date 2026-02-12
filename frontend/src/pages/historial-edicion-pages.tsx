import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

interface DetalleCambio {
  id_detalle_cambio: number;
  campo_modificado: string;
  valor_anterior: string;
  valor_nuevo: string;
}

interface HistorialEdicion {
  id_historial_edicion: number;
  fecha_edicion: string;
  usuario_email: string;
  usuario_nombre: string;
  detalles: DetalleCambio[];
}

interface EventoInfo {
  id_evento: number;
  nombre_evento: string;
  id_estado: number;
}

export default function HistorialEdicionPage() {
  const { id_evento } = useParams<{ id_evento: string }>();
  const navigate = useNavigate();
  
  const [evento, setEvento] = useState<EventoInfo | null>(null);
  const [historial, setHistorial] = useState<HistorialEdicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarHistorial();
  }, [id_evento]);

  const cargarHistorial = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      setLoading(true);

      // Obtener información del evento
      const eventoRes = await api.get(`/eventos/${id_evento}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvento(eventoRes.data);

      // Obtener historial de ediciones
      const historialRes = await api.get(`/eventos/${id_evento}/historial-ediciones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorial(historialRes.data);

    } catch (err: any) {
      console.error('Error cargando historial:', err);
      if (err.response?.status === 403) {
        setError('No tienes permisos para ver el historial de este evento');
      } else if (err.response?.status === 404) {
        setError('Evento no encontrado');
      } else {
        setError('Error al cargar el historial de ediciones');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatearCampo = (campo: string): string => {
    const mapeo: Record<string, string> = {
      nombre_evento: 'Nombre del Evento',
      fecha_evento: 'Fecha',
      ubicacion: 'Ubicación',
      descripcion: 'Descripción',
      costo_participacion: 'Costo',
      id_tipo: 'Tipo de Evento',
      id_dificultad: 'Dificultad',
      cupo_maximo: 'Cupo Máximo',
      id_estado: 'Estado'
    };
    return mapeo[campo] || campo;
  };

  const formatearValor = (campo: string, valor: string): string => {
    if (!valor) return 'Sin valor';
    
    // Formatear fechas
    if (campo === 'fecha_evento') {
      return new Date(valor).toLocaleDateString('es-AR');
    }
    
    // Formatear costos
    if (campo === 'costo_participacion') {
      return `$${parseFloat(valor).toFixed(2)}`;
    }
    
    // Formatear IDs de catálogos
    if (campo === 'id_tipo') {
      const tipos: Record<string, string> = { '1': 'Carrera', '2': 'Paseo', '3': 'Entrenamiento', '4': 'Cicloturismo' };
      return tipos[valor] || valor;
    }
    
    if (campo === 'id_dificultad') {
      const dificultades: Record<string, string> = { '1': 'Básico', '2': 'Intermedio', '3': 'Avanzado' };
      return dificultades[valor] || valor;
    }

    if (campo === 'id_estado') {
      const estados: Record<string, string> = { '1': 'Borrador', '2': 'Pendiente', '3': 'Publicado', '4': 'Finalizado', '5': 'Cancelado' };
      return estados[valor] || valor;
    }
    
    return valor;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0a0a0a',
        color: '#10b981',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '1.2rem',
        fontWeight: 'bold'
      }}>
        CARGANDO HISTORIAL...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0a0a0a',
        color: '#ef4444',
        fontFamily: 'Montserrat, sans-serif',
        gap: '20px'
      }}>
        <h2>❌ {error}</h2>
        <button 
          onClick={() => navigate('/mis-eventos')}
          style={{
            background: '#4a9eff',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 'bold'
          }}
        >
          Volver a Mis Eventos
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      background: '#0a0a0a', 
      minHeight: '100vh', 
      fontFamily: 'Montserrat, sans-serif',
      color: '#fff',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        marginBottom: '2rem'
      }}>
        <button 
          onClick={() => navigate('/mis-eventos')}
          style={{
            background: 'transparent',
            border: '1px solid #333',
            color: '#a8a8a8',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: '600',
            marginBottom: '1.5rem',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#4a9eff';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#333';
            e.currentTarget.style.color = '#a8a8a8';
          }}
        >
          ← Volver
        </button>

        <div style={{
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '2rem'
        }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: '800' }}>
            📝 Historial de Ediciones
          </h1>
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.2rem', 
            fontWeight: '600',
            color: '#4a9eff'
          }}>
            {evento?.nombre_evento}
          </h2>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {historial.length === 0 ? (
          <div style={{
            background: '#1a1a1a',
            border: '1px dashed #333',
            borderRadius: '12px',
            padding: '60px 24px',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#a8a8a8', fontSize: '1.3rem', margin: '0 0 12px 0' }}>
              No hay ediciones registradas
            </h3>
            <p style={{ color: '#6b6b6b', margin: 0 }}>
              Este evento no ha sido editado desde su creación.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {historial.map((edicion, index) => (
              <div 
                key={edicion.id_historial_edicion}
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '12px',
                  padding: '24px',
                  position: 'relative'
                }}
              >
                {/* Badge de número de edición */}
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '24px',
                  background: '#4a9eff',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Edición #{historial.length - index}
                </div>

                {/* Header de la edición */}
                <div style={{ marginTop: '12px', marginBottom: '20px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{ 
                      color: '#a8a8a8',
                      fontSize: '0.9rem'
                    }}>
                      📅 {new Date(edicion.fecha_edicion).toLocaleString('es-AR', {
                        dateStyle: 'long',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>
                  <div style={{ color: '#6b6b6b', fontSize: '0.85rem' }}>
                    👤 Editado por: <strong style={{ color: '#fff' }}>{edicion.usuario_nombre}</strong> ({edicion.usuario_email})
                  </div>
                </div>

                {/* Tabla de cambios */}
                <div style={{ 
                  background: '#0f0f0f',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #2a2a2a'
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse'
                  }}>
                    <thead>
                      <tr style={{ background: '#1f1f1f' }}>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left',
                          borderBottom: '1px solid #2a2a2a',
                          color: '#4a9eff',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Campo
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left',
                          borderBottom: '1px solid #2a2a2a',
                          color: '#ef4444',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Valor Anterior
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left',
                          borderBottom: '1px solid #2a2a2a',
                          color: '#10b981',
                          fontSize: '0.85rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Valor Nuevo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {edicion.detalles.map((detalle) => (
                        <tr key={detalle.id_detalle_cambio}>
                          <td style={{ 
                            padding: '12px 16px',
                            borderBottom: '1px solid #1a1a1a',
                            color: '#fff',
                            fontWeight: '600',
                            fontSize: '0.9rem'
                          }}>
                            {formatearCampo(detalle.campo_modificado)}
                          </td>
                          <td style={{ 
                            padding: '12px 16px',
                            borderBottom: '1px solid #1a1a1a',
                            color: '#ef4444',
                            fontSize: '0.9rem'
                          }}>
                            <code style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontFamily: 'monospace'
                            }}>
                              {formatearValor(detalle.campo_modificado, detalle.valor_anterior) || '—'}
                            </code>
                          </td>
                          <td style={{ 
                            padding: '12px 16px',
                            borderBottom: '1px solid #1a1a1a',
                            color: '#10b981',
                            fontSize: '0.9rem'
                          }}>
                            <code style={{
                              background: 'rgba(16, 185, 129, 0.1)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontFamily: 'monospace'
                            }}>
                              {formatearValor(detalle.campo_modificado, detalle.valor_nuevo)}
                            </code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}