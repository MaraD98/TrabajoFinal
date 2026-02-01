from fastapi import APIRouter, Depends, status, HTTPException # <--- AGREGAMOS HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

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

# ============ LISTAR TODAS (SOLO ROL 1 y 2) ============
@router.get(
    "",
    summary="Listar todas las inscripciones",
    description="Devuelve el listado completo. RESTRINGIDO: Solo Admin y Supervisor."
)
def listar_inscripciones(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # VALIDACIÓN DE ROL: Si no es 1 (Admin) ni 2 (Supervisor), lo echamos.
    if current_user.id_rol not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permisos para ver el listado de pagos."
        )

    # Si pasa el filtro, llamamos al servicio
    return InscripcionService.listar_todas(db)

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
    # VALIDACIÓN DE ROL: Si no es 1 (Admin) ni 2 (Supervisor), lo echamos.
    if current_user.id_rol not in [1, 2]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permisos para confirmar pagos."
        )

    return InscripcionService.confirmar_pago_manual(
        db=db, 
        id_reserva=id_reserva, 
        usuario_actual=current_user
    )

# ============ CANCELAR INSCRIPCIÓN (Usuario o Admin) ============
@router.delete(
    "/{id_inscripcion}",
    summary="Cancelar una inscripción y liberar cupo",
    status_code=status.HTTP_204_NO_CONTENT
)
def cancelar_inscripcion(
    id_inscripcion: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Llamamos al servicio para que haga la magia
    InscripcionService.cancelar_inscripcion(
        db=db, 
        id_inscripcion=id_inscripcion, 
        usuario_actual=current_user
    )
    return # Retorna 204 (sin contenido) al ser exitoso