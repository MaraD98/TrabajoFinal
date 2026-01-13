from sqlalchemy.orm import Session
from app.models.registro_models import Evento, TipoEvento, NivelDificultad 
from datetime import date

# Definimos la constante "PRO" para no usar números mágicos
ID_ESTADO_PUBLICADO = 3

def get_eventos_calendario(db: Session, fecha_inicio: date, fecha_fin: date):
    """
    Busca eventos publicados dentro del rango de fechas.
    Hace JOIN con Tipo y Dificultad para traer los nombres en vez de los IDs.
    """
    
    return db.query(
        # 1. Seleccionamos campos específicos de la tabla Evento
        Evento.id_evento,
        Evento.nombre_evento,
        Evento.fecha_evento,
        Evento.ubicacion,
        
        Evento.cupo_maximo,          # <--- FALTABA ESTE
        Evento.costo_participacion,  # <--- FALTABA ESTE
        # 2. LA MAGIA: Traemos el nombre de la otra tabla y lo RENOMBRAMOS
        # Usamos .label() para que coincida EXACTO con tu Schema ('nombre_tipo')
        TipoEvento.nombre.label("nombre_tipo"),           
        NivelDificultad.nombre.label("nivel_dificultad") 
    )\
    .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)\
    .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)\
    .filter(
        Evento.fecha_evento >= fecha_inicio,
        Evento.fecha_evento <= fecha_fin,
        Evento.id_estado == ID_ESTADO_PUBLICADO  # Solo los "Publicados" (3)
    ).all()