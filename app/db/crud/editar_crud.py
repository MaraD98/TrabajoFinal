from sqlalchemy.orm import Session
# 1. ACTUALIZA ESTA LÍNEA DE IMPORTACIÓN:
# Agrega 'EventoMultimedia' al final para poder usar la tabla de fotos
from app.models.registro_models import Evento, EventoMultimedia 
from app.models.editar_models import HistorialEdicionEvento, DetalleCambioEvento

# --- TUS FUNCIONES EXISTENTES (DÉJALAS IGUAL) ---
def obtener_evento_por_id(db: Session, id_evento: int):
    return db.query(Evento).filter(Evento.id_evento == id_evento).first()

def guardar_cambios_auditoria(db: Session, evento: Evento, historial: HistorialEdicionEvento, detalles: list[DetalleCambioEvento]):
    db.add(historial)
    db.flush()
    for detalle in detalles:
        detalle.id_historial_edicion = historial.id_historial_edicion
        db.add(detalle)
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento

# --- AGREGA ESTO AL FINAL DEL ARCHIVO (LO NUEVO) ---

def obtener_multimedia_por_id(db: Session, id_multimedia: int):
    """Busca una foto específica por su ID único."""
    return db.query(EventoMultimedia).filter(EventoMultimedia.id_multimedia == id_multimedia).first()

def actualizar_multimedia(db: Session, multimedia: EventoMultimedia):
    """Guarda los cambios de la foto en la base de datos."""
    db.add(multimedia)
    db.commit()
    db.refresh(multimedia)
    return multimedia