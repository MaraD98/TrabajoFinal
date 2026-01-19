# app/api/api.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.db.database import get_db
from app.core.security import security
from app.schemas.auth_schema import UsuarioCreate, UsuarioResponse, LoginRequest, Token
from app.services.auth_services import AuthService
from fastapi.security import OAuth2PasswordRequestForm

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
@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    
    # 👇 AQUÍ ESTÁ EL CAMBIO
    # Mapeamos lo que trae el formulario (ingles) a lo que espera tu modelo (español)
    login_data = LoginRequest(
        email=form_data.username,        # map username -> email
        contrasenia=form_data.password   # map password -> contrasenia  <-- ESTO FALTABA
    )
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

