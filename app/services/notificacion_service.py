from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.crud.notificacion_crud import NotificacionCRUD
from app.schemas.notificacion_schema import NotificacionResponse

class NotificacionService:
    @staticmethod
    def listar_notificaciones_usuario(db: Session, id_usuario: int) -> List[NotificacionResponse]:
        notificaciones = NotificacionCRUD.get_notificaciones_by_usuario(db, id_usuario)
        return [NotificacionResponse.model_validate(n) for n in notificaciones]

    @staticmethod
    def marcar_notificacion_leida(db: Session, id_notificacion: int) -> Optional[NotificacionResponse]:
        notificacion = NotificacionCRUD.update_notificacion_leida(db, id_notificacion, leida=True)
        if notificacion:
            return NotificacionResponse.model_validate(notificacion)
        return None
