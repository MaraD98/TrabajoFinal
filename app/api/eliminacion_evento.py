from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.database import get_db
from app.services.eliminacion_services import EliminacionService
from app.api.admin_eventos import get_current_user  
from app.models.auth_models import Usuario


router = APIRouter(prefix="/eliminacion", tags=["Eliminación de Eventos"])


# ============================================================================
# SCHEMAS
# ============================================================================

class MotivoRequest(BaseModel):
    motivo: str


# ============================================================================
# USUARIO COMÚN - CANCELAR/SOLICITAR BAJA
# ============================================================================

@router.post("/cancelar/{evento_id}")
def cancelar_evento_propio(
    evento_id: int,
    request: MotivoRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Usuario cancela su propio evento (crea solicitud de baja).
    Evento permanece en estado 3 hasta que admin apruebe.
    """
    return EliminacionService.cancelar_evento_propio(
        db=db,
        evento_id=evento_id,
        motivo=request.motivo,
        usuario_actual=usuario_actual
    )


@router.post("/solicitar-baja/{evento_id}")
def solicitar_baja_evento(
    evento_id: int,
    request: MotivoRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Organizador solicita baja de su evento.
    Evento permanece en estado 3 hasta que admin apruebe.
    """
    return EliminacionService.solicitar_baja_evento(
        db=db,
        evento_id=evento_id,
        motivo=request.motivo,
        usuario_actual=usuario_actual
    )


# ============================================================================
# ADMIN - GESTIÓN DE SOLICITUDES
# ============================================================================

@router.get("/admin/bajas-pendientes")
def obtener_bajas_pendientes(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Obtiene todas las solicitudes de baja pendientes.
    Requiere rol admin (1) o supervisor (2).
    """
    if usuario_actual.id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    
    return EliminacionService.obtener_bajas_pendientes(db)


@router.patch("/admin/aprobar-baja/{id_evento}")
def aprobar_baja(
    id_evento: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Admin aprueba solicitud de baja (estado 3 → 5).
    """
    if usuario_actual.id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    
    return EliminacionService.aprobar_baja(
        db=db,
        id_evento=id_evento,
        id_admin=usuario_actual.id_usuario
    )


@router.patch("/admin/rechazar-baja/{id_evento}")
def rechazar_baja(
    id_evento: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Admin rechaza solicitud de baja (elimina registro, evento sigue en 3).
    """
    if usuario_actual.id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    
    return EliminacionService.rechazar_baja(db=db, id_evento=id_evento)


# ============================================================================
# ADMIN - ELIMINACIÓN DIRECTA
# ============================================================================

@router.post("/admin/eliminar/{evento_id}")
def admin_eliminar_evento(
    evento_id: int,
    request: MotivoRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Admin elimina evento directamente (Soft Delete - estado 5).
    """
    if usuario_actual.id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    
    return EliminacionService.eliminar_evento_admin(
        db=db,
        evento_id=evento_id,
        motivo=request.motivo,
        usuario_actual=usuario_actual
    )


# ============================================================================
# ADMIN - EVENTOS FINALIZADOS
# ============================================================================

@router.get("/admin/eventos-finalizados")
def obtener_eventos_finalizados(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Obtiene eventos cuya fecha ya pasó (para depurar).
    """
    if usuario_actual.id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    
    return EliminacionService.obtener_eventos_finalizados(db)


# ============================================================================
# ADMIN - RESTAURAR EVENTO
# ============================================================================

@router.patch("/admin/restaurar/{id_evento}")
def restaurar_evento(
    id_evento: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Restaura un evento cancelado (estado 5 → 3).
    """
    if usuario_actual.id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    
    return EliminacionService.restaurar_evento_cancelado(
        db=db,
        id_evento=id_evento,
        id_admin=usuario_actual.id_usuario
    )


# ============================================================================
# ADMIN - DEPURAR EVENTO (Hard Delete)
# ============================================================================

@router.delete("/admin/depurar/{id_evento}")
def depurar_evento(
    id_evento: int,
    request: MotivoRequest,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Depura un evento (Hard Delete Lógico - estado 7).
    """
    if usuario_actual.id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    
    return EliminacionService.depurar_evento(
        db=db,
        evento_id=id_evento,
        motivo=request.motivo,
        id_admin=usuario_actual.id_usuario
    )


# ============================================================================
# ADMIN - HISTORIAL
# ============================================================================

@router.get("/admin/historial")
def obtener_historial(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Obtiene historial de eliminaciones (estados 5 y 7).
    """
    if usuario_actual.id_rol not in [1, 2]:
        raise HTTPException(status_code=403, detail="Requiere permisos de administrador")
    
    return EliminacionService.obtener_historial(db)

@router.get("/mis-solicitudes")
def obtener_mis_solicitudes_eliminacion(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_current_user)
):
    """
    Obtiene las solicitudes de eliminación pendientes del usuario actual.
    Retorna eventos que están en estado 3 (Publicado) pero tienen una solicitud de baja pendiente.
    """
    return EliminacionService.obtener_mis_solicitudes_eliminacion(
        db=db,
        id_usuario=usuario_actual.id_usuario
    )