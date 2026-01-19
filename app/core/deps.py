# ARCHIVO: app/core/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
# Fíjate que aquí importamos cosas DESDE security.py, por eso no pueden estar en el mismo archivo
from app.core.security import decode_access_token 
from app.db.database import get_db
from app.models.auth_models import Usuario

# Ajusta el string "/auth/login" si tu ruta de login es distinta
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login") 

def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> Usuario:
    """
    Decodifica el token, extrae el email (o ID) y busca al usuario en la BD.
    """
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo validar las credenciales (Token inválido)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    email: str = payload.get("sub")
    
    if email is None:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token no contiene identidad",
        )

    user = db.query(Usuario).filter(Usuario.email == email).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )
        
    return user