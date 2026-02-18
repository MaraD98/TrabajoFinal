from pydantic import BaseModel, EmailStr, Field, field_serializer
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

# ---------------------------------------------------------
# 1. ACTUALIZACIÓN DE DATOS (Info Personal y Contacto)
# ---------------------------------------------------------
class PerfilUpdate(BaseModel):
    """
    Campos opcionales. El usuario puede enviar solo lo que quiere cambiar.
    Si envía null o no envía el campo, no se toca en la BD.
    """
    nombre_y_apellido: Optional[str] = Field(None, min_length=3, max_length=255)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(None, max_length=50)
    direccion: Optional[str] = Field(None, max_length=255)
    enlace_redes: Optional[str] = Field(None, max_length=255)
    otro_contacto: Optional[str] = Field(None, max_length=255)

    class Config:
        from_attributes = True

# ---------------------------------------------------------
# 2. CAMBIO DE CONTRASEÑA (Separado por seguridad)
# ---------------------------------------------------------
class CambioPassword(BaseModel):
    password_actual: str = Field(..., description="Necesaria para autorizar el cambio")
    password_nueva: str = Field(..., min_length=6, description="Nueva contraseña (mínimo 6 caracteres)")

# ---------------------------------------------------------
# 3. RESPUESTA AL FRONTEND (Lectura)
# ---------------------------------------------------------
class PerfilResponse(BaseModel):
    """
    Devuelve los datos unificados de Usuario y Contacto.
    Ideal para rellenar el formulario de 'Mi Perfil' al entrar.
    """
    id_usuario: int
    nombre_y_apellido: str
    email: EmailStr
    # Datos de contacto (pueden venir vacíos si el usuario nunca los cargó)
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    enlace_redes: Optional[str] = None
    otro_contacto: Optional[str] = None
    
    # Opcional: Si el front necesita saber el rol para mostrar/ocultar menús
    # id_rol: int 

    class Config:
        from_attributes = True
        
# ---------------------------------------------------------
# 4. LISTADO DE MIS INSCRIPCIONES (Para la pestaña "Inscriptos")
# ---------------------------------------------------------
class MiInscripcionResponse(BaseModel):
    # Datos de la reserva
    id_reserva: int
    fecha_reserva: datetime
    estado_reserva: str      # Ej: "Pendiente", "Confirmado"

    # Datos del Evento
    id_evento: int
    nombre_evento: str
    ubicacion: str
    fecha_evento: date
    hora_evento: Optional[str] = None # Opcional si lo tienes
    costo: Decimal

# 👇 AGREGAR ESTO — convierte la fecha al mostrarla
    @field_serializer('fecha_evento')
    def serializar_fecha(self, valor: date) -> str:
        if valor is None:
            return None
        return valor.strftime('%d-%m-%Y')
    
    class Config:
        from_attributes = True