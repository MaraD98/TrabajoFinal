from typing import List  
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.auth_models import Usuario
from app.schemas.perfil_schema import PerfilResponse, PerfilUpdate, CambioPassword, MiInscripcionResponse
from app.services.perfil_service import PerfilService
from app.core.deps import get_current_user

router = APIRouter(tags=["Perfil"])
service = PerfilService()

@router.get("/me", response_model=PerfilResponse)
def ver_mi_perfil(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Obtiene los datos del perfil del usuario logueado.
    """
    # Pasamos el ID del usuario que viene del token
    return service.obtener_perfil(db, current_user.id_usuario)

@router.put("/me", response_model=PerfilResponse)
def editar_mi_perfil(
    datos: PerfilUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Edita datos personales (nombre) o de contacto.
    """
    return service.actualizar_datos(db, current_user.id_usuario, datos)

@router.post("/me/password")
def cambiar_contrasenia(
    datos: CambioPassword,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Cambio de contraseña. Requiere la pass actual y la nueva.
    """
    return service.cambiar_password(db, current_user.id_usuario, datos)

@router.delete("/me", status_code=status.HTTP_200_OK)
def eliminar_mi_cuenta(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Elimina la cuenta del usuario y sus datos de contacto permanentemente.
    """
    return service.eliminar_cuenta(db, current_user.id_usuario)

# -----------------------------------------------------------
# NUEVO ENDPOINT: Pestaña "Inscriptos"
# -----------------------------------------------------------
@router.get("/me/inscripciones", response_model=List[MiInscripcionResponse])
def ver_mis_inscripciones(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Devuelve la lista de eventos donde el usuario se anotó.
    Se usa para la pestaña 'Mis Eventos' -> 'Inscriptos'.
    """
    return service.obtener_mis_inscripciones(db, current_user.id_usuario)