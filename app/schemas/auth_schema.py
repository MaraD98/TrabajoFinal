from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime
from typing import Optional
import re

# ============ Registro ============
class UsuarioCreate(BaseModel):
    nombre_y_apellido: str = Field(..., min_length=5, max_length=255)
    email: EmailStr
    contrasenia: str = Field(..., min_length=6, max_length=50)

    @validator("contrasenia")
    def validar_contrasenia(cls, v):
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula")
        if not re.search(r"\d", v):
            raise ValueError("La contraseña debe contener al menos un número")
        return v 

# ============ Actualización (ADAPTADO A TU BD) ============
class UsuarioUpdate(BaseModel):
    nombre_y_apellido: Optional[str] = None
    email: Optional[EmailStr] = None
    # Estos campos irán a la tabla Contacto, pero el front los manda juntos
    telefono: Optional[str] = None
    direccion: Optional[str] = None 
    enlace_redes: Optional[str] = None

    class Config:
        from_attributes = True

# ============ Respuesta al Cliente ============
class UsuarioResponse(BaseModel):
    id_usuario: int
    nombre_y_apellido: str
    email: str
    fecha_creacion: datetime
    id_rol: int
    
    # Campos opcionales que vendrán de la tabla Contacto (si existen)
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    enlace_redes: Optional[str] = None

    class Config:
        from_attributes = True

# ============ Login y Tokens (Igual que antes) ============
class LoginRequest(BaseModel):
    email: EmailStr
    contrasenia: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None