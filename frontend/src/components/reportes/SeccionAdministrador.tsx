import { useState } from 'react';
import { TarjetasMetricas } from '../modals/reportesModal/TarjetasMetricas';

export default function SeccionAdministrador({
  // Props o estados globales que necesita recibir:
  usuarioRol,
  reporteData,
  usuariosPorMes,
  mesesOrdenados,
  maxEventosProvincia,
  // Props de Métricas - Eventos
  totalEventosGlobal, eventosFuturos, eventosPasados, eventosPropiosCount, eventosExternosCount,
  // Props de Métricas - Participantes
  totalConfirmadas, totalPendientes, promedioParticipantes, ocupacionGlobal,
  // Props de Métricas - Financiero
  totalRecaudadoGlobal, cantidadGratuitos, cantidadPagos, recaudadoPropios, recaudadoExternos,
  // Funciones para abrir modales
  setModalEventosGlobal, setModalParticipantes, setModalFinanciero, setModalAdminEvento,
  setModalFiltroTorta,
  exportando,
  handleExportarCSV,
  renderGraficoTorta,
  tendenciasFiltradas,
  tabTendencias,
  setTabTendencias,
  filtroTipoTendencias,
  setFiltroTipoTendencias,
  TIPOS_EVENTO,
  provinciaExpandida,
  setProvinciaExpandida,
  localidadExpandida,
  setLocalidadExpandida
}: any) {

  // --- Estados locales para los filtros y acordeones de esta sección ---
  const [filtroPertenenciaAdmin, setFiltroPertenenciaAdmin] = useState('Todos');
  const [mesExpandido, setMesExpandido] = useState(null);
  const [provinciaExpandidaAdmin, setProvinciaExpandidaAdmin] = useState(null);
  

  return (
    <div className="seccion-administrador-container">
      {/* ── Tarjetas Admin ────────────────────────────────── */}
      {(usuarioRol === 1) && (
        <>
          <div style={{ display: "flex", gap: "20px", marginBottom: "40px", flexWrap: "wrap" }}>
            {/* BLOQUE DE TARJETAS DE MÉTRICAS */}
            <TarjetasMetricas
              // Props Eventos
              totalEventosGlobal={totalEventosGlobal}
              eventosFuturos={eventosFuturos}
              eventosPasados={eventosPasados}
              eventosPropiosCount={eventosPropiosCount}
              eventosExternosCount={eventosExternosCount}
              onAbrirModalEventos={() => setModalEventosGlobal(true)}

              // Props Participantes
              totalConfirmadas={totalConfirmadas}
              totalPendientes={totalPendientes}
              promedioParticipantes={promedioParticipantes}
              ocupacionGlobal={ocupacionGlobal}
              onAbrirModalParticipantes={() => setModalParticipantes(true)}

              // Props Financiera
              usuarioRol={usuarioRol}
              totalRecaudadoGlobal={totalRecaudadoGlobal}
              cantidadGratuitos={cantidadGratuitos}
              cantidadPagos={cantidadPagos}
              recaudadoPropios={recaudadoPropios}
              recaudadoExternos={recaudadoExternos}
              onAbrirModalFinanciero={() => setModalFinanciero(true)}
            />
          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              TOP 10 DE EVENTOS POR RECAUDACIÓN (Actualizado)
          ═════════════════════════════════════════════════════════════════════ */}
          <div className="reportes-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3>🏆 Top 10 Eventos por Recaudación</h3>
              <select 
                value={filtroPertenenciaAdmin} 
                onChange={(e) => setFiltroPertenenciaAdmin(e.target.value)}
                style={{ padding: "6px", borderRadius: "5px", backgroundColor: "#1e293b", color: "#fff", border: "1px solid #334155" }}
              >
                <option value="Todos">Mostrar Todos</option>
                <option value="Propio">Solo Propios</option>
                <option value="Externo">Solo Externos</option>
              </select>
            </div>
            
            <div style={{ overflowX: "auto" }}>
              <table className="tabla-reportes-custom">
                <thead>
                  <tr>
                    <th style={{ textAlign: "center" }}>Posición</th>
                    <th>Evento</th>
                    <th>Pertenencia</th>
                    <th style={{ textAlign: "center" }}>Valor Unitario</th>
                    <th style={{ textAlign: "center" }}>Cupo</th>
                    <th style={{ textAlign: "right" }}>Recaudación</th>
                    <th style={{ textAlign: "center" }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {(reporteData?.top_10_recaudacion || [])
                    .filter((e: any) => filtroPertenenciaAdmin === 'Todos' || e.pertenencia === filtroPertenenciaAdmin)
                    .slice(0, 10)
                    .map((evt: any, index: number) => (
                      <tr key={evt.id}>
                        <td style={{ textAlign: "center", fontWeight: "900", color: index < 3 ? "#fbbf24" : "#cbd5e1", fontSize: "1.1rem" }}>
                          #{index + 1}
                        </td>
                        <td style={{ fontWeight: "bold" }}>{evt.nombre}</td>
                        <td>
                          <span className="badge-tipo" style={{ backgroundColor: evt.pertenencia === "Propio" ? "#8b5cf6" : "#4b5563" }}>
                            {evt.pertenencia}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          ${evt.costo_participacion.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>
                          <span style={{ color: "#3b82f6" }}>{evt.reservas_totales}</span> 
                          <span style={{ color: "#64748b" }}> / {evt.cupo_maximo || "∞"}</span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: "bold", color: "#4ade80" }}>
                          ${evt.monto_recaudado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button 
                            onClick={() => setModalAdminEvento(evt)}
                            style={{ padding: "6px 12px", backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold", transition: "0.2s" }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#3b82f6"}
                          >
                            Ver más
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              NUEVO REPORTE: REGISTRO DE USUARIOS NUEVOS (CONECTADO)
          ═════════════════════════════════════════════════════════════════════ */}
          <div style={{ display: "flex", gap: "20px", marginTop: "40px", flexWrap: "wrap", alignItems: "stretch" }}>
            
            {/* LADO IZQUIERDO: Tabla Detallada Conectada */}
            <div style={{ flex: "1 1 55%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155", minHeight: "450px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0 }}>👥 Registro de Usuarios Nuevos</h3>
                {mesExpandido && (
                  <span className="badge-tipo" style={{ backgroundColor: "#3b82f6" }}>Mes: {mesExpandido}</span>
                )}
              </div>

              {!mesExpandido ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "#64748b", textAlign: "center" }}>
                  <span style={{ fontSize: "3rem", marginBottom: "15px" }}>👉</span>
                  <h4 style={{ margin: 0, color: "#94a3b8" }}>Seleccioná un mes</h4>
                  <p style={{ maxWidth: "300px", marginTop: "10px" }}>Hacé clic en algún mes del panel derecho para ver el listado completo de usuarios registrados.</p>
                </div>
              ) : (
                <div style={{ overflowY: "auto", flex: 1, paddingRight: "5px" }}>
                  <table className="tabla-reportes-custom">
                    <thead>
                      <tr>
                        <th>Usuario / Email</th>
                        <th>Rol</th>
                        <th style={{ textAlign: "center" }}>Día</th>
                        <th style={{ textAlign: "center" }}>Actividad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosPorMes[mesExpandido]?.usuarios?.map((u: any, idx: any) => (
                        <tr key={idx}>
                          <td>
                            <div style={{ fontWeight: "bold", color: "#f8fafc" }}>{u.nombre}</div>
                            <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>{u.email}</div>
                          </td>
                          <td>
                            <span className="badge-tipo" style={{ backgroundColor: u.rol === "Organización Externa" ? "#f97316" : "#0ea5e9" }}>
                              {u.rol}
                            </span>
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "bold", color: "#cbd5e1" }}>
                            {u.fecha_creacion ? u.fecha_creacion.split('/')[0] : "-"}
                          </td>
                          <td style={{ textAlign: "center", fontSize: "0.85rem", color: "#94a3b8" }}>
                            {u.rol === "Cliente" ? (
                              <span><strong style={{ color: "#4ade80" }}>{u.cantidad_inscripciones}</strong> inscrip.</span>
                            ) : (
                              <span><strong style={{ color: "#8b5cf6" }}>{u.cantidad_eventos_creados}</strong> eventos</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* LADO DERECHO: Acordeón por Mes y Día */}
            <div style={{ flex: "1 1 40%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155", minHeight: "450px", display: "flex", flexDirection: "column" }}>
              <h3 style={{ margin: "0 0 20px 0" }}>📈 Nuevos Registros por Mes</h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", flex: 1, paddingRight: "5px" }}>
                {mesesOrdenados?.map((mes: any, index: any) => (
                  <div key={index} style={{ backgroundColor: "#1e293b", borderRadius: "8px", overflow: "hidden", border: mesExpandido === mes ? "1px solid #3b82f6" : "1px solid transparent", transition: "0.2s" }}>
                    
                    {/* Botón del Mes */}
                    <div 
                      onClick={() => setMesExpandido(mesExpandido === mes ? null : mes)}
                      style={{ padding: "12px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: mesExpandido === mes ? "1px solid #334155" : "none" }}
                    >
                      <strong style={{ color: "#f8fafc", fontSize: "1.1rem" }}>{mes}</strong>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ color: "#94a3b8", fontSize: "0.9rem" }}>{usuariosPorMes[mes]?.total} total</span>
                        <span style={{ color: "#94a3b8" }}>{mesExpandido === mes ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    
                    {/* Desplegable de los Días */}
                    {mesExpandido === mes && (
                      <div style={{ padding: "10px 15px", backgroundColor: "#0f172a" }}>
                        {Object.keys(usuariosPorMes[mes]?.dias || {}).sort((a,b) => parseInt(a)-parseInt(b)).map(dia => {
                          const stats = usuariosPorMes[mes].dias[dia];
                          return (
                            <div key={dia} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1e293b", fontSize: "0.9rem" }}>
                              <span style={{ color: "#cbd5e1", fontWeight: "bold" }}>Día {dia}</span>
                              <div style={{ textAlign: "right", display: "flex", gap: "10px" }}>
                                {stats.clientes > 0 && (
                                  <span style={{ color: "#0ea5e9" }}><strong>{stats.clientes}</strong> Clientes</span>
                                )}
                                {stats.organizaciones > 0 && (
                                  <span style={{ color: "#f97316" }}><strong>{stats.organizaciones}</strong> Org.</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              NUEVO MAPA DE CALOR: DENSIDAD POR PROVINCIA (Unificado y Visual)
          ═════════════════════════════════════════════════════════════════════ */}
          <div className="reportes-card" style={{ marginTop: "40px", marginBottom: "40px" }}>
            <div style={{ marginBottom: "20px" }}>
              <h3>📍 Mapa de Densidad por Provincia</h3>
              <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>
                Medidor de concentración de eventos. Hacé clic en un evento para ver sus detalles completos.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              {reporteData?.tendencias_ubicacion_completa?.map((prov: any, index: any) => {
                const porcentajeCalor = (prov.total_eventos / (maxEventosProvincia || 1)) * 100;
                const todosEventosProvincia = prov.localidades.flatMap((loc: any) => loc.eventos);

                return (
                  <div key={index} style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", overflow: "hidden" }}>
                    
                    {/* Fila clickeable principal con la BARRA DE CALOR de fondo */}
                    <div 
                      onClick={() => setProvinciaExpandidaAdmin(provinciaExpandidaAdmin === prov.provincia ? null : prov.provincia)}
                      style={{ position: "relative", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", zIndex: 1 }}
                    >
                      <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${porcentajeCalor}%`, backgroundColor: porcentajeCalor > 70 ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)", zIndex: -1, transition: "width 1s" }}></div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "1.2rem" }}>{porcentajeCalor > 70 ? "🔥" : "🗺️"}</span>
                        <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "1.1rem" }}>{prov.provincia}</h4>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <strong style={{ color: porcentajeCalor > 70 ? "#ef4444" : "#fbbf24" }}>{prov.total_eventos} Eventos</strong>
                        <span style={{ color: "#94a3b8" }}>{provinciaExpandidaAdmin === prov.provincia ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* Desplegable con los eventos */}
                    {provinciaExpandidaAdmin === prov.provincia && (
                      <div style={{ padding: "15px 20px", borderTop: "1px solid #334155", backgroundColor: "#1e293b" }}>
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {todosEventosProvincia.map((evento: any, i: any) => (
                            <li 
                              key={i} 
                              onClick={() => setModalAdminEvento(evento)}
                              style={{ backgroundColor: "#0f172a", padding: "10px", borderRadius: "6px", display: "flex", justifyContent: "space-between", cursor: "pointer", border: "1px solid #334155" }}
                              onMouseOver={(e) => e.currentTarget.style.borderColor = "#3b82f6"}
                              onMouseOut={(e) => e.currentTarget.style.borderColor = "#334155"}
                            >
                              <div>
                                <strong style={{ color: "#e2e8f0" }}>{evento.nombre}</strong>
                                <span style={{ color: "#94a3b8", fontSize: "0.85rem", marginLeft: "10px" }}>{evento.tipo}</span>
                              </div>
                              <span style={{ color: evento.pertenencia === "Propio" ? "#8b5cf6" : "#4b5563", fontSize: "0.85rem", fontWeight: "bold" }}>
                                {evento.pertenencia}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ════════════════════════════════════════════════════════════════
                    ADMIN — Gráficos del sistema
                ════════════════════════════════════════════════════════════════ */}
                <div className="reportes-graficos" style={{ marginTop: '2rem' }}>
                    {usuarioRol === 1 && (reporteData?.eventos_por_tipo ?? []).length > 0 && (
                    <div className="grafico-card">
                        <div className="grafico-card__header">
                        <h3>🏃‍♂️ Eventos por Tipo</h3>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button onClick={() => setModalFiltroTorta({ titulo: "Todos los Tipos", filtroKey: "tipo", valor: "TODOS" })} className="btn-export" style={{ backgroundColor: "#3b82f6", color: "#fff" }}>
                            Ver Detalles
                            </button>
                            <button data-html2canvas-ignore="true" disabled={exportando === "eventos_por_tipo"} onClick={() => handleExportarCSV("eventos_por_tipo")} className="btn-export">
                            {exportando === "eventos_por_tipo" ? "..." : "📥 CSV"}
                            </button>
                        </div>
                        </div>
                        <div className="grafico-card__body">
                        {renderGraficoTorta(reporteData?.eventos_por_tipo ?? [], "tipo", "cantidad", "Detalle por Tipo")}
                        </div>
                    </div>
                    )}

                    {usuarioRol <= 2 && (reporteData?.eventos_por_dificultad ?? []).length > 0 && (
                    <div className="grafico-card">
                        <div className="grafico-card__header">
                        <h3>🧗 Eventos por Dificultad</h3>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button onClick={() => setModalFiltroTorta({ titulo: "Todas las Dificultades", filtroKey: "dificultad", valor: "TODOS" })} className="btn-export" style={{ backgroundColor: "#3b82f6", color: "#fff" }}>
                            Ver Detalles
                            </button>
                            <button data-html2canvas-ignore="true" disabled={exportando === "eventos_por_dificultad"} onClick={() => handleExportarCSV("eventos_por_dificultad")} className="btn-export">
                            {exportando === "eventos_por_dificultad" ? "..." : "📥 CSV"}
                            </button>
                        </div>
                        </div>
                        <div className="grafico-card__body">
                        {renderGraficoTorta(reporteData?.eventos_por_dificultad ?? [], "dificultad", "cantidad", "Detalle por Dificultad")}
                        </div>
                    </div>
                    )}
                </div>
                {/* fin .reportes-graficos */}

                {/* ════════════════════════════════════════════════════════════════
                    TENDENCIAS POR UBICACIÓN
                ════════════════════════════════════════════════════════════════ */}
                {tendenciasFiltradas?.length > 0 && (
                    <div className="grafico-card grafico-card--wide" style={{ marginTop: "30px" }}>
                    <div className="grafico-card__header">
                        <h3>🗺️ Tendencias por Ubicación — Análisis de Mercado (Top 10)</h3>
                        <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "5px" }}>
                        Datos globales del sistema para análisis estratégico de zonas con mayor actividad.
                        </p>
                    </div>

                    <div style={{ display: "flex", gap: "10px", padding: "15px 20px", borderBottom: "1px solid #333", flexWrap: "wrap", alignItems: "center" }}>
                        {(["activos", "pasados"]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setTabTendencias(tab)}
                            style={{
                            padding: "8px 16px",
                            background: tabTendencias === tab ? "#4ade80" : "transparent",
                            border: `2px solid ${tabTendencias === tab ? "#4ade80" : "#666"}`,
                            borderRadius: "6px",
                            color: tabTendencias === tab ? "#000" : "#fff",
                            fontWeight: "bold",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            }}
                        >
                            {tab === "activos" ? "📈 Eventos Activos" : "📊 Eventos Pasados"}
                        </button>
                        ))}

                        <select
                        value={filtroTipoTendencias}
                        onChange={(e) => setFiltroTipoTendencias(e.target.value)}
                        style={{
                            padding: "8px 14px",
                            background: "#0d0d0d",
                            border: "2px solid #666",
                            borderRadius: "6px",
                            color: "#fff",
                            fontSize: "0.9rem",
                            cursor: "pointer",
                        }}
                        >
                        <option value="">🚴 Todos los Tipos</option>
                        {TIPOS_EVENTO?.map((t: any) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                        </select>
                    </div>

                    <div className="grafico-card__body" style={{ padding: "20px" }}>
                        {tendenciasFiltradas
                        .sort((a: any, b: any) => b.total_eventos - a.total_eventos)
                        .slice(0, 10)
                        .map((prov: any, idx: any) => (
                            <div key={idx} style={{ marginBottom: "15px", border: "1px solid #333", borderRadius: "8px", overflow: "hidden" }}>
                            <div
                                onClick={() => setProvinciaExpandida(provinciaExpandida === prov.provincia ? null : prov.provincia)}
                                style={{ padding: "15px", background: "#252525", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderLeft: "4px solid #4ade80" }}
                            >
                                <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>{prov.provincia.toUpperCase()}</span>
                                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#4ade80" }}>
                                    {prov.localidades.reduce((s: any, loc: any) => s + loc.eventos.length, 0)} eventos
                                </span>
                                <span style={{ transition: "transform 0.3s", transform: provinciaExpandida === prov.provincia ? "rotate(180deg)" : "rotate(0deg)" }}>
                                    ▼
                                </span>
                                </div>
                            </div>

                            {provinciaExpandida === prov.provincia && (
                                <div style={{ padding: "10px 20px", background: "#1a1a1a" }}>
                                {prov.localidades.map((loc: any, li: any) => {
                                    const locKey = `${prov.provincia}-${loc.localidad}`;
                                    return (
                                    <div key={li} style={{ marginBottom: "10px" }}>
                                        <div
                                        onClick={() => setLocalidadExpandida(localidadExpandida === locKey ? null : locKey)}
                                        style={{ padding: "12px", background: "#2d2d2d", borderRadius: "6px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #444" }}
                                        >
                                        <span style={{ fontWeight: 500, color: "#e0e0e0" }}>{loc.localidad}</span>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <span style={{ color: "#4ade80", fontWeight: "bold" }}>{loc.eventos.length} eventos</span>
                                            <span style={{ fontSize: "0.8rem", color: "#888" }}>{localidadExpandida === locKey ? "▲" : "▼"}</span>
                                        </div>
                                        </div>

                                        {localidadExpandida === locKey && (
                                        <div style={{ marginTop: "5px", marginLeft: "20px" }}>
                                            {loc.eventos.map((evt: any, ei: any) => (
                                            <div key={ei} style={{ padding: "10px 14px", background: "#1a1a1a", marginBottom: "5px", borderRadius: "6px", fontSize: "0.85rem", border: "1px solid #2a2a2a", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                                <span style={{ color: "#e0e0e0", fontWeight: 500 }}>{evt.nombre}</span>
                                                <div style={{ display: "flex", gap: "16px", color: "#888", flexWrap: "wrap", fontSize: "0.82rem" }}>
                                                <span style={{ background: "#252525", padding: "2px 8px", borderRadius: "4px", color: "#a78bfa" }}>{evt.tipo}</span>
                                                <span>🚴 {evt.distancia_km} km</span>
                                                <span>📅 {new Date(evt.fecha_evento).toLocaleDateString("es-AR")}</span>
                                                <span style={{ color: evt.estado === 3 ? "#4ade80" : "#60a5fa", fontWeight: "bold" }}>
                                                    {evt.estado === 3 ? "● Activo" : "● Finalizado"}
                                                </span>
                                                </div>
                                            </div>
                                            ))}
                                        </div>
                                        )}
                                    </div>
                                    );
                                })}
                                </div>
                            )}
                            </div>
                        ))}
                        {tendenciasFiltradas?.length === 0 && (
                        <p className="no-data">
                            No hay eventos {tabTendencias === "activos" ? "activos" : "finalizados"} para mostrar
                            {filtroTipoTendencias ? ` del tipo "${filtroTipoTendencias}"` : ""}.
                        </p>
                        )}
                    </div>
                    </div>
                )}
    
          </div>
        </>
      )}
    </div>
  );
}