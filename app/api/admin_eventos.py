# app/api/admin_eventos.py
from fastapi import APIRouter, Depends, Query, status, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.database import get_db
from app.core.security import security
from app.services.auth_services import AuthService
from app.models.auth_models import Usuario
from app.models.registro_models import Evento, EliminacionEvento

# Schemas
from app.schemas.evento_solicitud_schema import (
    SolicitudPublicacionResponse, 
    RevisionSolicitud, 
    SolicitudesPaginadas,
    SolicitudEliminacionResponse
)
# Service y CRUD
from app.services.evento_solicitud_service import EventoSolicitudService
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD

# Router unificado
router = APIRouter(prefix="/admin", tags=["Administración de Eventos"])

# --- SEGURIDAD ---
def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Usuario:
    return AuthService.get_current_usuario_from_token(db, credentials.credentials)

def require_admin(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    if current_user.id_rol not in [1, 2]:  
        raise HTTPException(status_code=403, detail="Acceso restringido a Administradores")
    return current_user

# =========================================================
# SECCIÓN 1: GESTIÓN DE ALTAS (SOLICITUDES DE PUBLICACIÓN)
# =========================================================

@router.get("/solicitudes", response_model=SolicitudesPaginadas, summary="Listar todas las solicitudes (Filtros)")
def listar_todas(
    id_estado: int = Query(None, description="1=Pendiente, 2=Aprobada..."),
    pagina: int = 1,
    por_pagina: int = 20,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)
):
    skip = (pagina - 1) * por_pagina
    res = Solicitud_PublicacionCRUD.listar_solicitudes(db, admin, id_estado, skip, por_pagina)
    return SolicitudesPaginadas(
        total=res["total"], solicitudes=res["solicitudes"], pagina=pagina, por_pagina=por_pagina
    )

@router.get("/solicitudes/pendientes", response_model=list[SolicitudPublicacionResponse], summary="Ver Altas Pendientes")
def ver_pendientes_alta(db: Session = Depends(get_db), admin: Usuario = Depends(require_admin)):
    """Muestra solicitudes de nuevos eventos esperando aprobación."""
    return Solicitud_PublicacionCRUD.obtener_solicitudes_pendientes(db)

@router.patch("/solicitudes/{id_solicitud}/revisar", summary="Aprobar/Rechazar Alta")
def revisar_alta(
    id_solicitud: int,
    revision: RevisionSolicitud,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)
):
    """
    - Si Estado=3 (Aprobar): Publica el evento visible para todos.
    - Si Estado=4 (Rechazar): Devuelve a borrador o marca rechazado.
    """
    if revision.id_estado_solicitud == 3:
        return EventoSolicitudService.aprobar_solicitud_y_publicar(db, id_solicitud, admin.id_usuario)
    else:
        return Solicitud_PublicacionCRUD.actualizar_estado_solicitud(db, id_solicitud, revision)

# =========================================================
# SECCIÓN 2: GESTIÓN DE BAJAS (SOLICITUDES DE ELIMINACIÓN)
# =========================================================

@router.get("/bajas/pendientes", response_model=list[SolicitudEliminacionResponse], summary="Ver Bajas Pendientes")
def ver_pendientes_baja(db: Session = Depends(get_db), admin: Usuario = Depends(require_admin)):
    """
    Muestra organizadores que piden borrar un evento YA publicado.
    Solo muestra eventos en estado 6 (Pendiente de Eliminación).
    """
    return EventoSolicitudService.obtener_bajas_pendientes_formateadas(db)

@router.patch("/bajas/{id_eliminacion}/aprobar", summary="Confirmar Baja (Soft Delete)")
def aprobar_baja(id_eliminacion: int, db: Session = Depends(get_db), admin: Usuario = Depends(require_admin)):
    """
    El admin acepta la baja. El evento pasa a estado 5 'Cancelado' (Soft Delete).
    No se borra de la BD, pero no sale en la app.
    """
    return EventoSolicitudService.aprobar_eliminacion(db, id_eliminacion)

@router.patch("/eventos/{id_evento}/aprobar-baja", summary="Aprobar Baja por ID de Evento")
def aprobar_baja_por_evento(
    id_evento: int, 
    db: Session = Depends(get_db), 
    admin: Usuario = Depends(require_admin)
):
    """
    ✅ ENDPOINT ESPECIAL: Aprueba la baja de un evento usando su ID directamente.
    
    Útil cuando el evento está en estado 6 pero no tiene registro en eliminacion_evento.
    Crea automáticamente el registro de auditoría antes de cancelar.
    """
    return EventoSolicitudService.aprobar_eliminacion_por_evento(db, id_evento, admin.id_usuario)

