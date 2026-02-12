import React, { useState, useEffect } from 'react';
import '../../styles/edit-event-modal.css';

interface EditEventModalProps {
  show: boolean;
  evento: any;
  onClose: () => void;
  onSuccess: () => void;
}

const TIPOS_EVENTO = [
  { id: 1, nombre: 'Carrera' },
  { id: 2, nombre: 'Paseo' },
  { id: 3, nombre: 'Entrenamiento' },
  { id: 4, nombre: 'Cicloturismo' }
];

const DIFICULTADES = [
  { id: 1, nombre: 'Principiante' },
  { id: 2, nombre: 'Intermedio' },
  { id: 3, nombre: 'Avanzado' },
  { id: 4, nombre: 'Experto' }
];

export default function EditEventModal({ show, evento, onClose, onSuccess }: EditEventModalProps) {
  const [formData, setFormData] = useState({
    nombre_evento: '',
    fecha_evento: '',
    ubicacion: '',
    descripcion: '',
    costo_participacion: 0,
    id_tipo: 1,
    id_dificultad: 1,
    cupo_maximo: 0
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (evento) {
      // Formatear fecha correctamente (YYYY-MM-DD para input date)
      let fechaFormateada = '';
      if (evento.fecha_evento) {
        try {
          const fecha = new Date(evento.fecha_evento);
          fechaFormateada = fecha.toISOString().split('T')[0];
        } catch {
          fechaFormateada = evento.fecha_evento;
        }
      }

      setFormData({
        nombre_evento: evento.nombre_evento || '',
        fecha_evento: fechaFormateada,
        ubicacion: evento.ubicacion || '',
        descripcion: evento.descripcion || '',
        costo_participacion: evento.costo_participacion || 0,
        id_tipo: evento.id_tipo || 1,
        id_dificultad: evento.id_dificultad || 1,
        cupo_maximo: evento.cupo_maximo || 0
      });
      setError('');
    }
  }, [evento]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8000/api/v1/admin/eventos/${evento.id_evento}/editar-directo`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al actualizar evento');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CRÍTICO: Evitar que el click se propague al overlay
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (!show) return null;

  return (
    <>
      {/* ✅ Overlay oscuro */}
      <div 
        className="modal-overlay" 
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* ✅ Modal - Detener propagación del click */}
        <div 
          className="edit-event-modal" 
          onClick={handleModalClick}
        >
          <div className="modal-header">
            <h2>✏️ Editar Evento</h2>
            <button 
              className="btn-close" 
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-body">
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label>Nombre del Evento *</label>
                <input
                  type="text"
                  value={formData.nombre_evento}
                  onChange={(e) => setFormData({ ...formData, nombre_evento: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Fecha *</label>
                <input
                  type="date"
                  value={formData.fecha_evento}
                  onChange={(e) => setFormData({ ...formData, fecha_evento: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group full-width">
                <label>Ubicación *</label>
                <input
                  type="text"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group full-width">
                <label>Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  disabled={loading}
                  placeholder="Describe el evento..."
                />
              </div>

              <div className="form-group">
                <label>Tipo de Evento *</label>
                <select
                  value={formData.id_tipo}
                  onChange={(e) => setFormData({ ...formData, id_tipo: Number(e.target.value) })}
                  disabled={loading}
                >
                  {TIPOS_EVENTO.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Dificultad *</label>
                <select
                  value={formData.id_dificultad}
                  onChange={(e) => setFormData({ ...formData, id_dificultad: Number(e.target.value) })}
                  disabled={loading}
                >
                  {DIFICULTADES.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Costo ($) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costo_participacion}
                  onChange={(e) => setFormData({ ...formData, costo_participacion: Number(e.target.value) })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Cupo Máximo *</label>
                <input
                  type="number"
                  min="0"
                  value={formData.cupo_maximo}
                  onChange={(e) => setFormData({ ...formData, cupo_maximo: Number(e.target.value) })}
                  required
                  disabled={loading}
                  placeholder="0 = ilimitado"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-cancelar" 
                onClick={onClose} 
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn-guardar" 
                disabled={loading}
              >
                {loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}