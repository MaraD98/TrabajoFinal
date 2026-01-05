from sqlalchemy import Column, Integer, String, Date, DECIMAL, DateTime, ForeignKey, func, Text
from app.models.base import Base

# --- MODELOS AUXILIARES ---
# Necesitamos definirlos para que las ForeignKey de abajo tengan a dónde apuntar.

class TipoEvento(Base):
    __tablename__ = "tipoevento"
    id_tipo = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)

class NivelDificultad(Base):
    __tablename__ = "niveldificultad"
    id_dificultad = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)

class EstadoEvento(Base):
    __tablename__ = "estadoevento"
    id_estado = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), unique=True, nullable=False)

# --- MODELO PRINCIPAL ---

class Evento(Base):
    __tablename__ = "evento"

    id_evento = Column(Integer, primary_key=True, index=True)
    
    # 1. Relación con Usuario (Igual que contacto se relaciona con usuario en el código de ella)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)

    nombre_evento = Column(String(255), nullable=False, index=True)
    fecha_evento = Column(Date, nullable=False)
    ubicacion = Column(String(255), nullable=False)
    
    # 2. Relaciones con las tablas de arriba (Solo ForeignKey)
    id_tipo = Column(Integer, ForeignKey("tipoevento.id_tipo"), nullable=False)
    id_dificultad = Column(Integer, ForeignKey("niveldificultad.id_dificultad"), nullable=False)
    
    descripcion = Column(String(500), nullable=True)
    costo_participacion = Column(DECIMAL(10, 2), nullable=False)    
    
    
    id_estado = Column(Integer, ForeignKey("estadoevento.id_estado"), nullable=False, default=1)

    # Fecha automática
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    
    # Coordenadas para mapa
    lat = Column(DECIMAL(9, 6), nullable=True)
    lng = Column(DECIMAL(9, 6), nullable=True)
   
    # ---(HU 1.3 y 1.4) ---
class EventoMultimedia(Base):
    __tablename__ = "evento_multimedia"

    id_multimedia = Column(Integer, primary_key=True, index=True)
    id_evento = Column(Integer, ForeignKey("evento.id_evento"), nullable=False)
    url_archivo = Column(String, nullable=False) # Aquí va la ruta de la foto 
    tipo_archivo = Column(String(50), nullable=False) # 'IMAGEN' 
    fecha_subida = Column(DateTime(timezone=True), server_default=func.now())