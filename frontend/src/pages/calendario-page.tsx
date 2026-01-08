import { useState, useEffect } from 'react';
import { getEventosCalendario } from '../services/eventos';
import '../styles/Calendario.css';

// 👇 Ajusté esto para que coincida con tu Backend de Python
interface Evento {
  id: number;
  nombre_evento: string; // Antes titulo
  fecha_evento: string;  // Antes fecha
  descripcion?: string;
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function CalendarioPage() {
  const [fechaActual, setFechaActual] = useState(new Date());
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(false);

  const mes = fechaActual.getMonth();
  const anio = fechaActual.getFullYear();

  useEffect(() => {
    cargarEventos();
  }, [mes, anio]);

  const cargarEventos = async () => {
    setCargando(true);
    try {
      // Nota: El mes en JS es 0-11, pero tu backend seguro espera 1-12
      const data = await getEventosCalendario(mes + 1, anio);
      setEventos(data || []);
    } catch (error) {
      console.error('Error al cargar eventos:', error);
      setEventos([]);
    } finally {
      // Pequeño delay artificial para que se luzca la animación de la bici 😉
      setTimeout(() => setCargando(false), 800);
    }
  };

  const obtenerDiasDelMes = () => {
    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);
    const diasEnMes = ultimoDia.getDate();
    
    // Ajustar el día de la semana (0=Dom a formato Lun=0)
    let diaSemanaInicio = primerDia.getDay() - 1;
    if (diaSemanaInicio === -1) diaSemanaInicio = 6;

    const dias: (number | null)[] = [];
    
    // Rellenar huecos vacíos antes del día 1
    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push(null);
    }
    
    // Rellenar los días reales
    for (let dia = 1; dia <= diasEnMes; dia++) {
      dias.push(dia);
    }
    return dias;
  };

  const obtenerEventosDelDia = (dia: number) => {
    // Formato YYYY-MM-DD para comparar
    const fechaBuscada = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    // Usamos fecha_evento que es como viene del backend
    return eventos.filter(e => e.fecha_evento === fechaBuscada);
  };

  const cambiarMes = (direccion: number) => {
    const nuevaFecha = new Date(anio, mes + direccion, 1);
    setFechaActual(nuevaFecha);
  };

  const dias = obtenerDiasDelMes();

  return (
    <div className="calendario-container">
      <div className="calendario-wrapper">
        
        {/* Cabecera */}
        <header className="calendario-header">
          <h1 className="calendario-titulo">Calendario de Eventos</h1>
          
          <div className="calendario-navegacion">
            <button 
              className="btn-navegacion" 
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            
            <h2 className="mes-actual">
              {MESES[mes]} {anio}
            </h2>
            
            <button 
              className="btn-navegacion" 
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </header>

        {/* Cuerpo del Calendario */}
        {cargando ? (
          <div className="calendario-cargando">
            {/* 🚲 AQUÍ ESTÁ LA BICI 🚲 */}
            <div className="bici-loader">
                <div className="bici-cuadro"></div>
            </div>
            <p>Buscando rutas...</p>
          </div>
        ) : (
          <div className="calendario-grid-wrapper">
            <div className="calendario-grid">
              
              {/* Nombres de los días (Lun, Mar...) */}
              {DIAS_SEMANA.map(dia => (
                <div key={dia} className="dia-semana-header">
                  {dia}
                </div>
              ))}

              {/* Días numéricos */}
              {dias.map((dia, index) => {
                if (dia === null) {
                  return <div key={`vacio-${index}`} className="dia-celda dia-vacio"></div>;
                }

                const eventosDelDia = obtenerEventosDelDia(dia);
                const tieneEventos = eventosDelDia.length > 0;

                return (
                  <div 
                    key={`dia-${dia}`} 
                    className={`dia-celda ${tieneEventos ? 'dia-con-eventos' : ''}`}
                  >
                    <div className="dia-numero">{dia}</div>
                    
                    {tieneEventos && (
                      <div className="eventos-lista">
                        {eventosDelDia.map(evento => (
                          <div 
                            key={evento.id} 
                            className="evento-badge"
                            title={evento.descripcion || evento.nombre_evento}
                          >
                            {evento.nombre_evento}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}