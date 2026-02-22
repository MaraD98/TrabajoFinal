from fastapi import APIRouter, Depends, status, Query, Request
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import ValidationError

from app.models.auth_models import Usuario
from app.schemas.evento_solicitud_schema import (
    SolicitudPublicacionCreate,
    SolicitudBorradorCreate,
    SolicitudPublicacionResponse,
    TipoEventoResponse,
    NivelDificultadResponse
)
from app.services.evento_solicitud_service import EventoSolicitudService
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD
from app.db.database import get_db
from app.core.security import security
from app.services.auth_services import AuthService

router = APIRouter(prefix="/solicitudes-eventos", tags=["Solicitudes de Eventos Externos"])


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    return AuthService.get_current_usuario_from_token(db, credentials.credentials)


# ============================================================================
# POST — Crear solicitud
#
# enviar=False → Borrador (SolicitudBorradorCreate, campos opcionales — como Gmail)
# enviar=True  → Envío real (SolicitudPublicacionCreate, validación estricta)
#
# FastAPI no soporta body polimórfico nativo, por eso usamos Request
# y validamos manualmente según el query param `enviar`.
# ============================================================================
@router.post(
    "/",
    response_model=SolicitudPublicacionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear solicitud de evento",
    description="""
Crea una solicitud de publicación de evento.

- **enviar=False**: Guarda borrador. Acepta campos incompletos (igual que Gmail guarda borradores).
- **enviar=True**: Envía para revisión. Todos los campos son requeridos.

Admin/Supervisor (rol 1, 2): auto-aprueba y publica el evento inmediatamente.
Externo (rol 3, 4): queda pendiente de aprobación manual.
    """
)
async def crear_solicitud_evento(
    request: Request,
    enviar: bool = Query(True, description="True: Enviar para revisión | False: Guardar borrador"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    body = await request.json()

    if enviar:
        # Validación estricta — rechaza si falta algún campo obligatorio
        try:
            solicitud = SolicitudPublicacionCreate(**body)
        except ValidationError as e:
            return JSONResponse(
                status_code=422,
                content={"detail": [{"msg": err["msg"], "field": " → ".join(str(x) for x in err["loc"])} for err in e.errors()]}
            )
    else:
        # Borrador — acepta cualquier combinación de campos, sin validación obligatoria
        try:
            solicitud = SolicitudBorradorCreate(**body)
        except ValidationError as e:
            return JSONResponse(
                status_code=422,
                content={"detail": [{"msg": err["msg"], "field": " → ".join(str(x) for x in err["loc"])} for err in e.errors()]}
            )

    return EventoSolicitudService.crear_solicitud(
        db=db,
        solicitud=solicitud,
        id_usuario=current_user.id_usuario,
        id_rol=current_user.id_rol,
        enviar=enviar
    )


# ============================================================================
# PUT — Actualizar solicitud existente (autoguardado / reenvío / envío de borrador)
# ============================================================================
@router.put(
    "/{id_solicitud}",
    response_model=SolicitudPublicacionResponse,
    summary="Actualizar solicitud existente",
    description="Actualiza una solicitud. enviar=False: actualiza borrador. enviar=True: envía para revisión."
)
async def actualizar_solicitud_evento(
    id_solicitud: int,
    request: Request,
    enviar: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    body = await request.json()

    if enviar:
        try:
            solicitud = SolicitudPublicacionCreate(**body)
        except ValidationError as e:
            return JSONResponse(
                status_code=422,
                content={"detail": [{"msg": err["msg"], "field": " → ".join(str(x) for x in err["loc"])} for err in e.errors()]}
            )
    else:
        try:
            solicitud = SolicitudBorradorCreate(**body)
        except ValidationError as e:
            return JSONResponse(
                status_code=422,
                content={"detail": [{"msg": err["msg"], "field": " → ".join(str(x) for x in err["loc"])} for err in e.errors()]}
            )

    resultado = EventoSolicitudService.actualizar_solicitud(
        db=db,
        id_solicitud=id_solicitud,
        solicitud=solicitud,
        id_usuario=current_user.id_usuario,
        enviar=enviar
    )

    # ✅ FIX: si admin/supervisor envía un borrador (enviar=True),
    # actualizar_solicitud solo lo pone en Pendiente (estado 2).
    # Hay que auto-aprobar igual que cuando crean uno nuevo desde registro_evento.py.
    # Esto cubre el caso del botón "Editar" en Mis Eventos → Borradores cuando
    # el usuario es admin/supervisor.
    if enviar and current_user.id_rol in [1, 2]:
        solicitud_db = Solicitud_PublicacionCRUD.obtener_solicitud_por_id(db, id_solicitud)
        if solicitud_db:
            resultado = EventoSolicitudService._auto_aprobar_solicitud(
                db=db,
                solicitud=solicitud_db,
                id_admin=current_user.id_usuario
            )

    return resultado


# ============================================================================
# GET — Mis solicitudes
# ============================================================================
@router.get(
    "/mis-solicitudes",
    response_model=list[SolicitudPublicacionResponse],
    summary="Obtener mis solicitudes"
)
def obtener_mis_solicitudes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    return EventoSolicitudService.obtener_mis_solicitudes(db, current_user.id_usuario)


@router.get(
    "/{id_solicitud}",
    response_model=SolicitudPublicacionResponse,
    summary="Consultar solicitud por ID"
)
def consultar_solicitud(
    id_solicitud: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    return EventoSolicitudService.obtener_solicitud(db, id_solicitud, current_user)


@router.patch(
    "/{id_solicitud}/enviar",
    response_model=SolicitudPublicacionResponse,
    summary="Enviar solicitud para revisión",
    description="Cambia el estado de Borrador (1) a Pendiente (2)."
)
def enviar_solicitud_para_revision(
    id_solicitud: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    return EventoSolicitudService.enviar_solicitud_para_revision(db, id_solicitud, current_user)


@router.get(
    "/catalogos/tipos",
    response_model=list[TipoEventoResponse],
    summary="Listar tipos de evento"
)
def listar_tipos_evento(db: Session = Depends(get_db)):
    return Solicitud_PublicacionCRUD.obtener_tipos_evento(db)


@router.get(
    "/catalogos/dificultades",
    response_model=list[NivelDificultadResponse],
    summary="Listar niveles de dificultad"
)
def listar_niveles_dificultad(db: Session = Depends(get_db)):
    return Solicitud_PublicacionCRUD.obtener_niveles_dificultad(db)