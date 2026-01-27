from sqlalchemy.orm import Session
from app.models.auth_models import Usuario, Contacto
from app.schemas.perfil_schema import PerfilUpdate
from app.models.inscripcion_models import ReservaEvento
from app.models.registro_models import Evento


def get_full_profile(db: Session, id_usuario: int):
    """
    Busca al usuario y sus datos de contacto.
    Retorna una tupla o estructura que el Service pueda unificar.
    """
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    contacto = db.query(Contacto).filter(Contacto.id_usuario == id_usuario).first()
    
    if not usuario:
        return None
        
    return usuario, contacto

def update_profile(db: Session, id_usuario: int, datos: PerfilUpdate):
    """
    Actualiza datos en tabla Usuario y/o tabla Contacto.
    Si el contacto no existe, lo crea (Upsert lógico).
    """
    usuario = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    contacto = db.query(Contacto).filter(Contacto.id_usuario == id_usuario).first()

    if not usuario:
        return None

    # Actualizamos campos de Usuario
    if datos.nombre_y_apellido is not None:
        usuario.nombre_y_apellido = datos.nombre_y_apellido
    if datos.email is not None:
        usuario.email = datos.email

    # Actualizamos campos de Contacto
    tiene_datos_contacto = any([
        datos.telefono is not None,
        datos.direccion is not None,
        datos.enlace_redes is not None,
        datos.otro_contacto is not None
    ])

    if tiene_datos_contacto:
        if not contacto:
            contacto = Contacto(id_usuario=id_usuario)
            db.add(contacto)
        
        if datos.telefono is not None: contacto.telefono = datos.telefono
        if datos.direccion is not None: contacto.direccion = datos.direccion
        if datos.enlace_redes is not None: contacto.enlace_redes = datos.enlace_redes
        if datos.otro_contacto is not None: contacto.otro_contacto = datos.otro_contacto

    db.commit()
    db.refresh(usuario)
    if contacto:
        db.refresh(contacto)
    
    return usuario, contacto

def delete_user_account(db: Session, id_usuario: int):
    """
    Elimina primero el contacto (si existe) y luego al usuario.
    """
    db.query(Contacto).filter(Contacto.id_usuario == id_usuario).delete()
    filas_borradas = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).delete()
    
    db.commit()
    return filas_borradas > 0

# =========================================================
# NUEVA FUNCIÓN: Obtener reservas del usuario (JOIN Evento)
# =========================================================
def get_mis_inscripciones_db(db: Session, id_usuario: int):
    """
    Trae las reservas de un usuario y las cruza (JOIN) con la tabla Evento
    para obtener el nombre, fecha, ubicación, etc.
    """
    return db.query(ReservaEvento, Evento).join(
        Evento, ReservaEvento.id_evento == Evento.id_evento
    ).filter(
        ReservaEvento.id_usuario == id_usuario
    ).all()