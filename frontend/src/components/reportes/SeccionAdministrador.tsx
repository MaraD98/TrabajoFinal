import { useState } from 'react';
import { TarjetasMetricas } from '../modals/reportesModal/TarjetasMetricas';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

export default function SeccionAdministrador({
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
  setLocalidadExpandida,
  fechaInicio,
  fechaFin,
  filtroPertenencia
}: any) {

  // --- ESTADOS ---
  const [mesExpandido, setMesExpandido] = useState<string | null>(null);
  const [modalDetalleUsuario, setModalDetalleUsuario] = useState<any>(null);
  const [ordenEventos, setOrdenEventos] = useState({ columna: 'monto_recaudado', direccion: 'desc' });
  const [ordenUsuarios, setOrdenUsuarios] = useState({ columna: 'dia', direccion: 'asc' });
  const [provinciaExpandidaAdmin, setProvinciaExpandidaAdmin] = useState(null);

  // --- LÓGICA DE ORDENAMIENTO ---
  const handleOrdenarMaster = (columna: any, tipoTabla: any) => {
    if (tipoTabla === 'eventos') {
      setOrdenEventos(prev => ({
        columna,
        direccion: prev.columna === columna && prev.direccion === 'asc' ? 'desc' : 'asc'
      }));
    } else if (tipoTabla === 'usuarios') {
      setOrdenUsuarios(prev => ({
        columna,
        direccion: prev.columna === columna && prev.direccion === 'asc' ? 'desc' : 'asc'
      }));
    }
  };

  // 1. PRIMERO: La función que filtra (para que exista antes de usarla)
const aplicarFiltrosUsuarios = (lista: any[]) => {
  if (!lista) return [];
  return lista.filter((u: any) => {
    // 1. Filtro de Pertenencia
    const rolNormalizado = u.rol === "Organización Externa" ? "externos" : "propios";
    const pasaPertenencia = !filtroPertenencia || filtroPertenencia === "todos" || rolNormalizado === filtroPertenencia;

    // 2. Filtro de Fechas (Conversión de DD/MM/YYYY a YYYY-MM-DD para comparar strings)
    const [d, m, a] = u.fecha_creacion.split('/');
    const fechaUsuarioISO = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    
    const pasaFechaInicio = !fechaInicio || fechaUsuarioISO >= fechaInicio;
    const pasaFechaFin = !fechaFin || fechaUsuarioISO <= fechaFin;

    return pasaPertenencia && pasaFechaInicio && pasaFechaFin;
  });
};

// 2. SEGUNDO: El gráfico usa la función que ya está creada arriba
const datosGrafico = (mesesOrdenados || [])
  .map((mesStr: string) => {
    const [mes, anio] = mesStr.split('/').map((num: any) => parseInt(num));
    
    // Obtenemos los usuarios y LOS FILTRAMOS ACÁ
    const listaUsuariosMes = usuariosPorMes[mesStr]?.usuarios || [];
    const listaFiltrada = aplicarFiltrosUsuarios(listaUsuariosMes);

    return {
      name: mesStr, 
      cantidad: listaFiltrada.length, 
      originalName: mesStr,
      sortValue: (anio * 12) + mes 
    };
  })
  .sort((a: any, b: any) => a.sortValue - b.sortValue);

  return (
    <div className="seccion-administrador-container">

      {(usuarioRol === 1) && (
        <>
        
          {/* ═════════════════════════════════════════════════════════════════════
              RANKING COMPLETO DE EVENTOS POR RECAUDACIÓN
          ═════════════════════════════════════════════════════════════════════ */}
          <div className="grafico-card grafico-card--wide" style={{ marginTop: "20px" }}>
            <div className="grafico-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>🏆 Ranking de eventos por recaudación</h3>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8', backgroundColor: '#334155', padding: '4px 12px', borderRadius: '20px' }}>
                {/* Filtramos la lista antes de contar el length */}
                  Mostrando {
                      reporteData?.top_10_recaudacion?.filter((evt: any) => {
                          const pertenenciaNormalizada = evt.pertenencia?.toLowerCase();
                          const filtroNormalizado = filtroPertenencia?.toLowerCase().replace(/s$/, "");
                          const pasaPertenencia = !filtroPertenencia || filtroPertenencia === "todos" || pertenenciaNormalizada === filtroNormalizado;
                          const pasaFechaInicio = !fechaInicio || evt.fecha_evento >= fechaInicio;
                          const pasaFechaFin = !fechaFin || evt.fecha_evento <= fechaFin;
                          return pasaPertenencia && pasaFechaInicio && pasaFechaFin;
                      }).length || 0
                  } eventos
              </span>
            </div>
            
            <div className="grafico-card__body">
              {/* Mantenemos el maxHeight para que tenga scroll interno si son muchos */}
              <div style={{ maxHeight: "600px", overflowY: "auto", overflowX: "auto", border: "1px solid #334155", borderRadius: "8px" }}>
                <table className="tabla-reportes-custom">
                  <thead style={{ position: "sticky", top: 0, backgroundColor: "#1e293b", zIndex: 10 }}>
                    <tr>
                      <th style={{ textAlign: "center" }}>Pos.</th>
                      
                      <th onClick={() => handleOrdenarMaster('nombre', 'eventos')} style={{ cursor: "pointer", userSelect: "none" }}>
                        Evento {ordenEventos.columna === 'nombre' ? (ordenEventos.direccion === 'asc' ? '🔼' : '🔽') : '↕️'}
                      </th>
                      
                      <th onClick={() => handleOrdenarMaster('pertenencia', 'eventos')} style={{ cursor: "pointer", userSelect: "none" }}>
                        Pertenencia {ordenEventos.columna === 'pertenencia' ? (ordenEventos.direccion === 'asc' ? '🔼' : '🔽') : '↕️'}
                      </th>
                      
                      <th onClick={() => handleOrdenarMaster('costo_participacion', 'eventos')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                        Valor Unit. {ordenEventos.columna === 'costo_participacion' ? (ordenEventos.direccion === 'asc' ? '🔼' : '🔽') : '↕️'}
                      </th>
                      
                      <th onClick={() => handleOrdenarMaster('reservas_totales', 'eventos')} style={{ textAlign: "center", cursor: "pointer", userSelect: "none" }}>
                        Inscriptos {ordenEventos.columna === 'reservas_totales' ? (ordenEventos.direccion === 'asc' ? '🔼' : '🔽') : '↕️'}
                      </th>
                      
                      <th onClick={() => handleOrdenarMaster('monto_recaudado', 'eventos')} style={{ textAlign: "right", cursor: "pointer", userSelect: "none" }}>
                        Recaudación {ordenEventos.columna === 'monto_recaudado' ? (ordenEventos.direccion === 'asc' ? '🔼' : '🔽') : '↕️'}
                      </th>
                      
                      <th style={{ textAlign: "center" }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reporteData?.top_10_recaudacion || [])
                        .filter((evt: any) => {
                          // 1. Lógica de Pertenencia
                          // Normalizamos a minúsculas y quitamos la 's' final para comparar "propio" con "propios"
                          const pertenenciaNormalizada = evt.pertenencia?.toLowerCase(); // "propio" o "externo"
                          const filtroNormalizado = filtroPertenencia?.toLowerCase().replace(/s$/, ""); // "todos", "propio", "externo"

                          const pasaPertenencia = 
                            !filtroPertenencia || 
                            filtroPertenencia === "todos" || 
                            pertenenciaNormalizada === filtroNormalizado;

                          // 2. Lógica de Fechas
                          // evt.fecha_evento viene del back como "YYYY-MM-DD" (según tu servicio Python)
                          // fechaInicio viene del input como "YYYY-MM-DD"
                          const fechaEvt = evt.fecha_evento; // String "2024-05-20"
                          
                          const pasaFechaInicio = !fechaInicio || fechaEvt >= fechaInicio;
                          const pasaFechaFin = !fechaFin || fechaEvt <= fechaFin;

                          // Retornamos la combinación de todos los filtros
                          return pasaPertenencia && pasaFechaInicio && pasaFechaFin;
                        })
                      .sort((a: any, b: any) => {
                        let valorA = a[ordenEventos.columna];
                        let valorB = b[ordenEventos.columna];
                        if (typeof valorA === 'string') {
                          return ordenEventos.direccion === 'asc' 
                            ? valorA.localeCompare(valorB) 
                            : valorB.localeCompare(valorA);
                        }
                        return ordenEventos.direccion === 'asc' ? valorA - valorB : valorB - valorA;
                      })
                      .map((evt: any, index: number) => (
                        <tr key={evt.id} style={{ borderBottom: "1px solid #1e293b" }}>
                          <td style={{ 
                            textAlign: "center", 
                            fontWeight: "900", 
                            color: index < 3 ? "#fbbf24" : "#94a3b8", // Oro para los primeros 3, gris para el resto
                            fontSize: index < 3 ? "1.2rem" : "1rem" 
                          }}>
                            #{index + 1}
                          </td>
                          <td style={{ fontWeight: "bold" }}>{evt.nombre}</td>
                          <td>
                            <span className="badge-tipo" style={{ 
                              backgroundColor: evt.pertenencia === "Propio" ? "#8b5cf6" : "#4b5563",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "0.8rem"
                            }}>
                              {evt.pertenencia}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            ${evt.costo_participacion.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "bold" }}>
                            <span style={{ color: "#3b82f6" }}>{evt.reservas_totales}</span> 
                            <span style={{ color: "#64748b", fontSize: '0.85rem' }}> / {evt.cupo_maximo || "∞"}</span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: "bold", color: "#4ade80" }}>
                            ${evt.monto_recaudado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button 
                              onClick={() => setModalAdminEvento(evt)}
                              className="btn-ver-mas" 
                              style={{ 
                                backgroundColor: "transparent", 
                                color: "#3b82f6", 
                                border: "1px solid #3b82f6",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                cursor: "pointer"
                              }}
                            >
                              Detalles
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mensaje de estado vacío */}
            {(!reporteData?.top_10_recaudacion || reporteData.top_10_recaudacion.length === 0) && (
                <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                    No hay datos de recaudación disponibles.
                </div>
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              NUEVO REPORTE: REGISTRO DE USUARIOS NUEVOS (CONECTADO)
          ═════════════════════════════════════════════════════════════════════ */}
          <div style={{ display: "flex", gap: "20px", marginTop: "40px", flexWrap: "wrap", alignItems: "stretch" }}>
            
            {/* LADO IZQUIERDO: Tabla Detallada Conectada */}
            <div style={{ flex: "1 1 55%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155", minHeight: "450px", display: "flex", flexDirection: "column" }}>
              

              {!mesExpandido ? (
            /* VISTA A: DASHBOARD DE EVOLUCIÓN */
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ textAlign: "left", marginBottom: "30px" }}>
                <h3 style={{ margin: 0, fontSize: "1.5rem" }}>👥 Evolución de registros en el tiempo</h3>
                <p style={{ color: "#94a3b8", marginTop: "5px" }}>Evolución mensual de nuevos usuarios en la plataforma.</p>
              </div>
              
              <div style={{ flex: 1, width: '100%', minHeight: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={datosGrafico} 
                    /* Agregamos márgenes para que las etiquetas de los ejes no se corten */
                    margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                    onClick={(data: any) => {
                      if (data && data.activePayload) {
                        setMesExpandido(data.activePayload[0].payload.originalName);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    
                    {/* EJE X: Mes / Año */}
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      label={{ 
                        value: 'Mes / Año', 
                        position: 'insideBottom', 
                        offset: -20, 
                        fill: '#64748b', 
                        fontSize: 14,
                        fontWeight: 'bold'
                      }} 
                    />
                    
                    {/* EJE Y: Cantidad de Usuarios */}
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      label={{ 
                        value: 'Cantidad de Usuarios', 
                        angle: -90, 
                        position: 'insideLeft', 
                        style: { textAnchor: 'middle' },
                        fill: '#64748b',
                        fontSize: 14,
                        fontWeight: 'bold'
                      }}
                    />
                    
                    <Tooltip 
                      cursor={{ fill: '#1e293b', opacity: 0.4 }}
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                      itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                    />

                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} style={{ cursor: 'pointer' }}>
                      {datosGrafico.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.cantidad > 0 ? '#3b82f6' : '#1e293b'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
                <><div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div>
                        <h3 style={{ margin: 0 }}>Registros del {mesExpandido}</h3>
                        <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Haz clic en un nombre para ver su ficha técnica.</p>
                      </div>
                      <button
                        onClick={() => setMesExpandido(null)}
                        style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                      >
                        ⬅ Volver al gráfico
                      </button>
                    </div>

                      <table className="tabla-reportes-custom">
                        <thead>
                          <tr>
                            <th onClick={() => handleOrdenarMaster('nombre', 'usuarios')} style={{ cursor: "pointer" }}>
                              Usuario {ordenUsuarios.columna === 'nombre' ? (ordenUsuarios.direccion === 'asc' ? '🔼' : '🔽') : '↕️'}
                            </th>
                            <th onClick={() => handleOrdenarMaster('rol', 'usuarios')} style={{ cursor: "pointer" }}>
                              Rol {ordenUsuarios.columna === 'rol' ? (ordenUsuarios.direccion === 'asc' ? '🔼' : '🔽') : '↕️'}
                            </th>
                            <th onClick={() => handleOrdenarMaster('dia', 'usuarios')} style={{ textAlign: "center", cursor: "pointer" }}>
                              Día {ordenUsuarios.columna === 'dia' ? (ordenUsuarios.direccion === 'asc' ? '🔼' : '🔽') : '↕️'}
                            </th>
                            <th style={{ textAlign: "center" }}>Actividad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aplicarFiltrosUsuarios(usuariosPorMes[mesExpandido]?.usuarios)
                            .sort((a: any, b: any) => {
                              let valA, valB;
                              if (ordenUsuarios.columna === 'dia') {
                                valA = parseInt(a.fecha_creacion?.split('/')[0]) || 0;
                                valB = parseInt(b.fecha_creacion?.split('/')[0]) || 0;
                              } else {
                                valA = a[ordenUsuarios.columna]?.toLowerCase() || "";
                                valB = b[ordenUsuarios.columna]?.toLowerCase() || "";
                              }

                              if (ordenUsuarios.direccion === 'asc') return valA > valB ? 1 : -1;
                              return valA < valB ? 1 : -1;
                            })
                            .map((u: any, idx: any) => (
                              <tr key={idx}>
                                <td
                                  onClick={() => setModalDetalleUsuario(u)} // <--- Acción para abrir modal
                                  style={{ cursor: 'pointer', transition: '0.2s' }}
                                  className="nombre-usuario-hover" // Puedes agregar un estilo de hover si quieres
                                >
                                  <div style={{ fontWeight: "bold", color: "#3b82f6" }}>{u.nombre}</div> {/* Cambié a azul para indicar link */}
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
                            ))
                          }
                          
                        </tbody>
                      </table>
                    </div></>
              )}
              
            </div>

            {/* LADO DERECHO: Acordeón por Mes y Día */}
            <div style={{ flex: "1 1 40%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "12px", border: "1px solid #334155", maxHeight: "550px", overflowY: "auto" }}>              
              <h3 style={{ margin: "0 0 20px 0" }}>🗓️ Nuevos Registros por Mes</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflowY: "auto", flex: 1, paddingRight: "5px" }}>
                {mesesOrdenados?.map((mes: string, index: number) => {
                  const filtradosMes = aplicarFiltrosUsuarios(usuariosPorMes[mes]?.usuarios);
                  
                  // Re-calculamos los stats de los días solo con los filtrados
                  const statsDias: any = {};
                  filtradosMes.forEach(u => {
                    const dia = u.fecha_creacion.split('/')[0];
                    if (!statsDias[dia]) statsDias[dia] = { clientes: 0, organizaciones: 0 };
                    if (u.rol === "Cliente") statsDias[dia].clientes++;
                    else statsDias[dia].organizaciones++;
                  });

                  if (filtradosMes.length === 0 && (fechaInicio || fechaFin || filtroPertenencia !== "todos")) return null;

                  return (
                  <div key={index} style={{ backgroundColor: "#1e293b",marginBottom: "10px", borderRadius: "8px", overflow: "hidden", border: mesExpandido === mes ? "1px solid #3b82f6" : "1px solid transparent", transition: "0.2s"}}>
                    
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
                );
                })}
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
        
        {/* ── Tarjetas Admin ────────────────────────────────── */}
      
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

        {/* ── MODAAAAAL ────────────────────────────────── */}
        {modalDetalleUsuario && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: '#0f172a', width: '90%', maxWidth: '500px',
            borderRadius: '16px', border: '1px solid #334155', padding: '30px',
            position: 'relative', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
          }}>
            {/* Botón Cerrar */}
            <button 
              onClick={() => setModalDetalleUsuario(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
            >✕</button>

            {/* Cabecera: Avatar y Nombre */}
            <div style={{ textAlign: 'center', marginBottom: '25px' }}>
              <div style={{ 
                width: '70px', height: '70px', backgroundColor: '#3b82f6', 
                borderRadius: '50%', display: 'flex', justifyContent: 'center', 
                alignItems: 'center', margin: '0 auto 15px', fontSize: '2rem', color: 'white' 
              }}>
                {modalDetalleUsuario.nombre.charAt(0)}
              </div>
              <h2 style={{ margin: 0, color: '#f8fafc' }}>{modalDetalleUsuario.nombre}</h2>
              <p style={{ color: '#94a3b8', margin: '5px 0' }}>{modalDetalleUsuario.email}</p>
              <span className="badge-tipo" style={{ 
                backgroundColor: modalDetalleUsuario.rol === "Organización Externa" ? "#f97316" : "#0ea5e9",
                padding: '4px 12px'
              }}>
                {modalDetalleUsuario.rol}
              </span>
            </div>

            <hr style={{ borderColor: '#1e293b', margin: '20px 0' }} />

            {/* Grid de Métricas de Conversión */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '5px' }}>REGISTRO</span>
                <strong style={{ color: '#cbd5e1' }}>{modalDetalleUsuario.fecha_creacion}</strong>
              </div>
              
              <div style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
                <span style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '5px' }}>ACTIVIDAD TOTAL</span>
                <strong style={{ color: modalDetalleUsuario.rol === "Cliente" ? '#4ade80' : '#8b5cf6' }}>
                  {modalDetalleUsuario.rol === "Cliente" 
                    ? `${modalDetalleUsuario.cantidad_inscripciones} Inscripciones`
                    : `${modalDetalleUsuario.cantidad_eventos_creados} Eventos`
                  }
                </strong>
              </div>
            </div>

            {/* Sección de "Insights" (Decisiones para el Admin) */}
            <div style={{ marginTop: '20px', padding: '15px', borderRadius: '12px', border: '1px dashed #334155' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: '0.9rem' }}>💡 Análisis de Potencial</h4>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4' }}>
                {modalDetalleUsuario.rol === "Cliente" && modalDetalleUsuario.cantidad_inscripciones > 3 
                  ? "Usuario de alta fidelidad. Candidato para programa de referidos o beneficios VIP."
                  : modalDetalleUsuario.rol === "Organización Externa" && modalDetalleUsuario.cantidad_eventos_creados === 0
                  ? "Alerta: Organización inactiva. Se recomienda contacto comercial para ayudar en la carga de su primer evento."
                  : "Usuario con comportamiento estándar. Monitorear crecimiento el próximo mes."}
              </p>
            </div>

                {/* Botón de Acción */}
                <button style={{
                  width: '100%', marginTop: '25px', padding: '12px', borderRadius: '8px',
                  backgroundColor: '#3b82f6', color: 'white', border: 'none', fontWeight: 'bold',
                  cursor: 'pointer', transition: '0.3s'
                }} onClick={() => alert("Función para contactar a: " + modalDetalleUsuario.email)}>
                  Enviar Mensaje Directo
                </button>
              </div>
            </div>
          )}
        


        </>
      )}
    </div>
  );
}