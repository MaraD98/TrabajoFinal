# app/api/api.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.database import get_db
from app.core.security import security
from app.schemas.auth_schema import UsuarioCreate, UsuarioResponse, LoginRequest, Token
from app.services.auth_services import AuthService

router = APIRouter(prefix="/auth", tags=["Autenticación"])

# ============ Registro de usuario ============
@router.post(
    "/register",
    response_model=UsuarioResponse,
    summary="Registro de usuario",
    description="Endpoint para registrar un nuevo usuario en el sistema"
)
def register(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):
    new_usuario = AuthService.register_usuario(db, usuario_data)
    return new_usuario

# ============ Login ============
@router.post(
    "/login",
    response_model=Token,
    summary="Inicio de sesión",
    description="Permite a un usuario autenticarse con su correo y contraseña. Devuelve un token JWT válido para acceder a los endpoints protegidos."
)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    token = AuthService.authenticate_usuario(db, login_data)
    return token

# ============ Obtener usuario actual ============
@router.get(
    "/me",
    response_model=UsuarioResponse,
    summary="Perfil del usuario",
    description="Devuelve la información del usuario autenticado a partir del token JWT enviado en la cabecera Authorization."
)
def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    usuario = AuthService.get_current_usuario_from_token(db, credentials.credentials)
    return usuario

