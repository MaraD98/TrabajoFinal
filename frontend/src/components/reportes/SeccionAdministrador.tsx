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
  filtroTipoTendencias,
  setFiltroTipoTendencias,
  TIPOS_EVENTO,
  fechaInicio,
  fechaFin,
  filtroPertenencia,
  onVerPropios,    
  onVerExternos,
}: any) {

  // --- ESTADOS ---
  const [mesExpandido, setMesExpandido] = useState<string | null>(null);
  const [modalDetalleUsuario, setModalDetalleUsuario] = useState<any>(null);
  const [ordenEventos, setOrdenEventos] = useState({ columna: 'monto_recaudado', direccion: 'desc' });
  const [ordenUsuarios, setOrdenUsuarios] = useState({ columna: 'dia', direccion: 'asc' });
  const [provinciaExpandidaAdmin, setProvinciaExpandidaAdmin] = useState(null);
  const [localidadExpandidaAdmin, setLocalidadExpandidaAdmin] = useState<string | null>(null);

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
    // 1. Filtro de Pertenencia (CORREGIDO)
    let rolNormalizado = "todos";
    if (u.rol === "Organización Externa" || u.rol === "Cliente") {
      rolNormalizado = "externos";
    } else if (u.rol === "Administrador" || u.rol === "Supervisor") {
      rolNormalizado = "propios";
    }

    const pasaPertenencia = !filtroPertenencia || filtroPertenencia === "todos" || rolNormalizado === filtroPertenencia;

    // 2. Filtro de Fechas
    const [d, m, a] = u.fecha_creacion.split('/');
    const fechaUsuarioISO = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    
    const pasaFechaInicio = !fechaInicio || fechaUsuarioISO >= fechaInicio;
    const pasaFechaFin = !fechaFin || fechaUsuarioISO <= fechaFin;

    return pasaPertenencia && pasaFechaInicio && pasaFechaFin;
  });
};

