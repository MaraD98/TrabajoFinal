from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
from typing import Optional
import re

class UsuarioCreate(BaseModel):
    nombre_y_apellido: str = Field(..., min_length=5, max_length=255)
    email: EmailStr
    contrasenia: str = Field(..., min_length=6, max_length=50)

    @validator("contrasenia")
    def validar_contrasenia(cls, v):
        # Debe tener al menos una mayúscula y un número
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v 

# Para devolver un usuario
class UsuarioResponse(BaseModel):
    id_usuario: int
    nombre_y_apellido: str
    email: str
    fecha_creacion: datetime
    id_rol: int

    class Config:
        from_attributes = True

# Para login
class LoginRequest(BaseModel):
    email: EmailStr
    contrasenia: str

# Para tokens JWT
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None