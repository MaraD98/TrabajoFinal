from sqlalchemy.orm import Session
from app.db.crud.evento_solicitud_crud import Solicitud_PublicacionCRUD
from app.db.crud import registro_crud  # ⬅️ Asegúrate que esta línea esté
from app.schemas.evento_solicitud_schema import SolicitudPublicacionCreate
from app.services.evento_permisos_service import EventoPermisosService
from app.models.auth_models import Usuario
from app.models.registro_models import Evento, EliminacionEvento
from app.models.evento_solicitud_models import SolicitudPublicacion
from datetime import date, timedelta, datetime
from fastapi import HTTPException, status

class EventoSolicitudService:
    
    # --- VALIDACIONES BÁSICAS ---
    @staticmethod
    def validar_fecha_evento(fecha_evento: date) -> None:
        dias_minimos = 1
        fecha_minima = date.today() + timedelta(days=dias_minimos)
        if fecha_evento < fecha_minima:
            raise HTTPException(status_code=400, detail=f"La fecha debe ser al menos {dias_minimos} día en el futuro")

    @staticmethod
    def validar_tipo_y_dificultad(db: Session, id_tipo: int, id_dificultad: int) -> None:
        pass 

    @staticmethod
    def validar_usuario(db: Session, id_usuario: int) -> None:
        if not Solicitud_PublicacionCRUD.verificar_usuario_existe(db, id_usuario):
            raise HTTPException(status_code=404, detail=f"Usuario {id_usuario} no encontrado")

    # --- GESTIÓN DE ALTAS (USUARIO) ---
    @staticmethod
    def crear_solicitud(db: Session, solicitud: SolicitudPublicacionCreate, id_usuario: int):
        EventoSolicitudService.validar_fecha_evento(solicitud.fecha_evento)
        EventoSolicitudService.validar_usuario(db, id_usuario)
        return Solicitud_PublicacionCRUD.crear_solicitud_publicacion(db, solicitud, id_usuario)

    @staticmethod
    def obtener_mis_solicitudes(db: Session, id_usuario: int):
        """
        Obtiene todas las solicitudes de un usuario específico
        """
        return Solicitud_PublicacionCRUD.obtener_solicitudes_por_usuario(db, id_usuario)

    @staticmethod
    def obtener_solicitud(db: Session, id_solicitud: int, usuario_actual: Usuario):
        """Obtiene una solicitud por ID"""
        solicitud = Solicitud_PublicacionCRUD.obtener_solicitud_por_id(db, id_solicitud)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        return solicitud

    @staticmethod
    def enviar_solicitud_para_revision(db: Session, id_solicitud: int, usuario_actual: Usuario):
        solicitud = Solicitud_PublicacionCRUD.obtener_solicitud_por_id(db, id_solicitud)
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        EventoPermisosService.validar_puede_enviar_solicitud(solicitud, usuario_actual)
        return Solicitud_PublicacionCRUD.enviar_solicitud(db, id_solicitud)

    # --- GESTIÓN DE ALTAS (ADMIN) ---
    @staticmethod
    def aprobar_solicitud_y_publicar(db: Session, id_solicitud: int, id_admin: int):
        solicitud = db.query(SolicitudPublicacion).filter(SolicitudPublicacion.id_solicitud == id_solicitud).first()
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")

        if solicitud.id_estado_solicitud == 3: 
             raise HTTPException(status_code=400, detail="Esta solicitud ya fue aprobada")

        solicitud.id_estado_solicitud = 3  
        solicitud.observaciones_admin = f"Aprobado por Admin ID {id_admin}"

        nuevo_evento = Evento(
            id_usuario          = solicitud.id_usuario,
            nombre_evento       = solicitud.nombre_evento,
            fecha_evento        = solicitud.fecha_evento,
            ubicacion           = solicitud.ubicacion,
            id_tipo             = solicitud.id_tipo,
            id_dificultad       = solicitud.id_dificultad,
            descripcion         = solicitud.descripcion,
            costo_participacion = solicitud.costo_participacion,
            lat                 = solicitud.lat,
            lng                 = solicitud.lng,
            cupo_maximo         = solicitud.cupo_maximo,
            id_estado           = 3 
        )

        try:
            db.add(nuevo_evento)
            db.add(solicitud)
            db.commit()
            db.refresh(nuevo_evento)
            return solicitud
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Error al publicar evento: {str(e)}")

    # --- GESTIÓN DE BAJAS (ADMIN) ---
    @staticmethod
    def obtener_bajas_pendientes_formateadas(db: Session):
        """
        ✅ CORREGIDO: Maneja el nuevo formato del CRUD que retorna dict
        """
        resultados = Solicitud_PublicacionCRUD.obtener_bajas_pendientes(db)
        lista_formateada = []
        
        for item in resultados:
            # El CRUD ahora retorna dicts directamente
            if isinstance(item, dict):
                lista_formateada.append({
                    "id_eliminacion": item['id_eliminacion'],
                    "id_evento": item['id_evento'],
                    "nombre_evento": item['nombre_evento'],
                    "motivo": item['motivo_eliminacion'],
                    "fecha_solicitud": item['fecha_eliminacion'].date() if hasattr(item['fecha_eliminacion'], 'date') else item['fecha_eliminacion'],
                    "usuario_solicitante": item['email']
                })
        
        return lista_formateada

    @staticmethod
    def aprobar_eliminacion(db: Session, id_eliminacion: int):
        """
        ✅ SOLUCIÓN: Aprueba una solicitud de baja.
        
        Si id_eliminacion es 0, busca el evento por id_evento y lo procesa igual.
        """
        if id_eliminacion == 0:
            raise HTTPException(
                status_code=400, 
                detail="Este evento no tiene solicitud de baja registrada. No se puede aprobar."
            )
        
        baja = db.query(EliminacionEvento).filter(EliminacionEvento.id_eliminacion == id_eliminacion).first()
        if not baja:
            raise HTTPException(status_code=404, detail="Solicitud de baja no encontrada")
        
        # Cancelar el evento (cambia a estado 5)
        return registro_crud.cancelar_evento(db, baja.id_evento, motivo="Baja aprobada por Admin")
    
    @staticmethod
    def aprobar_eliminacion_por_evento(db: Session, id_evento: int, id_admin: int):
        """
        ✅ Aprueba la eliminación de un evento en estado 6.
        
        Flujo:
        1. Verifica que el evento esté en estado 6 (Pendiente de Eliminación)
        2. Crea/actualiza el registro en eliminacion_evento
        3. Cambia el evento a estado 5 (Cancelado - Soft Delete)
        """
        print(f"🔍 [SERVICE] Iniciando aprobación de baja para evento {id_evento}")
        
        # 1. Verificar que el evento existe y está en estado 6
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        print(f"✅ [SERVICE] Evento encontrado: {evento.nombre_evento}, Estado: {evento.id_estado}")
        
        if evento.id_estado != 6:
            raise HTTPException(
                status_code=400, 
                detail=f"El evento no está en estado 'Pendiente de Eliminación'. Estado actual: {evento.id_estado}"
            )
        
        # 2. Verificar/crear registro de eliminación
        registro_eliminacion = db.query(EliminacionEvento).filter(
            EliminacionEvento.id_evento == id_evento
        ).first()
        
        if not registro_eliminacion:
            print(f"📝 [SERVICE] Creando registro de eliminación")
            registro_eliminacion = EliminacionEvento(
                id_evento=id_evento,
                motivo_eliminacion="[ADMIN] Aprobación de baja",
                fecha_eliminacion=datetime.now(),
                id_usuario=id_admin,
                notificacion_enviada=False
            )
            db.add(registro_eliminacion)
            try:
                db.flush()  # Guarda sin hacer commit completo
                print(f"✅ [SERVICE] Registro de eliminación creado con ID: {registro_eliminacion.id_eliminacion}")
            except Exception as e:
                print(f"❌ [SERVICE ERROR] Error al crear registro: {str(e)}")
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Error al crear registro de auditoría: {str(e)}")
        else:
            print(f"✅ [SERVICE] Registro de eliminación ya existe: {registro_eliminacion.id_eliminacion}")
        
        # 3. ✅ Llamar al CRUD para hacer el Soft Delete
        print(f"🔄 [SERVICE] Llamando a cancelar_evento...")
        try:
            resultado = registro_crud.cancelar_evento(db, id_evento, motivo="Baja aprobada por Admin")
            print(f"🎉 [SERVICE] Evento cancelado exitosamente")
            return resultado
        except Exception as e:
            print(f"💥 [SERVICE ERROR] Error en cancelar_evento: {str(e)}")
            raise

    @staticmethod
    def rechazar_eliminacion(db: Session, id_eliminacion: int):
        """
        ✅ Rechaza una solicitud de baja y restaura el evento a estado Publicado (3).
        
        Si id_eliminacion es 0, no se puede rechazar porque no hay solicitud formal.
        """
        if id_eliminacion == 0:
            raise HTTPException(
                status_code=400,
                detail="Este evento no tiene solicitud de baja registrada. Cambie el estado manualmente desde la base de datos."
            )
        
        baja = db.query(EliminacionEvento).filter(EliminacionEvento.id_eliminacion == id_eliminacion).first()
        if not baja:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        
        # Restaurar el evento a Publicado
        evento = db.query(Evento).filter(Evento.id_evento == baja.id_evento).first()
        if evento:
            evento.id_estado = 3  # Publicado
        
        # Eliminar la solicitud de baja
        db.delete(baja)
        db.commit()
        
        return {
            "mensaje": "Solicitud de baja rechazada. El evento permanece activo.",
            "id_evento": evento.id_evento if evento else None,
            "nuevo_estado": "Publicado"
        }
    
    @staticmethod
    def rechazar_eliminacion_por_evento(db: Session, id_evento: int):
        """
        ✅ NUEVO: Rechaza la eliminación usando el ID del evento directamente.
        
        Para eventos en estado 6 sin registro en eliminacion_evento.
        Simplemente los vuelve a estado 3 (Publicado).
        """
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")
        
        if evento.id_estado != 6:
            raise HTTPException(
                status_code=400,
                detail=f"El evento no está pendiente de eliminación (Estado actual: {evento.id_estado})"
            )
        
        # Restaurar a Publicado
        evento.id_estado = 3
        
        # Si existe algún registro de eliminación, eliminarlo
        registro_elim = db.query(EliminacionEvento).filter(
            EliminacionEvento.id_evento == id_evento
        ).first()
        
        if registro_elim:
            db.delete(registro_elim)
        
        db.commit()
        
        return {
            "mensaje": "Evento restaurado a Publicado",
            "id_evento": evento.id_evento,
            "nuevo_estado": "Publicado"
        }

    # --- MANTENIMIENTO (ADMIN) ---
    @staticmethod
    def depurar_evento_definitivo(db: Session, id_evento: int, motivo: str):
        return registro_crud.depurar_evento(db, id_evento, motivo)