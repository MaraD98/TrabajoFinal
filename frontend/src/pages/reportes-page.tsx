import { useState, useEffect, useRef } from "react";
import "../styles/reportes.css";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { getReporteGeneral, exportReporteCSV } from "../services/eventos";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ReporteData {
  total_eventos?: number;
  eventos_por_estado?: { estado: number; cantidad: number }[];
  eventos_por_usuario?: { usuario: number; cantidad: number }[];
  eventos_por_mes?: { anio: number; mes: number; cantidad: number }[];
  usuarios_total?: number;
  usuarios_por_rol?: { rol: number; cantidad: number }[];
  eventos_por_tipo?: { tipo: string; cantidad: number }[];
  eventos_por_dificultad?: { dificultad: string; cantidad: number }[];
  solicitudes_externas?: { estado: string; cantidad: number }[];
  mis_eventos_total?: number;
  mis_eventos_por_estado?: { estado: number; cantidad: number }[];
  mis_inscripciones?: any[];
  mis_notificaciones?: any[];
  eventos_por_ubicacion?: { ubicacion: string; cantidad: number }[];
  
  lista_eventos_detallada?: any[];
  rendimiento_por_tipo?: { tipo: string; cantidad: number }[];
  total_reservas_recibidas?: number;
  recaudacion_total?: number;
  detalle_recaudacion?: any[];
  tendencias_ubicacion?: any[];
}

