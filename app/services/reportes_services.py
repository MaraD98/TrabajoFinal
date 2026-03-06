from collections import Counter
from sqlalchemy.orm import Session
from sqlalchemy import func, case, text
from app.models.eliminacion_models import EliminacionEvento
from app.models.auth_models import Usuario, Rol
from app.models.evento_solicitud_models import EstadoSolicitud, SolicitudPublicacion
from app.models.registro_models import Evento, TipoEvento, NivelDificultad
from app.models.inscripcion_models import EstadoReserva, ReservaEvento
from datetime import datetime
import calendar

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
    def reportes_admin(db: Session, anio: int = None, mes: int = None, fecha_inicio: str = None, fecha_fin: str = None):
        filtros = []
        
        # 1. AHORA SÍ RECIBIMOS LAS FECHAS DEL FRONTEND
        if fecha_inicio:
            filtros.append(Evento.fecha_evento >= f"{fecha_inicio} 00:00:00")
        if fecha_fin:
            filtros.append(Evento.fecha_evento <= f"{fecha_fin} 23:59:59")

        # 2. FILTROS POR AÑO/MES (Por si se usan en otra vista)
        if anio and mes:
            _, ultimo_dia = calendar.monthrange(anio, mes)
            filtros.append(Evento.fecha_evento >= f"{anio}-{mes:02d}-01 00:00:00")
            filtros.append(Evento.fecha_evento <= f"{anio}-{mes:02d}-{ultimo_dia} 23:59:59")
        elif anio:
            filtros.append(Evento.fecha_evento >= f"{anio}-01-01 00:00:00")
            filtros.append(Evento.fecha_evento <= f"{anio}-12-31 23:59:59")

        # 3. EL ESCUDO ANTI-COLAPSO (Si el front manda la petición vacía)
        if not filtros:
            anio_actual = datetime.now().year
            filtros.append(Evento.fecha_evento >= f"{anio_actual}-01-01 00:00:00")
            filtros.append(Evento.fecha_evento <= f"{anio_actual}-12-31 23:59:59")

        # -- CONTEOS BÁSICOS ORIGINALES --
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
        
        # A. Traemos TODAS las métricas de reservas en una sola consulta ultra rápida
        reservas_stats = (
            db.query(
                ReservaEvento.id_evento,
                func.sum(case((ReservaEvento.id_estado_reserva == 2, 1), else_=0)).label("confirmadas"),
                func.count(ReservaEvento.id_reserva).label("total_reservas")
            )
            .join(Evento, ReservaEvento.id_evento == Evento.id_evento) # <-- Agregamos esto
            .filter(*filtros) # <-- AGREGAMOS LOS FILTROS ACÁ
            .group_by(ReservaEvento.id_evento)
            .all()
        )
        
        # Armamos un diccionario para buscar rápido
        reservas_map = {
            row.id_evento: {
                "confirmadas": int(row.confirmadas or 0),
                "total": int(row.total_reservas or 0)
            } for row in reservas_stats
        }

        # B. Eventos limpios, SIN outerjoin a reservas y SIN group_by (esto vuela en la BD)
        eventos_query = (
            db.query(
                Evento,
                TipoEvento.nombre.label("tipo_nombre"),
                NivelDificultad.nombre.label("dificultad_nombre"),
                Usuario.id_rol,
                Usuario.nombre_y_apellido.label("organizador")
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .outerjoin(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad)
            .join(Usuario, Evento.id_usuario == Usuario.id_usuario)
            .filter(*filtros)
            # Como ya no unimos reservas, el group_by ya no es necesario
            .order_by(Evento.fecha_evento.desc())
            .all()
        )

        lista_eventos_detallada = []
        total_recaudado = 0.0
        total_reservas_recibidas = 0

        # C. Armamos la lista y buscamos las reservas en el diccionario de Python
        for e, tipo_nombre, dificultad_nombre, id_rol, organizador in eventos_query:
            
            # Buscamos las estadísticas de este evento en el mapa (instantáneo)
            stats = reservas_map.get(e.id_evento, {"confirmadas": 0, "total": 0})
            confirmadas = stats["confirmadas"]
            total_reservas = stats["total"]
            
            costo = float(e.costo_participacion or 0)
            monto_evento = costo * confirmadas
            total_recaudado += monto_evento
            total_reservas_recibidas += total_reservas
            
            pertenencia = "Propio" if id_rol in [1, 2] else "Externo"

            lista_eventos_detallada.append({
                "id": e.id_evento,
                "nombre": e.nombre_evento,
                "fecha_evento": e.fecha_evento.strftime('%Y-%m-%d') if e.fecha_evento else "Sin fecha",
                "estado": e.id_estado,
                "tipo": tipo_nombre,
                "dificultad": dificultad_nombre or "Sin Dificultad",
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
        recaudacion_por_evento = sorted(
            [e for e in lista_eventos_detallada if e["estado"] in [3, 4]], 
            key=lambda x: x["monto_recaudado"], 
            reverse=True
        )

       # ═════════════════════════════════════════════════════════════════════
        # 5. Usuarios Nuevos (VERDADERAMENTE OPTIMIZADO)
        # ═════════════════════════════════════════════════════════════════════
        
        # A. Traemos SOLO los usuarios registrados en el rango de fechas
        query_usuarios = db.query(Usuario).filter(Usuario.id_rol.in_([1, 2, 3, 4]))
        
        # Usamos fecha_registro o fecha_creacion según como se llame en tu modelo
        col_fecha_user = getattr(Usuario, 'fecha_registro', getattr(Usuario, 'fecha_creacion', None))
        
        if col_fecha_user:
            if fecha_inicio:
                query_usuarios = query_usuarios.filter(col_fecha_user >= f"{fecha_inicio} 00:00:00")
            if fecha_fin:
                query_usuarios = query_usuarios.filter(col_fecha_user <= f"{fecha_fin} 23:59:59")
            # El escudo: si no hay fechas, traemos los de este año
            elif not fecha_inicio and not fecha_fin and not anio and not mes:
                query_usuarios = query_usuarios.filter(col_fecha_user >= f"{datetime.now().year}-01-01 00:00:00")

        usuarios_nuevos_query = query_usuarios.all()

        # B. Sacamos los IDs de esos poquitos usuarios
        ids_usuarios = [u.id_usuario for u in usuarios_nuevos_query]

        dict_reservas = {}
        dict_eventos = {}

        # C. SOLO buscamos reservas y eventos si encontramos usuarios nuevos
        if ids_usuarios:
            reservas_crudas = (
                db.query(ReservaEvento.id_usuario, Evento.nombre_evento, Evento.fecha_evento)
                .join(Evento, ReservaEvento.id_evento == Evento.id_evento)
                .filter(ReservaEvento.id_estado_reserva == 2)
                .filter(ReservaEvento.id_usuario.in_(ids_usuarios)) # <-- ¡LA MAGIA ESTÁ ACÁ!
                .all()
            )
            
            for r in reservas_crudas:
                dict_reservas.setdefault(r.id_usuario, []).append({
                    "evento": r.nombre_evento, 
                    "fecha": r.fecha_evento.strftime('%d/%m/%Y') if r.fecha_evento else ""
                })

            eventos_creados_crudos = (
                db.query(Evento.id_usuario, Evento.nombre_evento, Evento.fecha_evento)
                .filter(Evento.id_usuario.in_(ids_usuarios)) # <-- ¡Y ACÁ!
                .all()
            )
            
            for e in eventos_creados_crudos:
                dict_eventos.setdefault(e.id_usuario, []).append({
                    "evento": e.nombre_evento, 
                    "fecha": e.fecha_evento.strftime('%d/%m/%Y') if e.fecha_evento else ""
                })

        # D. Armamos la lista final rapidísimo
        usuarios_nuevos = []
        mapa_roles = { 1: "Administrador", 2: "Supervisor", 3: "Organización Externa", 4: "Cliente" }

        for u in usuarios_nuevos_query:
            fecha_creacion = getattr(u, 'fecha_creacion', None) or getattr(u, 'fecha_registro', None)
            
            insc_list = dict_reservas.get(u.id_usuario, [])
            ev_list = dict_eventos.get(u.id_usuario, [])

            usuarios_nuevos.append({
                "id": u.id_usuario,
                "nombre": u.nombre_y_apellido,
                "email": getattr(u, 'email', 'Sin Email'),
                "rol": mapa_roles.get(u.id_rol, "Desconocido"), 
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
            "top_10_recaudacion": recaudacion_por_evento, # Mantenemos el nombre de la clave para no romper el front, pero con la lista completa
            "usuarios_nuevos": usuarios_nuevos
        }

    @staticmethod
    def reportes_supervisor(db: Session, id_usuario: int, anio: int = None, mes: int = None, fecha_inicio: str = None, fecha_fin: str = None):
        filtros = []
        
        # ── 1. FILTROS VIEJOS (OPTIMIZADOS SIN FUNC.EXTRACT) ──
        if anio and mes:
            _, ultimo_dia = calendar.monthrange(anio, mes)
            filtros.append(Evento.fecha_evento >= f"{anio}-{mes:02d}-01 00:00:00")
            filtros.append(Evento.fecha_evento <= f"{anio}-{mes:02d}-{ultimo_dia} 23:59:59")
        elif anio:
            filtros.append(Evento.fecha_evento >= f"{anio}-01-01 00:00:00")
            filtros.append(Evento.fecha_evento <= f"{anio}-12-31 23:59:59")
            
        # ── 2. FILTROS DE FECHA EXACTA (Front-end actual) ──
        if fecha_inicio:
            filtros.append(Evento.fecha_evento >= f"{fecha_inicio} 00:00:00")
        if fecha_fin:
            filtros.append(Evento.fecha_evento <= f"{fecha_fin} 23:59:59")

        # ── 3. EL ESCUDO ANTI-COLAPSO ──
        # Si el front no mandó ninguna fecha (petición reportes/ vacía), 
        # forzamos el año actual para que la DB no escanee millones de registros.
        if not filtros:
            anio_actual = datetime.now().year
            filtros.append(Evento.fecha_evento >= f"{anio_actual}-01-01 00:00:00")
            filtros.append(Evento.fecha_evento <= f"{anio_actual}-12-31 23:59:59")

        # ── 1. UNIFICAMOS LAS CONSULTAS ──
        # Traemos TODOS los datos necesarios de una sola vez
        eventos_base = (
            db.query(
                Evento.id_evento, Evento.nombre_evento, Evento.fecha_evento,
                Evento.cupo_maximo, Evento.costo_participacion, Evento.id_estado,
                Usuario.id_usuario, Usuario.nombre_y_apellido, Usuario.email, Usuario.id_rol,
                Rol.nombre_rol
            )
            .join(Usuario, Evento.id_usuario == Usuario.id_usuario)
            .join(Rol, Usuario.id_rol == Rol.id_rol)
            .filter(Evento.id_estado.in_([3, 4, 5]))
            .filter(*filtros)
            .all()
        )

        # Sacamos los IDs de los eventos que encontramos
        eventos_ids = [e.id_evento for e in eventos_base]

        # ── 2. MAPA DE RESERVAS (Súper optimizado) ──
        # Solo buscamos las reservas de los eventos que trajimos arriba
        reservas_dict = {}
        if eventos_ids:
            reservas_agrupadas = (
                db.query(
                    ReservaEvento.id_evento,
                    func.sum(case((ReservaEvento.id_estado_reserva == 2, 1), else_=0)).label("confirmadas"),
                    func.sum(case((ReservaEvento.id_estado_reserva == 1, 1), else_=0)).label("pendientes")
                )
                .filter(ReservaEvento.id_evento.in_(eventos_ids)) # <--- Magia pura: solo los IDs filtrados
                .group_by(ReservaEvento.id_evento)
                .all()
            )
            reservas_dict = {
                r.id_evento: {"confirmadas": int(r.confirmadas or 0), "pendientes": int(r.pendientes or 0)} 
                for r in reservas_agrupadas
            }

        # ── 3. ARMAMOS LOS 3 REPORTES EN MEMORIA ──
        org_dict = {}
        top_ocupacion = []
        dashboard_eventos = []

        for row in eventos_base:
            uid = row.id_usuario
            stats = reservas_dict.get(row.id_evento, {"confirmadas": 0, "pendientes": 0})
            
            # --- A. Organizadores ---
            if uid not in org_dict:
                org_dict[uid] = {
                    "id_usuario": uid, "organizador": row.nombre_y_apellido,
                    "email": row.email, "rol": row.nombre_rol,
                    "total_eventos": 0, "activos": 0, "finalizados": 0, "recaudacion_total": 0.0
                }
            
            org_dict[uid]["total_eventos"] += 1
            if row.id_estado == 3: org_dict[uid]["activos"] += 1
            elif row.id_estado == 4: org_dict[uid]["finalizados"] += 1
            
            org_dict[uid]["recaudacion_total"] += (stats["confirmadas"] * float(row.costo_participacion or 0))

            # --- B. Dashboard Sistema ---
            estado_str = "Activo" if row.id_estado == 3 else ("Finalizado" if row.id_estado == 4 else "Cancelado")
            pertenencia = "Propio" if row.id_rol in [1, 2] else "Externo"
            
            dashboard_eventos.append({
                "id_evento": row.id_evento,
                "nombre_evento": row.nombre_evento,
                "fecha_evento": row.fecha_evento.strftime('%Y-%m-%d') if row.fecha_evento else "Sin fecha",
                "responsable": row.nombre_y_apellido,
                "estado": estado_str,
                "pertenencia": pertenencia
            })

            # --- C. Ocupación ---
            if row.cupo_maximo > 0 and row.id_estado in [3, 4]:
                inscriptos = stats["confirmadas"]
                reservados = stats["pendientes"]
                total_ocupado = inscriptos + reservados
                cupo = int(row.cupo_maximo)
                tasa = (total_ocupado / cupo * 100) if cupo > 0 else 0

                top_ocupacion.append({
                    "id_evento": row.id_evento,
                    "nombre_evento": row.nombre_evento,
                    "fecha_evento": row.fecha_evento.isoformat() if row.fecha_evento else None,
                    "cupo_maximo": cupo,
                    "inscriptos_pagos": inscriptos,
                    "reservados_no_pagos": reservados,
                    "total_ocupado": total_ocupado,
                    "tasa_ocupacion": round(tasa, 2),
                    "es_pago": float(row.costo_participacion or 0) > 0,
                    "pertenencia": pertenencia 
                })

        # Ordenamos los resultados
        analisis_organizadores = list(org_dict.values())
        analisis_organizadores.sort(key=lambda x: x["recaudacion_total"], reverse=True)
        top_ocupacion.sort(key=lambda x: x["tasa_ocupacion"], reverse=True)

        # ── 4. Solicitudes Externas (Este no lo tocamos) ──
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
                EliminacionEvento.motivo_eliminacion.label("motivo_eliminacion"),
                NivelDificultad.nombre.label("dificultad_nombre"), # <--- AGREGADO
                Usuario.id_rol.label("id_rol_creador")             # <--- AGREGADO
            )
            .join(TipoEvento, Evento.id_tipo == TipoEvento.id_tipo)
            .outerjoin(NivelDificultad, Evento.id_dificultad == NivelDificultad.id_dificultad) # <--- AGREGADO
            .join(Usuario, Evento.id_usuario == Usuario.id_usuario)                            # <--- AGREGADO
            .outerjoin(ReservaEvento, Evento.id_evento == ReservaEvento.id_evento)
            .outerjoin(EliminacionEvento, Evento.id_evento == EliminacionEvento.id_evento)
            .group_by(Evento.id_evento, TipoEvento.nombre, EliminacionEvento.motivo_eliminacion, NivelDificultad.nombre, Usuario.id_rol) # <--- AGREGADO AL GROUP BY
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
                "motivo": e.motivo_eliminacion,
                # ✅ ¡AHORA SÍ, LA MAGIA!
                "dificultad": e.dificultad_nombre or "Sin Dificultad",
                "pertenencia": "Propio" if e.id_rol_creador in [1, 2] else "Externo",
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