import { useState, useEffect, useRef } from "react";
import "../styles/reportes.css";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { useAuth } from "../context/auth-context";
import { getReporteGeneral, exportReporteCSV } from "../services/eventos";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DetalleRecaudacion {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  monto: number;
  monto_unitario: number;
  inscriptos_count: number;
  inscriptos_confirmados: number;
  cupo_maximo: number | null;
  estado_evento: number;
  tipo: string;
  descripcion: string;
  ubicacion_completa: string;
  distancia_km: number;
}

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
  detalle_recaudacion?: DetalleRecaudacion[];
  tendencias_ubicacion?: any[];
  tendencias_ubicacion_completa?: any[];
  top_10_recaudacion?: any[];
  usuarios_nuevos?: any[];
}

// ─── Modal detalle de evento ──────────────────────────────────────────────────

function EventoDetalleModal({
  evento,
  onClose,
}: {
  evento: DetalleRecaudacion;
  onClose: () => void;
}) {
  const estadoLabel: Record<number, string> = {
    1: "Borrador", 2: "Pendiente", 3: "Publicado",
    4: "Finalizado", 5: "Cancelado", 6: "Depurado por Admin",
  };
  const estadoColor: Record<number, string> = {
    3: "#4ade80", 4: "#60a5fa", 5: "#f87171", 2: "#fbbf24",
  };
  const color = estadoColor[evento.estado_evento] || "#888";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
        zIndex: 9999, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1a1a1a", border: "1px solid #333", borderRadius: "16px",
          padding: "32px", maxWidth: "600px", width: "100%",
          maxHeight: "85vh", overflowY: "auto", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            background: "none", border: "none", color: "#888",
            fontSize: "1.4rem", cursor: "pointer", lineHeight: 1,
          }}
        >
          ✕
        </button>

        <div
          style={{
            display: "inline-block", padding: "4px 12px", borderRadius: "20px",
            background: color + "22", border: `1px solid ${color}`,
            color, fontSize: "0.78rem", fontWeight: "bold", marginBottom: "12px",
          }}
        >
          {(estadoLabel[evento.estado_evento] || `Estado ${evento.estado_evento}`).toUpperCase()}
        </div>

        <h2 style={{ margin: "0 0 4px", fontSize: "1.4rem", color: "#fff" }}>
          {evento.nombre_evento}
        </h2>
        <p style={{ margin: "0 0 24px", color: "#888", fontSize: "0.9rem" }}>
          {evento.tipo}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "Fecha", value: new Date(evento.fecha_evento).toLocaleDateString("es-AR") },
            { label: "Distancia", value: `${evento.distancia_km} km` },
            {
              label: "Valor Unitario",
              value: evento.monto_unitario === 0
                ? "Gratuito"
                : `$${evento.monto_unitario.toLocaleString("es-AR")}`,
            },
            {
              label: "Cupo",
              value: evento.cupo_maximo
                ? `${evento.inscriptos_count} / ${evento.cupo_maximo}`
                : `${evento.inscriptos_count} inscriptos`,
            },
            { label: "Confirmados", value: `${evento.inscriptos_confirmados}` },
            { label: "Recaudado", value: `$${evento.monto.toLocaleString("es-AR")}` },
          ].map((item) => (
            <div
              key={item.label}
              style={{ background: "#252525", borderRadius: "8px", padding: "12px 16px" }}
            >
              <p style={{ margin: 0, color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {item.label}
              </p>
              <p style={{ margin: "4px 0 0", color: "#fff", fontWeight: "bold", fontSize: "1rem" }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {evento.ubicacion_completa && (
          <div style={{ marginBottom: "16px" }}>
            <p style={{ margin: "0 0 6px", color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              📍 Ubicación
            </p>
            <p style={{ margin: 0, color: "#e0e0e0", fontSize: "0.9rem" }}>
              {evento.ubicacion_completa}
            </p>
          </div>
        )}

        {evento.descripcion && (
          <div>
            <p style={{ margin: "0 0 6px", color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              📝 Descripción
            </p>
            <p style={{ margin: 0, color: "#ccc", fontSize: "0.9rem", lineHeight: 1.6 }}>
              {evento.descripcion}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ReportesPage() {

  // ── Estado ──────────────────────────────────────────────────────────────
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<string | null>(null);
  const [estadoAbierto, setEstadoAbierto] = useState<number | null>(null);
  const [eventoDetalle, setEventoDetalle] = useState<DetalleRecaudacion | null>(null);

  // Sort tabla de solicitudes
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Tendencias
  const [tabTendencias, setTabTendencias] = useState<"activos" | "pasados">("activos");
  const [filtroTipoTendencias, setFiltroTipoTendencias] = useState<string>("");
  const [provinciaExpandida, setProvinciaExpandida] = useState<string | null>(null);
  const [localidadExpandida, setLocalidadExpandida] = useState<string | null>(null);

  // Recaudación
  const [busquedaEvento, setBusquedaEvento] = useState<string>("");
  const [filtroEstadoRecaudacion, setFiltroEstadoRecaudacion] = useState<"todos" | "activos" | "pasados">("todos");
  const [filtroTipoRecaudacion, setFiltroTipoRecaudacion] = useState<string>("");
  const [sortFinanzas, setSortFinanzas] = useState<{
    key: "nombre" | "fecha" | "monto" | "cupo" | "unitario";
    direction: "asc" | "desc";
  }>({ key: "fecha", direction: "desc" });
  const reporteRef = useRef<HTMLDivElement>(null);
  const { user, getToken, loadingAuth } = useAuth();
  const usuarioRol = user?.id_rol || 0;

  // --- Estados para Admin (Nuevos Reportes) ---
  const [filtroPertenenciaAdmin, setFiltroPertenenciaAdmin] = useState<'Todos' | 'Propio' | 'Externo'>('Todos');
  
  const [modalAdminEvento, setModalAdminEvento] = useState<any | null>(null);
  // --- Estados para las Tarjetas Desplegables del Admin ---
  const [expandCard1, setExpandCard1] = useState(false);
  const [expandCard2, setExpandCard2] = useState(false);
  const [filtroCard3, setFiltroCard3] = useState<'Propio' | 'Externo'>('Propio');
  
  
  // Cálculos para las tarjetas
  const todosLosEventosAdmin = reporteData?.lista_eventos_detallada || [];
  const cantPropios = todosLosEventosAdmin.filter((e: any) => e.pertenencia === 'Propio').length;
  const cantExternos = todosLosEventosAdmin.filter((e: any) => e.pertenencia === 'Externo').length;
  
  const totalReservasAdmin = todosLosEventosAdmin.reduce((acc: number, curr: any) => acc + curr.reservas_totales, 0);
  const totalInscriptosAdmin = todosLosEventosAdmin.reduce((acc: number, curr: any) => acc + curr.inscripciones_confirmadas, 0);
  const pendientesAdmin = totalReservasAdmin - totalInscriptosAdmin;
  
  const eventosFiltradosTarjeta = todosLosEventosAdmin.filter((e: any) => e.pertenencia === filtroCard3);
  const recaudacionTarjeta = eventosFiltradosTarjeta.reduce((acc: number, curr: any) => acc + curr.monto_recaudado, 0);
  // --- Estados para Usuarios y Mapa de Calor ---
  const [mesExpandido, setMesExpandido] = useState<string | null>(null);
  const [provinciaExpandidaAdmin, setProvinciaExpandidaAdmin] = useState<string | null>(null);

  // 1. Agrupar usuarios nuevos por Mes (ej: "2023-10")
  const usuariosPorMes = (reporteData?.usuarios_nuevos || []).reduce((acc: any, user: any) => {
      // Extraemos "YYYY-MM" de la fecha "YYYY-MM-DD"
      const mesAnio = user.fecha_creacion ? user.fecha_creacion.substring(0, 7) : "Sin fecha";
      if (!acc[mesAnio]) acc[mesAnio] = [];
      acc[mesAnio].push(user);
      return acc;
  }, {});

  // 2. Calcular totales para la barra de porcentajes de Roles
  const totalClientes = (reporteData?.usuarios_nuevos || []).filter((u: any) => u.rol === "Cliente").length;
  const totalOrganizaciones = (reporteData?.usuarios_nuevos || []).filter((u: any) => u.rol === "Organización Externa").length;
  const totalUsuariosNuevos = totalClientes + totalOrganizaciones;
  const pctClientes = totalUsuariosNuevos > 0 ? (totalClientes / totalUsuariosNuevos) * 100 : 0;
  const pctOrganizaciones = totalUsuariosNuevos > 0 ? (totalOrganizaciones / totalUsuariosNuevos) * 100 : 0;

  // 3. Calcular el máximo de eventos en una provincia para dibujar la barra de calor
  const maxEventosProvincia = Math.max(...(reporteData?.tendencias_ubicacion_completa?.map((p: any) => p.total_eventos) || [1]));

  const TIPOS_EVENTO = [
    "Ciclismo de Ruta",
    "Mountain Bike (MTB)",
    "Rural Bike",
    "Gravel",
    "Cicloturismo",
    "Entrenamiento / Social",
  ];

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loadingAuth) {
      const token = getToken();
      if (token) cargarReportes(token);
      else setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAuth]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const cargarReportes = async (tokenParam?: string) => {
    try {
      setLoading(true);
      setError(null);
      const token = tokenParam || getToken();
      if (!token) { setError("No se encontró una sesión activa."); return; }
      const data = await getReporteGeneral(token, undefined, undefined);
      setReporteData(data);
    } catch (err: any) {
      setError(err?.response?.status === 401 ? "Sesión expirada" : "Error al cargar reportes");
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
    } catch {
      alert("Error al exportar el reporte CSV");
    } finally {
      setExportando(null);
    }
  };

  const handleDescargarPDF = async () => {
    if (!reporteRef.current) return;
    try {
      setExportando("pdf");
      const canvas = await html2canvas(reporteRef.current, { scale: 2, backgroundColor: "#000000" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, (imgProps.height * pdfWidth) / imgProps.width);
      pdf.save("reporte-panel-control.pdf");
    } catch {
      alert("No se pudo generar el PDF");
    } finally {
      setExportando(null);
    }
  };

  // ── Sort helpers ──────────────────────────────────────────────────────────
  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      !prev || prev.key !== key
        ? { key, direction: "asc" }
        : { key, direction: prev.direction === "asc" ? "desc" : "asc" }
    );
  };

  const si = (key: string) =>
    sortConfig?.key === key ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : "";

  const handleSortFin = (key: "nombre" | "fecha" | "monto" | "cupo" | "unitario") => {
    setSortFinanzas((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sif = (key: string) =>
    sortFinanzas.key === key ? (sortFinanzas.direction === "asc" ? " ↑" : " ↓") : "";

  const sortedLista = (lista: any[]) => {
    if (!sortConfig) return lista;
    return [...lista].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortConfig.key === "nombre") cmp = String(a.nombre || "").localeCompare(String(b.nombre || ""));
      else if (sortConfig.key === "fecha") cmp = new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
      else if (sortConfig.key === "reservas") cmp = (a.reservas ?? 0) - (b.reservas ?? 0);
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  };

  // ── Label helpers ─────────────────────────────────────────────────────────
  const getNombreEstado = (id: number) =>
    (({ 1: "Borrador", 2: "Pendiente", 3: "Publicado", 4: "Finalizado", 5: "Cancelado", 6: "Depurado por Admin" } as Record<number, string>)[id] || `Estado ${id}`);

  const getNombreRol = (id: number) =>
    (({ 1: "Admin", 2: "Supervisor", 3: "Operario", 4: "Cliente" } as Record<number, string>)[id] || `Rol ${id}`);

  const getNombreMes = (mes: number) =>
    ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][mes - 1] || String(mes);

  // ── Gráficos ──────────────────────────────────────────────────────────────

  const renderRankingHorizontal = (data: any[], labelKey: string, valueKey: string) => {
    if (!data?.length) return <p className="no-data">Sin datos de ubicación</p>;
    const sorted = [...data].sort((a: any, b: any) => b[valueKey] - a[valueKey]).slice(0, 10);
    const maxVal = Math.max(...sorted.map((d: any) => d[valueKey]), 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
        {sorted.map((item: any, i: number) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span style={{ fontWeight: 500, color: "#e0e0e0" }}>{item[labelKey]}</span>
              <span style={{ fontWeight: "bold", color: "#4ade80" }}>{item[valueKey]}</span>
            </div>
            <div style={{ width: "100%", height: "8px", backgroundColor: "#333", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${(item[valueKey] / maxVal) * 100}%`, height: "100%", backgroundColor: "#4ade80", borderRadius: "4px" }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGraficoLinea = (data: any[]) => {
    if (!data?.length) return <p className="no-data">Sin datos disponibles</p>;
    const sorted = [...data].sort((a: any, b: any) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes);
    const maxVal = Math.max(...sorted.map((item: any) => item.cantidad), 1);
    return (
      <div className="grafico-linea">
        <div className="grafico-linea__grid">
          {sorted.map((item: any, i: number) => (
            <div key={i} className="grafico-linea__columna">
              <span className="grafico-linea__count">{item.cantidad}</span>
              <div className="grafico-linea__barra" style={{ height: `${(item.cantidad / maxVal) * 80}%` }} />
              <div className="grafico-linea__label">{getNombreMes(item.mes)}<br />{item.anio}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGraficoPie = (
    data: any[],
    labelKey: string,
    valueKey: string,
    getLabelFn?: (v: any) => string
  ) => {
    if (!data?.length) return <p className="no-data">Sin datos disponibles</p>;
    const total = data.reduce((s: number, item: any) => s + item[valueKey], 0);
    const colores = ["#ff6b35", "#ffa500", "#4caf50", "#2196f3", "#9c27b0"];
    return (
      <div className="grafico-pie">
        {data.map((item: any, i: number) => (
          <div key={i} className="grafico-pie__item">
            <div className="grafico-pie__color" style={{ backgroundColor: colores[i % colores.length] }} />
            <div className="grafico-pie__info">
              <span className="grafico-pie__label">
                {getLabelFn ? getLabelFn(item[labelKey]) : item[labelKey]}
              </span>
              <span className="grafico-pie__valor">
                {item[valueKey]} ({((item[valueKey] / (total || 1)) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGraficoTorta = (data: any[], labelKey: string, valueKey: string) => {
    if (!data?.length) return <p className="no-data">Sin datos disponibles</p>;
    const total = data.reduce((s: number, item: any) => s + item[valueKey], 0);
    const colores = ["#ff6b35", "#4ade80", "#60a5fa", "#fbbf24", "#a78bfa", "#d63a3a"];
    const size = 180; const center = size / 2; const radius = 80;
    let angle = -90;
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "40px", width: "100%", padding: "20px 0" }}>
        {/* Contenedor del SVG */}
        <div style={{ position: "relative", width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
            {data.map((item: any, i: number) => {
              const val = item[valueKey];
              const arc = (val / total) * 360;
              const sa = angle;
              const ea = angle + arc;
              const mid = sa + arc / 2;
              const x1 = center + radius * Math.cos((Math.PI * sa) / 180);
              const y1 = center + radius * Math.sin((Math.PI * sa) / 180);
              const x2 = center + radius * Math.cos((Math.PI * ea) / 180);
              const y2 = center + radius * Math.sin((Math.PI * ea) / 180);
              const tr = radius * 0.65;
              const tx = center + tr * Math.cos((Math.PI * mid) / 180);
              const ty = center + tr * Math.sin((Math.PI * mid) / 180);
              const laf = arc > 180 ? 1 : 0;
              const d = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${laf} 1 ${x2} ${y2} Z`;
              angle += arc;
              return (
                <g key={i}>
                  <path d={d} fill={colores[i % colores.length]} stroke="#1a1a1a" strokeWidth="1" />
                  <text x={tx} y={ty} fill="white" fontSize="12" fontWeight="bold" textAnchor="middle" alignmentBaseline="middle">
                    {val}
                  </text>
                </g>
              );
            })}
            <circle cx={center} cy={center} r={radius * 0.35} fill="#1a1a1a" />
          </svg>
        </div>

        {/* Contenedor de la Leyenda */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {data.map((item: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ backgroundColor: colores[i % colores.length], width: "12px", height: "12px", borderRadius: "2px", marginRight: "10px" }} />
              <span style={{ fontSize: "0.85rem", color: "#ccc", whiteSpace: "nowrap" }}>
                <strong style={{ color: "#fff" }}>{item[labelKey]}:</strong> {item[valueKey]}
                <span style={{ color: "#888", marginLeft: "5px" }}>
                  ({((item[valueKey] / total) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Datos derivados ───────────────────────────────────────────────────────

  const detalleRecaudacionFiltrado: DetalleRecaudacion[] = (reporteData?.detalle_recaudacion ?? [])
    .filter((item: DetalleRecaudacion) => {
      const mb = item.nombre_evento.toLowerCase().includes(busquedaEvento.toLowerCase());
      const mt = filtroTipoRecaudacion === "" || item.tipo === filtroTipoRecaudacion;
      if (filtroEstadoRecaudacion === "activos") return mb && mt && item.estado_evento === 3;
      if (filtroEstadoRecaudacion === "pasados") return mb && mt && item.estado_evento === 4;
      return mb && mt;
    })
    .sort((a: DetalleRecaudacion, b: DetalleRecaudacion) => {
      const { key, direction } = sortFinanzas;
      let cmp = 0;
      if (key === "nombre") cmp = a.nombre_evento.localeCompare(b.nombre_evento);
      else if (key === "fecha") cmp = new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
      else if (key === "monto") cmp = a.monto - b.monto;
      else if (key === "unitario") cmp = a.monto_unitario - b.monto_unitario;
      else if (key === "cupo") cmp = (a.inscriptos_count ?? 0) - (b.inscriptos_count ?? 0);
      return direction === "asc" ? cmp : -cmp;
    });

  const totalRecaudacionFiltrado = detalleRecaudacionFiltrado.reduce(
    (s: number, item: DetalleRecaudacion) => s + item.monto, 0
  );

  const tendenciasFiltradas = (reporteData?.tendencias_ubicacion ?? [])
    .map((prov: any) => ({
      ...prov,
      localidades: prov.localidades
        .map((loc: any) => ({
          ...loc,
          eventos: loc.eventos.filter((evt: any) => {
            const me = tabTendencias === "activos" ? evt.estado === 3 : evt.estado === 4;
            const mt = filtroTipoTendencias === "" || evt.tipo === filtroTipoTendencias;
            return me && mt;
          }),
        }))
        .filter((loc: any) => loc.eventos.length > 0),
    }))
    .filter((prov: any) => prov.localidades.length > 0);

  // ── Guards de render ──────────────────────────────────────────────────────
  if (loadingAuth || loading) {
    return (
      <div className="reportes-page">
        <div className="reportes-loading">
          <div className="spinner-large" />
          <p>Cargando panel...</p>
        </div>
      </div>
    );
  }

  if (!getToken()) {
    return (
      <div className="reportes-page">
        <div className="reportes-alert reportes-alert--error">
          <span className="reportes-alert__icon">🔒</span>
          <span className="reportes-alert__message">Debes iniciar sesión para acceder.</span>
          <button
            onClick={() => (window.location.href = "/login")}
            className="reportes-alert__retry"
          >
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

  const pendientesCount =
    reporteData?.eventos_por_estado?.find((e: any) => e.estado === 1)?.cantidad ?? 0;

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="reportes-page">
      <Navbar />

      {eventoDetalle && (
        <EventoDetalleModal evento={eventoDetalle} onClose={() => setEventoDetalle(null)} />
      )}

      {/* ── Barra superior (sin filtros globales) ─────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 1000,
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
        padding: "16px 40px", borderBottom: "2px solid #4ade80",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: "15px",
      }}>
        <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#4ade80" }}>
          📊 Panel de Reportes
        </span>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleDescargarPDF}
            disabled={exportando === "pdf"}
            style={{
              padding: "10px 20px", background: "#e74c3c", border: "none",
              borderRadius: "8px", color: "#fff", fontWeight: "bold",
              cursor: exportando === "pdf" ? "not-allowed" : "pointer",
              opacity: exportando === "pdf" ? 0.6 : 1,
            }}
          >
            {exportando === "pdf" ? "Generando..." : "📄 Guardar PDF"}
          </button>
          <button
            onClick={() => cargarReportes()}
            style={{
              padding: "10px 20px", background: "#4ade80", border: "none",
              borderRadius: "8px", color: "#000", fontWeight: "bold", cursor: "pointer",
            }}
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      <div className="reportes-page__container" ref={reporteRef}>

        {/* Header */}
        <div className="reportes-header">
          <div>
            <h1 className="reportes-header__title">Panel de Control y Reportes</h1>
            <p className="reportes-header__subtitle">
              Gestión centralizada de datos para {user?.nombre_y_apellido}
            </p>
          </div>
        </div>

        {error && (
          <div className="reportes-alert reportes-alert--error">⚠️ {error}</div>
        )}

        {usuarioRol <= 2 && pendientesCount > 0 && (
          <div className="reportes-alert reportes-alert--warning">
            🔔 Tienes <strong>{pendientesCount}</strong> eventos pendientes de revisión.
          </div>
        )}

        {/* ── Tarjetas Admin / Supervisor ────────────────────────────────── */}
        {(usuarioRol === 1 || usuarioRol === 2) && (
          <>
            <div style={{ display: "flex", gap: "20px", marginBottom: "40px", flexWrap: "wrap" }}>
                
                {/* TARJETA 1: Total Eventos */}
                <div style={{ flex: "1 1 30%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155", minWidth: "250px" }}>
                    <h4 style={{ color: "#94a3b8", margin: "0 0 10px 0" }}>Total Eventos del Sistema</h4>
                    <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#fff" }}>{todosLosEventosAdmin.length}</span>
                    <div style={{ marginTop: "10px" }}>
                        <button onClick={() => setExpandCard1(!expandCard1)} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "0.9rem", padding: 0 }}>
                            {expandCard1 ? "Ocultar detalle ▴" : "Ver detalle ▾"}
                        </button>
                        {expandCard1 && (
                            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #334155", display: "flex", justifyContent: "space-between", color: "#cbd5e1", fontSize: "0.95rem" }}>
                                <span>Propios: <strong style={{ color: "#8b5cf6" }}>{cantPropios}</strong></span>
                                <span>Externos: <strong style={{ color: "#4b5563" }}>{cantExternos}</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* TARJETA 2: Usuarios Registrados (Participantes) */}
                <div style={{ flex: "1 1 30%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155", minWidth: "250px" }}>
                    <h4 style={{ color: "#94a3b8", margin: "0 0 10px 0" }}>Participantes Registrados</h4>
                    <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#3b82f6" }}>{totalReservasAdmin}</span>
                    <div style={{ marginTop: "10px" }}>
                        <button onClick={() => setExpandCard2(!expandCard2)} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "0.9rem", padding: 0 }}>
                            {expandCard2 ? "Ocultar detalle ▴" : "Ver detalle ▾"}
                        </button>
                        {expandCard2 && (
                            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #334155", display: "flex", justifyContent: "space-between", color: "#cbd5e1", fontSize: "0.95rem" }}>
                                <span>Inscriptos Confirmados: <strong style={{ color: "#4ade80" }}>{totalInscriptosAdmin}</strong></span>
                                <span>Reservas Pendientes: <strong style={{ color: "#fbbf24" }}>{pendientesAdmin}</strong></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* TARJETA 3: Eventos por Pertenencia (Filtro) */}
                <div style={{ flex: "1 1 30%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155", minWidth: "250px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                        <h4 style={{ color: "#94a3b8", margin: 0 }}>Rendimiento</h4>
                        <select 
                            value={filtroCard3} 
                            onChange={(e) => setFiltroCard3(e.target.value as 'Propio' | 'Externo')}
                            style={{ backgroundColor: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "5px", padding: "4px", fontSize: "0.85rem", cursor: "pointer" }}
                        >
                            <option value="Propio">Propios</option>
                            <option value="Externo">Externos</option>
                        </select>
                    </div>
                    <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#8b5cf6" }}>
                        {eventosFiltradosTarjeta.length} <span style={{ fontSize: "1.1rem", color: "#94a3b8", fontWeight: "normal" }}>eventos</span>
                    </span>
                    <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #334155", display: "flex", justifyContent: "space-between", color: "#cbd5e1", fontSize: "0.95rem" }}>
                        <span>Recaudación:</span>
                        <strong style={{ color: "#4ade80" }}>${recaudacionTarjeta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                    </div>
                </div>

            </div>

            {/* ═════════════════════════════════════════════════════════════════════
                TOP 10 DE EVENTOS POR RECAUDACIÓN (Actualizado)
            ═════════════════════════════════════════════════════════════════════ */}
            <div className="reportes-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3>🏆 Top 10 Eventos por Recaudación</h3>
                    <select 
                        value={filtroPertenenciaAdmin} 
                        onChange={(e) => setFiltroPertenenciaAdmin(e.target.value as any)}
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
                                {/* Le sacamos lo de Pagos / Max para dejarlo más limpio */}
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
                                    {/* Acá mostramos Reservas Totales / Max */}
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
                NUEVO REPORTE: DISTRIBUCIÓN DE USUARIOS Y CRECIMIENTO MENSUAL
            ═════════════════════════════════════════════════════════════════════ */}
            <div style={{ display: "flex", gap: "20px", marginTop: "40px", flexWrap: "wrap" }}>
                
                {/* LADO IZQUIERDO: Totales y Barra Porcentual */}
                <div style={{ flex: "1 1 45%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155" }}>
                    <h3 style={{ margin: "0 0 20px 0" }}>👥 Distribución por Rol</h3>
                    
                    <table className="tabla-reportes-custom" style={{ marginBottom: "20px" }}>
                        <thead>
                            <tr>
                                <th>Rol de Usuario</th>
                                <th style={{ textAlign: "center" }}>Total Registrados</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><span style={{ color: "#0ea5e9", fontWeight: "bold" }}>● Cliente</span></td>
                                <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "1.1rem" }}>{totalClientes}</td>
                            </tr>
                            <tr>
                                <td><span style={{ color: "#f97316", fontWeight: "bold" }}>● Organización Externa</span></td>
                                <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "1.1rem" }}>{totalOrganizaciones}</td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Barra Porcentual Visual */}
                    <div style={{ marginTop: "30px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "5px" }}>
                            <span>Clientes ({pctClientes.toFixed(1)}%)</span>
                            <span>Organizaciones ({pctOrganizaciones.toFixed(1)}%)</span>
                        </div>
                        <div style={{ width: "100%", height: "12px", backgroundColor: "#1e293b", borderRadius: "10px", display: "flex", overflow: "hidden" }}>
                            <div style={{ width: `${pctClientes}%`, backgroundColor: "#0ea5e9", transition: "width 0.5s" }}></div>
                            <div style={{ width: `${pctOrganizaciones}%`, backgroundColor: "#f97316", transition: "width 0.5s" }}></div>
                        </div>
                    </div>
                </div>

                {/* LADO DERECHO: Evolución Mensual (Acordeón) */}
                <div style={{ flex: "1 1 45%", backgroundColor: "#0f172a", padding: "20px", borderRadius: "10px", border: "1px solid #334155" }}>
                    <h3 style={{ margin: "0 0 20px 0" }}>📈 Nuevos Registros por Mes</h3>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto", paddingRight: "5px" }}>
                        {Object.keys(usuariosPorMes).sort().reverse().map((mes, index) => (
                            <div key={index} style={{ backgroundColor: "#1e293b", borderRadius: "8px", overflow: "hidden" }}>
                                <div 
                                    onClick={() => setMesExpandido(mesExpandido === mes ? null : mes)}
                                    style={{ padding: "12px 15px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", borderBottom: mesExpandido === mes ? "1px solid #334155" : "none" }}
                                >
                                    <strong style={{ color: "#f8fafc" }}>{mes}</strong>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span className="badge-tipo" style={{ backgroundColor: "#3b82f6" }}>{usuariosPorMes[mes].length} usuarios</span>
                                        <span style={{ color: "#94a3b8" }}>{mesExpandido === mes ? "▲" : "▼"}</span>
                                    </div>
                                </div>
                                
                                {mesExpandido === mes && (
                                    <div style={{ padding: "10px 15px", backgroundColor: "#0f172a" }}>
                                        {usuariosPorMes[mes].map((u: any, i: number) => (
                                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: i !== usuariosPorMes[mes].length - 1 ? "1px solid #1e293b" : "none", fontSize: "0.85rem" }}>
                                                <div>
                                                    <span style={{ color: "#cbd5e1", fontWeight: "bold" }}>{u.nombre}</span><br/>
                                                    <span style={{ color: "#64748b" }}>{u.email}</span>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <span style={{ color: u.rol === "Cliente" ? "#0ea5e9" : "#f97316" }}>{u.rol}</span><br/>
                                                    <span style={{ color: "#4ade80" }}>{u.cantidad_inscripciones} inscrip.</span>
                                                </div>
                                            </div>
                                        ))}
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
                    {reporteData?.tendencias_ubicacion_completa?.map((prov: any, index: number) => {
                        // Calculamos qué tan "caliente" es la provincia para llenar la barra roja/naranja
                        const porcentajeCalor = (prov.total_eventos / maxEventosProvincia) * 100;
                        
                        // Unificamos TODOS los eventos de todas las localidades de esa provincia en un solo array
                        const todosEventosProvincia = prov.localidades.flatMap((loc: any) => loc.eventos);

                        return (
                            <div key={index} style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", overflow: "hidden" }}>
                                
                                {/* Fila clickeable principal con la BARRA DE CALOR de fondo */}
                                <div 
                                    onClick={() => setProvinciaExpandidaAdmin(provinciaExpandidaAdmin === prov.provincia ? null : prov.provincia)}
                                    style={{ position: "relative", padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", zIndex: 1 }}
                                >
                                    {/* La barra de densidad (Fondo de color) */}
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

                                {/* Desplegable con los eventos (AHORA CLICKEABLES) */}
                                {provinciaExpandidaAdmin === prov.provincia && (
                                    <div style={{ padding: "15px 20px", borderTop: "1px solid #334155", backgroundColor: "#1e293b" }}>
                                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
                                            {todosEventosProvincia.map((evento: any, i: number) => (
                                                <li 
                                                    key={i} 
                                                    onClick={() => setModalAdminEvento(evento)} // ¡ACÁ ABRIMOS EL MODAL!
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
            </div>

            <div className="stat-card stat-card--primary">
              <div className="stat-card__valor">{reporteData?.total_eventos ?? 0}</div>
              <div className="stat-card__label">Total Eventos Sistema</div>
            </div>
            <div className="stat-card stat-card--success">
              <div className="stat-card__valor">{reporteData?.usuarios_total ?? 0}</div>
              <div className="stat-card__label">Usuarios Registrados</div>
            </div>
            <div
              className="stat-card stat-card--info"
              style={{ cursor: "pointer" }}
              onClick={() => document.getElementById("lista_eventos_detallada")?.scrollIntoView({ behavior: "smooth" })}
            >
              <div className="stat-card__valor">{reporteData?.mis_eventos_total ?? 0}</div>
              <div className="stat-card__label">Mis Eventos Creados</div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            ROL 3 — ORGANIZACIÓN EXTERNA
        ════════════════════════════════════════════════════════════════ */}
        {usuarioRol === 3 && (
          <div style={{ marginTop: "20px" }}>

            {/* Acordeón: mis solicitudes por estado */}
            {(reporteData?.lista_eventos_detallada ?? []).length > 0 && (
              <div className="grafico-card grafico-card--wide" id="lista_eventos_detallada">
                <div className="grafico-card__header">
                  <h3>📋 Mis Solicitudes por Estado</h3>
                </div>
                <div className="grafico-card__body">
                  {[2, 3, 4, 5, 6].map((idEstado: number) => {
                    const items = sortedLista(
                      (reporteData?.lista_eventos_detallada ?? []).filter((e: any) => e.estado === idEstado)
                    );
                    if (!items.length) return null;
                    const isOpen = estadoAbierto === idEstado;
                    const bc = idEstado === 3 ? "#4ade80" : idEstado === 2 ? "#fbbf24" : "#e74c3c";

                    return (
                      <div key={idEstado} style={{ marginBottom: "10px", border: "1px solid #333", borderRadius: "8px", overflow: "hidden" }}>
                        <div
                          onClick={() => setEstadoAbierto(isOpen ? null : idEstado)}
                          style={{
                            padding: "15px", backgroundColor: "#252525",
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center", cursor: "pointer",
                            borderLeft: `4px solid ${bc}`,
                          }}
                        >
                          <span style={{ fontWeight: "bold", fontSize: "1rem" }}>
                            {getNombreEstado(idEstado).toUpperCase()} ({items.length})
                          </span>
                          <span style={{ transition: "transform 0.3s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                            ▼
                          </span>
                        </div>

                        {isOpen && (
                          <div style={{ padding: "10px", backgroundColor: "#1a1a1a" }}>
                            <div className="table-responsive">
                              <table className="tabla-reportes-custom">
                                <thead>
                                  <tr>
                                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("nombre")}>
                                      Evento{si("nombre")}
                                    </th>
                                    <th style={{ cursor: "pointer" }} onClick={() => handleSort("fecha")}>
                                      Fecha{si("fecha")}
                                    </th>
                                    <th>Tipo</th>
                                    <th style={{ textAlign: "center", cursor: "pointer" }} onClick={() => handleSort("reservas")}>
                                      Cupo / Reservas{si("reservas")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((evt: any) => (
                                    <tr key={evt.id}>
                                      <td style={{ fontWeight: "bold" }}>{evt.nombre}</td>
                                      <td>{evt.fecha}</td>
                                      <td><span className="badge-tipo">{evt.tipo}</span></td>
                                      <td style={{ textAlign: "center" }}>
                                        <div className="reservas-indicator">
                                          {evt.reservas}{evt.cupo_maximo ? ` / ${evt.cupo_maximo}` : ""}
                                        </div>
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

            {/* ── FILA 1 (100%): Popularidad por Categoría ───────────── */}
            <div className="grafico-card grafico-card--wide" style={{ marginTop: "24px" }}>
              <div className="grafico-card__header">
                <h3>📈 Popularidad por Categoría de Mis Eventos</h3>
                <p style={{ fontSize: "0.8rem", color: "#888" }}>
                  Distribución de inscritos según el tipo de actividad que organizás.
                </p>
                <button
                  data-html2canvas-ignore="true"
                  onClick={() => handleExportarCSV("rendimiento_categorias")}
                  className="btn-export"
                >
                  📥 CSV
                </button>
              </div>
              <div className="grafico-card__body">
                {renderGraficoTorta(reporteData?.rendimiento_por_tipo ?? [], "tipo", "cantidad")}
                <div className="insight-text" style={{ marginTop: "20px" }}>
                  {(reporteData?.rendimiento_por_tipo ?? []).length > 0 ? (
                    <>
                      💡 Tu categoría más buscada es{" "}
                      <strong>
                        {[...(reporteData?.rendimiento_por_tipo ?? [])]
                          .sort((a: any, b: any) => b.cantidad - a.cantidad)[0]?.tipo}
                      </strong>
                    </>
                  ) : (
                    "💡 No hay datos suficientes para determinar una tendencia."
                  )}
                </div>
              </div>
            </div>

            {/* ── FILA 2: Tarjeta filtros + tarjeta totales ───────────── */}
            <div className="reportes-graficos" style={{ marginTop: "24px" }}>

              {/* Tarjeta izquierda: resumen + filtros de recaudación */}
              <div className="grafico-card">
                <div className="grafico-card__header">
                  <h3>💰 Recaudación Total</h3>
                  <p style={{ fontSize: "0.8rem", color: "#888" }}>
                    Todos los eventos — gratuitos muestran $0
                  </p>
                </div>
                <div className="grafico-card__body" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: "3.2rem", fontWeight: "bold", color: "#4ade80" }}>
                    ${totalRecaudacionFiltrado.toLocaleString("es-AR")}
                  </span>
                  <p style={{ color: "#ccc", marginTop: "8px" }}>
                    {detalleRecaudacionFiltrado.length} eventos en la vista
                  </p>

                  {/* Búsqueda */}
                  <input
                    type="text"
                    placeholder="🔍 Buscar evento..."
                    value={busquedaEvento}
                    onChange={(e) => setBusquedaEvento(e.target.value)}
                    style={{
                      width: "100%", padding: "10px", marginTop: "16px",
                      background: "#0d0d0d", border: "1px solid #4ade80",
                      borderRadius: "6px", color: "#fff", fontSize: "0.9rem",
                    }}
                  />

                  {/* Filtro estado */}
                  <select
                    value={filtroEstadoRecaudacion}
                    onChange={(e) => setFiltroEstadoRecaudacion(e.target.value as any)}
                    style={{
                      width: "100%", padding: "10px", marginTop: "10px",
                      background: "#0d0d0d", border: "1px solid #4ade80",
                      borderRadius: "6px", color: "#fff", fontSize: "0.9rem", cursor: "pointer",
                    }}
                  >
                    <option value="todos">📊 Todos los Eventos</option>
                    <option value="activos">🟢 Solo Activos (Publicados)</option>
                    <option value="pasados">🔵 Solo Finalizados</option>
                  </select>

                  {/* Filtro tipo */}
                  <select
                    value={filtroTipoRecaudacion}
                    onChange={(e) => setFiltroTipoRecaudacion(e.target.value)}
                    style={{
                      width: "100%", padding: "10px", marginTop: "10px",
                      background: "#0d0d0d", border: "1px solid #4ade80",
                      borderRadius: "6px", color: "#fff", fontSize: "0.9rem", cursor: "pointer",
                    }}
                  >
                    <option value="">🚴 Todos los Tipos</option>
                    {TIPOS_EVENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Tarjeta derecha: métricas globales */}
              <div className="grafico-card" style={{ display: "flex", flexDirection: "column", gap: "16px", justifyContent: "center" }}>
                {[
                  { label: "Recaudación total sistema", value: `$${(reporteData?.recaudacion_total ?? 0).toLocaleString("es-AR")}`, color: "#4ade80" },
                  { label: "Total reservas recibidas", value: String(reporteData?.total_reservas_recibidas ?? 0), color: "#60a5fa" },
                  { label: "Mis eventos creados", value: String(reporteData?.mis_eventos_total ?? 0), color: "#fbbf24" },
                ].map((card) => (
                  <div key={card.label} style={{ background: "#252525", borderRadius: "8px", padding: "20px" }}>
                    <p style={{ margin: 0, color: "#888", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {card.label}
                    </p>
                    <p style={{ margin: "6px 0 0", color: card.color, fontWeight: "bold", fontSize: "2rem" }}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── TABLA DETALLE RECAUDACIÓN PRO ───────────────────────── */}
            <div className="grafico-card grafico-card--wide" style={{ marginTop: "20px" }}>
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
                {detalleRecaudacionFiltrado.length === 0 ? (
                  <p className="no-data">Sin eventos para mostrar con los filtros actuales.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="tabla-reportes-custom">
                      <thead>
                        <tr>
                          <th style={{ cursor: "pointer" }} onClick={() => handleSortFin("nombre")}>
                            Evento{sif("nombre")}
                          </th>
                          <th style={{ cursor: "pointer" }} onClick={() => handleSortFin("fecha")}>
                            Fecha{sif("fecha")}
                          </th>
                          <th>Tipo</th>
                          <th style={{ textAlign: "center", cursor: "pointer" }} onClick={() => handleSortFin("cupo")}>
                            Cupo{sif("cupo")}
                          </th>
                          <th style={{ textAlign: "right", cursor: "pointer" }} onClick={() => handleSortFin("unitario")}>
                            Valor Unit.{sif("unitario")}
                          </th>
                          <th style={{ textAlign: "right", cursor: "pointer" }} onClick={() => handleSortFin("monto")}>
                            Monto Total{sif("monto")}
                          </th>
                          <th style={{ textAlign: "center" }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleRecaudacionFiltrado.map((item: DetalleRecaudacion, idx: number) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: "bold" }}>{item.nombre_evento}</td>
                            <td>{new Date(item.fecha_evento).toLocaleDateString("es-AR")}</td>
                            <td><span className="badge-tipo">{item.tipo}</span></td>
                            <td style={{ textAlign: "center" }}>
                              <div className="reservas-indicator">
                                {item.inscriptos_count}
                                {item.cupo_maximo ? ` / ${item.cupo_maximo}` : ""}
                              </div>
                            </td>
                            <td style={{ textAlign: "right", color: "#ccc" }}>
                              {item.monto_unitario === 0
                                ? "Gratis"
                                : `$${item.monto_unitario.toLocaleString("es-AR")}`}
                            </td>
                            <td style={{ textAlign: "right", color: "#4ade80", fontWeight: "bold" }}>
                              ${item.monto.toLocaleString("es-AR")}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button
                                onClick={() => setEventoDetalle(item)}
                                style={{
                                  padding: "5px 12px", background: "transparent",
                                  border: "1px solid #4ade80", borderRadius: "6px",
                                  color: "#4ade80", cursor: "pointer",
                                  fontSize: "0.8rem", fontWeight: "bold", whiteSpace: "nowrap",
                                }}
                              >
                                Ver más →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: "2px solid #4ade80" }}>
                          <td colSpan={5} style={{ textAlign: "right", fontWeight: "bold", fontSize: "1.1rem" }}>
                            TOTAL FILTRADO:
                          </td>
                          <td style={{ textAlign: "right", color: "#4ade80", fontWeight: "bold", fontSize: "1.2rem" }}>
                            ${totalRecaudacionFiltrado.toLocaleString("es-AR")}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
            </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            ADMIN / SUPERVISOR — Gráficos del sistema
        ════════════════════════════════════════════════════════════════ */}
        <div className="reportes-graficos">

          {usuarioRol <= 2 && (reporteData?.eventos_por_mes ?? []).length > 0 && (
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
              <div className="grafico-card__body">
                {renderGraficoLinea(reporteData?.eventos_por_mes ?? [])}
              </div>
            </div>
          )}

          {usuarioRol <= 2 && (reporteData?.eventos_por_tipo ?? []).length > 0 && (
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
                {renderGraficoTorta(reporteData?.eventos_por_tipo ?? [], "tipo", "cantidad")}
              </div>
            </div>
          )}

          {usuarioRol <= 2 && (reporteData?.eventos_por_dificultad ?? []).length > 0 && (
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
                {renderGraficoTorta(reporteData?.eventos_por_dificultad ?? [], "dificultad", "cantidad")}
              </div>
            </div>
          )}

          {usuarioRol <= 2 && (reporteData?.eventos_por_ubicacion ?? []).length > 0 && (
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
              <div className="grafico-card__body" style={{ overflowY: "auto", maxHeight: "300px" }}>
                {renderRankingHorizontal(reporteData?.eventos_por_ubicacion ?? [], "ubicacion", "cantidad")}
              </div>
            </div>
          )}

          {usuarioRol === 1 && (reporteData?.usuarios_por_rol ?? []).length > 0 && (
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
              <div className="grafico-card__body">
                {renderGraficoPie(reporteData?.usuarios_por_rol ?? [], "rol", "cantidad", getNombreRol)}
              </div>
            </div>
          )}

          {usuarioRol <= 2 && (
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
                <p style={{ fontSize: "0.9rem", color: "#e0e0e0" }}>
                  Registro de intervenciones administrativas sobre eventos y usuarios.
                </p>
                <div className="audit-badge">Auditoría Activa</div>
              </div>
            </div>
          )}

        </div>
        {/* fin .reportes-graficos */}

        {/* ════════════════════════════════════════════════════════════════
            TENDENCIAS POR UBICACIÓN — visible para todos los roles
        ════════════════════════════════════════════════════════════════ */}
        {tendenciasFiltradas.length > 0 && (
          <div className="grafico-card grafico-card--wide" style={{ marginTop: "30px" }}>
            <div className="grafico-card__header">
              <h3>🗺️ Tendencias por Ubicación — Análisis de Mercado (Top 10)</h3>
              <p style={{ fontSize: "0.8rem", color: "#888", marginTop: "5px" }}>
                Datos globales del sistema para análisis estratégico de zonas con mayor actividad.
              </p>
            </div>

            {/* Tabs Activos / Pasados + filtro Tipo */}
            <div
              style={{
                display: "flex", gap: "10px", padding: "15px 20px",
                borderBottom: "1px solid #333", flexWrap: "wrap", alignItems: "center",
              }}
            >
              {(["activos", "pasados"] as const).map((tab) => (
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
                {TIPOS_EVENTO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Lista de provincias */}
            <div className="grafico-card__body" style={{ padding: "20px" }}>
              {tendenciasFiltradas
                .sort((a: any, b: any) => b.total_eventos - a.total_eventos)
                .slice(0, 10)
                .map((prov: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: "15px",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    {/* Fila provincia */}
                    <div
                      onClick={() =>
                        setProvinciaExpandida(
                          provinciaExpandida === prov.provincia ? null : prov.provincia
                        )
                      }
                      style={{
                        padding: "15px",
                        background: "#252525",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        borderLeft: "4px solid #4ade80",
                      }}
                    >
                      <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                        {prov.provincia.toUpperCase()}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                        <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#4ade80" }}>
                          {prov.localidades.reduce(
                            (s: number, loc: any) => s + loc.eventos.length, 0
                          )}{" "}
                          eventos
                        </span>
                        <span
                          style={{
                            transition: "transform 0.3s",
                            transform:
                              provinciaExpandida === prov.provincia
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                          }}
                        >
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Panel de localidades */}
                    {provinciaExpandida === prov.provincia && (
                      <div style={{ padding: "10px 20px", background: "#1a1a1a" }}>
                        {prov.localidades.map((loc: any, li: number) => {
                          const locKey = `${prov.provincia}-${loc.localidad}`;
                          return (
                            <div key={li} style={{ marginBottom: "10px" }}>

                              {/* Fila localidad */}
                              <div
                                onClick={() =>
                                  setLocalidadExpandida(
                                    localidadExpandida === locKey ? null : locKey
                                  )
                                }
                                style={{
                                  padding: "12px",
                                  background: "#2d2d2d",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  border: "1px solid #444",
                                }}
                              >
                                <span style={{ fontWeight: 500, color: "#e0e0e0" }}>
                                  {loc.localidad}
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{ color: "#4ade80", fontWeight: "bold" }}>
                                    {loc.eventos.length} eventos
                                  </span>
                                  <span style={{ fontSize: "0.8rem", color: "#888" }}>
                                    {localidadExpandida === locKey ? "▲" : "▼"}
                                  </span>
                                </div>
                              </div>

                              {/* Lista de eventos de la localidad */}
                              {localidadExpandida === locKey && (
                                <div style={{ marginTop: "5px", marginLeft: "20px" }}>
                                  {loc.eventos.map((evt: any, ei: number) => (
                                    <div
                                      key={ei}
                                      style={{
                                        padding: "10px 14px",
                                        background: "#1a1a1a",
                                        marginBottom: "5px",
                                        borderRadius: "6px",
                                        fontSize: "0.85rem",
                                        border: "1px solid #2a2a2a",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        flexWrap: "wrap",
                                        gap: "8px",
                                      }}
                                    >
                                      <span style={{ color: "#e0e0e0", fontWeight: 500 }}>
                                        {evt.nombre}
                                      </span>
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: "16px",
                                          color: "#888",
                                          flexWrap: "wrap",
                                          fontSize: "0.82rem",
                                        }}
                                      >
                                        <span
                                          style={{
                                            background: "#252525",
                                            padding: "2px 8px",
                                            borderRadius: "4px",
                                            color: "#a78bfa",
                                          }}
                                        >
                                          {evt.tipo}
                                        </span>
                                        <span>🚴 {evt.distancia_km} km</span>
                                        <span>
                                          📅{" "}
                                          {new Date(evt.fecha_evento).toLocaleDateString("es-AR")}
                                        </span>
                                        <span
                                          style={{
                                            color: evt.estado === 3 ? "#4ade80" : "#60a5fa",
                                            fontWeight: "bold",
                                          }}
                                        >
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

              {tendenciasFiltradas.length === 0 && (
                <p className="no-data">
                  No hay eventos {tabTendencias === "activos" ? "activos" : "finalizados"} para mostrar
                  {filtroTipoTendencias ? ` del tipo "${filtroTipoTendencias}"` : ""}.
                </p>
              )}
            </div>
          </div>
        )}
      {/* ════════════════════════════════════════════════════════════════
            MODAL DETALLE EVENTO ADMIN (BOTÓN VER MÁS)
        ════════════════════════════════════════════════════════════════ */}
        {modalAdminEvento && (
            <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.7)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <div style={{ backgroundColor: "#1e293b", padding: "24px", borderRadius: "12px", width: "90%", maxWidth: "600px", border: "1px solid #334155", color: "#f8fafc", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>
                        <h3 style={{ margin: 0, color: "#fff" }}>Detalles del Evento</h3>
                        <button onClick={() => setModalAdminEvento(null)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#94a3b8" }}>✖</button>
                    </div>
                    
                    {/* Grilla de información */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", fontSize: "0.95rem" }}>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Evento:</strong> <br/>{modalAdminEvento.nombre}</p>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Organizador:</strong> <br/>{modalAdminEvento.organizador}</p>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Fecha:</strong> <br/>{modalAdminEvento.fecha_evento.split('-').reverse().join('-')}</p>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Tipo:</strong> <br/>{modalAdminEvento.tipo}</p>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Ubicación:</strong> <br/>{modalAdminEvento.ubicacion || "Sin ubicación"}</p>
                        <p style={{ margin: 0 }}><strong style={{ color: "#94a3b8" }}>Distancia:</strong> <br/>{modalAdminEvento.distancia_km} km</p>
                    </div>

                    <h4 style={{ marginTop: "25px", marginBottom: "10px", color: "#cbd5e1" }}>Desglose de Inscripciones</h4>
                    
                    {/* Tarjetitas de estado de reservas */}
                    <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "#0f172a", padding: "15px", borderRadius: "8px", border: "1px solid #334155" }}>
                        <div style={{ textAlign: "center", flex: 1 }}>
                            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#fff" }}>{modalAdminEvento.cupo_maximo || "∞"}</span>
                            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>Cupo Máximo</p>
                        </div>
                        <div style={{ textAlign: "center", flex: 1, borderLeft: "1px solid #334155", borderRight: "1px solid #334155" }}>
                            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#4ade80" }}>{modalAdminEvento.inscripciones_confirmadas}</span>
                            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>Pagos Confirmados</p>
                        </div>
                        <div style={{ textAlign: "center", flex: 1 }}>
                            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#fbbf24" }}>{modalAdminEvento.reservas_totales - modalAdminEvento.inscripciones_confirmadas}</span>
                            <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.8rem", marginTop: "5px" }}>Reservas Pendientes</p>
                        </div>
                    </div>

                </div>
            </div>
        )}
      </div>
      {/* fin .reportes-page__container */}

      <Footer />
    </div>
  );
}