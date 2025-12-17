from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import timedelta
from app.db.crud.auth_crud import UsuarioCRUD
from app.core.security import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, decode_access_token
from app.schemas.auth_schema import UsuarioCreate, LoginRequest

class AuthService:
    @staticmethod
    def register_usuario(db: Session, usuario_data: UsuarioCreate):
        # Verificar si el email ya existe
        existing_email = UsuarioCRUD.get_usuario_by_email(db, usuario_data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado"
            )
        
        # Crear usuario
        new_usuario = UsuarioCRUD.create_usuario(
            db=db,
            nombre_y_apellido=usuario_data.nombre_y_apellido,
            email=usuario_data.email,
            contrasenia=usuario_data.contrasenia
        )
        return new_usuario
    
    @staticmethod
    def authenticate_usuario(db: Session, login_data: LoginRequest):
        # Buscar usuario por email
        usuario = UsuarioCRUD.get_usuario_by_email(db, login_data.email)
        
        if not usuario or not verify_password(login_data.contrasenia, usuario.contrasenia):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email o contraseña incorrectos",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Crear token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": usuario.email},  # usamos email como identificador
            expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    
    @staticmethod
    def get_current_usuario_from_token(db: Session, token: str):
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar las credenciales",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
        payload = decode_access_token(token)
        if payload is None:
            raise credentials_exception
        
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        
        usuario = UsuarioCRUD.get_usuario_by_email(db, email)
        if usuario is None:
            raise credentials_exception
        
        return usuario
