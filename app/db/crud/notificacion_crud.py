from sqlalchemy.orm import Session
from app.models.notificacion_models import Notificacion
from typing import List, Optional

class NotificacionCRUD:
    @staticmethod
    def create_notificacion(db: Session, id_usuario: int, id_estado_solicitud: Optional[int], mensaje: str) -> Notificacion:
        nueva_notificacion = Notificacion(
            id_usuario=id_usuario,
            id_estado_solicitud=id_estado_solicitud,
            mensaje=mensaje
        )
        db.add(nueva_notificacion)
        db.commit()
        db.refresh(nueva_notificacion)
        return nueva_notificacion
    
    @staticmethod
    def get_notificaciones_by_usuario(db: Session, id_usuario: int) -> List[Notificacion]:
        return db.query(Notificacion).filter(
            Notificacion.id_usuario == id_usuario
        ).order_by(Notificacion.fecha_creacion.desc()).all()

    @staticmethod
    def update_notificacion_leida(db: Session, id_notificacion: int, leida: bool = True) -> Optional[Notificacion]:
        notificacion = db.query(Notificacion).filter(Notificacion.id_notificacion == id_notificacion).first()
        if notificacion:
            notificacion.leida = leida
            db.commit()
            db.refresh(notificacion)
        return notificacion
    
    
