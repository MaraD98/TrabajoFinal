from sqlalchemy.orm import Session

# 1. Traemos 'Evento' desde TU archivo 'registro_models'
from app.models.registro_models import Evento 

# 2. Traemos los historiales desde 'editar_models'
from app.models.editar_models import HistorialEdicionEvento, DetalleCambioEvento

def obtener_evento_por_id(db: Session, id_evento: int):
    """Solo busca el evento en la DB."""
    return db.query(Evento).filter(Evento.id_evento == id_evento).first()

def guardar_cambios_auditoria(db: Session, evento: Evento, historial: HistorialEdicionEvento, detalles: list[DetalleCambioEvento]):
    """
    Recibe el evento modificado, el historial y la lista de detalles.
    Guarda todo de una sola vez.
    """
    # 1. Agregamos el historial (la cabecera)
    db.add(historial)
    db.flush() # Hacemos flush para que se genere el ID del historial
    
    # 2. Asignamos ese ID a cada detalle y los guardamos
    for detalle in detalles:
        detalle.id_historial_edicion = historial.id_historial_edicion
        db.add(detalle)
        
    # 3. El evento ya está modificado (porque SQLAlchemy sigue los objetos), 
    # pero hacemos un add por seguridad o simplemente confirmamos al final.
    db.add(evento) 
    
    # 4. Confirmamos todo junto (Commit)
    db.commit()
    db.refresh(evento)
    return evento