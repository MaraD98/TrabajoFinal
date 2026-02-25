from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy import func, case, text
from app.models.auth_models import Usuario, Rol
from app.models.evento_solicitud_models import EstadoSolicitud, SolicitudPublicacion
from app.models.registro_models import Evento, TipoEvento, NivelDificultad
from app.models.inscripcion_models import EstadoReserva, ReservaEvento

class ReporteService:

    @staticmethod
    def _get_mis_estadisticas(db: Session, id_usuario: int, id_rol: int):
        query_total = db.query(func.count(Evento.id_evento))
        query_estados = db.query(Evento.id_estado, func.count(Evento.id_evento)).group_by(Evento.id_estado)

        # Si NO es admin(1) ni supervisor(2), filtramos solo por su usuario
        if id_rol > 2:
            query_total = query_total.filter(Evento.id_usuario == id_usuario)
            query_estados = query_estados.filter(Evento.id_usuario == id_usuario)

        total = query_total.scalar()
        res_estados = query_estados.all()
        por_estado = [{"estado": e, "cantidad": c} for e, c in res_estados]

        return {
            "mis_eventos_total": total,
            "mis_eventos_por_estado": por_estado
        }

    @staticmethod
    def _extraer_provincia(ubicacion_completa: str) -> str:
        if not ubicacion_completa:
            return "Sin Provincia"
        partes = [p.strip() for p in ubicacion_completa.split(',')]
        for parte in partes:
            if "Provincia de" in parte:
                return parte.replace("Provincia de", "").strip().title()
            if "Province of" in parte:
                return parte.replace("Province of", "").strip().title()
        if len(partes) >= 3:
            candidata = partes[-3].strip()
            if not candidata.isdigit() and candidata.lower() != "argentina":
                return candidata.title()
        if len(partes) >= 2:
            return partes[-2].strip().title()
        return "Sin Provincia"

    @staticmethod
    def _extraer_localidad(ubicacion_completa: str) -> str:
        if not ubicacion_completa:
            return "Sin Localidad"
        partes = [p.strip() for p in ubicacion_completa.split(',')]
        for parte in partes:
            if "Municipio de" in parte:
                return parte.replace("Municipio de", "").strip().title()
        for parte in partes:
            if "Departamento" in parte:
                return parte.strip().title()
        if len(partes) >= 3:
            return partes[-3].strip().title()
        return partes[0].strip().title()

    @staticmethod
    def reportes_admin(db: Session, anio: int = None, mes: int = None):
        filtros = []
        if anio:
            filtros.append(func.extract("year", Evento.fecha_evento) == anio)
        if mes:
            filtros.append(func.extract("month", Evento.fecha_evento) == mes)

        # -- CONTEOS BÁSICOS ORIGINALES (No los tocamos para no romper el CSV) --
        total_eventos = db.query(func.count(Evento.id_evento)).filter(*filtros).scalar()

        resultados_estado = db.query(Evento.id_estado, func.count(Evento.id_evento)).filter(*filtros).group_by(Evento.id_estado).all()
        eventos_por_estado = [{"estado": e, "cantidad": c} for e, c in resultados_estado]

        resultados_usuario = db.query(Evento.id_usuario, func.count(Evento.id_evento)).filter(*filtros).group_by(Evento.id_usuario).all()
        eventos_por_usuario = [{"usuario": u, "cantidad": c} for u, c in resultados_usuario]

        resultados_mes = db.query(
            func.extract("year", Evento.fecha_evento).label("anio"),
            func.extract("month", Evento.fecha_evento).label("mes"),
            func.count(Evento.id_evento)
        ).filter(*filtros).group_by("anio", "mes").all()
        eventos_por_mes = [{"anio": int(a), "mes": int(m), "cantidad": c} for a, m, c in resultados_mes]

        resultados_tipo = (
            db.query(TipoEvento.nombre, func.count(Evento.id_evento))
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .filter(*filtros).group_by(TipoEvento.nombre).all()
        )
        eventos_por_tipo = [{"tipo": n, "cantidad": c} for n, c in resultados_tipo]

        resultados_dificultad = (
            db.query(NivelDificultad.nombre, func.count(Evento.id_evento))
            .join(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
            .filter(*filtros).group_by(NivelDificultad.nombre).all()
        )
        eventos_por_dificultad = [{"dificultad": n, "cantidad": c} for n, c in resultados_dificultad]

        usuarios_total = db.query(func.count(Usuario.id_usuario)).scalar()
        resultados_roles = db.query(Usuario.id_rol, func.count(Usuario.id_usuario)).group_by(Usuario.id_rol).all()
        usuarios_por_rol = [{"rol": r, "cantidad": c} for r, c in resultados_roles]

        ubicaciones_crudas = db.query(Evento.ubicacion).filter(*filtros).all()
        lista_lugares = [ReporteService._extraer_localidad(u[0]) for u in ubicaciones_crudas if u[0]]
        conteo = Counter(lista_lugares)
        eventos_por_ubicacion = [{"ubicacion": lugar, "cantidad": cantidad} for lugar, cantidad in conteo.most_common(10)]

        # ═════════════════════════════════════════════════════════════════════
        # -- NUEVA LÓGICA AGREGADA PARA LOS REQUERIMIENTOS 1 AL 5 DEL ADMIN --
        # ═════════════════════════════════════════════════════════════════════

        # 1 y 2. Lista Detallada (Propios y Externos) y Recaudación
        eventos_query = (
            db.query(
                Evento,
                TipoEvento.nombre.label("tipo_nombre"),
                NivelDificultad.nombre.label("dificultad_nombre"), # <--- AGREGAMOS LA DIFICULTAD
                Usuario.id_rol,
                Usuario.nombre_y_apellido.label("organizador"),
                func.count(ReservaEvento.id_reserva).label("total_reservas")
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .outerjoin(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad) # <--- EL JOIN
            .join(Usuario, Evento.id_usuario == Usuario.id_usuario)
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .filter(*filtros)
            .group_by(Evento.id_evento, TipoEvento.nombre, NivelDificultad.nombre, Usuario.id_rol, Usuario.nombre_y_apellido)
            .order_by(Evento.fecha_evento.desc())
            .all()
        )

        confirmadas_subq = (
            db.query(
                ReservaEvento.id_evento,
                func.sum(case((ReservaEvento.id_estado_reserva == 2, 1), else_=0)).label("confirmadas")
            )
            .group_by(ReservaEvento.id_evento)
            .all()
        )
        confirmadas_map = {row.id_evento: int(row.confirmadas or 0) for row in confirmadas_subq}

        lista_eventos_detallada = []
        total_recaudado = 0.0
        total_reservas_recibidas = 0

        # Agregamos dificultad_nombre al for
        for e, tipo_nombre, dificultad_nombre, id_rol, organizador, total_reservas in eventos_query:
            confirmadas = confirmadas_map.get(e.id_evento, 0)
            costo = float(e.costo_participacion or 0)
            monto_evento = costo * confirmadas
            total_recaudado += monto_evento
            total_reservas_recibidas += (total_reservas or 0)
            
            pertenencia = "Propio" if id_rol in [1, 2] else "Externo"

            lista_eventos_detallada.append({
                "id": e.id_evento,
                "nombre": e.nombre_evento,
                "fecha_evento": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                "estado": e.id_estado,
                "tipo": tipo_nombre,
                "dificultad": dificultad_nombre or "Sin Dificultad", # <--- AHORA EL FRONTEND TIENE LA DIFICULTAD
                "pertenencia": pertenencia,
                "organizador": organizador,
                "reservas_totales": total_reservas,
                "inscripciones_confirmadas": confirmadas,
                "cupo_maximo": e.cupo_maximo,
                "costo_participacion": costo,
                "monto_recaudado": round(monto_evento, 2),
                "ubicacion": e.ubicacion,
                "distancia_km": float(e.distancia_km or 0),
            })

        # 3. Tendencias por Ubicación (Con pertenencia)
        tendencias_dict = {}
        for ev in lista_eventos_detallada:
            if ev["estado"] not in [3, 4]: 
                continue
            prov = ReporteService._extraer_provincia(ev["ubicacion"]).strip().title()
            loc = ReporteService._extraer_localidad(ev["ubicacion"]).strip().title()

            if prov not in tendencias_dict:
                tendencias_dict[prov] = {"provincia": prov, "total_eventos": 0, "localidades": {}}
            if loc not in tendencias_dict[prov]["localidades"]:
                tendencias_dict[prov]["localidades"][loc] = {"localidad": loc, "cantidad": 0, "eventos": []}

            tendencias_dict[prov]["localidades"][loc]["eventos"].append(ev)
            tendencias_dict[prov]["localidades"][loc]["cantidad"] += 1
            tendencias_dict[prov]["total_eventos"] += 1

        tendencias_ubicacion = []
        for prov_data in tendencias_dict.values():
            prov_data["localidades"] = list(prov_data["localidades"].values())
            tendencias_ubicacion.append(prov_data)
        tendencias_ubicacion.sort(key=lambda x: x["total_eventos"], reverse=True)

        # 4. Top 10 Recaudación
        top_10_recaudacion = sorted(
            [e for e in lista_eventos_detallada if e["estado"] in [3, 4]], 
            key=lambda x: x["monto_recaudado"], 
            reverse=True
        )[:10]

        # 5. Usuarios Nuevos (Clientes y Org Externas)
        usuarios_nuevos_query = db.query(Usuario).filter(Usuario.id_rol.in_([3, 4])).all()
        usuarios_nuevos = []
        for u in usuarios_nuevos_query:
            fecha_creacion = getattr(u, 'fecha_creacion', None) or getattr(u, 'fecha_registro', None)
            
            # Filtro manual de fecha para usuarios si aplicaron filtros
            if anio and fecha_creacion and fecha_creacion.year != anio:
                continue
            if mes and fecha_creacion and fecha_creacion.month != mes:
                continue

            # Buscar inscripciones confirmadas
            inscripciones_q = (
                db.query(Evento.nombre_evento, Evento.fecha_evento)
                .join(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
                .filter(ReservaEvento.id_usuario == u.id_usuario, ReservaEvento.id_estado_reserva == 2)
                .all()
            )
            insc_list = [{"evento": i.nombre_evento, "fecha": i.fecha_evento.strftime('%d/%m/%Y') if i.fecha_evento else ""} for i in inscripciones_q]

            # Buscar eventos creados
            ev_creados_q = db.query(Evento.nombre_evento, Evento.fecha_evento).filter(Evento.id_usuario == u.id_usuario).all()
            ev_list = [{"evento": e.nombre_evento, "fecha": e.fecha_evento.strftime('%d/%m/%Y') if e.fecha_evento else ""} for e in ev_creados_q]

            usuarios_nuevos.append({
                "id": u.id_usuario,
                "nombre": u.nombre_y_apellido,
                "email": getattr(u, 'email', 'Sin Email'),
                "rol": "Organización Externa" if u.id_rol == 3 else "Cliente",
                "fecha_creacion": fecha_creacion.strftime('%d/%m/%Y') if fecha_creacion else "Sin fecha",
                "inscripciones": insc_list,
                "cantidad_inscripciones": len(insc_list),
                "eventos_creados": ev_list,
                "cantidad_eventos_creados": len(ev_list)
            })

        return {
            "total_eventos": total_eventos,
            "eventos_por_tipo": eventos_por_tipo,
            "eventos_por_dificultad": eventos_por_dificultad,
            "eventos_por_estado": eventos_por_estado,
            "eventos_por_usuario": eventos_por_usuario,
            "eventos_por_mes": eventos_por_mes,
            "usuarios_total": usuarios_total,
            "usuarios_por_rol": usuarios_por_rol,
            "eventos_por_ubicacion": eventos_por_ubicacion,
            
            # -- DATOS NUEVOS PARA LOS REQUERIMIENTOS FRONTEND --
            "lista_eventos_detallada": lista_eventos_detallada,
            "recaudacion_total": round(total_recaudado, 2),
            "total_reservas_recibidas": total_reservas_recibidas,
            "tendencias_ubicacion_completa": tendencias_ubicacion,
            "top_10_recaudacion": top_10_recaudacion,
            "usuarios_nuevos": usuarios_nuevos
        }

    @staticmethod
    def reportes_supervisor(db: Session, id_usuario: int, anio: int = None, mes: int = None):
        filtros = []
        if anio:
            filtros.append(func.extract("year", Evento.fecha_evento) == anio)
        if mes:
            filtros.append(func.extract("month", Evento.fecha_evento) == mes)

        # ── 1. Análisis Organizadores Top 10 (con más detalles) ──
        reservas_confirmadas_sq = (
            db.query(
                ReservaEvento.id_evento,
                func.count(ReservaEvento.id_reserva).label("cant_confirmadas")
            )
            .filter(ReservaEvento.id_estado_reserva == 2)
            .group_by(ReservaEvento.id_evento)
            .subquery()
        )

        top_organizadores_query = (
            db.query(
                Usuario.id_usuario,
                Usuario.nombre_y_apellido,
                Usuario.email,
                Rol.nombre_rol,
                func.count(Evento.id_evento).label("total_eventos"),
                func.count(case((Evento.id_estado == 3, 1))).label("activos"),
                func.count(case((Evento.id_estado == 4, 1))).label("finalizados"),
                func.sum(
                    func.coalesce(reservas_confirmadas_sq.c.cant_confirmadas, 0) * func.coalesce(Evento.costo_participacion, 0)
                ).label("recaudacion_total")
            )
            .join(Evento, Evento.id_usuario == Usuario.id_usuario)
            .join(Rol, Usuario.id_rol == Rol.id_rol)
            .outerjoin(reservas_confirmadas_sq, Evento.id_evento == reservas_confirmadas_sq.c.id_evento)
            .filter(Evento.id_estado.in_([3, 4, 5]))
            .filter(*filtros)
            .group_by(Usuario.id_usuario, Usuario.nombre_y_apellido, Usuario.email, Rol.nombre_rol)
            .order_by(text("recaudacion_total DESC"))
            .limit(10)
            .all()
        )

        analisis_organizadores = [
            {
                "id_usuario": row.id_usuario,
                "organizador": row.nombre_y_apellido,
                "email": row.email,
                "rol": row.nombre_rol,
                "total_eventos": row.total_eventos,
                "activos": row.activos,
                "finalizados": row.finalizados,
                "recaudacion_total": float(row.recaudacion_total or 0)
            }
            for row in top_organizadores_query
        ]

        # ── 2. Top Eventos por Tasa de Ocupación (Se mantiene igual) ──
        ocupacion_query = (
            db.query(
                Evento.id_evento,
                Evento.nombre_evento,
                Evento.cupo_maximo,
                Evento.costo_participacion,
                func.sum(case((ReservaEvento.id_estado_reserva == 2, 1), else_=0)).label("inscriptos_pagos"),
                func.sum(case((ReservaEvento.id_estado_reserva == 1, 1), else_=0)).label("reservados_no_pagos")
            )
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .filter(Evento.cupo_maximo > 0)
            .filter(Evento.id_estado.in_([3, 4]))
            .filter(*filtros)
            .group_by(Evento.id_evento)
            .all()
        )

        top_ocupacion = []
        for row in ocupacion_query:
            inscriptos = int(row.inscriptos_pagos or 0)
            reservados = int(row.reservados_no_pagos or 0)
            total_ocupado = inscriptos + reservados
            cupo = int(row.cupo_maximo)
            tasa = (total_ocupado / cupo * 100) if cupo > 0 else 0
            
            top_ocupacion.append({
                "id_evento": row.id_evento,
                "nombre_evento": row.nombre_evento,
                "cupo_maximo": cupo,
                "inscriptos_pagos": inscriptos,
                "reservados_no_pagos": reservados,
                "total_ocupado": total_ocupado,
                "tasa_ocupacion": round(tasa, 2),
                "es_pago": float(row.costo_participacion or 0) > 0
            })
        
        top_ocupacion.sort(key=lambda x: x["tasa_ocupacion"], reverse=True)
        top_ocupacion = top_ocupacion[:10]

        # ── 3. Dashboard Eventos del Sistema (Nuevo) ──
        # Traemos todos los eventos desglosados para que el front arme los gráficos
        eventos_sistema_query = (
            db.query(
                Evento.id_evento,
                Evento.nombre_evento,
                Evento.fecha_evento,
                Usuario.nombre_y_apellido.label("responsable"),
                Evento.id_estado,
                case((Usuario.id_rol.in_([1, 2]), "Propio"), else_="Externo").label("pertenencia")
            )
            .join(Usuario, Evento.id_usuario == Usuario.id_usuario)
            .filter(Evento.id_estado.in_([3, 4, 5]))
            .filter(*filtros)
            .all()
        )

        dashboard_eventos = []
        for row in eventos_sistema_query:
            estado_str = "Activo" if row.id_estado == 3 else ("Finalizado" if row.id_estado == 4 else "Cancelado")
            dashboard_eventos.append({
                "id_evento": row.id_evento,
                "nombre_evento": row.nombre_evento,
                "fecha_evento": row.fecha_evento.strftime('%Y-%m-%d') if row.fecha_evento else "Sin fecha",
                "responsable": row.responsable,
                "estado": estado_str,
                "pertenencia": row.pertenencia
            })

        # Mantenemos las solicitudes externas
        resultados_solicitudes = (
            db.query(EstadoSolicitud.nombre, func.count(SolicitudPublicacion.id_solicitud))
            .join(SolicitudPublicacion, EstadoSolicitud.id_estado_solicitud == SolicitudPublicacion.id_estado_solicitud)
            .group_by(EstadoSolicitud.nombre).all()
        )
        solicitudes_externas = [{"estado": n, "cantidad": c} for n, c in resultados_solicitudes]

        return {
            "analisis_organizadores": analisis_organizadores,
            "top_ocupacion": top_ocupacion,
            "dashboard_eventos": dashboard_eventos,
            "solicitudes_externas": solicitudes_externas
        }

    @staticmethod
    def reportes_organizacion_externa(db: Session, id_usuario: int, id_rol: int):
        # 1. Pasamos el rol a las estadísticas base
        stats_base = ReporteService._get_mis_estadisticas(db, id_usuario, id_rol)

        # ── BASES DE CONSULTA (Sin filtrar por usuario todavía) ──
        base_eventos_query = (
            db.query(
                Evento.id_evento,
                Evento.nombre_evento,
                Evento.fecha_evento,
                Evento.fecha_creacion,
                Evento.id_estado,
                Evento.costo_participacion,
                Evento.cupo_maximo,
                Evento.distancia_km,
                Evento.descripcion,
                Evento.ubicacion,
                TipoEvento.nombre.label("tipo_nombre"),
                func.count(ReservaEvento.id_reserva).label("total_reservas"),
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .group_by(Evento.id_evento, TipoEvento.nombre)
        )

        # ARREGLO 1: Armamos la base sin filtro de Popularidad por tipo
        base_resultados_tipo = (
            db.query(TipoEvento.nombre, func.count(ReservaEvento.id_reserva))
            .join(Evento, Evento.id_tipo == TipoEvento.id_tipo)
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .group_by(TipoEvento.nombre)
        )

        # ARREGLO 2: Armamos la base sin filtro de Reservas confirmadas
        base_confirmadas_subq = (
            db.query(
                ReservaEvento.id_evento,
                func.sum(
                    case((ReservaEvento.id_estado_reserva == 2, 1), else_=0)
                ).label("confirmadas"),
                func.count(ReservaEvento.id_reserva).label("total")
            )
            .join(Evento, ReservaEvento.id_evento == Evento.id_evento)
            .group_by(ReservaEvento.id_evento)
        )

        # ── APLICAMOS EL FILTRO CONDICIONAL IGUAL QUE EN EL FRONT ──
        # Si el rol es mayor a 2 (ej: Organizador 3), filtramos para que vea solo lo suyo.
        # Si es 1 (Admin) o 2 (Supervisor), se saltan este if y ven TODO.
        if id_rol > 2:
            base_eventos_query = base_eventos_query.filter(Evento.id_usuario == id_usuario)
            base_resultados_tipo = base_resultados_tipo.filter(Evento.id_usuario == id_usuario)
            base_confirmadas_subq = base_confirmadas_subq.filter(Evento.id_usuario == id_usuario)

        # Ejecutamos las consultas (ahora si son globales para admin/super)
        eventos_query = base_eventos_query.order_by(Evento.fecha_evento.desc()).all()
        resultados_tipo = base_resultados_tipo.all()
        confirmadas_subq = base_confirmadas_subq.all()

        # ── ARMADO DE LISTAS ──
        lista_eventos = [
            {
                "id": e.id_evento,
                "nombre": e.nombre_evento,
                "fecha": e.fecha_evento.strftime('%d/%m/%Y') if e.fecha_evento else "Sin fecha",
                "fecha_solicitud": e.fecha_creacion.strftime('%d/%m/%Y') if e.fecha_creacion else "Sin fecha",
                "fecha_creacion": e.fecha_creacion.strftime('%d/%m/%Y') if e.fecha_creacion else "Sin fecha",
                "fecha_evento": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                "estado": e.id_estado,
                "estado_evento": e.id_estado,
                "tipo": e.tipo_nombre,
                "reservas": e.total_reservas,
                "cupo_maximo": e.cupo_maximo,
                "costo_participacion": float(e.costo_participacion or 0),
                "distancia_km": float(e.distancia_km or 0),
                "descripcion": e.descripcion or "",
                "ubicacion_completa": e.ubicacion or "",
            }
            for e in eventos_query
        ]

        # Mapeamos los resultados_tipo (que ahora respetan el rol)
        rendimiento_tipo = [{"tipo": n, "cantidad": c} for n, c in resultados_tipo if c > 0]

        # Mapeamos las confirmadas (que ahora respetan el rol)
        confirmadas_map: dict = {row.id_evento: {"confirmadas": int(row.confirmadas or 0), "total": int(row.total or 0)} for row in confirmadas_subq}

        # ── Detalle de recaudación: TODOS los eventos (incluye gratuitos) ─────
        detalle_recaudacion = []
        total_recaudado = 0.0

        for e in eventos_query:
            costo = float(e.costo_participacion or 0)
            stats = confirmadas_map.get(e.id_evento, {"confirmadas": 0, "total": int(e.total_reservas or 0)})
            inscriptos_confirmados = stats["confirmadas"]
            inscriptos_count = stats["total"]
            monto_evento = costo * inscriptos_confirmados
            total_recaudado += monto_evento

            detalle_recaudacion.append({
                "id_evento": e.id_evento,
                "nombre_evento": e.nombre_evento,
                "fecha_evento": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                "monto": round(monto_evento, 2),
                "monto_unitario": costo,
                "inscriptos_count": inscriptos_count,
                "inscriptos_confirmados": inscriptos_confirmados,
                "cupo_maximo": e.cupo_maximo,
                "estado_evento": e.id_estado,
                "tipo": e.tipo_nombre,
                "descripcion": e.descripcion or "",
                "ubicacion_completa": e.ubicacion or "",
                "distancia_km": float(e.distancia_km or 0),
            })

        # ── Tendencias globales por ubicación (Queda igual, ya era global) ──
        eventos_globales = (
            db.query(
                Evento.nombre_evento,
                Evento.ubicacion,
                Evento.fecha_evento,
                Evento.id_estado,
                Evento.distancia_km,
                TipoEvento.nombre.label("tipo_nombre"),
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .filter(Evento.id_estado.in_([3, 4]))
            .all()
        )

        tendencias_dict: dict = {}
        for evento in eventos_globales:
            provincia = ReporteService._extraer_provincia(evento.ubicacion).strip().title()
            localidad = ReporteService._extraer_localidad(evento.ubicacion).strip().title()

            if provincia not in tendencias_dict:
                tendencias_dict[provincia] = {"provincia": provincia, "total_eventos": 0, "localidades": {}}

            if localidad not in tendencias_dict[provincia]["localidades"]:
                tendencias_dict[provincia]["localidades"][localidad] = {
                    "localidad": localidad, "cantidad": 0, "eventos": []
                }

            tendencias_dict[provincia]["localidades"][localidad]["eventos"].append({
                "nombre": evento.nombre_evento,
                "tipo": evento.tipo_nombre,
                "distancia_km": float(evento.distancia_km or 0),
                "fecha_evento": evento.fecha_evento.strftime('%Y-%m-%d') if evento.fecha_evento else "Sin fecha",
                "estado": evento.id_estado,
            })
            tendencias_dict[provincia]["localidades"][localidad]["cantidad"] += 1
            tendencias_dict[provincia]["total_eventos"] += 1

        tendencias_ubicacion = []
        for prov_data in tendencias_dict.values():
            prov_data["localidades"] = list(prov_data["localidades"].values())
            tendencias_ubicacion.append(prov_data)
        tendencias_ubicacion.sort(key=lambda x: x["total_eventos"], reverse=True)
        tendencias_ubicacion = tendencias_ubicacion[:10]

        return {
            "mis_eventos_total": stats_base["mis_eventos_total"],
            "mis_eventos_por_estado": stats_base["mis_eventos_por_estado"],
            "lista_eventos_detallada": lista_eventos,
            "rendimiento_por_tipo": rendimiento_tipo,
            "total_reservas_recibidas": sum(e["reservas"] for e in lista_eventos),
            "recaudacion_total": round(total_recaudado, 2),
            "detalle_recaudacion": detalle_recaudacion,
            "tendencias_ubicacion": tendencias_ubicacion,
        }

    @staticmethod
    def reportes_cliente(db: Session, id_usuario: int):
        """
        REPORTES CLIENTE - Mis inscripciones y actividad
        """
        # Obtener todas las reservas del cliente
        reservas = db.query(
            ReservaEvento.id_reserva,
            ReservaEvento.id_estado_reserva,
            ReservaEvento.fecha_reserva,
            Evento.id_evento,
            Evento.nombre_evento,
            Evento.fecha_evento,
            Evento.costo_participacion,
            Evento.ubicacion,
            TipoEvento.nombre.label("tipo"),
            EstadoReserva.nombre.label("estado_reserva")
        ).join(Evento, ReservaEvento.id_evento == Evento.id_evento)\
         .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)\
         .join(EstadoReserva, ReservaEvento.id_estado_reserva == EstadoReserva.id_estado_reserva)\
         .filter(ReservaEvento.id_usuario == id_usuario)\
         .order_by(ReservaEvento.fecha_reserva.desc()).all()
        
        mis_inscripciones = [{
            "reserva_id": r.id_reserva,
            "evento_id": r.id_evento,
            "evento_nombre": r.nombre_evento,
            "fecha_evento": r.fecha_evento.strftime('%Y-%m-%d') if r.fecha_evento else None,
            "fecha_reserva": r.fecha_reserva.strftime('%Y-%m-%d') if r.fecha_reserva else None,
            "costo": float(r.costo_participacion or 0),
            "ubicacion": r.ubicacion,
            "tipo": r.tipo,
            "estado": r.estado_reserva,
            "estado_id": r.id_estado_reserva
        } for r in reservas]
        
        # Estadísticas
        total_inscripciones = len(mis_inscripciones)
        confirmadas = sum(1 for i in mis_inscripciones if i["estado_id"] == 2)
        pendientes = sum(1 for i in mis_inscripciones if i["estado_id"] == 1)
        canceladas = sum(1 for i in mis_inscripciones if i["estado_id"] == 3)
        
        total_gastado = sum(i["costo"] for i in mis_inscripciones if i["estado_id"] == 2)
        
        return {
            "mis_inscripciones": mis_inscripciones,
            "total_inscripciones": total_inscripciones,
            "confirmadas": confirmadas,
            "pendientes": pendientes,
            "canceladas": canceladas,
            "total_gastado": round(total_gastado, 2)
        }