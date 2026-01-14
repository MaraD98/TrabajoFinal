from datetime import date
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

# Tus modelos
from app.models.registro_models import Evento 
from app.models.editar_models import HistorialEdicionEvento, DetalleCambioEvento

class EditarEventoService:

    @staticmethod
    # ¡OJO! Agregué el parámetro id_rol_actual aquí
    def actualizar_evento(db: Session, id_evento: int, evento_update, id_usuario_actual: int, id_rol_actual: int):
        """
        Realiza la edición de un evento con validación de roles:
        - Admin (1) o Supervisor (2): Pueden editar SIEMPRE.
        - Dueño: Puede editar SOLO si el evento NO está Publicado (3).
        """
        
        # 1. BUSCAR EL EVENTO
        evento_db = db.query(Evento).filter(Evento.id_evento == id_evento).first()

        if not evento_db:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"El evento con id {id_evento} no existe."
            )

        # === 2. NUEVA LÓGICA DE VALIDACIÓN DE PERMISOS ===
        
        # Definimos constantes según tu BD
        ROL_ADMIN = 1
        ROL_SUPERVISOR = 2
        ESTADO_PUBLICADO = 3
        
        es_autoridad = id_rol_actual in [ROL_ADMIN, ROL_SUPERVISOR]
        es_dueno = evento_db.id_usuario == id_usuario_actual
        esta_publicado = evento_db.id_estado == ESTADO_PUBLICADO

        # Caso A: No es ni autoridad ni el dueño -> FUERA
        if not es_autoridad and not es_dueno:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="No tienes permisos para editar este evento."
            )

        # Caso B: Es el dueño (pero no admin), y el evento ya está publicado -> PROHIBIDO
        if es_dueno and not es_autoridad and esta_publicado:
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="El evento ya está PUBLICADO. Solo un Administrador o Supervisor puede modificarlo."
            )

        # Si pasa estas validaciones, significa que:
        # 1. O es Autoridad (puede hacer lo que quiera).
        # 2. O es Dueño y el evento sigue en Borrador/Pendiente.
        
        # =================================================

        # 3. VALIDAR REGLA DE NEGOCIO (No editar eventos pasados)
        # Nota: ¿Los admins deberían poder corregir eventos pasados? 
        # Si NO quieres que los admins editen eventos pasados, deja esto tal cual.
        # Si quieres que los admins SÍ puedan, agrega "and not es_autoridad" en el if.
        if evento_db.fecha_evento < date.today():
             raise HTTPException(
                 status_code=status.HTTP_400_BAD_REQUEST, 
                 detail="No se permite editar un evento cuya fecha ya ha pasado."
             )

        # 4. DETECCIÓN DE CAMBIOS (Core de la Auditoría)
        datos_nuevos = evento_update.model_dump(exclude_unset=True) 
        cambios_detectados = []

        for campo, valor_nuevo in datos_nuevos.items():
            valor_anterior = getattr(evento_db, campo)
            
            str_anterior = str(valor_anterior) if valor_anterior is not None else ""
            str_nuevo = str(valor_nuevo) if valor_nuevo is not None else ""

            if str_anterior != str_nuevo:
                cambios_detectados.append({
                    "campo": campo,
                    "anterior": str_anterior,
                    "nuevo": str_nuevo,
                    "valor_real": valor_nuevo 
                })

        # 5. TRANSACCIÓN DB
        if cambios_detectados:
            try:
                # A. Crear la CABECERA (Historial)
                # Aquí guardamos el id_usuario_actual. Si edita un Admin, queda registrado que FUE EL ADMIN.
                nuevo_historial = HistorialEdicionEvento(
                    id_evento=id_evento,
                    id_usuario=id_usuario_actual
                )
                db.add(nuevo_historial)
                db.flush() 

                # B. Crear los DETALLES
                for cambio in cambios_detectados:
                    detalle = DetalleCambioEvento(
                        id_historial_edicion=nuevo_historial.id_historial_edicion,
                        campo_modificado=cambio["campo"],
                        valor_anterior=cambio["anterior"],
                        valor_nuevo=cambio["nuevo"]
                    )
                    db.add(detalle)
                    
                    # C. ACTUALIZAR EL EVENTO REAL
                    setattr(evento_db, cambio["campo"], cambio["valor_real"])

                db.commit()
                db.refresh(evento_db)
            
            except Exception as e:
                db.rollback() 
                print(f"Error al guardar historial: {e}") 
                raise HTTPException(status_code=500, detail="Error interno al procesar la edición.")
        
        return evento_db