import { useState, useEffect, useRef, useCallback } from "react";
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

// ─── NUEVOS TIPOS PARA ADMIN ──────────────────────────────────────────────────

interface DetalleRecaudacionAdmin extends DetalleRecaudacion {
  organizador_nombre: string;
  organizador_tipo: "Admin/Supervisor" | "Externo";
}

interface Top10Recaudacion {
  id_evento: number;
  nombre_evento: string;
  fecha_evento: string;
  estado_evento: number;
  tipo: string;
  organizador_nombre: string;
  organizador_tipo: "Admin/Supervisor" | "Externo";
  monto_unitario: number;
  inscriptos_confirmados: number;
  total_reservas: number;
  recaudacion_evento: number;
}

interface NuevoUsuarioMes {
  anio: number;
  mes: number;
  id_rol: number;
  tipo: "Externo" | "Cliente";
  cantidad: number;
}

interface UsuarioAcordeon {
  id_usuario: number;
  nombre: string;
  email: string;
  id_rol: number;
  fecha_creacion: string | null;
  eventos_creados: number;
  inscripciones: number;
}

interface DetalleUsuarioModal {
  id_usuario: number;
  nombre: string;
  email: string;
  id_rol: number;
  fecha_creacion: string | null;
  categoria: "eventos_creados" | "inscripciones";
  items: any[];
}