// --- FUNCIÓN PARA APLICAR FILTROS A LA LISTA DE EVENTOS ---
const aplicarFiltrosEventos = (listaEventos: any[]) => {
  if (!listaEventos) return [];
  return listaEventos.filter((evento: any) => {
    // 1. Filtro de Pertenencia
    const esPropio = evento.pertenencia === "Propio";
    const pasaPertenencia = 
      !filtroPertenencia || 
      filtroPertenencia === "todos" || 
      (filtroPertenencia === "propios" && esPropio) || 
      (filtroPertenencia === "externos" && !esPropio);

    // 2. Filtro de Fechas
    let pasaFechaInicio = true;
    let pasaFechaFin = true;
    if (evento.fecha_evento) {
      let fechaEventoISO = evento.fecha_evento;
      // Si viene como DD/MM/YYYY, la pasamos a YYYY-MM-DD
      if (evento.fecha_evento.includes('/')) {
        const [d, m, a] = evento.fecha_evento.split('/');
        fechaEventoISO = `${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      if (fechaInicio && fechaEventoISO < fechaInicio) pasaFechaInicio = false;
      if (fechaFin && fechaEventoISO > fechaFin) pasaFechaFin = false;
    }

    // 3. NUEVO: Filtro de Tipo de Evento
    const pasaTipo = !filtroTipoTendencias || evento.tipo === filtroTipoTendencias;

    return pasaPertenencia && pasaFechaInicio && pasaFechaFin && pasaTipo;
  });
};

// 1. Agarramos la lista completa de eventos (puede llamarse lista_eventos_detallada o lista_eventos según el endpoint)
  const eventosBase = reporteData?.lista_eventos_detallada || reporteData?.lista_eventos || [];
  
  // 2. La pasamos por tus filtros de fecha y pertenencia
  const eventosFiltradosParaGraficos = aplicarFiltrosEventos(eventosBase);

  // 3. Contamos los Tipos dinámicamente
  const datosGraficoTipoDinámico = eventosFiltradosParaGraficos.reduce((acc, evento) => {
    const tipo = evento.tipo || "Sin Tipo";
    const existente = acc.find((item: any) => item.tipo === tipo);
    if (existente) existente.cantidad += 1;
    else acc.push({ tipo, cantidad: 1 });
    return acc;
  }, []);

  // 4. Contamos las Dificultades dinámicamente
  const datosGraficoDificultadDinámico = eventosFiltradosParaGraficos.reduce((acc, evento) => {
    const dificultad = evento.dificultad || "Sin Dificultad";
    const existente = acc.find((item: any) => item.dificultad === dificultad);
    if (existente) existente.cantidad += 1;
    else acc.push({ dificultad, cantidad: 1 });
    return acc;
  }, []);

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
          <div className="grafico-card grafico-card--wide" style={{ marginTop: '2rem' }}>
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
                                onClick={() => setModalFiltroTorta({ 
                                  titulo: "Todos los Tipos", 
                                  filtroKey: "tipo", 
                                  valor: "TODOS",
                                  // 👇 LE INYECTAMOS LA DATA YA FILTRADA AL ESTADO DEL MODAL 👇
                                  dataFiltrada: eventosFiltradosParaGraficos 
                                })} 
                                className="btn-export" 
                                style={{ backgroundColor: "#3b82f6", color: "#fff" }}
                              >
                                Ver Detalles
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
          <div style={{ display: "flex", gap: "20px", marginTop: '2rem', flexWrap: "wrap", alignItems: "stretch" }}>
            
            {/* LADO IZQUIERDO: Tabla Detallada Conectada */}
            <div style={{ flex: "1 1 55%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155", minHeight: "450px", display: "flex", flexDirection: "column", maxHeight: "550px" }}>
              

              {!mesExpandido ? (
            /* VISTA A: DASHBOARD DE EVOLUCIÓN */
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ textAlign: "left", marginBottom: "30px" }}>
                <h3 style={{ margin: 0, fontSize: "1.5rem" }}>👥 Evolución de registros en el tiempo</h3>
                <p style={{ color: "#94a3b8", marginTop: "5px" }}>Evolución mensual de nuevos usuarios en la plataforma.</p>
              </div>
              
              <div style={{ flex: 1, width: '100%', minHeight: '350px' }}>
                <ResponsiveContainer width="100%" height={300}>
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
                <><div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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

                      <div style={{ flex: 1,minHeight: "0", overflowY: "auto", paddingRight: "5px" }}>
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
                                  <span className="badge-tipo" style={{ backgroundColor: u.rol === "Organización Externa" ? "#f97316" : u.rol === "Administrador" ? "#6a128d" : u.rol === "Supervisor" ? "#1a810d" : "#0ea5e9" }}>
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
                     </div>
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
                    if (!statsDias[dia]) statsDias[dia] = { clientes: 0, organizaciones: 0, administradores: 0, supervisores: 0 };
                    if (u.rol === "Cliente") statsDias[dia].clientes++;
                    else if (u.rol === "Organizador Externo") statsDias[dia].organizaciones++;
                    else if (u.rol === "Administrador") statsDias[dia].administradores++;
                    else if (u.rol === "Supervisor") statsDias[dia].supervisores++;
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
                                  <span style={{ color: "#f97316" }}><strong>{stats.organizaciones}</strong> Org. Externa</span>
                                )}
                                {stats.administradores > 0 && (
                                  <span style={{ color: "#6a128d" }}><strong>{stats.administradores}</strong> Administrador</span>
                                )}
                                {stats.supervisores > 0 && (
                                  <span style={{ color: "#1a810d" }}><strong>{stats.supervisores}</strong> Supervisores</span>
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
            DISTRIBUCIÓN GEOGRÁFICA CON PROVINCIAS Y LOCALIDADES
          ═════════════════════════════════════════════════════════════════════ */}

          <div className="grafico-card grafico-card--wide" style={{ marginTop: '2rem', overflow: "hidden", maxHeight: "800px"}}>
            
            <div className="grafico-card__header" style={{ flexShrink: 0 }}>
              <div>
                <h3 style={{ margin: 0 }}>📍 Distribución Geográfica de Eventos</h3>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginTop: "5px" }}>
                  Analizá en qué provincias se concentra la mayor cantidad de eventos según tus filtros actuales. Hacé clic para ver el detalle.
                </p>
              </div>
              
              {/* Selector de Tipo de Evento */}
              <select
                value={filtroTipoTendencias || ""}
                onChange={(e) => setFiltroTipoTendencias(e.target.value)}
                style={{
                  padding: "8px 14px",
                  background: "#0d0d0d",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  outline: "none"
                }}
              >
                <option value="">🚴 Todos los Tipos</option>
                {TIPOS_EVENTO?.map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="grafico-card__body" style={{ display: "flex", flexDirection: "column", gap: "10px", paddingTop: "20px", flex: 1, minHeight: 0, overflowY: "auto", paddingRight: "5px" }}>
              {reporteData?.tendencias_ubicacion_completa?.map((prov: any, index: any) => {
                
                const todosEventosProvincia = prov.localidades.flatMap((loc: any) => loc.eventos || []);
                const eventosFiltrados = aplicarFiltrosEventos(todosEventosProvincia);
                const totalFiltrado = eventosFiltrados.length;

                if (totalFiltrado === 0 && (fechaInicio || fechaFin || filtroPertenencia !== "todos" || filtroTipoTendencias)) {
                  return null;
                }

                const calculoCalor = (totalFiltrado / (maxEventosProvincia || 1)) * 100;
                const porcentajeCalor = calculoCalor > 100 ? 100 : calculoCalor; 

                return (
                  <div key={index} style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}>
                    
                    {/* ─────────────────────────────────────────────────────────
                        HEADER DE PROVINCIA (clickeable)
                    ───────────────────────────────────────────────────────── */}
                    <div 
                      onClick={() => setProvinciaExpandidaAdmin(provinciaExpandidaAdmin === prov.provincia ? null : prov.provincia)}
                      style={{ 
                        position: "relative", 
                        padding: "10px 15px", 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        cursor: "pointer", 
                        zIndex: 1,
                        transition: "background-color 0.2s"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1e293b"}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      {/* Barra de calor de fondo */}
                      <div style={{ 
                        position: "absolute", 
                        left: 0, 
                        top: 0, 
                        height: "100%", 
                        width: `${porcentajeCalor}%`, 
                        backgroundColor: porcentajeCalor > 70 ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)", 
                        zIndex: -1, 
                        transition: "width 0.5s ease-in-out" 
                      }}></div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "1.2rem" }}>{porcentajeCalor > 70 ? "🔥" : "🗺️"}</span>
                        <h4 style={{ margin: 0, color: "#f8fafc", fontSize: "1.1rem" }}>{prov.provincia.toUpperCase()}</h4>
                      </div>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <strong style={{ color: porcentajeCalor > 70 ? "#ef4444" : "#fbbf24" }}>
                          {totalFiltrado} {totalFiltrado === 1 ? "Evento" : "Eventos"}
                        </strong>
                        <span style={{ 
                          color: "#94a3b8", 
                          transition: "transform 0.3s", 
                          transform: provinciaExpandidaAdmin === prov.provincia ? "rotate(180deg)" : "rotate(0deg)" 
                        }}>▼</span>
                      </div>
                    </div>

                    {/* ─────────────────────────────────────────────────────────
                        PANEL DE LOCALIDADES (solo visible si provincia expandida)
                    ───────────────────────────────────────────────────────── */}
                    {provinciaExpandidaAdmin === prov.provincia && (
                      <div style={{ 
                        padding: "10px 20px 20px 20px", 
                        borderTop: "1px solid #334155", 
                        backgroundColor: "#1e293b" 
                      }}>
                        
                        {/* Contador de localidades */}
                        <div style={{ 
                          marginBottom: "10px", 
                          fontStyle: "italic"
                        }}>
                          📍 {prov.localidades.filter((loc: any) => aplicarFiltrosEventos(loc.eventos || []).length > 0).length} localidades con eventos
                        </div>

                        {/* Iteramos sobre las localidades de la provincia */}
                        {prov.localidades.map((loc: any, li: number) => {
                          const eventosLocFiltrados = aplicarFiltrosEventos(loc.eventos || []);
                          if (eventosLocFiltrados.length === 0) return null;

                          // Crear key única para esta localidad
                          const localidadKey = `${prov.provincia}-${loc.localidad}`;

                          return (
                            <div key={li} style={{ 
                              marginBottom: "5px",
                              backgroundColor: "#0f172a",
                              border: "1px solid #334155",
                              borderRadius: "6px",
                              overflow: "hidden"
                            }}>
                              
                              {/* ─────────────────────────────────────────────────────────
                                  HEADER DE LOCALIDAD (clickeable)
                              ───────────────────────────────────────────────────────── */}
                              <div 
                                onClick={() => setLocalidadExpandidaAdmin(
                                  localidadExpandidaAdmin === localidadKey ? null : localidadKey
                                )}
                                style={{ 
                                  display: "flex", 
                                  justifyContent: "space-between", 
                                  alignItems: "center", 
                                  padding: "12px 15px",
                                  cursor: "pointer",
                                  transition: "background-color 0.2s"
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1a1f2e"}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  {/* Flecha indicadora */}
                                  <span style={{ 
                                    color: "#94a3b8", 
                                    fontSize: "0.7rem",
                                    transition: "transform 0.3s",
                                    transform: localidadExpandidaAdmin === localidadKey ? "rotate(90deg)" : "rotate(0deg)",
                                    display: "inline-block"
                                  }}>▶</span>
                                  
                                  <span style={{ fontWeight: 500, color: "#e0e0e0", fontSize: "0.95rem" }}>
                                    {loc.localidad}
                                  </span>
                                </div>
                                
                                <span style={{ 
                                  color: "#4ade80", 
                                  fontSize: "0.85rem", 
                                  fontWeight: "bold",
                                  backgroundColor: "rgba(74, 222, 128, 0.1)",
                                  padding: "4px 10px",
                                  borderRadius: "4px"
                                }}>
                                  {eventosLocFiltrados.length} {eventosLocFiltrados.length === 1 ? "evento" : "eventos"}
                                </span>
                              </div>

                              {/* ─────────────────────────────────────────────────────────
                                  LISTA DE EVENTOS (solo visible si localidad expandida)
                              ───────────────────────────────────────────────────────── */}
                              {localidadExpandidaAdmin === localidadKey && (
                                <div style={{ 
                                  padding: "10px 15px 15px 15px",
                                  borderTop: "1px solid #334155",
                                  backgroundColor: "#0a0e1a"
                                }}>
                                  <ul style={{ 
                                    margin: 0, 
                                    padding: 0, 
                                    listStyle: "none", 
                                    display: "flex", 
                                    flexDirection: "column", 
                                    gap: "5px" 
                                  }}>
                                    {eventosLocFiltrados.map((evento: any, ei: number) => (
                                      <li 
                                        key={ei} 
                                        onClick={(e) => {
                                          e.stopPropagation(); // Evitar que se cierre la localidad
                                          setModalAdminEvento(evento);
                                        }}
                                        style={{ 
                                          backgroundColor: "#1e293b", 
                                          padding: "5px 15px", 
                                          borderRadius: "6px", 
                                          display: "flex", 
                                          justifyContent: "space-between", 
                                          alignItems: "center", 
                                          cursor: "pointer", 
                                          border: "1px solid #334155", 
                                          transition: "all 0.2s"
                                        }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.style.borderColor = "#3b82f6";
                                          e.currentTarget.style.transform = "translateX(4px)";
                                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.15)";
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.style.borderColor = "#334155";
                                          e.currentTarget.style.transform = "translateX(0)";
                                          e.currentTarget.style.boxShadow = "none";
                                        }}
                                      >
                                        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                          <strong style={{ color: "#e2e8f0", fontSize: "0.95rem" }}>
                                            {evento.nombre}
                                          </strong>
                                          <div style={{ 
                                            display: "flex", 
                                            gap: "12px", 
                                            fontSize: "0.80rem", 
                                            color: "#94a3b8",
                                            flexWrap: "wrap"
                                          }}>
                                            <span style={{ 
                                              background: "#252525", 
                                              padding: "3px 8px", 
                                              borderRadius: "4px", 
                                              color: "#a78bfa",
                                              fontWeight: 500
                                            }}>
                                              {evento.tipo}
                                            </span>
                                            {evento.fecha && (
                                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                📅 {evento.fecha}
                                              </span>
                                            )}
                                            {evento.distancia_km && (
                                              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                🚴 {evento.distancia_km} km
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <span 
                                          style={{ 
                                            backgroundColor: evento.pertenencia === "Propio" 
                                              ? "rgba(139, 92, 246, 0.2)" 
                                              : "rgba(75, 85, 99, 0.2)",
                                            color: evento.pertenencia === "Propio" ? "#a78bfa" : "#9ca3af", 
                                            padding: "6px 12px", 
                                            borderRadius: "4px",
                                            fontSize: "0.80rem", 
                                            fontWeight: "bold",
                                            whiteSpace: "nowrap"
                                          }}
                                        >
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

                        {/* Mensaje si no hay localidades visibles */}
                        {prov.localidades.every((loc: any) => aplicarFiltrosEventos(loc.eventos || []).length === 0) && (
                          <p style={{ 
                            color: "#94a3b8", 
                            fontSize: "0.9rem", 
                            textAlign: "center", 
                            padding: "20px",
                            fontStyle: "italic"
                          }}>
                            No hay eventos que coincidan con los filtros en esta provincia.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mensaje si no hay provincias visibles */}
              {reporteData?.tendencias_ubicacion_completa?.every((prov: any) => {
                const todosEventosProvincia = prov.localidades.flatMap((loc: any) => loc.eventos || []);
                const eventosFiltrados = aplicarFiltrosEventos(todosEventosProvincia);
                return eventosFiltrados.length === 0 && (fechaInicio || fechaFin || filtroPertenencia !== "todos" || filtroTipoTendencias);
              }) && (
                <div style={{ 
                  textAlign: "center", 
                  padding: "40px 20px",
                  color: "#94a3b8"
                }}>
                  <p style={{ fontSize: "3rem", margin: "0 0 10px 0" }}>🗺️</p>
                  <p style={{ fontSize: "1.1rem", fontWeight: 500, margin: "0 0 5px 0", color: "#e2e8f0" }}>
                    No hay eventos que coincidan con los filtros
                  </p>
                  <p style={{ fontSize: "0.9rem", margin: 0 }}>
                    Intentá ajustar los criterios de búsqueda
                  </p>
                </div>
              )}
            </div>
          </div>


        {/* ════════════════════════════════════════════════════════════════
                            ADMIN — Gráficos del sistema
            ════════════════════════════════════════════════════════════════ */}
        <div className="reportes-graficos" style={{ marginTop: '2rem' }}>
            
            {/* Gráfico de Tipos */}
            {usuarioRol <= 2 && datosGraficoTipoDinámico.length > 0 && (() => {
                // 1. Calculamos cuál es el tipo con más cantidad para el insight
                const tipoGanador = [...datosGraficoTipoDinámico].sort((a, b) => b.cantidad - a.cantidad)[0]?.tipo;

                return (
                    <div className="grafico-card">
                        <div className="grafico-card__header">
                            {/* Agregamos el div para separar texto de botones y pusimos el parrafito gris */}
                            <div style={{ flex: 1 }}>
                                <h3>🏃‍♂️ Eventos por Tipo</h3>
                                <p style={{ fontSize: "13px", color: "#d7d7d7", marginTop: "4px" }}>
                                    Cantidad total de eventos en el sistema según su categoría.
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                                <button onClick={() => setModalFiltroTorta({ titulo: "Todos los Tipos", filtroKey: "tipo", valor: "TODOS" })} className="btn-export" style={{ backgroundColor: "#3b82f6", color: "#fff" }}>
                                    Ver Detalles
                                </button>
                                <button data-html2canvas-ignore="true" disabled={exportando === "eventos_por_tipo"} onClick={() => handleExportarCSV("eventos_por_tipo")} className="btn-export">
                                    {exportando === "eventos_por_tipo" ? "..." : "📥 CSV"}
                                </button>
                            </div>
                        </div>
                        <div className="grafico-card__body">
                            {renderGraficoTorta(datosGraficoTipoDinámico, "tipo", "cantidad", "Eventos")}
                            
                            {/* Acá sumamos el mensaje del foquito 💡 */}
                            <div className="insight-text" style={{ marginTop: "20px" }}>
                                {tipoGanador ? (
                                    <>💡 La categoría con más eventos registrados es <strong>{tipoGanador}</strong>.</>
                                ) : (
                                    "💡 No hay eventos en este rango de fechas para determinar una tendencia."
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Gráfico de Dificultad */}
            {usuarioRol <= 2 && datosGraficoDificultadDinámico.length > 0 && (() => {
                // 1. Calculamos cuál es la dificultad con más cantidad para el insight
                const dificultadGanadora = [...datosGraficoDificultadDinámico].sort((a, b) => b.cantidad - a.cantidad)[0]?.dificultad;

                return (
                    <div className="grafico-card">
                        <div className="grafico-card__header">
                            <div style={{ flex: 1 }}>
                                <h3>🧗 Eventos por Dificultad</h3>
                                <p style={{ fontSize: "13px", color: "#d7d7d7", marginTop: "4px" }}>
                                    Distribución de los eventos según su nivel de exigencia física.
                                </p>
                            </div>
                            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                                <button onClick={() => setModalFiltroTorta({ titulo: "Todas las Dificultades", filtroKey: "dificultad", valor: "TODOS" })} className="btn-export" style={{ backgroundColor: "#3b82f6", color: "#fff" }}>
                                    Ver Detalles
                                </button>
                                <button data-html2canvas-ignore="true" disabled={exportando === "eventos_por_dificultad"} onClick={() => handleExportarCSV("eventos_por_dificultad")} className="btn-export">
                                    {exportando === "eventos_por_dificultad" ? "..." : "📥 CSV"}
                                </button>
                            </div>
                        </div>
                        <div className="grafico-card__body">
                            {renderGraficoTorta(datosGraficoDificultadDinámico, "dificultad", "cantidad", "Eventos")}
                            
                            {/* Acá sumamos el mensaje del foquito 💡 */}
                            <div className="insight-text" style={{ marginTop: "20px" }}>
                                {dificultadGanadora ? (
                                    <>💡 La dificultad predominante en el sistema es <strong>{dificultadGanadora}</strong>.</>
                                ) : (
                                    "💡 No hay eventos en este rango de fechas para determinar una tendencia."
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

        </div>

            
        {/* ── Tarjetas Admin ────────────────────────────────── */}
      
          <div style={{ display: "flex", gap: "20px",marginTop: '2rem', flexWrap: "wrap" }}>
            {/* BLOQUE DE TARJETAS DE MÉTRICAS */}
            <TarjetasMetricas
              // Props Eventos
              totalEventosGlobal={totalEventosGlobal}
              eventosFuturos={eventosFuturos}
              eventosPasados={eventosPasados}
              eventosPropiosCount={eventosPropiosCount}
              eventosExternosCount={eventosExternosCount}
              onAbrirModalEventos={() => setModalEventosGlobal(true)}
              onVerPropios={onVerPropios}
              onVerExternos={onVerExternos}

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
                backgroundColor: modalDetalleUsuario.rol === "Organización Externa" ? "#f97316" : modalDetalleUsuario.rol === "Administrador" ? "#6a128d" : modalDetalleUsuario.rol === "Supervisor" ? "#1a810d" : "#0ea5e9",
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