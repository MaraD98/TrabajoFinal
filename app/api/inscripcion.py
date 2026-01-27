from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

# DB y Auth
from app.db.database import get_db
from app.core.security import security
from app.services.auth_services import AuthService
from app.services.inscripcion_services import InscripcionService

router = APIRouter(prefix="/inscripciones", tags=["Inscripciones"])

# Dependencia de usuario
def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    return AuthService.get_current_usuario_from_token(db, credentials.credentials)

# ============ INSCRIBIRSE A UN EVENTO ============
@router.post(
    "/{id_evento}",
    summary="Inscribirse a un evento",
    description="Genera una reserva. Si es gratuito se confirma, si es pago queda pendiente."
)
def inscribirse_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return InscripcionService.crear_inscripcion(
        db=db, 
        id_evento=id_evento, 
        usuario_actual=current_user
    )

# ============ CONFIRMAR PAGO (ADMIN) ============
@router.post(
    "/confirmar-pago/{id_reserva}",
    summary="Confirmar pago de una reserva (Solo Admin/Supervisor)"
)
def confirmar_pago(
    id_reserva: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return InscripcionService.confirmar_pago_manual(
        db=db, 
        id_reserva=id_reserva, 
        usuario_actual=current_user
    )