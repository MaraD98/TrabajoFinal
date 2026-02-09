from sqlalchemy import Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.sql import func
from app.models.base import Base
from sqlalchemy.orm import relationship


# Modelos Auth de la base de datos

class Rol(Base):
    __tablename__ = "rol"
    id_rol = Column(Integer, primary_key=True, index=True)
    nombre_rol = Column(String(100), unique=True, nullable=False)

class Usuario(Base):
    __tablename__ = "usuario"
    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre_y_apellido = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    contrasenia = Column(String(200), nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    id_rol = Column(Integer, ForeignKey("rol.id_rol"), nullable=False)

class Contacto(Base):
    __tablename__ = "contacto"
    id_contacto = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    telefono = Column(String(50))
    direccion = Column(String(255))
    enlace_redes = Column(String(255))
    otro_contacto = Column(String(255))


    