interface ReporteData {
  // ── Campos originales ──────────────────────────────────────────────────────
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
  detalle_recaudacion?: DetalleRecaudacion[] | DetalleRecaudacionAdmin[];
  tendencias_ubicacion?: any[];
  // ── Campos nuevos Admin ────────────────────────────────────────────────────
  total_inscripciones_sistema?: number;
  total_eventos_externos?: number;
  top10_recaudacion?: Top10Recaudacion[];
  nuevos_usuarios_por_mes?: NuevoUsuarioMes[];
  usuarios_acordeon?: UsuarioAcordeon[];
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPOS_EVENTO = [
  "Ciclismo de Ruta",
  "Mountain Bike (MTB)",
  "Rural Bike",
  "Gravel",
  "Cicloturismo",
  "Entrenamiento / Social",
];

const ESTADO_LABEL: Record<number, string> = {
  1: "Borrador",
  2: "Pendiente",
  3: "Publicado",
  4: "Finalizado",
  5: "Cancelado",
  6: "Depurado por Admin",
};

const ESTADO_COLOR: Record<number, string> = {
  1: "#888",
  2: "#fbbf24",
  3: "#4ade80",
  4: "#60a5fa",
  5: "#f87171",
  6: "#d63a3a",
};

const ROL_LABEL: Record<number, string> = {
  1: "Admin",
  2: "Supervisor",
  3: "Organización Externa",
  4: "Cliente",
};

const MES_LABEL = [
  "Ene","Feb","Mar","Abr","May","Jun",
  "Jul","Ago","Sep","Oct","Nov","Dic",
];

// ─── Estilos reutilizables ────────────────────────────────────────────────────

const sTab = (active: boolean): React.CSSProperties => ({
  padding: "6px 14px",
  fontSize: "0.78rem",
  fontWeight: "bold",
  letterSpacing: "0.04em",
  border: `1.5px solid ${active ? "#4ade80" : "#444"}`,
  borderRadius: "20px",
  background: active ? "#4ade80" : "transparent",
  color: active ? "#000" : "#aaa",
  cursor: "pointer",
  transition: "all 0.18s",
  whiteSpace: "nowrap" as const,
});

const sCardSquare: React.CSSProperties = {
  flex: "1 1 0",
  minWidth: "140px",
  background: "#1e1e1e",
  border: "1px solid #2e2e2e",
  borderRadius: "14px",
  padding: "22px 18px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  transition: "border-color 0.2s",
};

const sThSort: React.CSSProperties = {
  cursor: "pointer",
  userSelect: "none",
  whiteSpace: "nowrap",
};

// ═════════════════════════════════════════════════════════════════════════════
// MODAL: Detalle de Evento (Organización Externa — SIN CAMBIOS)
// ═════════════════════════════════════════════════════════════════════════════

function EventoDetalleModal({
  evento,
  onClose,
}: {
  evento: DetalleRecaudacion;
  onClose: () => void;
}) {
  const color = ESTADO_COLOR[evento.estado_evento] || "#888";
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
          {(ESTADO_LABEL[evento.estado_evento] || `Estado ${evento.estado_evento}`).toUpperCase()}
        </div>

        <h2 style={{ margin: "0 0 4px", fontSize: "1.4rem", color: "#fff" }}>
          {evento.nombre_evento}
        </h2>
        <p style={{ margin: "0 0 24px", color: "#888", fontSize: "0.9rem" }}>
          {evento.tipo}
        </p>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: "16px", marginBottom: "24px",
        }}>
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
            { label: "Recaudado",   value: `$${evento.monto.toLocaleString("es-AR")}` },
          ].map((item) => (
            <div
              key={item.label}
              style={{ background: "#252525", borderRadius: "8px", padding: "12px 16px" }}
            >
              <p style={{
                margin: 0, color: "#888", fontSize: "0.75rem",
                textTransform: "uppercase", letterSpacing: "0.05em",
              }}>
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
            <p style={{
              margin: "0 0 6px", color: "#888", fontSize: "0.75rem",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              📍 Ubicación
            </p>
            <p style={{ margin: 0, color: "#e0e0e0", fontSize: "0.9rem" }}>
              {evento.ubicacion_completa}
            </p>
          </div>
        )}

        {evento.descripcion && (
          <div>
            <p style={{
              margin: "0 0 6px", color: "#888", fontSize: "0.75rem",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
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

// ═════════════════════════════════════════════════════════════════════════════
// MODAL: Detalle de Usuario (NUEVO — solo Admin)
// ═════════════════════════════════════════════════════════════════════════════

function UsuarioDetalleModal({
  detalle,
  onClose,
}: {
  detalle: DetalleUsuarioModal;
  onClose: () => void;
}) {
  const rolColor =
    detalle.id_rol === 3 ? "#fbbf24"
    : detalle.id_rol === 4 ? "#60a5fa"
    : "#4ade80";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
        zIndex: 10000, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#111",
          border: `1px solid ${rolColor}44`,
          borderTop: `3px solid ${rolColor}`,
          borderRadius: "16px", padding: "32px",
          maxWidth: "680px", width: "100%",
          maxHeight: "88vh", overflowY: "auto", position: "relative",
        }}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "16px", right: "16px",
            background: "none", border: "none", color: "#666",
            fontSize: "1.4rem", cursor: "pointer", lineHeight: 1,
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
        >
          ✕
        </button>

        {/* Encabezado */}
        <div style={{
          display: "flex", alignItems: "flex-start",
          gap: "16px", marginBottom: "24px",
        }}>
          <div
            style={{
              width: "52px", height: "52px", borderRadius: "50%",
              background: rolColor + "22", border: `2px solid ${rolColor}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.4rem", flexShrink: 0,
            }}
          >
            {detalle.id_rol === 4 ? "👤" : detalle.id_rol === 3 ? "🏢" : "🛡️"}
          </div>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "1.3rem", color: "#fff" }}>
              {detalle.nombre}
            </h2>
            <p style={{ margin: "0 0 6px", color: "#888", fontSize: "0.85rem" }}>
              {detalle.email}
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "3px 10px", borderRadius: "12px",
                  background: rolColor + "22", border: `1px solid ${rolColor}`,
                  color: rolColor, fontSize: "0.72rem", fontWeight: "bold",
                }}
              >
                {ROL_LABEL[detalle.id_rol] || `Rol ${detalle.id_rol}`}
              </span>
              {detalle.fecha_creacion && (
                <span style={{ color: "#555", fontSize: "0.75rem", alignSelf: "center" }}>
                  Miembro desde{" "}
                  {new Date(detalle.fecha_creacion).toLocaleDateString("es-AR")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Título sección */}
        <h3 style={{
          margin: "0 0 14px", fontSize: "0.9rem", color: "#888",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {detalle.categoria === "inscripciones"
            ? `📋 Inscripciones (${detalle.items.length})`
            : `📅 Eventos Creados (${detalle.items.length})`}
        </h3>

        {detalle.items.length === 0 ? (
          <p style={{ color: "#555", textAlign: "center", padding: "30px 0" }}>
            Sin registros disponibles.
          </p>
        ) : (
          <div className="table-responsive">
            <table className="tabla-reportes-custom">
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>
                    Fecha{detalle.categoria === "inscripciones" ? " del Evento" : ""}
                  </th>
                  {detalle.categoria === "inscripciones" && <th>Fecha Reserva</th>}
                  <th>Tipo</th>
                  <th style={{ textAlign: "center" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {detalle.items.map((item: any, idx: number) => {
                  const fechaDisplay =
                    detalle.categoria === "inscripciones"
                      ? new Date(item.fecha_evento).toLocaleDateString("es-AR")
                      : new Date(item.fecha).toLocaleDateString("es-AR");
                  const estadoId =
                    detalle.categoria === "inscripciones"
                      ? item.estado_reserva
                      : item.estado;
                  const estadoTxt =
                    detalle.categoria === "inscripciones"
                      ? (
                          ["", "Pendiente", "Confirmada", "Cancelada", "Expirada"][estadoId]
                          || `Est.${estadoId}`
                        )
                      : (ESTADO_LABEL[estadoId] || `Est.${estadoId}`);
                  const estadoClr =
                    detalle.categoria === "inscripciones"
                      ? (
                          { 1: "#fbbf24", 2: "#4ade80", 3: "#f87171", 4: "#888" } as
                            Record<number, string>
                        )[estadoId] || "#888"
                      : ESTADO_COLOR[estadoId] || "#888";

                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500, color: "#e0e0e0" }}>
                        {item.nombre}
                      </td>
                      <td>{fechaDisplay}</td>
                      {detalle.categoria === "inscripciones" && (
                        <td style={{ color: "#888", fontSize: "0.82rem" }}>
                          {new Date(item.fecha_reserva).toLocaleDateString("es-AR")}
                        </td>
                      )}
                      <td>
                        <span className="badge-tipo">{item.tipo}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            padding: "3px 9px", borderRadius: "12px",
                            background: estadoClr + "22",
                            border: `1px solid ${estadoClr}`,
                            color: estadoClr,
                            fontSize: "0.72rem", fontWeight: "bold",
                          }}
                        >
                          {estadoTxt}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════

export default function ReportesPage() {

  // ── Estado base ────────────────────────────────────────────────────────────
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [exportando, setExportando]   = useState<string | null>(null);

  // ── Estado Organización Externa (SIN CAMBIOS) ──────────────────────────────
  const [estadoAbierto, setEstadoAbierto]     = useState<number | null>(null);
  const [eventoDetalle, setEventoDetalle]     = useState<DetalleRecaudacion | null>(null);
  const [busquedaEvento, setBusquedaEvento]   = useState<string>("");
  const [filtroEstadoRecaudacion, setFiltroEstadoRecaudacion] =
    useState<"todos" | "activos" | "pasados">("todos");
  const [filtroTipoRecaudacion, setFiltroTipoRecaudacion] = useState<string>("");
  const [sortFinanzas, setSortFinanzas] = useState<{
    key: "nombre" | "fecha" | "monto" | "cupo" | "unitario";
    direction: "asc" | "desc";
  }>({ key: "fecha", direction: "desc" });

  // Sort tabla solicitudes (Externo)
  const [sortConfig, setSortConfig] =
    useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Tendencias (compartido Externo / Admin)
  const [tabTendencias, setTabTendencias] =
    useState<"activos" | "pasados">("activos");
  const [filtroTipoTendencias, setFiltroTipoTendencias] = useState<string>("");
  const [provinciaExpandida, setProvinciaExpandida]     = useState<string | null>(null);
  const [localidadExpandida, setLocalidadExpandida]     = useState<string | null>(null);

  // ── Estado NUEVO Admin ─────────────────────────────────────────────────────

  // Segmentación recaudación Admin: Todos | Propios | Externos
  const [segRecaudacion, setSegRecaudacion] =
    useState<"todos" | "propios" | "externos">("todos");
  const [busquedaAdminEvento, setBusquedaAdminEvento] = useState<string>("");
  const [filtroTipoAdmin, setFiltroTipoAdmin]         = useState<string>("");
  const [filtroEstadoAdmin, setFiltroEstadoAdmin] =
    useState<"todos" | "activos" | "pasados">("todos");

  // Sort tabla recaudación Admin
  const [sortAdminRecaudacion, setSortAdminRecaudacion] = useState<{
    key: "nombre" | "fecha" | "monto" | "unitario" | "cupo" | "organizador";
    direction: "asc" | "desc";
  }>({ key: "fecha", direction: "desc" });

  // Sort top 10
  const [sortTop10, setSortTop10] = useState<{
    key: "nombre" | "monto" | "confirmados" | "organizador";
    direction: "asc" | "desc";
  }>({ key: "monto", direction: "desc" });

  // Acordeón usuarios
  const [rolExpandidoAcordeon, setRolExpandidoAcordeon] =
    useState<number | null>(null);
  const [usuarioDetalleModal, setUsuarioDetalleModal] =
    useState<DetalleUsuarioModal | null>(null);
  const [loadingUsuarioDetalle, setLoadingUsuarioDetalle] =
    useState<number | null>(null);

  // Segmentación Tendencias Admin: Todos | Propios | Externos
  const [segTendencias, setSegTendencias] =
    useState<"todos" | "propios" | "externos">("todos");

  const reporteRef = useRef<HTMLDivElement>(null);
  const { user, getToken, loadingAuth } = useAuth();
  const usuarioRol = user?.id_rol || 0;

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loadingAuth) {
      const token = getToken();
      if (token) cargarReportes(token);
      else setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAuth]);

  // ── Acciones ───────────────────────────────────────────────────────────────
  const cargarReportes = async (tokenParam?: string) => {
    try {
      setLoading(true);
      setError(null);
      const token = tokenParam || getToken();
      if (!token) { setError("No se encontró una sesión activa."); return; }
      const data = await getReporteGeneral(token, undefined, undefined);
      setReporteData(data);
    } catch (err: any) {
      setError(
        err?.response?.status === 401
          ? "Sesión expirada"
          : "Error al cargar reportes"
      );
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
      const canvas = await html2canvas(reporteRef.current, {
        scale: 2,
        backgroundColor: "#000000",
      });
      const imgData  = canvas.toDataURL("image/png");
      const pdf      = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      pdf.addImage(
        imgData, "PNG", 0, 10,
        pdfWidth,
        (imgProps.height * pdfWidth) / imgProps.width
      );
      pdf.save("reporte-panel-control.pdf");
    } catch {
      alert("No se pudo generar el PDF");
    } finally {
      setExportando(null);
    }
  };

  // ── NUEVO: Carga detalle de usuario para el modal "Ver Más" ───────────────
  const handleVerMasUsuario = useCallback(async (idUsuario: number) => {
    const token = getToken();
    if (!token) return;
    setLoadingUsuarioDetalle(idUsuario);
    try {
      // Endpoint: GET /reportes/usuario-detalle/{id}
      const res = await fetch(`/api/reportes/usuario-detalle/${idUsuario}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al cargar detalle");
      const data: DetalleUsuarioModal = await res.json();
      setUsuarioDetalleModal(data);
    } catch {
      alert("No se pudo cargar el detalle del usuario.");
    } finally {
      setLoadingUsuarioDetalle(null);
    }
  }, [getToken]);

  // ── Sort helpers — Externo (SIN CAMBIOS) ───────────────────────────────────
  const handleSort = (key: string) => {
    setSortConfig((prev) =>
      !prev || prev.key !== key
        ? { key, direction: "asc" }
        : { key, direction: prev.direction === "asc" ? "desc" : "asc" }
    );
  };

  const si = (key: string) =>
    sortConfig?.key === key
      ? sortConfig.direction === "asc" ? " ↑" : " ↓"
      : "";

  const handleSortFin = (
    key: "nombre" | "fecha" | "monto" | "cupo" | "unitario"
  ) => {
    setSortFinanzas((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sif = (key: string) =>
    sortFinanzas.key === key
      ? sortFinanzas.direction === "asc" ? " ↑" : " ↓"
      : "";

  const sortedLista = (lista: any[]) => {
    if (!sortConfig) return lista;
    return [...lista].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortConfig.key === "nombre")
        cmp = String(a.nombre || "").localeCompare(String(b.nombre || ""));
      else if (sortConfig.key === "fecha")
        cmp = new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
      else if (sortConfig.key === "reservas")
        cmp = (a.reservas ?? 0) - (b.reservas ?? 0);
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  };

  // ── Sort helpers NUEVOS Admin ──────────────────────────────────────────────
  const handleSortAdminRec = (key: typeof sortAdminRecaudacion["key"]) => {
    setSortAdminRecaudacion((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const siar = (key: string) =>
    sortAdminRecaudacion.key === key
      ? sortAdminRecaudacion.direction === "asc" ? " ↑" : " ↓"
      : "";

  const handleSortTop10 = (key: typeof sortTop10["key"]) => {
    setSortTop10((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sit = (key: string) =>
    sortTop10.key === key
      ? sortTop10.direction === "asc" ? " ↑" : " ↓"
      : "";

  // ── Label helpers (SIN CAMBIOS) ────────────────────────────────────────────
  const getNombreEstado = (id: number) =>
    ESTADO_LABEL[id] || `Estado ${id}`;

  const getNombreRol = (id: number) =>
    ROL_LABEL[id] || `Rol ${id}`;

  const getNombreMes = (mes: number) =>
    MES_LABEL[mes - 1] || String(mes);

  // ── Datos derivados — Externo (SIN CAMBIOS) ────────────────────────────────
  const detalleRecaudacionFiltrado: DetalleRecaudacion[] = (
    reporteData?.detalle_recaudacion ?? []
  )
    .filter((item: any) => {
      const mb = item.nombre_evento
        .toLowerCase()
        .includes(busquedaEvento.toLowerCase());
      const mt =
        filtroTipoRecaudacion === "" || item.tipo === filtroTipoRecaudacion;
      if (filtroEstadoRecaudacion === "activos")
        return mb && mt && item.estado_evento === 3;
      if (filtroEstadoRecaudacion === "pasados")
        return mb && mt && item.estado_evento === 4;
      return mb && mt;
    })
    .sort((a: any, b: any) => {
      const { key, direction } = sortFinanzas;
      let cmp = 0;
      if (key === "nombre")
        cmp = a.nombre_evento.localeCompare(b.nombre_evento);
      else if (key === "fecha")
        cmp = new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
      else if (key === "monto")    cmp = a.monto - b.monto;
      else if (key === "unitario") cmp = a.monto_unitario - b.monto_unitario;
      else if (key === "cupo")
        cmp = (a.inscriptos_count ?? 0) - (b.inscriptos_count ?? 0);
      return direction === "asc" ? cmp : -cmp;
    });

  const totalRecaudacionFiltrado = detalleRecaudacionFiltrado.reduce(
    (s: number, item: any) => s + item.monto, 0
  );

  // ── Datos derivados — Admin recaudación ───────────────────────────────────
  const adminRecaudacionFiltrada: DetalleRecaudacionAdmin[] = (
    (reporteData?.detalle_recaudacion ?? []) as DetalleRecaudacionAdmin[]
  )
    .filter((item: DetalleRecaudacionAdmin) => {
      const mb = item.nombre_evento
        .toLowerCase()
        .includes(busquedaAdminEvento.toLowerCase());
      const mt =
        filtroTipoAdmin === "" || item.tipo === filtroTipoAdmin;
      const ms =
        filtroEstadoAdmin === "activos"  ? item.estado_evento === 3
        : filtroEstadoAdmin === "pasados" ? item.estado_evento === 4
        : true;
      const mseg =
        segRecaudacion === "propios"
          ? item.organizador_tipo !== "Externo"
          : segRecaudacion === "externos"
          ? item.organizador_tipo === "Externo"
          : true;
      return mb && mt && ms && mseg;
    })
    .sort((a: DetalleRecaudacionAdmin, b: DetalleRecaudacionAdmin) => {
      const { key, direction } = sortAdminRecaudacion;
      let cmp = 0;
      if (key === "nombre")
        cmp = a.nombre_evento.localeCompare(b.nombre_evento);
      else if (key === "fecha")
        cmp = new Date(a.fecha_evento).getTime() - new Date(b.fecha_evento).getTime();
      else if (key === "monto")        cmp = a.monto - b.monto;
      else if (key === "unitario")     cmp = a.monto_unitario - b.monto_unitario;
      else if (key === "cupo")
        cmp = (a.inscriptos_count ?? 0) - (b.inscriptos_count ?? 0);
      else if (key === "organizador")
        cmp = a.organizador_nombre.localeCompare(b.organizador_nombre);
      return direction === "asc" ? cmp : -cmp;
    });

  const totalAdminRecaudacionFiltrada = adminRecaudacionFiltrada.reduce(
    (s: number, item: DetalleRecaudacionAdmin) => s + item.monto, 0
  );

  // ── Datos derivados — Admin Top 10 sort ───────────────────────────────────
  const top10Sorted: Top10Recaudacion[] = [
    ...(reporteData?.top10_recaudacion ?? []),
  ].sort((a: Top10Recaudacion, b: Top10Recaudacion) => {
    const { key, direction } = sortTop10;
    let cmp = 0;
    if (key === "nombre")
      cmp = a.nombre_evento.localeCompare(b.nombre_evento);
    else if (key === "monto")
      cmp = a.recaudacion_evento - b.recaudacion_evento;
    else if (key === "confirmados")
      cmp = a.inscriptos_confirmados - b.inscriptos_confirmados;
    else if (key === "organizador")
      cmp = a.organizador_nombre.localeCompare(b.organizador_nombre);
    return direction === "asc" ? cmp : -cmp;
  });

  // ── Datos derivados — Tendencias con segmentación Admin ───────────────────
  const tendenciasFiltradas = (reporteData?.tendencias_ubicacion ?? [])
    .map((prov: any) => ({
      ...prov,
      localidades: prov.localidades
        .map((loc: any) => ({
          ...loc,
          eventos: loc.eventos.filter((evt: any) => {
            const me =
              tabTendencias === "activos"
                ? evt.estado === 3
                : evt.estado === 4;
            const mt =
              filtroTipoTendencias === "" ||
              evt.tipo === filtroTipoTendencias;
            // Segmentación Admin — campo organizador_tipo solo existe en admin
            const mseg =
              usuarioRol === 1
                ? segTendencias === "propios"
                  ? evt.organizador_tipo !== "Externo"
                  : segTendencias === "externos"
                  ? evt.organizador_tipo === "Externo"
                  : true
                : true;
            return me && mt && mseg;
          }),
        }))
        .filter((loc: any) => loc.eventos.length > 0),
    }))
    .filter((prov: any) => prov.localidades.length > 0);

  // ── Datos derivados — Acordeón usuarios agrupado por rol ─────────────────
  const usuariosPorRolAgrupados: Record<number, UsuarioAcordeon[]> = {};
  (reporteData?.usuarios_acordeon ?? []).forEach((u: UsuarioAcordeon) => {
    if (!usuariosPorRolAgrupados[u.id_rol])
      usuariosPorRolAgrupados[u.id_rol] = [];
    usuariosPorRolAgrupados[u.id_rol].push(u);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERS DE GRÁFICOS (SIN CAMBIOS — usados por Admin y Supervisor)
  // ═══════════════════════════════════════════════════════════════════════════

  const renderRankingHorizontal = (
    data: any[],
    labelKey: string,
    valueKey: string
  ) => {
    if (!data?.length)
      return <p className="no-data">Sin datos de ubicación</p>;
    const sorted = [...data]
      .sort((a: any, b: any) => b[valueKey] - a[valueKey])
      .slice(0, 10);
    const maxVal = Math.max(...sorted.map((d: any) => d[valueKey]), 1);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
        {sorted.map((item: any, i: number) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
              <span style={{ fontWeight: 500, color: "#e0e0e0" }}>
                {item[labelKey]}
              </span>
              <span style={{ fontWeight: "bold", color: "#4ade80" }}>
                {item[valueKey]}
              </span>
            </div>
            <div style={{
              width: "100%", height: "8px",
              backgroundColor: "#333", borderRadius: "4px", overflow: "hidden",
            }}>
              <div style={{
                width: `${(item[valueKey] / maxVal) * 100}%`,
                height: "100%", backgroundColor: "#4ade80", borderRadius: "4px",
              }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGraficoLinea = (data: any[]) => {
    if (!data?.length)
      return <p className="no-data">Sin datos disponibles</p>;
    const sorted = [...data].sort((a: any, b: any) =>
      a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes
    );
    const maxVal = Math.max(...sorted.map((item: any) => item.cantidad), 1);
    return (
      <div className="grafico-linea">
        <div className="grafico-linea__grid">
          {sorted.map((item: any, i: number) => (
            <div key={i} className="grafico-linea__columna">
              <span className="grafico-linea__count">{item.cantidad}</span>
              <div
                className="grafico-linea__barra"
                style={{ height: `${(item.cantidad / maxVal) * 80}%` }}
              />
              <div className="grafico-linea__label">
                {getNombreMes(item.mes)}<br />{item.anio}
              </div>
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
    if (!data?.length)
      return <p className="no-data">Sin datos disponibles</p>;
    const total = data.reduce((s: number, item: any) => s + item[valueKey], 0);
    const colores = ["#ff6b35","#ffa500","#4caf50","#2196f3","#9c27b0"];
    return (
      <div className="grafico-pie">
        {data.map((item: any, i: number) => (
          <div key={i} className="grafico-pie__item">
            <div
              className="grafico-pie__color"
              style={{ backgroundColor: colores[i % colores.length] }}
            />
            <div className="grafico-pie__info">
              <span className="grafico-pie__label">
                {getLabelFn ? getLabelFn(item[labelKey]) : item[labelKey]}
              </span>
              <span className="grafico-pie__valor">
                {item[valueKey]}{" "}
                ({((item[valueKey] / (total || 1)) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGraficoTorta = (
    data: any[],
    labelKey: string,
    valueKey: string
  ) => {
    if (!data?.length)
      return <p className="no-data">Sin datos disponibles</p>;
    const total  = data.reduce((s: number, item: any) => s + item[valueKey], 0);
    const colores = ["#ff6b35","#4ade80","#60a5fa","#fbbf24","#a78bfa","#d63a3a"];
    const size = 180; const center = size / 2; const radius = 80;
    let angle = -90;
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "40px", width: "100%", padding: "20px 0",
      }}>
        <div style={{ position: "relative", width: size, height: size }}>
          <svg
            width={size} height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{ display: "block" }}
          >
            {data.map((item: any, i: number) => {
              const val = item[valueKey];
              const arc = (val / total) * 360;
              const sa  = angle; const ea = angle + arc;
              const mid = sa + arc / 2;
              const x1  = center + radius * Math.cos((Math.PI * sa) / 180);
              const y1  = center + radius * Math.sin((Math.PI * sa) / 180);
              const x2  = center + radius * Math.cos((Math.PI * ea) / 180);
              const y2  = center + radius * Math.sin((Math.PI * ea) / 180);
              const tr  = radius * 0.65;
              const tx  = center + tr * Math.cos((Math.PI * mid) / 180);
              const ty  = center + tr * Math.sin((Math.PI * mid) / 180);
              const laf = arc > 180 ? 1 : 0;
              const d   = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${laf} 1 ${x2} ${y2} Z`;
              angle += arc;
              return (
                <g key={i}>
                  <path
                    d={d}
                    fill={colores[i % colores.length]}
                    stroke="#1a1a1a"
                    strokeWidth="1"
                  />
                  <text
                    x={tx} y={ty} fill="white" fontSize="12"
                    fontWeight="bold" textAnchor="middle"
                    alignmentBaseline="middle"
                  >
                    {val}
                  </text>
                </g>
              );
            })}
            <circle cx={center} cy={center} r={radius * 0.35} fill="#1a1a1a" />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {data.map((item: any, i: number) => (
            <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
              <div style={{
                backgroundColor: colores[i % colores.length],
                width: "12px", height: "12px",
                borderRadius: "2px", marginRight: "10px",
              }} />
              <span style={{ fontSize: "0.85rem", color: "#ccc", whiteSpace: "nowrap" }}>
                <strong style={{ color: "#fff" }}>{item[labelKey]}:</strong>{" "}
                {item[valueKey]}
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

  // ═══════════════════════════════════════════════════════════════════════════
  // NUEVO RENDER: Gráfico de líneas dobles (Externo vs Cliente por mes)
  // ═══════════════════════════════════════════════════════════════════════════

  const renderGraficoLineasDobles = (data: NuevoUsuarioMes[]) => {
    if (!data?.length)
      return <p className="no-data">Sin datos disponibles</p>;

    // Construir mapa: { "2024-01": { Externo: n, Cliente: n } }
    const mapaData: Record<string, { Externo: number; Cliente: number }> = {};
    data.forEach((row: NuevoUsuarioMes) => {
      const k = `${row.anio}-${String(row.mes).padStart(2, "0")}`;
      if (!mapaData[k]) mapaData[k] = { Externo: 0, Cliente: 0 };
      mapaData[k][row.tipo] = row.cantidad;
    });

    const meses  = Object.keys(mapaData).sort();
    if (!meses.length)
      return <p className="no-data">Sin datos disponibles</p>;

    const maxVal = Math.max(
      ...meses.flatMap((m) => [mapaData[m].Externo, mapaData[m].Cliente]),
      1
    );

    return (
      <div style={{ overflowX: "auto" }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: "18px",
          minWidth: `${meses.length * 72}px`, padding: "10px 0 0",
        }}>
          {meses.map((mesKey: string, idx: number) => {
            const [anio, mes] = mesKey.split("-");
            const ext = mapaData[mesKey].Externo;
            const cli = mapaData[mesKey].Cliente;
            return (
              <div
                key={idx}
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: "4px", flex: "1 0 60px",
                }}
              >
                {/* Valores numéricos sobre las barras */}
                <div style={{
                  display: "flex", gap: "6px",
                  fontSize: "0.7rem", marginBottom: "4px",
                }}>
                  <span style={{ color: "#fbbf24", fontWeight: "bold" }}>{ext}</span>
                  <span style={{ color: "#555" }}>/</span>
                  <span style={{ color: "#60a5fa", fontWeight: "bold" }}>{cli}</span>
                </div>
                {/* Barras agrupadas */}
                <div style={{ display: "flex", alignItems: "flex-end", gap: "3px", height: "80px" }}>
                  <div
                    title={`Externos: ${ext}`}
                    style={{
                      width: "14px",
                      height: `${Math.max((ext / maxVal) * 80, ext > 0 ? 4 : 0)}px`,
                      background: "#fbbf24",
                      borderRadius: "3px 3px 0 0",
                      transition: "height 0.3s",
                    }}
                  />
                  <div
                    title={`Clientes: ${cli}`}
                    style={{
                      width: "14px",
                      height: `${Math.max((cli / maxVal) * 80, cli > 0 ? 4 : 0)}px`,
                      background: "#60a5fa",
                      borderRadius: "3px 3px 0 0",
                      transition: "height 0.3s",
                    }}
                  />
                </div>
                {/* Etiqueta mes / año */}
                <span style={{
                  fontSize: "0.68rem", color: "#666",
                  textAlign: "center", lineHeight: 1.2,
                }}>
                  {getNombreMes(parseInt(mes, 10))}<br />
                  <span style={{ color: "#444" }}>{anio}</span>
                </span>
              </div>
            );
          })}
        </div>
        {/* Leyenda */}
        <div style={{ display: "flex", gap: "20px", marginTop: "14px", paddingLeft: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{
              width: "12px", height: "12px",
              background: "#fbbf24", borderRadius: "2px",
            }} />
            <span style={{ fontSize: "0.78rem", color: "#aaa" }}>Org. Externa</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{
              width: "12px", height: "12px",
              background: "#60a5fa", borderRadius: "2px",
            }} />
            <span style={{ fontSize: "0.78rem", color: "#aaa" }}>Cliente</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Guards de render ────────────────────────────────────────────────────────
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
          <span className="reportes-alert__message">
            Debes iniciar sesión para acceder.
          </span>
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
    reporteData?.eventos_por_estado?.find((e: any) => e.estado === 1)
      ?.cantidad ?? 0;

  
  // ═══════════════════════════════════════════════════════════════════════════
  // JSX PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="reportes-page">
      <Navbar />

      {/* ── Modales ────────────────────────────────────────────────────────── */}
      {eventoDetalle && (
        <EventoDetalleModal
          evento={eventoDetalle}
          onClose={() => setEventoDetalle(null)}
        />
      )}
      {usuarioDetalleModal && (
        <UsuarioDetalleModal
          detalle={usuarioDetalleModal}
          onClose={() => setUsuarioDetalleModal(null)}
        />
      )}

      {/* ── Barra sticky superior ─────────────────────────────────────────── */}
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
              padding: "10px 20px", background: "#e74c3c",
              border: "none", borderRadius: "8px", color: "#fff",
              fontWeight: "bold",
              cursor: exportando === "pdf" ? "not-allowed" : "pointer",
              opacity: exportando === "pdf" ? 0.6 : 1,
            }}
          >
            {exportando === "pdf" ? "Generando..." : "📄 Guardar PDF"}
          </button>
          <button
            onClick={() => cargarReportes()}
            style={{
              padding: "10px 20px", background: "#4ade80",
              border: "none", borderRadius: "8px",
              color: "#000", fontWeight: "bold", cursor: "pointer",
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

        {/* ── Tarjetas KPI Admin / Supervisor (originales) ──────────────────── */}
        {(usuarioRol === 1 || usuarioRol === 2) && (
          <>
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
              onClick={() =>
                document
                  .getElementById("lista_eventos_detallada")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              <div className="stat-card__valor">
                {reporteData?.mis_eventos_total ?? 0}
              </div>
              <div className="stat-card__label">Mis Eventos Creados</div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            ROL 1 — DASHBOARD ADMIN COMPLETO (NUEVO)
        ════════════════════════════════════════════════════════════════════ */}
        {usuarioRol === 1 && (
          <div style={{ marginTop: "28px", display: "flex", flexDirection: "column", gap: "28px" }}>

            {/* ───────────────────────────────────────────────────────────────
                BLOQUE 1: 4 Tarjetas cuadradas en fila horizontal
            ─────────────────────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>

              {/* Recaudación Total Sistema */}
              <div style={{
                ...sCardSquare,
                borderColor: "#4ade8044",
                background: "linear-gradient(135deg, #0d1f0d 0%, #1a2e1a 100%)",
              }}>
                <span style={{ fontSize: "1.6rem" }}>💰</span>
                <span style={{
                  fontSize: "1.6rem", fontWeight: "bold",
                  color: "#4ade80", lineHeight: 1.1,
                }}>
                  ${(reporteData?.recaudacion_total ?? 0).toLocaleString("es-AR")}
                </span>
                <span style={{
                  fontSize: "0.7rem", color: "#6a9e6a",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  textAlign: "center",
                }}>
                  Recaudación Total Sistema
                </span>
              </div>

              {/* Total Inscripciones */}
              <div style={{
                ...sCardSquare,
                borderColor: "#60a5fa44",
                background: "linear-gradient(135deg, #0d1525 0%, #1a2540 100%)",
              }}>
                <span style={{ fontSize: "1.6rem" }}>📋</span>
                <span style={{
                  fontSize: "1.6rem", fontWeight: "bold",
                  color: "#60a5fa", lineHeight: 1.1,
                }}>
                  {(reporteData?.total_inscripciones_sistema ?? 0).toLocaleString("es-AR")}
                </span>
                <span style={{
                  fontSize: "0.7rem", color: "#5a8aaa",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  textAlign: "center",
                }}>
                  Total Inscripciones
                </span>
              </div>

              {/* Mis Eventos Creados */}
              <div style={{
                ...sCardSquare,
                borderColor: "#fbbf2444",
                background: "linear-gradient(135deg, #1f1500 0%, #2e1e00 100%)",
              }}>
                <span style={{ fontSize: "1.6rem" }}>📅</span>
                <span style={{
                  fontSize: "1.6rem", fontWeight: "bold",
                  color: "#fbbf24", lineHeight: 1.1,
                }}>
                  {reporteData?.mis_eventos_total ?? 0}
                </span>
                <span style={{
                  fontSize: "0.7rem", color: "#aa8a30",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  textAlign: "center",
                }}>
                  Mis Eventos Creados
                </span>
              </div>

              {/* Eventos Externos */}
              <div style={{
                ...sCardSquare,
                borderColor: "#a78bfa44",
                background: "linear-gradient(135deg, #130d1f 0%, #1e1530 100%)",
              }}>
                <span style={{ fontSize: "1.6rem" }}>🏢</span>
                <span style={{
                  fontSize: "1.6rem", fontWeight: "bold",
                  color: "#a78bfa", lineHeight: 1.1,
                }}>
                  {reporteData?.total_eventos_externos ?? 0}
                </span>
                <span style={{
                  fontSize: "0.7rem", color: "#7a6aaa",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  textAlign: "center",
                }}>
                  Eventos Externos
                </span>
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────────
                BLOQUE 2: Ruta del Dinero — Tabla de Recaudación Unificada
            ─────────────────────────────────────────────────────────────── */}
            <div className="grafico-card grafico-card--wide">
              <div className="grafico-card__header" style={{ flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h3 style={{ margin: 0 }}>
                    💰 Ruta del Dinero — Detalle de Recaudación
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#666" }}>
                    Trazabilidad completa: cada peso con su organizador de origen.
                  </p>
                </div>
                <button
                  data-html2canvas-ignore="true"
                  onClick={() => handleExportarCSV("detalle_recaudacion_admin")}
                  className="btn-export"
                >
                  📥 CSV
                </button>
              </div>

              {/* Sub-header: total filtrado + controles */}
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between", flexWrap: "wrap",
                gap: "14px", padding: "14px 20px",
                borderBottom: "1px solid #222", background: "#111",
              }}>
                {/* Total filtrado */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                  <span style={{ fontSize: "2rem", fontWeight: "bold", color: "#4ade80" }}>
                    ${totalAdminRecaudacionFiltrada.toLocaleString("es-AR")}
                  </span>
                  <span style={{ color: "#555", fontSize: "0.82rem" }}>
                    ({adminRecaudacionFiltrada.length} eventos en vista)
                  </span>
                </div>

                {/* Controles */}
                <div style={{
                  display: "flex", gap: "8px",
                  flexWrap: "wrap", alignItems: "center",
                }}>

                  {/* Tabs segmentación Todos | Propios | Externos */}
                  <div style={{
                    display: "flex", gap: "6px", background: "#1a1a1a",
                    padding: "4px", borderRadius: "24px",
                    border: "1px solid #2a2a2a",
                  }}>
                    {(["todos","propios","externos"] as const).map((seg) => (
                      <button
                        key={seg}
                        onClick={() => setSegRecaudacion(seg)}
                        style={sTab(segRecaudacion === seg)}
                      >
                        {seg === "todos"
                          ? "Todos"
                          : seg === "propios"
                          ? "✦ Propios"
                          : "🏢 Externos"}
                      </button>
                    ))}
                  </div>

                  {/* Búsqueda */}
                  <input
                    type="text"
                    placeholder="🔍 Buscar evento..."
                    value={busquedaAdminEvento}
                    onChange={(e) => setBusquedaAdminEvento(e.target.value)}
                    style={{
                      padding: "7px 12px", background: "#0d0d0d",
                      border: "1px solid #333", borderRadius: "6px",
                      color: "#fff", fontSize: "0.82rem", minWidth: "180px",
                    }}
                  />

                  {/* Filtro tipo (tabs compactos) */}
                  <div style={{
                    display: "flex", gap: "4px", flexWrap: "wrap",
                    background: "#1a1a1a", padding: "4px",
                    borderRadius: "8px", border: "1px solid #2a2a2a",
                  }}>
                    <button
                      onClick={() => setFiltroTipoAdmin("")}
                      style={sTab(filtroTipoAdmin === "")}
                    >
                      Todos
                    </button>
                    {TIPOS_EVENTO.map((t) => (
                      <button
                        key={t}
                        onClick={() => setFiltroTipoAdmin(t)}
                        style={sTab(filtroTipoAdmin === t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>

                  {/* Filtro estado */}
                  <div style={{
                    display: "flex", gap: "6px", background: "#1a1a1a",
                    padding: "4px", borderRadius: "24px",
                    border: "1px solid #2a2a2a",
                  }}>
                    {(["todos","activos","pasados"] as const).map((est) => (
                      <button
                        key={est}
                        onClick={() => setFiltroEstadoAdmin(est)}
                        style={sTab(filtroEstadoAdmin === est)}
                      >
                        {est === "todos"
                          ? "📊 Todos"
                          : est === "activos"
                          ? "🟢 Activos"
                          : "🔵 Finalizados"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tabla recaudación Admin */}
              <div className="grafico-card__body" style={{ padding: "0" }}>
                {adminRecaudacionFiltrada.length === 0 ? (
                  <p className="no-data" style={{ padding: "30px" }}>
                    Sin eventos con los filtros seleccionados.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="tabla-reportes-custom">
                      <thead>
                        <tr>
                          <th style={sThSort} onClick={() => handleSortAdminRec("nombre")}>
                            Evento{siar("nombre")}
                          </th>
                          <th style={sThSort} onClick={() => handleSortAdminRec("organizador")}>
                            Organizador{siar("organizador")}
                          </th>
                          <th style={{ textAlign: "center" }}>Tipo org.</th>
                          <th style={sThSort} onClick={() => handleSortAdminRec("fecha")}>
                            Fecha{siar("fecha")}
                          </th>
                          <th>Tipo Evento</th>
                          <th style={{ textAlign: "center" }}>Estado</th>
                          <th
                            style={{ textAlign: "center", ...sThSort }}
                            onClick={() => handleSortAdminRec("cupo")}
                          >
                            Cupo{siar("cupo")}
                          </th>
                          <th
                            style={{ textAlign: "right", ...sThSort }}
                            onClick={() => handleSortAdminRec("unitario")}
                          >
                            Unit.{siar("unitario")}
                          </th>
                          <th
                            style={{ textAlign: "right", ...sThSort }}
                            onClick={() => handleSortAdminRec("monto")}
                          >
                            Recaudado{siar("monto")}
                          </th>
                          <th style={{ textAlign: "center" }}>Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminRecaudacionFiltrada.map(
                          (item: DetalleRecaudacionAdmin, idx: number) => {
                            const estadoClr =
                              ESTADO_COLOR[item.estado_evento] || "#888";
                            const esTipoExterno =
                              item.organizador_tipo === "Externo";
                            return (
                              <tr key={idx}>
                                <td style={{ fontWeight: "bold", color: "#e0e0e0" }}>
                                  {item.nombre_evento}
                                </td>
                                <td style={{ color: "#ccc", fontSize: "0.85rem" }}>
                                  {item.organizador_nombre}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <span style={{
                                    padding: "2px 8px", borderRadius: "10px",
                                    fontSize: "0.72rem", fontWeight: "bold",
                                    background: esTipoExterno
                                      ? "#fbbf2422" : "#4ade8022",
                                    border: `1px solid ${esTipoExterno ? "#fbbf24" : "#4ade80"}`,
                                    color: esTipoExterno ? "#fbbf24" : "#4ade80",
                                  }}>
                                    {esTipoExterno ? "Externo" : "Propio"}
                                  </span>
                                </td>
                                <td style={{ fontSize: "0.85rem" }}>
                                  {new Date(item.fecha_evento)
                                    .toLocaleDateString("es-AR")}
                                </td>
                                <td>
                                  <span className="badge-tipo">{item.tipo}</span>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <span style={{
                                    padding: "2px 8px", borderRadius: "10px",
                                    background: estadoClr + "22",
                                    border: `1px solid ${estadoClr}`,
                                    color: estadoClr,
                                    fontSize: "0.72rem", fontWeight: "bold",
                                  }}>
                                    {ESTADO_LABEL[item.estado_evento]
                                      || `Est.${item.estado_evento}`}
                                  </span>
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <div className="reservas-indicator">
                                    {item.inscriptos_count}
                                    {item.cupo_maximo
                                      ? ` / ${item.cupo_maximo}` : ""}
                                  </div>
                                </td>
                                <td style={{
                                  textAlign: "right",
                                  color: "#aaa", fontSize: "0.85rem",
                                }}>
                                  {item.monto_unitario === 0
                                    ? "Gratis"
                                    : `$${item.monto_unitario.toLocaleString("es-AR")}`}
                                </td>
                                <td style={{
                                  textAlign: "right",
                                  color: "#4ade80", fontWeight: "bold",
                                }}>
                                  ${item.monto.toLocaleString("es-AR")}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <button
                                    onClick={() => setEventoDetalle(item as any)}
                                    style={{
                                      padding: "4px 10px",
                                      background: "transparent",
                                      border: "1px solid #4ade80",
                                      borderRadius: "6px", color: "#4ade80",
                                      cursor: "pointer",
                                      fontSize: "0.78rem", fontWeight: "bold",
                                    }}
                                  >
                                    Ver →
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: "2px solid #4ade80" }}>
                          <td
                            colSpan={8}
                            style={{
                              textAlign: "right", fontWeight: "bold",
                              fontSize: "1rem", padding: "12px 16px",
                            }}
                          >
                            TOTAL FILTRADO:
                          </td>
                          <td style={{
                            textAlign: "right", color: "#4ade80",
                            fontWeight: "bold", fontSize: "1.2rem",
                            padding: "12px 16px",
                          }}>
                            ${totalAdminRecaudacionFiltrada.toLocaleString("es-AR")}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────────
                BLOQUE 3: Top 10 Eventos por Recaudación Histórica
            ─────────────────────────────────────────────────────────────── */}
            <div className="grafico-card grafico-card--wide">
              <div className="grafico-card__header">
                <div>
                  <h3 style={{ margin: 0 }}>
                    🏆 Top 10 Eventos por Recaudación Histórica
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#666" }}>
                    Ranking de los eventos que más ingresos generaron en todo el sistema.
                  </p>
                </div>
                <button
                  data-html2canvas-ignore="true"
                  onClick={() => handleExportarCSV("top10_recaudacion")}
                  className="btn-export"
                >
                  📥 CSV
                </button>
              </div>

              <div className="grafico-card__body" style={{ padding: "0" }}>
                {top10Sorted.length === 0 ? (
                  <p className="no-data" style={{ padding: "30px" }}>
                    Sin datos disponibles.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="tabla-reportes-custom">
                      <thead>
                        <tr>
                          <th style={{ width: "40px", textAlign: "center" }}>#</th>
                          <th style={sThSort} onClick={() => handleSortTop10("nombre")}>
                            Evento{sit("nombre")}
                          </th>
                          <th style={sThSort} onClick={() => handleSortTop10("organizador")}>
                            Organizador{sit("organizador")}
                          </th>
                          <th style={{ textAlign: "center" }}>Tipo org.</th>
                          <th>Tipo Evento</th>
                          <th style={{ textAlign: "center" }}>Estado</th>
                          <th
                            style={{ textAlign: "center", ...sThSort }}
                            onClick={() => handleSortTop10("confirmados")}
                          >
                            Confirmados{sit("confirmados")}
                          </th>
                          <th
                            style={{ textAlign: "right", ...sThSort }}
                            onClick={() => handleSortTop10("monto")}
                          >
                            Recaudación{sit("monto")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {top10Sorted.map((row: Top10Recaudacion, idx: number) => {
                          const estadoClr =
                            ESTADO_COLOR[row.estado_evento] || "#888";
                          const esTipoExterno =
                            row.organizador_tipo === "Externo";
                          const medallaColor =
                            idx === 0 ? "#ffd700"
                            : idx === 1 ? "#c0c0c0"
                            : idx === 2 ? "#cd7f32"
                            : "#555";
                          return (
                            <tr key={idx}>
                              <td style={{ textAlign: "center" }}>
                                <span style={{
                                  fontWeight: "bold",
                                  color: medallaColor,
                                  fontSize: idx < 3 ? "1rem" : "0.85rem",
                                }}>
                                  {idx < 3
                                    ? ["🥇","🥈","🥉"][idx]
                                    : `#${idx + 1}`}
                                </span>
                              </td>
                              <td style={{ fontWeight: "bold", color: "#e0e0e0" }}>
                                {row.nombre_evento}
                              </td>
                              <td style={{ color: "#bbb", fontSize: "0.85rem" }}>
                                {row.organizador_nombre}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span style={{
                                  padding: "2px 8px", borderRadius: "10px",
                                  fontSize: "0.72rem", fontWeight: "bold",
                                  background: esTipoExterno
                                    ? "#fbbf2422" : "#4ade8022",
                                  border: `1px solid ${esTipoExterno ? "#fbbf24" : "#4ade80"}`,
                                  color: esTipoExterno ? "#fbbf24" : "#4ade80",
                                }}>
                                  {esTipoExterno ? "Externo" : "Propio"}
                                </span>
                              </td>
                              <td>
                                <span className="badge-tipo">{row.tipo}</span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span style={{
                                  padding: "2px 8px", borderRadius: "10px",
                                  background: estadoClr + "22",
                                  border: `1px solid ${estadoClr}`,
                                  color: estadoClr,
                                  fontSize: "0.72rem", fontWeight: "bold",
                                }}>
                                  {ESTADO_LABEL[row.estado_evento]
                                    || `Est.${row.estado_evento}`}
                                </span>
                              </td>
                              <td style={{ textAlign: "center", color: "#ccc" }}>
                                {row.inscriptos_confirmados}
                              </td>
                              <td style={{
                                textAlign: "right", fontWeight: "bold",
                                color: "#4ade80", fontSize: "1rem",
                              }}>
                                ${row.recaudacion_evento.toLocaleString("es-AR")}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────────
                BLOQUE 4: Métricas de Usuarios — Acordeón por Rol
            ─────────────────────────────────────────────────────────────── */}
            <div className="grafico-card grafico-card--wide">
              <div className="grafico-card__header">
                <div>
                  <h3 style={{ margin: 0 }}>👥 Métricas de Usuarios</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#666" }}>
                    Expandí cada rol para ver el detalle individual con acceso
                    al historial completo.
                  </p>
                </div>
                <button
                  data-html2canvas-ignore="true"
                  onClick={() => handleExportarCSV("usuarios_detalle")}
                  className="btn-export"
                >
                  📥 CSV
                </button>
              </div>

              <div className="grafico-card__body" style={{ padding: "16px" }}>

                {/* Gráfico de nuevos usuarios por mes (barras dobles) */}
                {(reporteData?.nuevos_usuarios_por_mes ?? []).length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <p style={{
                      margin: "0 0 12px", fontSize: "0.8rem", color: "#888",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>
                      📈 Nuevos registros por mes
                    </p>
                    {renderGraficoLineasDobles(
                      reporteData?.nuevos_usuarios_por_mes ?? []
                    )}
                  </div>
                )}

                {/* Acordeón por rol */}
                {([1, 2, 3, 4] as const).map((idRol: number) => {
                  const usuariosDelRol: UsuarioAcordeon[] =
                    usuariosPorRolAgrupados[idRol] ?? [];
                  if (!usuariosDelRol.length) return null;

                  const isOpen = rolExpandidoAcordeon === idRol;
                  const rolClr =
                    idRol === 1 ? "#e74c3c"
                    : idRol === 2 ? "#a78bfa"
                    : idRol === 3 ? "#fbbf24"
                    : "#60a5fa";
                  const totalValorRol = usuariosDelRol.reduce(
                    (s: number, u: UsuarioAcordeon) =>
                      s + (idRol <= 3 ? u.eventos_creados : u.inscripciones),
                    0
                  );

                  return (
                    <div
                      key={idRol}
                      style={{
                        marginBottom: "10px",
                        border: `1px solid ${isOpen ? rolClr + "66" : "#2a2a2a"}`,
                        borderRadius: "10px", overflow: "hidden",
                        transition: "border-color 0.2s",
                      }}
                    >
                      {/* Fila principal del rol */}
                      <div
                        onClick={() =>
                          setRolExpandidoAcordeon(isOpen ? null : idRol)
                        }
                        style={{
                          padding: "16px 20px",
                          background: isOpen ? "#1e1e1e" : "#161616",
                          display: "flex", justifyContent: "space-between",
                          alignItems: "center", cursor: "pointer",
                          borderLeft: `4px solid ${rolClr}`,
                          transition: "background 0.2s",
                        }}
                      >
                        <div style={{
                          display: "flex", alignItems: "center", gap: "14px",
                        }}>
                          <span style={{ fontSize: "1.2rem" }}>
                            {idRol === 1 ? "🛡️"
                              : idRol === 2 ? "👁️"
                              : idRol === 3 ? "🏢"
                              : "👤"}
                          </span>
                          <div>
                            <span style={{
                              fontWeight: "bold", fontSize: "1rem",
                              color: "#e0e0e0",
                            }}>
                              {ROL_LABEL[idRol]}
                            </span>
                            <span style={{
                              marginLeft: "12px", color: "#555",
                              fontSize: "0.82rem",
                            }}>
                              {idRol <= 3
                                ? `${totalValorRol} eventos creados`
                                : `${totalValorRol} inscripciones`}
                            </span>
                          </div>
                        </div>
                        <div style={{
                          display: "flex", alignItems: "center", gap: "16px",
                        }}>
                          <span style={{
                            padding: "4px 14px", borderRadius: "20px",
                            background: rolClr + "22",
                            border: `1px solid ${rolClr}`,
                            color: rolClr, fontWeight: "bold",
                            fontSize: "0.85rem",
                          }}>
                            {usuariosDelRol.length} usuarios
                          </span>
                          <span style={{
                            transition: "transform 0.3s",
                            transform: isOpen
                              ? "rotate(180deg)" : "rotate(0deg)",
                            color: "#666", fontSize: "0.9rem",
                          }}>
                            ▼
                          </span>
                        </div>
                      </div>

                      {/* Panel expandido con tabla de usuarios */}
                      {isOpen && (
                        <div style={{
                          background: "#0f0f0f",
                          borderTop: `1px solid ${rolClr}33`,
                        }}>
                          <div className="table-responsive">
                            <table className="tabla-reportes-custom">
                              <thead>
                                <tr>
                                  <th>Nombre</th>
                                  <th>Email</th>
                                  <th style={{ textAlign: "center" }}>
                                    {idRol <= 3
                                      ? "Eventos Creados"
                                      : "Inscripciones"}
                                  </th>
                                  <th style={{ textAlign: "center" }}>
                                    Miembro desde
                                  </th>
                                  <th style={{ textAlign: "center" }}>Acción</th>
                                </tr>
                              </thead>
                              <tbody>
                                {usuariosDelRol.map((u: UsuarioAcordeon) => (
                                  <tr key={u.id_usuario}>
                                    <td style={{
                                      fontWeight: 500, color: "#e0e0e0",
                                    }}>
                                      {u.nombre}
                                    </td>
                                    <td style={{
                                      color: "#888", fontSize: "0.82rem",
                                    }}>
                                      {u.email}
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      <span style={{
                                        padding: "3px 10px",
                                        borderRadius: "12px",
                                        background: rolClr + "22",
                                        border: `1px solid ${rolClr}33`,
                                        color: rolClr, fontWeight: "bold",
                                        fontSize: "0.82rem",
                                      }}>
                                        {idRol <= 3
                                          ? u.eventos_creados
                                          : u.inscripciones}
                                      </span>
                                    </td>
                                    <td style={{
                                      textAlign: "center",
                                      color: "#666", fontSize: "0.8rem",
                                    }}>
                                      {u.fecha_creacion
                                        ? new Date(u.fecha_creacion)
                                            .toLocaleDateString("es-AR")
                                        : "—"}
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      <button
                                        onClick={() =>
                                          handleVerMasUsuario(u.id_usuario)
                                        }
                                        disabled={
                                          loadingUsuarioDetalle === u.id_usuario
                                        }
                                        style={{
                                          padding: "5px 12px",
                                          background: "transparent",
                                          border: `1px solid ${rolClr}`,
                                          borderRadius: "6px",
                                          color: rolClr,
                                          cursor:
                                            loadingUsuarioDetalle === u.id_usuario
                                              ? "not-allowed"
                                              : "pointer",
                                          fontSize: "0.78rem",
                                          fontWeight: "bold",
                                          opacity:
                                            loadingUsuarioDetalle === u.id_usuario
                                              ? 0.5 : 1,
                                          transition: "opacity 0.15s",
                                        }}
                                      >
                                        {loadingUsuarioDetalle === u.id_usuario
                                          ? "..."
                                          : "Ver Más →"}
                                      </button>
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

          </div>
          /* fin bloque Admin */
        )}

        {/* ════════════════════════════════════════════════════════════════════
            ROL 3 — ORGANIZACIÓN EXTERNA (SIN CAMBIOS)
        ════════════════════════════════════════════════════════════════════ */}
        {usuarioRol === 3 && (
          <div style={{ marginTop: "20px" }}>

            {/* Acordeón: mis solicitudes por estado */}
            {(reporteData?.lista_eventos_detallada ?? []).length > 0 && (
              <div
                className="grafico-card grafico-card--wide"
                id="lista_eventos_detallada"
              >
                <div className="grafico-card__header">
                  <h3>📋 Mis Solicitudes por Estado</h3>
                </div>
                <div className="grafico-card__body">
                  {[2, 3, 4, 5, 6].map((idEstado: number) => {
                    const items = sortedLista(
                      (reporteData?.lista_eventos_detallada ?? []).filter(
                        (e: any) => e.estado === idEstado
                      )
                    );
                    if (!items.length) return null;
                    const isOpen = estadoAbierto === idEstado;
                    const bc =
                      idEstado === 3 ? "#4ade80"
                      : idEstado === 2 ? "#fbbf24"
                      : "#e74c3c";

                    return (
                      <div
                        key={idEstado}
                        style={{
                          marginBottom: "10px",
                          border: "1px solid #333",
                          borderRadius: "8px", overflow: "hidden",
                        }}
                      >
                        <div
                          onClick={() =>
                            setEstadoAbierto(isOpen ? null : idEstado)
                          }
                          style={{
                            padding: "15px", backgroundColor: "#252525",
                            display: "flex", justifyContent: "space-between",
                            alignItems: "center", cursor: "pointer",
                            borderLeft: `4px solid ${bc}`,
                          }}
                        >
                          <span style={{ fontWeight: "bold", fontSize: "1rem" }}>
                            {getNombreEstado(idEstado).toUpperCase()}{" "}
                            ({items.length})
                          </span>
                          <span style={{
                            transition: "transform 0.3s",
                            transform: isOpen
                              ? "rotate(180deg)" : "rotate(0deg)",
                          }}>
                            ▼
                          </span>
                        </div>

                        {isOpen && (
                          <div style={{
                            padding: "10px", backgroundColor: "#1a1a1a",
                          }}>
                            <div className="table-responsive">
                              <table className="tabla-reportes-custom">
                                <thead>
                                  <tr>
                                    <th
                                      style={{ cursor: "pointer" }}
                                      onClick={() => handleSort("nombre")}
                                    >
                                      Evento{si("nombre")}
                                    </th>
                                    <th
                                      style={{ cursor: "pointer" }}
                                      onClick={() => handleSort("fecha")}
                                    >
                                      Fecha{si("fecha")}
                                    </th>
                                    <th>Tipo</th>
                                    <th
                                      style={{
                                        textAlign: "center",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => handleSort("reservas")}
                                    >
                                      Cupo / Reservas{si("reservas")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((evt: any) => (
                                    <tr key={evt.id}>
                                      <td style={{ fontWeight: "bold" }}>
                                        {evt.nombre}
                                      </td>
                                      <td>{evt.fecha}</td>
                                      <td>
                                        <span className="badge-tipo">
                                          {evt.tipo}
                                        </span>
                                      </td>
                                      <td style={{ textAlign: "center" }}>
                                        <div className="reservas-indicator">
                                          {evt.reservas}
                                          {evt.cupo_maximo
                                            ? ` / ${evt.cupo_maximo}` : ""}
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

            {/* Popularidad por Categoría */}
            <div
              className="grafico-card grafico-card--wide"
              style={{ marginTop: "24px" }}
            >
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
                {renderGraficoTorta(
                  reporteData?.rendimiento_por_tipo ?? [],
                  "tipo",
                  "cantidad"
                )}
                <div className="insight-text" style={{ marginTop: "20px" }}>
                  {(reporteData?.rendimiento_por_tipo ?? []).length > 0 ? (
                    <>
                      💡 Tu categoría más buscada es{" "}
                      <strong>
                        {[...(reporteData?.rendimiento_por_tipo ?? [])]
                          .sort((a: any, b: any) => b.cantidad - a.cantidad)[0]
                          ?.tipo}
                      </strong>
                    </>
                  ) : (
                    "💡 No hay datos suficientes para determinar una tendencia."
                  )}
                </div>
              </div>
            </div>

            {/* Fila: filtros recaudación + tarjetas métricas */}
            <div className="reportes-graficos" style={{ marginTop: "24px" }}>

              <div className="grafico-card">
                <div className="grafico-card__header">
                  <h3>💰 Recaudación Total</h3>
                  <p style={{ fontSize: "0.8rem", color: "#888" }}>
                    Todos los eventos — gratuitos muestran $0
                  </p>
                </div>
                <div className="grafico-card__body" style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center",
                }}>
                  <span style={{
                    fontSize: "3.2rem", fontWeight: "bold", color: "#4ade80",
                  }}>
                    ${totalRecaudacionFiltrado.toLocaleString("es-AR")}
                  </span>
                  <p style={{ color: "#ccc", marginTop: "8px" }}>
                    {detalleRecaudacionFiltrado.length} eventos en la vista
                  </p>

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

                  {/* Filtro estado (tabs) */}
                  <div style={{
                    display: "flex", gap: "6px", marginTop: "12px",
                    flexWrap: "wrap", justifyContent: "center",
                  }}>
                    {(["todos","activos","pasados"] as const).map((est) => (
                      <button
                        key={est}
                        onClick={() => setFiltroEstadoRecaudacion(est)}
                        style={sTab(filtroEstadoRecaudacion === est)}
                      >
                        {est === "todos"
                          ? "📊 Todos"
                          : est === "activos"
                          ? "🟢 Activos"
                          : "🔵 Finalizados"}
                      </button>
                    ))}
                  </div>

                  {/* Filtro tipo (tabs) */}
                  <div style={{
                    display: "flex", gap: "5px", marginTop: "10px",
                    flexWrap: "wrap", justifyContent: "center",
                  }}>
                    <button
                      onClick={() => setFiltroTipoRecaudacion("")}
                      style={sTab(filtroTipoRecaudacion === "")}
                    >
                      Todos
                    </button>
                    {TIPOS_EVENTO.map((t) => (
                      <button
                        key={t}
                        onClick={() => setFiltroTipoRecaudacion(t)}
                        style={sTab(filtroTipoRecaudacion === t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tarjetas métricas globales */}
              <div className="grafico-card" style={{
                display: "flex", flexDirection: "column",
                gap: "16px", justifyContent: "center",
              }}>
                {[
                  {
                    label: "Recaudación total sistema",
                    value: `$${(reporteData?.recaudacion_total ?? 0)
                      .toLocaleString("es-AR")}`,
                    color: "#4ade80",
                  },
                  {
                    label: "Total reservas recibidas",
                    value: String(reporteData?.total_reservas_recibidas ?? 0),
                    color: "#60a5fa",
                  },
                  {
                    label: "Mis eventos creados",
                    value: String(reporteData?.mis_eventos_total ?? 0),
                    color: "#fbbf24",
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    style={{
                      background: "#252525",
                      borderRadius: "8px", padding: "20px",
                    }}
                  >
                    <p style={{
                      margin: 0, color: "#888", fontSize: "0.75rem",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {card.label}
                    </p>
                    <p style={{
                      margin: "6px 0 0", color: card.color,
                      fontWeight: "bold", fontSize: "2rem",
                    }}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla detalle recaudación Externo */}
            <div
              className="grafico-card grafico-card--wide"
              style={{ marginTop: "20px" }}
            >
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
                  <p className="no-data">
                    Sin eventos para mostrar con los filtros actuales.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="tabla-reportes-custom">
                      <thead>
                        <tr>
                          <th
                            style={{ cursor: "pointer" }}
                            onClick={() => handleSortFin("nombre")}
                          >
                            Evento{sif("nombre")}
                          </th>
                          <th
                            style={{ cursor: "pointer" }}
                            onClick={() => handleSortFin("fecha")}
                          >
                            Fecha{sif("fecha")}
                          </th>
                          <th>Tipo</th>
                          <th
                            style={{ textAlign: "center", cursor: "pointer" }}
                            onClick={() => handleSortFin("cupo")}
                          >
                            Cupo{sif("cupo")}
                          </th>
                          <th
                            style={{ textAlign: "right", cursor: "pointer" }}
                            onClick={() => handleSortFin("unitario")}
                          >
                            Valor Unit.{sif("unitario")}
                          </th>
                          <th
                            style={{ textAlign: "right", cursor: "pointer" }}
                            onClick={() => handleSortFin("monto")}
                          >
                            Monto Total{sif("monto")}
                          </th>
                          <th style={{ textAlign: "center" }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleRecaudacionFiltrado.map(
                          (item: any, idx: number) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: "bold" }}>
                                {item.nombre_evento}
                              </td>
                              <td>
                                {new Date(item.fecha_evento)
                                  .toLocaleDateString("es-AR")}
                              </td>
                              <td>
                                <span className="badge-tipo">{item.tipo}</span>
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <div className="reservas-indicator">
                                  {item.inscriptos_count}
                                  {item.cupo_maximo
                                    ? ` / ${item.cupo_maximo}` : ""}
                                </div>
                              </td>
                              <td style={{ textAlign: "right", color: "#ccc" }}>
                                {item.monto_unitario === 0
                                  ? "Gratis"
                                  : `$${item.monto_unitario
                                      .toLocaleString("es-AR")}`}
                              </td>
                              <td style={{
                                textAlign: "right",
                                color: "#4ade80", fontWeight: "bold",
                              }}>
                                ${item.monto.toLocaleString("es-AR")}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <button
                                  onClick={() => setEventoDetalle(item)}
                                  style={{
                                    padding: "5px 12px",
                                    background: "transparent",
                                    border: "1px solid #4ade80",
                                    borderRadius: "6px", color: "#4ade80",
                                    cursor: "pointer", fontSize: "0.8rem",
                                    fontWeight: "bold", whiteSpace: "nowrap",
                                  }}
                                >
                                  Ver más →
                                </button>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: "2px solid #4ade80" }}>
                          <td
                            colSpan={5}
                            style={{
                              textAlign: "right",
                              fontWeight: "bold", fontSize: "1.1rem",
                            }}
                          >
                            TOTAL FILTRADO:
                          </td>
                          <td style={{
                            textAlign: "right", color: "#4ade80",
                            fontWeight: "bold", fontSize: "1.2rem",
                          }}>
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

        {/* ════════════════════════════════════════════════════════════════════
            ADMIN / SUPERVISOR — Gráficos del sistema (SIN CAMBIOS)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="reportes-graficos">

          {usuarioRol <= 2 &&
            (reporteData?.eventos_por_mes ?? []).length > 0 && (
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

          {usuarioRol <= 2 &&
            (reporteData?.eventos_por_tipo ?? []).length > 0 && (
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
                  {renderGraficoTorta(
                    reporteData?.eventos_por_tipo ?? [],
                    "tipo",
                    "cantidad"
                  )}
                </div>
              </div>
            )}

          {usuarioRol <= 2 &&
            (reporteData?.eventos_por_dificultad ?? []).length > 0 && (
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
                  {renderGraficoTorta(
                    reporteData?.eventos_por_dificultad ?? [],
                    "dificultad",
                    "cantidad"
                  )}
                </div>
              </div>
            )}

          {usuarioRol <= 2 &&
            (reporteData?.eventos_por_ubicacion ?? []).length > 0 && (
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
                <div className="grafico-card__body" style={{
                  overflowY: "auto", maxHeight: "300px",
                }}>
                  {renderRankingHorizontal(
                    reporteData?.eventos_por_ubicacion ?? [],
                    "ubicacion",
                    "cantidad"
                  )}
                </div>
              </div>
            )}

          {usuarioRol === 1 &&
            (reporteData?.usuarios_por_rol ?? []).length > 0 && (
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
                  {renderGraficoPie(
                    reporteData?.usuarios_por_rol ?? [],
                    "rol",
                    "cantidad",
                    getNombreRol
                  )}
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
                  Registro de intervenciones administrativas sobre eventos
                  y usuarios.
                </p>
                <div className="audit-badge">Auditoría Activa</div>
              </div>
            </div>
          )}

        </div>
        {/* fin .reportes-graficos */}

        {/* ════════════════════════════════════════════════════════════════════
            MAPA DE CALOR / TENDENCIAS POR UBICACIÓN
            Visible para todos los roles.
            Admin tiene segmentación extra: Todos | Propios | Externos
        ════════════════════════════════════════════════════════════════════ */}
        {tendenciasFiltradas.length > 0 && (
          <div
            className="grafico-card grafico-card--wide"
            style={{ marginTop: "30px" }}
          >
            <div className="grafico-card__header">
              <h3>🗺️ Mapa de Calor — Tendencias por Ubicación (Top 10)</h3>
              <p style={{
                fontSize: "0.8rem", color: "#888", marginTop: "5px",
              }}>
                Datos globales del sistema para análisis estratégico de zonas
                con mayor actividad.
              </p>
            </div>

            {/* Controles: tabs Activos/Pasados + segmentación Admin + filtro Tipo */}
            <div style={{
              display: "flex", gap: "10px", padding: "15px 20px",
              borderBottom: "1px solid #333",
              flexWrap: "wrap", alignItems: "center",
            }}>

              {/* Tab Activos / Pasados */}
              <div style={{
                display: "flex", gap: "6px", background: "#1a1a1a",
                padding: "4px", borderRadius: "24px",
                border: "1px solid #2a2a2a",
              }}>
                {(["activos","pasados"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTabTendencias(tab)}
                    style={sTab(tabTendencias === tab)}
                  >
                    {tab === "activos" ? "📈 Activos" : "📊 Pasados"}
                  </button>
                ))}
              </div>

              {/* Segmentación Propios/Externos — SOLO ADMIN */}
              {usuarioRol === 1 && (
                <div style={{
                  display: "flex", gap: "6px", background: "#1a1a1a",
                  padding: "4px", borderRadius: "24px",
                  border: "1px solid #2a2a2a",
                }}>
                  {(["todos","propios","externos"] as const).map((seg) => (
                    <button
                      key={seg}
                      onClick={() => setSegTendencias(seg)}
                      style={sTab(segTendencias === seg)}
                    >
                      {seg === "todos"
                        ? "Todos"
                        : seg === "propios"
                        ? "✦ Propios"
                        : "🏢 Externos"}
                    </button>
                  ))}
                </div>
              )}

              {/* Filtro por tipo de evento */}
              <div style={{
                display: "flex", gap: "5px", flexWrap: "wrap",
                background: "#1a1a1a", padding: "4px",
                borderRadius: "8px", border: "1px solid #2a2a2a",
              }}>
                <button
                  onClick={() => setFiltroTipoTendencias("")}
                  style={sTab(filtroTipoTendencias === "")}
                >
                  🚴 Todos
                </button>
                {TIPOS_EVENTO.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFiltroTipoTendencias(t)}
                    style={sTab(filtroTipoTendencias === t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de provincias — acordeón */}
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
                      borderRadius: "8px", overflow: "hidden",
                    }}
                  >
                    {/* Fila provincia */}
                    <div
                      onClick={() =>
                        setProvinciaExpandida(
                          provinciaExpandida === prov.provincia
                            ? null
                            : prov.provincia
                        )
                      }
                      style={{
                        padding: "15px", background: "#252525",
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", cursor: "pointer",
                        borderLeft: "4px solid #4ade80",
                      }}
                    >
                      <span style={{ fontWeight: "bold", fontSize: "1.1rem" }}>
                        {prov.provincia.toUpperCase()}
                      </span>
                      <div style={{
                        display: "flex", alignItems: "center", gap: "15px",
                      }}>
                        <span style={{
                          fontSize: "1.2rem", fontWeight: "bold",
                          color: "#4ade80",
                        }}>
                          {prov.localidades.reduce(
                            (s: number, loc: any) => s + loc.eventos.length,
                            0
                          )}{" "}
                          eventos
                        </span>
                        <span style={{
                          transition: "transform 0.3s",
                          transform:
                            provinciaExpandida === prov.provincia
                              ? "rotate(180deg)" : "rotate(0deg)",
                        }}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Panel de localidades */}
                    {provinciaExpandida === prov.provincia && (
                      <div style={{
                        padding: "10px 20px", background: "#1a1a1a",
                      }}>
                        {prov.localidades.map((loc: any, li: number) => {
                          const locKey =
                            `${prov.provincia}-${loc.localidad}`;
                          return (
                            <div key={li} style={{ marginBottom: "10px" }}>

                              {/* Fila localidad */}
                              <div
                                onClick={() =>
                                  setLocalidadExpandida(
                                    localidadExpandida === locKey
                                      ? null : locKey
                                  )
                                }
                                style={{
                                  padding: "12px", background: "#2d2d2d",
                                  borderRadius: "6px", cursor: "pointer",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  border: "1px solid #444",
                                }}
                              >
                                <span style={{ fontWeight: 500, color: "#e0e0e0" }}>
                                  {loc.localidad}
                                </span>
                                <div style={{
                                  display: "flex",
                                  alignItems: "center", gap: "10px",
                                }}>
                                  <span style={{
                                    color: "#4ade80", fontWeight: "bold",
                                  }}>
                                    {loc.eventos.length} eventos
                                  </span>
                                  <span style={{
                                    fontSize: "0.8rem", color: "#888",
                                  }}>
                                    {localidadExpandida === locKey ? "▲" : "▼"}
                                  </span>
                                </div>
                              </div>

                              {/* Lista de eventos de la localidad */}
                              {localidadExpandida === locKey && (
                                <div style={{
                                  marginTop: "5px", marginLeft: "20px",
                                }}>
                                  {loc.eventos.map((evt: any, ei: number) => {
                                    const esTipoExterno =
                                      evt.organizador_tipo === "Externo";
                                    return (
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
                                          flexWrap: "wrap", gap: "8px",
                                        }}
                                      >
                                        <span style={{
                                          color: "#e0e0e0", fontWeight: 500,
                                        }}>
                                          {evt.nombre}
                                        </span>
                                        <div style={{
                                          display: "flex", gap: "12px",
                                          color: "#888", flexWrap: "wrap",
                                          fontSize: "0.82rem",
                                          alignItems: "center",
                                        }}>
                                          <span style={{
                                            background: "#252525",
                                            padding: "2px 8px",
                                            borderRadius: "4px",
                                            color: "#a78bfa",
                                          }}>
                                            {evt.tipo}
                                          </span>
                                          {/* Badge Propios/Externos — solo Admin */}
                                          {usuarioRol === 1 &&
                                            evt.organizador_tipo && (
                                              <span style={{
                                                padding: "2px 8px",
                                                borderRadius: "10px",
                                                fontSize: "0.72rem",
                                                fontWeight: "bold",
                                                background: esTipoExterno
                                                  ? "#fbbf2422" : "#4ade8022",
                                                border: `1px solid ${esTipoExterno ? "#fbbf24" : "#4ade80"}`,
                                                color: esTipoExterno
                                                  ? "#fbbf24" : "#4ade80",
                                              }}>
                                                {esTipoExterno
                                                  ? "Externo" : "Propio"}
                                              </span>
                                            )}
                                          {usuarioRol === 1 &&
                                            evt.organizador_nombre && (
                                              <span style={{
                                                color: "#666",
                                                fontSize: "0.78rem",
                                              }}>
                                                por {evt.organizador_nombre}
                                              </span>
                                            )}
                                          <span>🚴 {evt.distancia_km} km</span>
                                          <span>
                                            📅{" "}
                                            {new Date(evt.fecha_evento)
                                              .toLocaleDateString("es-AR")}
                                          </span>
                                          <span style={{
                                            color: evt.estado === 3
                                              ? "#4ade80" : "#60a5fa",
                                            fontWeight: "bold",
                                          }}>
                                            {evt.estado === 3
                                              ? "● Activo"
                                              : "● Finalizado"}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
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
                  No hay eventos{" "}
                  {tabTendencias === "activos" ? "activos" : "finalizados"}{" "}
                  para mostrar
                  {filtroTipoTendencias
                    ? ` del tipo "${filtroTipoTendencias}"` : ""}.
                </p>
              )}
            </div>
          </div>
        )}

      </div>
      {/* fin .reportes-page__container */}

      <Footer />
    </div>
  );
}