export default function ReportesPage() {
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);
  const [estadoAbierto, setEstadoAbierto] = useState<number | null>(null);
  
  const pendientesCount = reporteData?.eventos_por_estado?.find((e: any) => e.estado === 1)?.cantidad || 0;

  const [anioFiltro, setAnioFiltro] = useState<string>("");
  const [mesFiltro, setMesFiltro] = useState<string>("");

  const [tabTendencias, setTabTendencias] = useState<'activos' | 'pasados'>('activos');
  const [provinciaExpandida, setProvinciaExpandida] = useState<string | null>(null);
  const [localidadExpandida, setLocalidadExpandida] = useState<string | null>(null);
  
  const [busquedaEvento, setBusquedaEvento] = useState<string>("");
  const [sortFinanzas, setSortFinanzas] = useState<{ key: 'nombre' | 'fecha' | 'monto'; direction: 'asc' | 'desc' }>({ key: 'fecha', direction: 'desc' });

  const reporteRef = useRef<HTMLDivElement>(null);
  
  const { user, getToken, loadingAuth } = useAuth();
  const usuarioRol = user?.id_rol || 0;

  useEffect(() => {
    if (!loadingAuth) {
      const currentToken = getToken();
      if (currentToken) {
        cargarReportes(currentToken);
      } else {
        setLoading(false);
      }
    }
  }, [loadingAuth, getToken, anioFiltro, mesFiltro]);

  const cargarReportes = async (tokenParaCargar?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = tokenParaCargar || getToken();
      if (!token) {
        setError("No se encontró una sesión activa.");
        return;
      }

      const data = await getReporteGeneral(
        token, 
        anioFiltro ? parseInt(anioFiltro) : undefined, 
        mesFiltro ? parseInt(mesFiltro) : undefined
      );
      setReporteData(data);
    } catch (err: any) {
      console.error("Error en reportes:", err);
      setError(err.response?.status === 401 ? "Sesión expirada" : "Error al cargar reportes");
    } finally {
      setLoading(false);
    }
  };

  const handleExportarCSV = async (tipo: string) => {
    try {
      const token = getToken();
      if (!token) return alert("Sesión no válida");
      
      setExportando(tipo); 
      await exportReporteCSV(tipo, token);
    } catch (err) {
      alert("Error al exportar el reporte CSV");
    } finally {
      setExportando(null); 
    }
  };

  const handleDescargarPDF = async () => {
    const input = reporteRef.current;
    if (!input) return;

    try {
      setExportando("pdf");
      const canvas = await html2canvas(input, { 
        scale: 2,
        backgroundColor: "#000000"
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfImgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfImgHeight);
      pdf.save("reporte-panel-control.pdf");
    } catch (err) {
      console.error("Error al generar PDF", err);
      alert("No se pudo generar el PDF");
    } finally {
      setExportando(null);
    }
  };

  const handleSortFinanzas = (key: 'nombre' | 'fecha' | 'monto') => {
    setSortFinanzas(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getNombreEstado = (id: number) => ({ 
    1: "Borrador", 
    2: "Pendiente", 
    3: "Publicado", 
    4: "Finalizado", 
    5: "Cancelado", 
    6: "Depurado por Admin" 
  }[id] || `Estado ${id}`);
  
  const getNombreRol = (id: number) => ({ 
    1: "Admin", 
    2: "Supervisor", 
    3: "Operario", 
    4: "Cliente" 
  }[id] || `Rol ${id}`);
  
  const getNombreMes = (mes: number) => [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun", 
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ][mes - 1] || mes.toString();

  const renderGraficoBarras = (data: any[], labelKey: string, valueKey: string, getLabelFn?: (val: any) => string) => {
    if (!data || data.length === 0) return <p className="no-data">Sin datos disponibles</p>;
    const maxValue = Math.max(...data.map((item: any) => item[valueKey]), 1);
    return (
      <div className="grafico-barras">
        {data.map((item: any, index: number) => (
          <div key={index} className="grafico-barras__item">
            <div className="grafico-barras__label">{getLabelFn ? getLabelFn(item[labelKey]) : item[labelKey]}</div>
            <div className="grafico-barras__bar-container">
              <div className="grafico-barras__bar" style={{ width: `${(item[valueKey] / maxValue) * 100}%` }}>
                <span className="grafico-barras__valor">{item[valueKey]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRankingHorizontal = (data: any[], labelKey: string, valueKey: string) => {
    if (!data || data.length === 0) return <p className="no-data">Sin datos de ubicación</p>;
    const dataSorted = [...data].sort((a: any, b: any) => b[valueKey] - a[valueKey]).slice(0, 10);
    const maxValue = Math.max(...dataSorted.map((d: any) => d[valueKey]), 1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        {dataSorted.map((item: any, index: number) => (
          <div key={index} style={{ display: 'flex', flexDirection: 'column', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ fontWeight: 500, color: '#e0e0e0' }}>{item[labelKey]}</span>
              <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{item[valueKey]}</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#333', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${(item[valueKey] / maxValue) * 100}%`, 
                height: '100%', 
                backgroundColor: '#4ade80',
                borderRadius: '4px' 
              }}></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGraficoLinea = (data: any[]) => {
    if (!data || data.length === 0) return <p className="no-data">Sin datos disponibles</p>;
    const dataOrdenada = [...data].sort((a: any, b: any) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes);
    const maxValue = Math.max(...dataOrdenada.map((item: any) => item.cantidad), 1);
    return (
      <div className="grafico-linea">
        <div className="grafico-linea__grid">
          {dataOrdenada.map((item: any, index: number) => (
            <div key={index} className="grafico-linea__columna">
              <span className="grafico-linea__count">{item.cantidad}</span>
              <div className="grafico-linea__barra" style={{ height: `${(item.cantidad / maxValue) * 80}%` }}></div>
              <div className="grafico-linea__label">{getNombreMes(item.mes)}<br/>{item.anio}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGraficoPie = (data: any[], labelKey: string, valueKey: string, getLabelFn?: (val: any) => string) => {
    if (!data || data.length === 0) return <p className="no-data">Sin datos disponibles</p>;
    const total = data.reduce((sum: number, item: any) => sum + item[valueKey], 0);
    const colores = ["#ff6b35", "#ffa500", "#4caf50", "#2196f3", "#9c27b0"];
    return (
      <div className="grafico-pie">
        {data.map((item: any, index: number) => (
          <div key={index} className="grafico-pie__item">
            <div className="grafico-pie__color" style={{ backgroundColor: colores[index % colores.length] }}></div>
            <div className="grafico-pie__info">
              <span className="grafico-pie__label">{getLabelFn ? getLabelFn(item[labelKey]) : item[labelKey]}</span>
              <span className="grafico-pie__valor">{item[valueKey]} ({((item[valueKey] / (total || 1)) * 100).toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGraficoTorta = (data: any[], labelKey: string, valueKey: string) => {
    if (!data || data.length === 0) return <p className="no-data">Sin datos disponibles</p>;

    const total = data.reduce((sum: number, item: any) => sum + item[valueKey], 0);
    const colores = ["#ff6b35", "#4ade80", "#60a5fa", "#fbbf24", "#a78bfa", "#d63a3a"];
    
    const size = 180; 
    const center = size / 2;
    const radius = 80;
    let currentAngle = -90; 

    return (
      <div className="grafico-pie-flex-container" style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
          {data.map((item: any, index: number) => {
            const valor = item[valueKey];
            const angleRange = (valor / total) * 360;
            const startAngle = currentAngle;
            const endAngle = currentAngle + angleRange;
            const middleAngle = startAngle + angleRange / 2;

            const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
            const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
            const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
            const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);
            
            const textRadius = radius * 0.65; 
            const tx = center + textRadius * Math.cos((Math.PI * middleAngle) / 180);
            const ty = center + textRadius * Math.sin((Math.PI * middleAngle) / 180);

            const largeArcFlag = angleRange > 180 ? 1 : 0;
            const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            currentAngle += angleRange;

            return (
              <g key={index}>
                <path d={pathData} fill={colores[index % colores.length]} stroke="#1a1a1a" strokeWidth="1" />
                <text x={tx} y={ty} fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">
                  {valor}
                </text>
              </g>
            );
          })}
          <circle cx={center} cy={center} r={radius * 0.35} fill="#1a1a1a" />
        </svg>

        <div className="grafico-pie__leyenda" style={{ flexGrow: 1 }}>
          {data.map((item: any, index: number) => {
            const porcentajeIndividual = ((item[valueKey] / total) * 100).toFixed(1);
            return (
              <div key={index} className="grafico-torta__leyenda-item" style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <div 
                  className="grafico-torta__color-box" 
                  style={{ backgroundColor: colores[index % colores.length], width: '12px', height: '12px', borderRadius: '2px', marginRight: '10px' }}
                ></div>
                <span className="grafico-torta__texto" style={{ fontSize: '0.9rem', color: '#ccc' }}>
                  <strong style={{ color: '#fff' }}>{item[labelKey]}:</strong> {item[valueKey]} 
                  <span style={{ color: '#888', marginLeft: '5px' }}>({porcentajeIndividual}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loadingAuth || loading) {
    return (
      <div className="reportes-page"> 
        <div className="reportes-loading">
          <div className="spinner-large"></div>
          <p>Cargando panel...</p>
        </div>
      </div>
    );
  }

  const activeToken = getToken();
  if (!activeToken) {
    return (
      <div className="reportes-page">
        <div className="reportes-alert reportes-alert--error">
          <span className="reportes-alert__icon">🔒</span>
          <span className="reportes-alert__message">Debes iniciar sesión para acceder.</span>
          <button onClick={() => window.location.href = "/login"} className="reportes-alert__retry">Ir al Login</button>
        </div>
      </div>
    );
  }

  const detalleRecaudacionFiltrado = reporteData?.detalle_recaudacion
    ?.filter((item: any) => 
      item.nombre_evento.toLowerCase().includes(busquedaEvento.toLowerCase())
    )
    .sort((a: any, b: any) => {
      const { key, direction } = sortFinanzas;
      let comparison = 0;
      
      if (key === 'nombre') {
        comparison = a.nombre_evento.localeCompare(b.nombre_evento);
      } else if (key === 'fecha') {
        comparison = new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
      } else if (key === 'monto') {
        comparison = a.monto - b.monto;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    }) || [];

  const totalRecaudacionFiltrado = detalleRecaudacionFiltrado.reduce((sum: number, item: any) => sum + item.monto, 0);

  return (
    <div className="reportes-page">
      <Navbar />
      
      <div className="filtros-globales-sticky" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
        padding: '20px 40px',
        borderBottom: '2px solid #4ade80',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4ade80' }}>🔍 FILTRO GLOBAL</span>
          <select 
            value={anioFiltro} 
            onChange={(e) => setAnioFiltro(e.target.value)} 
            className="filter-select"
            style={{
              padding: '10px 15px',
              fontSize: '1rem',
              borderRadius: '8px',
              border: '2px solid #4ade80',
              background: '#0d0d0d',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="">📅 Año (Todos)</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
          
          <select 
            value={mesFiltro} 
            onChange={(e) => setMesFiltro(e.target.value)} 
            className="filter-select"
            style={{
              padding: '10px 15px',
              fontSize: '1rem',
              borderRadius: '8px',
              border: '2px solid #4ade80',
              background: '#0d0d0d',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <option value="">📆 Mes (Todos)</option>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((m: number) => (
              <option key={m} value={m}>{getNombreMes(m)}</option>
            ))}
          </select>
          
          <p style={{ fontSize: '0.9rem', color: '#ccc', margin: 0 }}>
            Este filtro actualiza <strong style={{ color: '#4ade80' }}>todos los gráficos y tarjetas</strong> del dashboard
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleDescargarPDF} 
            disabled={exportando === "pdf"}
            style={{
              padding: '10px 20px',
              background: '#e74c3c',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 'bold',
              cursor: exportando === "pdf" ? 'not-allowed' : 'pointer',
              opacity: exportando === "pdf" ? 0.6 : 1
            }}
          >
            {exportando === "pdf" ? "Generando..." : "📄 Guardar PDF"}
          </button>

          <button 
            onClick={() => cargarReportes()}
            style={{
              padding: '10px 20px',
              background: '#4ade80',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            ↻ Actualizar Datos
          </button>
        </div>
      </div>

      <div className="reportes-page__container" ref={reporteRef}>
        
        <div className="reportes-header">
          <div>
            <h1 className="reportes-header__title">Panel de Control y Reportes</h1>
            <p className="reportes-header__subtitle">Gestión centralizada de datos para {user?.nombre_y_apellido}</p>
          </div>
        </div>

        {error && <div className="reportes-alert reportes-alert--error">⚠️ {error}</div>}
        
        {usuarioRol <= 2 && pendientesCount > 0 && (
          <div className="reportes-alert reportes-alert--warning">
            🔔 Tienes <strong>{pendientesCount}</strong> eventos pendientes de revisión.
          </div>
        )}

        {(usuarioRol === 1 || usuarioRol === 2) && (
          <>
            <div className="stat-card stat-card--primary">
              <div className="stat-card__valor">{reporteData?.total_eventos || 0}</div>
              <div className="stat-card__label">Total Eventos Sistema</div>
            </div>
            <div className="stat-card stat-card--success">
              <div className="stat-card__valor">{reporteData?.usuarios_total || 0}</div>
              <div className="stat-card__label">Usuarios Registrados</div>
            </div>
            <div className="stat-card stat-card--info"
              onClick={() => document.getElementById('lista_eventos_detallada')?.scrollIntoView({behavior: 'smooth'})}
              style={{cursor: 'pointer'}}
            >
              <div className="stat-card__valor">{reporteData?.mis_eventos_total || 0}</div>
              <div className="stat-card__label">Mis Eventos Creados</div>
            </div>
          </>
        )}

        {usuarioRol === 3 && (
          <div className="reportes-rol3-container" style={{ marginTop: '20px' }}>
            
            {reporteData?.lista_eventos_detallada && (
              <div className="grafico-card grafico-card--wide">
                <div className="grafico-card__header">
                  <h3>📋 Detalle de Mis Solicitudes por Estado</h3>
                </div>
                
                <div className="grafico-card__body">
                  {[2, 3, 4, 5, 6].map((idEstado: number) => {
                    const eventosEnEstado = reporteData.lista_eventos_detallada?.filter((e: any) => e.estado === idEstado) || [];
                    if (eventosEnEstado.length === 0) return null;

                    const isOpen = estadoAbierto === idEstado;

                    return (
                      <div key={idEstado} className="accordion-section" style={{ marginBottom: '10px', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                        <div 
                          onClick={() => setEstadoAbierto(isOpen ? null : idEstado)}
                          style={{ 
                            padding: '15px', 
                            backgroundColor: '#252525', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            cursor: 'pointer',
                            borderLeft: `4px solid ${idEstado === 3 ? '#4ade80' : idEstado === 2 ? '#fbbf24' : '#e74c3c'}`
                          }}
                        >
                          <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>
                            {getNombreEstado(idEstado).toUpperCase()} ({eventosEnEstado.length})
                          </span>
                          <span style={{ transition: 'transform 0.3s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                            ▼
                          </span>
                        </div>

                        {isOpen && (
                          <div style={{ padding: '10px', backgroundColor: '#1a1a1a' }}>
                            <div className="table-responsive">
                              <table className="tabla-reportes-custom">
                                <thead>
                                  <tr>
                                    <th>Evento</th>
                                    <th>Fecha</th>
                                    <th>Tipo</th>
                                    <th style={{ textAlign: 'center' }}>Reservas</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {eventosEnEstado.map((evento: any) => (
                                    <tr key={evento.id}>
                                      <td style={{ fontWeight: 'bold' }}>{evento.nombre}</td>
                                      <td>{evento.fecha}</td>
                                      <td><span className="badge-tipo">{evento.tipo}</span></td>
                                      <td style={{ textAlign: 'center' }}>
                                        <div className="reservas-indicator">{evento.reservas}</div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {reporteData?.mis_eventos_por_estado && (
              <div className="grafico-card">
                <div className="grafico-card__header">
                  <h3>📊 Mi Actividad (Estados)</h3>
                  <button 
                    data-html2canvas-ignore="true"
                    disabled={exportando === "mis_eventos_por_estado"}
                    onClick={() => handleExportarCSV("mis_eventos_por_estado")}
                    className="btn-export"
                  >
                    {exportando === "mis_eventos_por_estado" ? "..." : "📥 CSV"}
                  </button>
                </div>
                <div className="grafico-card__body">{renderGraficoBarras(reporteData.mis_eventos_por_estado, "estado", "cantidad", getNombreEstado)}</div>
              </div>
            )}

            <div className="reportes-graficos">
              <div className="grafico-card">
                <div className="grafico-card__header">
                  <h3>📈 Popularidad por Categoría</h3>
                  <p style={{fontSize: '0.8rem', color: '#888'}}>Distribución de inscritos según el tipo de actividad.</p>
                  <button 
                    data-html2canvas-ignore="true"
                    onClick={() => handleExportarCSV("rendimiento_categorias")}
                    className="btn-export"
                  >
                    📥 CSV
                  </button>
                </div>
                <div className="grafico-card__body">
                  {renderGraficoTorta(reporteData.rendimiento_por_tipo || [], "tipo", "cantidad")}
                  <div className="insight-text">
                    {reporteData.rendimiento_por_tipo && reporteData.rendimiento_por_tipo.length > 0 ? (
                      <>
                        💡 Tu categoría más buscada es <strong>{ [...reporteData.rendimiento_por_tipo].sort((a: any, b: any) => b.cantidad - a.cantidad)[0].tipo }</strong>
                      </>
                    ) : (
                      "💡 No hay datos suficientes para determinar una tendencia."
                    )}
                  </div>
                </div>
              </div>

              <div className="grafico-card">
                <div className="grafico-card__header">
                  <h3>💰 Recaudación Total (Mis Eventos)</h3>
                  <p style={{fontSize: '0.8rem', color: '#888'}}>Solo inscripciones confirmadas y pagadas</p>
                </div>
                <div className="grafico-card__body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '4rem', fontWeight: 'bold', color: '#4ade80' }}>
                    ${totalRecaudacionFiltrado.toLocaleString('es-AR')}
                  </span>
                  <p style={{ color: '#ccc', marginTop: '10px' }}>
                    {detalleRecaudacionFiltrado.length} eventos con recaudación registrada
                  </p>
                  
                  <input
                    type="text"
                    placeholder="🔍 Buscar evento..."
                    value={busquedaEvento}
                    onChange={(e) => setBusquedaEvento(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      marginTop: '15px',
                      background: '#0d0d0d',
                      border: '1px solid #4ade80',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>
            </div>

            {detalleRecaudacionFiltrado.length > 0 && (
              <div className="grafico-card grafico-card--wide" style={{ marginTop: '20px' }}>
                <div className="grafico-card__header">
                  <h3>📊 Detalle de Recaudación por Evento</h3>
                  <button 
                    data-html2canvas-ignore="true"
                    onClick={() => handleExportarCSV("detalle_recaudacion")}
                    className="btn-export"
                  >
                    📥 Exportar CSV
                  </button>
                </div>
                <div className="grafico-card__body">
                  <div className="table-responsive">
                    <table className="tabla-reportes-custom">
                      <thead>
                        <tr>
                          <th 
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleSortFinanzas('nombre')}
                          >
                            Evento {sortFinanzas.key === 'nombre' && (sortFinanzas.direction === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => handleSortFinanzas('fecha')}
                          >
                            Fecha {sortFinanzas.key === 'fecha' && (sortFinanzas.direction === 'asc' ? '↑' : '↓')}
                          </th>
                          <th 
                            style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'right' }}
                            onClick={() => handleSortFinanzas('monto')}
                          >
                            Monto {sortFinanzas.key === 'monto' && (sortFinanzas.direction === 'asc' ? '↑' : '↓')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleRecaudacionFiltrado.map((item: any, index: number) => (
                          <tr key={index}>
                            <td style={{ fontWeight: 'bold' }}>{item.nombre_evento}</td>
                            <td>{new Date(item.fecha_evento).toLocaleDateString('es-AR')}</td>
                            <td style={{ textAlign: 'right', color: '#4ade80', fontWeight: 'bold' }}>
                              ${item.monto.toLocaleString('es-AR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid #4ade80' }}>
                          <td colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            TOTAL FILTRADO:
                          </td>
                          <td style={{ textAlign: 'right', color: '#4ade80', fontWeight: 'bold', fontSize: '1.2rem' }}>
                            ${totalRecaudacionFiltrado.toLocaleString('es-AR')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        <div className="reportes-graficos">
          
          {(usuarioRol <= 2) && reporteData?.eventos_por_mes && (
            <div className="grafico-card grafico-card--wide">
              <div className="grafico-card__header">
                <h3>📅 Tendencia Mensual de Eventos</h3>
                <button 
                  data-html2canvas-ignore="true" 
                  disabled={exportando === "eventos_por_mes"}
                  onClick={() => handleExportarCSV("eventos_por_mes")}
                  className="btn-export"
                >
                  {exportando === "eventos_por_mes" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">{renderGraficoLinea(reporteData.eventos_por_mes)}</div>
            </div>
          )}

          {(usuarioRol <= 2) && reporteData?.eventos_por_tipo && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🏃‍♂️ Eventos por Tipo</h3>
                <button 
                  data-html2canvas-ignore="true" 
                  disabled={exportando === "eventos_por_tipo"}
                  onClick={() => handleExportarCSV("eventos_por_tipo")}
                  className="btn-export"
                >
                  {exportando === "eventos_por_tipo" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">
                {renderGraficoTorta(reporteData.eventos_por_tipo, "tipo", "cantidad")}
              </div>
            </div>
          )}

          {(usuarioRol <= 2) && reporteData?.eventos_por_dificultad && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🧗 Eventos por Dificultad</h3>
                <button 
                  data-html2canvas-ignore="true" 
                  disabled={exportando === "eventos_por_dificultad"}
                  onClick={() => handleExportarCSV("eventos_por_dificultad")}
                  className="btn-export"
                >
                  {exportando === "eventos_por_dificultad" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">
                {renderGraficoTorta(reporteData.eventos_por_dificultad, "dificultad", "cantidad")}
              </div>
            </div>
          )}

          {(usuarioRol <= 2) && reporteData?.eventos_por_ubicacion && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>📍 Top Ubicaciones</h3>
                <button 
                  data-html2canvas-ignore="true" 
                  disabled={exportando === "eventos_por_ubicacion"}
                  onClick={() => handleExportarCSV("eventos_por_ubicacion")}
                  className="btn-export"
                >
                  {exportando === "eventos_por_ubicacion" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body" style={{ overflowY: 'auto', maxHeight: '300px' }}>
                {renderRankingHorizontal(reporteData.eventos_por_ubicacion, "ubicacion", "cantidad")}
              </div>
            </div>
          )}

          {usuarioRol === 1 && reporteData?.usuarios_por_rol && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🎭 Distribución por Roles</h3>
                <button 
                  data-html2canvas-ignore="true"
                  disabled={exportando === "usuarios_por_rol"}
                  onClick={() => handleExportarCSV("usuarios_por_rol")}
                  className="btn-export"
                >
                  {exportando === "usuarios_por_rol" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">{renderGraficoPie(reporteData.usuarios_por_rol, "rol", "cantidad", getNombreRol)}</div>
            </div>
          )}

          {(usuarioRol <= 2) && (
            <div className="grafico-card">
              <div className="grafico-card__header">
                <h3>🕵️ Auditoría de Cambios</h3>
                <button 
                  data-html2canvas-ignore="true"
                  disabled={exportando === "auditoria"}
                  onClick={() => handleExportarCSV("auditoria")}
                  className="btn-export"
                >
                  {exportando === "auditoria" ? "..." : "📥 CSV"}
                </button>
              </div>
              <div className="grafico-card__body">
                <p style={{fontSize: '0.9rem', color: '#e0e0e0'}}>
                  Registro de intervenciones.
                </p>
                <div className="audit-badge">Auditoría Activa</div>
              </div>
            </div>
          )}
        </div>

        {reporteData?.tendencias_ubicacion && reporteData.tendencias_ubicacion.length > 0 && (
          <div className="grafico-card grafico-card--wide" style={{ marginTop: '30px' }}>
            <div className="grafico-card__header">
              <h3>🗺️ Tendencias por Ubicación - Análisis de Mercado (Top 10)</h3>
              <p style={{fontSize: '0.8rem', color: '#888', marginTop: '5px'}}>
                Datos globales del sistema (todos los eventos) para análisis estratégico
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', padding: '15px 20px', borderBottom: '1px solid #333' }}>
              <button
                onClick={() => setTabTendencias('activos')}
                style={{
                  padding: '8px 16px',
                  background: tabTendencias === 'activos' ? '#4ade80' : 'transparent',
                  border: `2px solid ${tabTendencias === 'activos' ? '#4ade80' : '#666'}`,
                  borderRadius: '6px',
                  color: tabTendencias === 'activos' ? '#000' : '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📈 Eventos Activos
              </button>
              <button
                onClick={() => setTabTendencias('pasados')}
                style={{
                  padding: '8px 16px',
                  background: tabTendencias === 'pasados' ? '#4ade80' : 'transparent',
                  border: `2px solid ${tabTendencias === 'pasados' ? '#4ade80' : '#666'}`,
                  borderRadius: '6px',
                  color: tabTendencias === 'pasados' ? '#000' : '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📊 Eventos Pasados
              </button>
            </div>

            <div className="grafico-card__body" style={{ padding: '20px' }}>
              {reporteData.tendencias_ubicacion
                .sort((a: any, b: any) => b.total_eventos - a.total_eventos)
                .slice(0, 10)
                .map((prov: any, index: number) => (
                <div key={index} style={{ marginBottom: '15px', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }}>
                  <div
                    onClick={() => setProvinciaExpandida(provinciaExpandida === prov.provincia ? null : prov.provincia)}
                    style={{
                      padding: '15px',
                      background: '#252525',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      borderLeft: '4px solid #4ade80'
                    }}
                  >
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                      {prov.provincia.toUpperCase()}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4ade80' }}>
                        {prov.total_eventos} eventos
                      </span>
                      <span style={{ transition: 'transform 0.3s', transform: provinciaExpandida === prov.provincia ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {provinciaExpandida === prov.provincia && (
                    <div style={{ padding: '10px 20px', background: '#1a1a1a' }}>
                      {prov.localidades.map((loc: any, locIndex: number) => (
                        <div key={locIndex} style={{ marginBottom: '10px' }}>
                          <div
                            onClick={() => setLocalidadExpandida(localidadExpandida === `${prov.provincia}-${loc.localidad}` ? null : `${prov.provincia}-${loc.localidad}`)}
                            style={{
                              padding: '12px',
                              background: '#2d2d2d',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              border: '1px solid #444'
                            }}
                          >
                            <span style={{ fontWeight: '500' }}>{loc.localidad}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{loc.cantidad} eventos</span>
                              <span style={{ fontSize: '0.8rem' }}>
                                {localidadExpandida === `${prov.provincia}-${loc.localidad}` ? '▲' : '▼'}
                              </span>
                            </div>
                          </div>

                          {localidadExpandida === `${prov.provincia}-${loc.localidad}` && (
                            <div style={{ marginTop: '5px', marginLeft: '20px' }}>
                              {loc.eventos.map((evt: any, evtIndex: number) => (
                                <div key={evtIndex} style={{
                                  padding: '8px 12px',
                                  background: '#1a1a1a',
                                  marginBottom: '5px',
                                  borderRadius: '4px',
                                  fontSize: '0.85rem',
                                  border: '1px solid #333',
                                  display: 'flex',
                                  justifyContent: 'space-between'
                                }}>
                                  <span style={{ color: '#e0e0e0' }}>{evt.nombre}</span>
                                  <div style={{ display: 'flex', gap: '15px', color: '#888' }}>
                                    <span>📍 {evt.tipo}</span>
                                    <span>🚴 {evt.distancia_km} km</span>
                                    <span>📅 {new Date(evt.fecha_evento).toLocaleDateString('es-AR')}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}