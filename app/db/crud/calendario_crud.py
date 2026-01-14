from sqlalchemy.orm import Session
from app.models.registro_models import Evento, TipoEvento, NivelDificultad 
from datetime import date

# Definimos la constante "PRO" para no usar números mágicos
ID_ESTADO_PUBLICADO = 3

def get_eventos_calendario(db: Session, fecha_inicio: date, fecha_fin: date):
    """
    Busca eventos publicados dentro del rango de fechas.
    Trae TODA la info: IDs, nombres, descripción, costos y coordenadas.
    """
    
    return db.query(
        # --- 0 al 3: Datos básicos del Evento ---
        Evento.id_evento,          # row[0]
        Evento.nombre_evento,      # row[1]
        Evento.fecha_evento,       # row[2]
        Evento.ubicacion,          # row[3]
        
        # --- 4 y 5: Datos del TIPO ---
        TipoEvento.id_tipo,                     # row[4] (Nuevo: ID)
        TipoEvento.nombre.label("nombre_tipo"), # row[5] (Nombre)
        
        # --- 6 y 7: Datos de la DIFICULTAD ---
        NivelDificultad.id_dificultad,                    # row[6] (Nuevo: ID)
        NivelDificultad.nombre.label("nombre_dificultad"),# row[7] (Nombre)

        # --- 8, 9, 10: Detalles extra ---
        Evento.descripcion,          # row[8]
        Evento.costo_participacion,  # row[9]
        Evento.cupo_maximo,          # row[10]

        # --- 11 y 12: Coordenadas ---
        Evento.lat,                  # row[11]
        Evento.lng                   # row[12]
        
    )\
    .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)\
    .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)\
    .filter(
        Evento.fecha_evento >= fecha_inicio,
        Evento.fecha_evento <= fecha_fin,
        Evento.id_estado == ID_ESTADO_PUBLICADO  # Solo los "Publicados" (3)
    ).all()