@router.patch("/bajas/{id_eliminacion}/rechazar", summary="Rechazar Baja")
def rechazar_baja(id_eliminacion: int, db: Session = Depends(get_db), admin: Usuario = Depends(require_admin)):
    """
    El admin dice NO. El evento sigue Publicado (Estado 3) y la solicitud de baja se descarta.
    """
    return EventoSolicitudService.rechazar_eliminacion(db, id_eliminacion)

@router.patch("/eventos/{id_evento}/rechazar-baja", summary="Rechazar Baja por ID de Evento")
def rechazar_baja_por_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(require_admin)
):
    """
    ✅ ENDPOINT ESPECIAL: Rechaza la baja usando el ID del evento directamente.
    
    Para eventos en estado 6 sin registro en eliminacion_evento.
    Los restaura a estado 3 (Publicado).
    """
    return EventoSolicitudService.rechazar_eliminacion_por_evento(db, id_evento)

# =========================================================
# SECCIÓN 3: MANTENIMIENTO (DEPURACIÓN DEFINITIVA)
# =========================================================

@router.delete("/eventos/{id_evento}/depurar", summary="Depuración Definitiva (Hard Delete)")
def depurar_evento(
    id_evento: int, 
    motivo: str = Query(..., description="Razón técnica de la depuración"),
    db: Session = Depends(get_db), 
    admin: Usuario = Depends(require_admin)
):
    """
    ¡PELIGRO! Esto saca el evento de circulación definitivamente (Estado 7 o Delete Físico).
    Usar para contenido inapropiado o limpieza de base de datos.
    """
    return EventoSolicitudService.depurar_evento_definitivo(db, id_evento, motivo)

# =========================================================
# ✅ HISTORIAL COMPLETO DE ELIMINACIONES (CORREGIDO)
# =========================================================
@router.get("/historial-eliminaciones", summary="Historial Completo de Eliminaciones")
def obtener_historial_eliminaciones(
    db: Session = Depends(get_db), 
    admin: Usuario = Depends(require_admin)
):
    """
    ✅ CORREGIDO: Devuelve TODAS las eliminaciones para auditoría.
    
    Muestra eventos que tienen registro en eliminacion_evento Y están en:
    - Estado 5 (Cancelado - Soft Delete) ← Principal
    - Estado 7 (Depurado - Hard Delete Lógico)
    
    Los eventos en estado 5 son los que fueron:
    1. Cancelados por el organizador (HU 4.1)
    2. Aprobados para baja por el admin (HU 4.2)
    """
    eliminaciones = (
        db.query(EliminacionEvento, Evento, Usuario)
        .join(Evento, EliminacionEvento.id_evento == Evento.id_evento)  # ⬅️ INNER JOIN
        .outerjoin(Usuario, EliminacionEvento.id_usuario == Usuario.id_usuario)
        .filter(Evento.id_estado.in_([5, 7]))  # ⬅️ FILTRAR SOLO ESTADOS 5 Y 7
        .order_by(desc(EliminacionEvento.fecha_eliminacion))
        .all()
    )
    
    resultado = []
    for elim, evento, usuario in eliminaciones:
        # Determinar el tipo de eliminación según el estado
        if evento.id_estado == 5:
            estado_texto = "Cancelado (Soft Delete)"
            tipo_elim = "soft_delete"
        elif evento.id_estado == 7:
            estado_texto = "Depurado (Hard Delete Lógico)"
            tipo_elim = "hard_delete"
        else:
            estado_texto = f"Estado {evento.id_estado}"
            tipo_elim = "otro"
            
        resultado.append({
            "id_evento": elim.id_evento,
            "nombre_evento": evento.nombre_evento,
            "fecha_eliminacion": elim.fecha_eliminacion.strftime("%d/%m/%Y %H:%M:%S"),
            "motivo": elim.motivo_eliminacion,
            "estado": estado_texto,
            "eliminado_por": usuario.email if usuario else "Sistema",
            "tipo_eliminacion": tipo_elim
        })
    
    return resultado