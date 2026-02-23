from fastapi import APIRouter, Depends, status, HTTPException, BackgroundTasks
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from datetime import date

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

@router.get(
    "/mis-pagos-pendientes",
    summary="Reservas con pago pendiente del usuario logueado"
)
def mis_pagos_pendientes(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Devuelve las reservas del usuario donde id_estado_reserva = 1 (Pendiente),
    el evento no está cancelado (5) ni depurado (6), y la fecha es futura.
    Se usa para mostrar el badge de alerta ⏰ en el frontend.

    El valor 1 corresponde al primer INSERT de EstadoReserva en 02_postgres.sql:
        INSERT INTO EstadoReserva (nombre) VALUES ('Pendiente'), ...
    """
    from app.models.inscripcion_models import ReservaEvento
    from app.models.registro_models import Evento

    hoy = date.today()

    reservas = (
        db.query(ReservaEvento, Evento)
        .join(Evento, ReservaEvento.id_evento == Evento.id_evento)
        .filter(
            ReservaEvento.id_usuario == current_user.id_usuario,
            ReservaEvento.id_estado_reserva == 1,  # Pendiente (ver EstadoReserva)
            Evento.id_estado.notin_([5, 6]),        # excluir Cancelado y Depurado
            Evento.fecha_evento >= hoy              # solo eventos futuros
        )
        .all()
    )

    return [
        {
            "id_reserva":          r.id_reserva,
            "id_evento":           e.id_evento,
            "nombre_evento":       e.nombre_evento,
            "fecha_evento":        str(e.fecha_evento),
            "costo_participacion": float(e.costo_participacion or 0),
            "ubicacion":           e.ubicacion,
            "fecha_limite_pago":    r.fecha_expiracion.isoformat() if r.fecha_expiracion else None, 
        }
        for r, e in reservas
    ]
# ============ INSCRIBIRSE A UN EVENTO ============
@router.post(
    "/{id_evento}",
    summary="Inscribirse a un evento",
    description="Genera una reserva. Si es gratuito se confirma, si es pago queda pendiente."
)
def inscribirse_evento(
    id_evento: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return InscripcionService.crear_inscripcion(
        db=db, 
        id_evento=id_evento, 
        usuario_actual=current_user,
        background_tasks=background_tasks
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