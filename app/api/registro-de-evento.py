from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

# Importaciones de Base de Datos
from app.db.database import get_db

# Importaciones de TU lógica (Schemas y Services)
from app.schemas.registro_schema import EventoCreate, EventoResponse
from app.services import registro_service

# Importaciones de la seguridad de TU COMPAÑERA
from app.core.security import security  # El esquema de seguridad (Bearer)
from app.services.auth_services import AuthService # Su servicio de autenticación

router = APIRouter()

# --- DEPENDENCIA DE SEGURIDAD ---
# Esta función actúa como el "Portero". Usa la lógica de tu compañera.
def obtener_usuario_actual(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Recibe el token, llama al servicio de autenticación y devuelve al usuario.
    Si el token es inválido, AuthService lanzará el error.
    """
    return AuthService.get_current_usuario_from_token(db, credentials.credentials)

# --- TU ENDPOINT ---
@router.post("/eventos/", response_model=EventoResponse, status_code=status.HTTP_201_CREATED)
def registrar_evento(
    evento: EventoCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(obtener_usuario_actual) # <--- AQUÍ PROTEGEMOS LA RUTA
):
    """
    HU 1.1 y 1.2: Registro de evento.
    - Requiere Token JWT en el Header (Authorization: Bearer <token>)
    - Valida datos obligatorios y fecha futura.
    """
    
    # Si llega aquí, el usuario está autenticado.
    # Podrías usar 'current_user.id' si necesitas guardar quién creó el evento.
    
    nuevo_evento = registro_service.crear_nuevo_evento(db=db, evento_in=evento)
    
    return nuevo_evento