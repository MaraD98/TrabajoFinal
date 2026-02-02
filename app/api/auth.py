# app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.security import OAuth2PasswordRequestForm

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


# ============================================
# 🔧 LOGIN - MODIFICADO PARA ADMIN DASHBOARD
# ============================================
# CAMBIO: Ahora devolvemos no solo el token, sino también la información del usuario
# Esto permite que el frontend guarde los datos del usuario en localStorage
# y pueda verificar permisos de administrador sin hacer requests adicionales.
#
# ANTES devolvíamos: { "access_token": "...", "token_type": "bearer" }
# AHORA devolvemos: { "access_token": "...", "token_type": "bearer", "user": {...} }
@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Endpoint de login que autentica al usuario y devuelve:
    1. Token de acceso (JWT)
    2. Información completa del usuario (para guardar en localStorage)
    """
    
    # Mapear los datos del formulario OAuth2 a nuestro modelo LoginRequest
    login_data = LoginRequest(
        email=form_data.username,      # OAuth2 usa 'username', nosotros usamos 'email'
        contrasenia=form_data.password  # OAuth2 usa 'password', nosotros 'contrasenia'
    )
    
    # 1. Autenticar y obtener el token (esto ya existía)
    token_data = AuthService.authenticate_usuario(db, login_data)
    
    # ========================================
    # ✅ NUEVO: Obtener información del usuario
    # ========================================
    # Usamos el token recién generado para obtener los datos completos del usuario
    # Esto incluye: id_usuario, nombre_y_apellido, email, id_rol, telefono, etc.
    usuario = AuthService.get_current_usuario_from_token(db, token_data["access_token"])
    
    # ========================================
    # ✅ NUEVO: Devolver token + datos del usuario
    # ========================================
    # Estructura de respuesta mejorada para el frontend:
    return {
        "access_token": token_data["access_token"],  # Token JWT para autenticación
        "token_type": token_data["token_type"],       # Tipo de token (bearer)
        
        # 🆕 NUEVO: Objeto con información del usuario
        "user": {
            "id_usuario": usuario.id_usuario,
            "nombre_y_apellido": usuario.nombre_y_apellido,
            "email": usuario.email,
            "id_rol": usuario.id_rol,  # 🔑 IMPORTANTE: Permite verificar si es admin (1 o 2)
            
            # Datos opcionales de contacto (pueden ser None)
            "telefono": getattr(usuario, 'telefono', None),
            "direccion": getattr(usuario, 'direccion', None),
            "enlace_redes": getattr(usuario, 'enlace_redes', None)
        }
    }
    # ========================================
    # FIN DE CAMBIOS
    # ========================================


# ============ Obtener usuario actual ============
# (Este endpoint NO fue modificado, sigue funcionando igual)
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