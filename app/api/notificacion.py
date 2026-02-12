from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.api.auth import get_current_user
from app.models.auth_models import Usuario
from app.core.security import security
from app.db.database import get_db
from app.schemas.notificacion_schema import NotificacionResponse
from app.services.notificacion_service import NotificacionService


router = APIRouter(
    prefix="/notificaciones",
    tags=["Notificaciones"]
)

# 📌 Ver todas las notificaciones del usuario logueado
@router.get("/", response_model=List[NotificacionResponse])
def listar_mis_notificaciones(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return NotificacionService.listar_notificaciones_usuario(db, current_user.id_usuario)

# 📌 Marcar una notificación como leída (solo si es tuya)
@router.put("/{id_notificacion}", response_model=NotificacionResponse)
def marcar_notificacion_leida(
    id_notificacion: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notificacion = NotificacionService.marcar_notificacion_leida(db, id_notificacion)
    if notificacion is None or notificacion.id_usuario != current_user.id_usuario:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return notificacion
