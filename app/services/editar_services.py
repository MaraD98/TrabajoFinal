from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.registro_models import Evento
from app.models.solicitud_edicion_models import SolicitudEdicionEvento
from app.models.editar_models import HistorialEdicionEvento, DetalleCambioEvento
from app.models.auth_models import Usuario
from app.schemas.editar_schema import EventoEditar
from app.db.crud import solicitud_edicion_crud
from app.db.crud.editar_crud import obtener_evento_por_id, guardar_cambios_auditoria
from datetime import datetime
from app.email import enviar_correo_modificacion_evento
from app.models.registro_models import ReservaEvento  
import json

ID_ESTADO_PUBLICADO = 3


class EditarEventoService:
    
    # ========================================================================
    # ✅ MODIFICADO: ACTUALIZAR EVENTO CON AUTO-APROBACIÓN
    # ========================================================================
    @staticmethod
    def actualizar_evento(
        db: Session,
        id_evento: int,
        evento_update: EventoEditar,
        id_usuario_actual: int,
        id_rol_actual: int
    ):
        """
        Actualizar evento según el rol del usuario.
        
        ✅ NUEVO COMPORTAMIENTO:
        - Admin/Supervisor (rol 1, 2): Solicitud + auto-aprobación + cambios aplicados
        - Externo (rol 3): Solicitud pendiente (espera aprobación manual)
        """
        # Verificar que el evento existe
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evento no encontrado"
            )
        
        es_admin = id_rol_actual in [1, 2]
        es_dueno = evento.id_usuario == id_usuario_actual
        
        # Verificar permisos
        if not es_admin and not es_dueno:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permiso para editar este evento"
            )
        
        # ✅ CAMBIO: Admin también crea solicitud, pero se auto-aprueba
        if es_admin:
            return EditarEventoService._editar_con_autoaprobacion(
                db=db,
                evento=evento,
                evento_update=evento_update,
                id_usuario=id_usuario_actual
            )
        else:
            return EditarEventoService._crear_solicitud_edicion(
                db=db,
                evento=evento,
                evento_update=evento_update,
                id_usuario=id_usuario_actual
            )

    # ========================================================================
    # ✅ NUEVO: EDITAR CON AUTO-APROBACIÓN (ADMIN)
    # ========================================================================
    @staticmethod
    def _editar_con_autoaprobacion(
        db: Session,
        evento: Evento,
        evento_update: EventoEditar,
        id_usuario: int
    ):
        """
        Admin/Supervisor edita con auto-aprobación:
        1. Crea solicitud
        2. La marca como aprobada inmediatamente
        3. Aplica los cambios
        4. Registra en historial
        
        → Trazabilidad completa + sin burocracia
        """
        cambios = EditarEventoService._detectar_cambios(evento, evento_update)
        if not cambios:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se detectaron cambios"
            )
        
        # 1. Crear solicitud
        solicitud = solicitud_edicion_crud.crear_solicitud_edicion(
            db=db,
            id_evento=evento.id_evento,
            id_usuario=id_usuario,
            cambios_propuestos=cambios
        )
        
        # 2. Auto-aprobar la solicitud inmediatamente
        solicitud_edicion_crud.aprobar_solicitud(
            db=db,
            solicitud=solicitud,
            id_admin=id_usuario
        )
        
        # 3. Aplicar cambios al evento
        for campo, valores in cambios.items():
            setattr(evento, campo, valores["valor_real"])  # valor_real sigue siendo el objeto Python original aquí, antes de serializar
        
        # 4. Registrar en historial
        historial = HistorialEdicionEvento(
            id_evento=evento.id_evento,
            id_usuario=id_usuario,
            fecha_edicion=datetime.now()
        )
        db.add(historial)
        db.flush()
        
        # 5. Registrar detalles de cada cambio
        for campo, valores in cambios.items():
            detalle = DetalleCambioEvento(
                id_historial_edicion=historial.id_historial_edicion,
                campo_modificado=campo,
                valor_anterior=str(valores["anterior"]),
                valor_nuevo=str(valores["nuevo"])
            )
            db.add(detalle)
        
        db.commit()
        db.refresh(evento)
        
    # 1. Buscamos a los inscriptos (excluyendo estado 4 que asumo es cancelado)
        inscriptos = db.query(ReservaEvento).filter(
            ReservaEvento.id_evento == evento.id_evento,
            ReservaEvento.id_estado != 4
        ).all()

        # 2. Notificamos a cada uno por mail
        for reser in inscriptos:
            if reser.usuario and reser.usuario.email:
                enviar_correo_modificacion_evento(
                    email_destino=reser.usuario.email,
                    nombre_evento=evento.nombre_evento,
                    id_evento=evento.id_evento,
                    fecha_url=evento.fecha_evento.strftime('%Y-%m-%d')
                )
    
        # 3. Devolvemos la respuesta detallada (la que venía de Main)
        return {
            "mensaje": "[AUTO-APROBADO] Cambios aplicados directamente por Admin/Supervisor",
            "id_evento": evento.id_evento,
            "id_solicitud": solicitud.id_solicitud_edicion,
            "cambios_aplicados": list(cambios.keys()),
            "trazabilidad": "Solicitud creada y auto-aprobada para mantener historial"
        }
    
    

    # ========================================================================
    # MÉTODO PRIVADO: CREAR SOLICITUD (ORGANIZADOR EXTERNO)
    # ========================================================================
    
    @staticmethod
    def _crear_solicitud_edicion(
        db: Session, 
        evento: Evento, 
        evento_update: EventoEditar, 
        id_usuario: int
    ):
        """
        Organizador crea solicitud de edición.
        ✅ CRÍTICO: El evento SIEMPRE permanece en estado 3 (visible).
        """
        # Verificar si ya existe una solicitud pendiente
        solicitud_existente = solicitud_edicion_crud.obtener_solicitud_pendiente(
            db=db, 
            id_evento=evento.id_evento
        )
        
        if solicitud_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una solicitud de edición pendiente para este evento. Debes esperar a que sea aprobada o rechazada."
            )

        # Detectar cambios
        cambios = EditarEventoService._detectar_cambios(evento, evento_update)
        
        if not cambios:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="No se detectaron cambios"
            )

        # ✅ CREAR SOLICITUD (evento permanece en estado 3)
        solicitud = solicitud_edicion_crud.crear_solicitud_edicion(
            db=db,
            id_evento=evento.id_evento,
            id_usuario=id_usuario,
            cambios_propuestos=cambios
        )

        return {
            "mensaje": "Solicitud de edición enviada exitosamente. Quedará pendiente de aprobación por un administrador.",
            "id_solicitud": solicitud.id_solicitud_edicion,
            "evento_visible": True,
            "estado_evento": "El evento permanece publicado mientras se aprueba la solicitud"
        }

    # ========================================================================
    # MÉTODO PRIVADO: DETECTAR CAMBIOS
    # ========================================================================
    
    @staticmethod
    def _detectar_cambios(evento: Evento, evento_update: EventoEditar) -> dict:
        """
        Detecta qué campos cambiaron entre el evento actual y los nuevos datos.
        Retorna un dict con estructura: {campo: {anterior, nuevo, valor_real}}
        """
        cambios = {}
        campos_editables = [
            'nombre_evento', 'fecha_evento', 'ubicacion', 'descripcion',
            'costo_participacion', 'id_tipo', 'id_dificultad', 
            'cupo_maximo', 'lat', 'lng'
        ]

        for campo in campos_editables:
            valor_nuevo = getattr(evento_update, campo, None)
            valor_actual = getattr(evento, campo, None)

            # Solo registrar si hay cambio real
            if valor_nuevo is not None and valor_nuevo != valor_actual:
                cambios[campo] = {
                    "anterior": str(valor_actual) if valor_actual is not None else "",
                    "nuevo": str(valor_nuevo),
                    "valor_real": valor_nuevo  # ✅ FIX 1: se mantiene como objeto Python para _editar_con_autoaprobacion
                                               # El CRUD lo serializa con default=str al hacer json.dumps
                }

        return cambios

    # ========================================================================
    # APROBAR SOLICITUD (ADMIN)
    # ========================================================================
    
    @staticmethod
    def aprobar_solicitud_edicion(db: Session, id_evento: int, id_admin: int):
        """
        Admin aprueba solicitud de edición.
        Aplica cambios y mantiene evento en estado 3.
        """
        solicitud = solicitud_edicion_crud.obtener_solicitud_pendiente(
            db=db, 
            id_evento=id_evento
        )
        
        if not solicitud:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="No hay solicitud de edición pendiente para este evento"
            )

        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()
        if not evento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Evento no encontrado"
            )

        # ✅ FIX 2: cambios_propuestos es Text (string), manejar ambos casos por si acaso
        cambios_raw = solicitud.cambios_propuestos
        if isinstance(cambios_raw, str):
            try:
                cambios = json.loads(cambios_raw)
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error al parsear cambios propuestos"
                )
        else:
            cambios = cambios_raw  # ya es dict (por si SQLAlchemy lo deserializó)

        # Aplicar cambios al evento
        # Tras el round-trip JSON, valor_real viene como string → usar "nuevo"
        for campo, valores in cambios.items():
            setattr(evento, campo, valores.get("valor_real") or valores.get("nuevo"))

        # Registrar en historial
        historial = HistorialEdicionEvento(
            id_evento=evento.id_evento,
            id_usuario=solicitud.id_usuario,
            fecha_edicion=datetime.now()
        )
        db.add(historial)
        db.flush()

        # Registrar detalles
        for campo, valores in cambios.items():
            detalle = DetalleCambioEvento(
                id_historial_edicion=historial.id_historial_edicion,
                campo_modificado=campo,
                valor_anterior=valores["anterior"],
                valor_nuevo=valores["nuevo"]
            )
            db.add(detalle)

        # Marcar solicitud como aprobada
        solicitud_edicion_crud.aprobar_solicitud(
            db=db, 
            solicitud=solicitud, 
            id_admin=id_admin
        )

        db.commit()
        db.refresh(evento)
     
        inscriptos = db.query(ReservaEvento).filter(
            ReservaEvento.id_evento == evento.id_evento,
            ReservaEvento.id_estado != 4
        ).all()

        for reser in inscriptos:
            if reser.usuario and reser.usuario.email:
                enviar_correo_modificacion_evento(
                    email_destino=reser.usuario.email,
                    nombre_evento=evento.nombre_evento,
                    id_evento=evento.id_evento,
                    fecha_url=evento.fecha_evento.strftime('%Y-%m-%d')
                )
        
        return {
            "mensaje": "Solicitud de edición aprobada exitosamente. Cambios aplicados al evento.",
            "id_evento": evento.id_evento,
            "nombre_evento": evento.nombre_evento,
            "cambios_aplicados": list(cambios.keys())
        }

    # ========================================================================
    # RECHAZAR SOLICITUD (ADMIN)
    # ========================================================================
    
    @staticmethod
    def rechazar_solicitud_edicion(db: Session, id_evento: int, id_admin: int):
        """
        Admin rechaza solicitud. Evento permanece sin cambios.
        """
        solicitud = solicitud_edicion_crud.obtener_solicitud_pendiente(
            db=db, 
            id_evento=id_evento
        )
        
        if not solicitud:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="No hay solicitud de edición pendiente para este evento"
            )

        # Obtener evento para nombre
        evento = db.query(Evento).filter(Evento.id_evento == id_evento).first()

        # Marcar solicitud como rechazada
        solicitud_edicion_crud.rechazar_solicitud(
            db=db, 
            solicitud=solicitud, 
            id_admin=id_admin
        )

        db.commit()

        return {
            "mensaje": "Solicitud de edición rechazada. El evento permanece sin cambios.",
            "id_evento": id_evento,
            "nombre_evento": evento.nombre_evento if evento else "Desconocido"
        }

    # ========================================================================
    # ✅ CORREGIDO: OBTENER MIS SOLICITUDES CON MULTIMEDIA
    # ========================================================================
    
    @staticmethod
    def obtener_mis_solicitudes_edicion(db: Session, id_usuario: int):
        """
        ✅ CORREGIDO: Obtiene las solicitudes de edición pendientes del usuario.
        Incluye multimedia e imagen_url del evento para mostrar la imagen correcta.
        Retorna lista vacía si no hay solicitudes.
        """
        from app.models.registro_models import EventoMultimedia  # ← IMPORTAR
        
        # Obtener solicitudes pendientes del usuario
        solicitudes = db.query(SolicitudEdicionEvento).filter(
            SolicitudEdicionEvento.id_usuario == id_usuario,
            SolicitudEdicionEvento.aprobada == None  # NULL = Pendiente
        ).all()

        # Si no hay solicitudes, retornar lista vacía
        if not solicitudes:
            return []

        resultado = []
        for solicitud in solicitudes:
            # Obtener el evento asociado
            evento = db.query(Evento).filter(
                Evento.id_evento == solicitud.id_evento
            ).first()
            
            if not evento:
                continue  # Saltar si el evento no existe
            
            # ✅ NUEVO: Obtener multimedia del evento
            multimedia = db.query(EventoMultimedia).filter(
                EventoMultimedia.id_evento == evento.id_evento
            ).all()
            
            # Parsear cambios propuestos — mismo fix: manejar str o dict
            cambios_raw = solicitud.cambios_propuestos
            if isinstance(cambios_raw, str):
                try:
                    cambios = json.loads(cambios_raw)
                except:
                    cambios = {}
            else:
                cambios = cambios_raw if cambios_raw else {}

            resultado.append({
                "id_solicitud_edicion": solicitud.id_solicitud_edicion,
                "id_evento": evento.id_evento,
                "nombre_evento": evento.nombre_evento,
                "fecha_evento": evento.fecha_evento.isoformat() if evento.fecha_evento else None,
                "ubicacion": evento.ubicacion,
                "id_tipo": evento.id_tipo,
                "cambios_propuestos": cambios,
                "fecha_solicitud": solicitud.fecha_solicitud.isoformat() if solicitud.fecha_solicitud else None,
                "estado": "Pendiente de aprobación",
                "multimedia": [{"url_archivo": m.url_archivo} for m in multimedia] if multimedia else None,
                "imagen_url": None
            })

        return resultado

    # ========================================================================
    # ✅ OBTENER SOLICITUDES PENDIENTES (ADMIN)
    # ========================================================================
    
    @staticmethod
    def obtener_solicitudes_pendientes(db: Session):
        """
        ✅ CORREGIDO: Admin obtiene TODAS las solicitudes de edición pendientes.
        Retorna lista vacía si no hay solicitudes.
        """
        # Obtener TODAS las solicitudes pendientes
        solicitudes = db.query(SolicitudEdicionEvento).filter(
            SolicitudEdicionEvento.aprobada == None
        ).all()

        # Si no hay solicitudes, retornar lista vacía
        if not solicitudes:
            return []

        resultado = []
        for solicitud in solicitudes:
            # Obtener evento
            evento = db.query(Evento).filter(
                Evento.id_evento == solicitud.id_evento
            ).first()
            
            # Obtener usuario que solicitó
            usuario = db.query(Usuario).filter(
                Usuario.id_usuario == solicitud.id_usuario
            ).first()
            
            if not evento or not usuario:
                continue  # Saltar si faltan datos
            
            # Parsear cambios propuestos — mismo fix: manejar str o dict
            cambios_raw = solicitud.cambios_propuestos
            if isinstance(cambios_raw, str):
                try:
                    cambios = json.loads(cambios_raw)
                except:
                    cambios = {}
            else:
                cambios = cambios_raw if cambios_raw else {}

            resultado.append({
                "id_solicitud_edicion": solicitud.id_solicitud_edicion,
                "id_evento": evento.id_evento,
                "nombre_evento": evento.nombre_evento,
                "fecha_evento": evento.fecha_evento.isoformat() if evento.fecha_evento else None,
                "ubicacion": evento.ubicacion,
                "cambios_propuestos": cambios,
                "fecha_solicitud": solicitud.fecha_solicitud.isoformat() if solicitud.fecha_solicitud else None,
                "usuario_solicitante": usuario.email,
                "usuario_nombre": usuario.nombre_y_apellido,
                "estado": "Pendiente de aprobación"
            })

        return resultado
    
    @staticmethod
    def editar_evento_como_admin(
        db: Session,
        id_evento: int,
        evento_update: EventoEditar,
        id_admin: int
    ):
        """
        ✅ NUEVO: Permite a admin editar eventos directamente sin solicitud.
        Registra cambios en historial de auditoría.
        """
        # 1. Verificar que el evento existe
        evento = obtener_evento_por_id(db, id_evento)
        if not evento:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evento no encontrado"
            )
        
        # 2. Verificar que está en estado activo (3 = Publicado)
        if evento.id_estado != 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Solo se pueden editar eventos activos"
            )
        
        # 3. Preparar historial de cambios
        cambios_realizados = []
        historial = HistorialEdicionEvento(
            id_evento=id_evento,
            id_usuario=id_admin,
            fecha_edicion=datetime.now()
        )
        
        # 4. Aplicar cambios y registrar
        campos_editables = {
            'nombre_evento': 'Nombre del Evento',
            'fecha_evento': 'Fecha',
            'ubicacion': 'Ubicación',
            'descripcion': 'Descripción',
            'costo_participacion': 'Costo',
            'id_tipo': 'Tipo de Evento',
            'id_dificultad': 'Dificultad',
            'cupo_maximo': 'Cupo Máximo',
            'lat': 'Latitud',
            'lng': 'Longitud'
        }
        
        for campo, nombre_legible in campos_editables.items():
            nuevo_valor = getattr(evento_update, campo, None)
            
            if nuevo_valor is not None:
                valor_anterior = getattr(evento, campo)
                
                # Solo registrar si realmente cambió
                if str(valor_anterior) != str(nuevo_valor):
                    cambios_realizados.append(
                        DetalleCambioEvento(
                            campo_modificado=campo,
                            valor_anterior=str(valor_anterior or ''),
                            valor_nuevo=str(nuevo_valor)
                        )
                    )
                    
                    # Aplicar cambio
                    setattr(evento, campo, nuevo_valor)
        
        # 5. Verificar que hubo cambios
        if not cambios_realizados:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se detectaron cambios"
            )
        
        # 6. Guardar todo en auditoría
        guardar_cambios_auditoria(db, evento, historial, cambios_realizados)
        
        return {
            "success": True,
            "message": f"Evento actualizado correctamente. {len(cambios_realizados)} cambio(s) aplicado(s).",
            "cambios_aplicados": len(cambios_realizados),
            "id_evento": id_evento
        }