import { useState } from 'react';

// ── Tipos ────────────────────────────────────────────────────────────────────
type ModoFecha = 'dia' | 'mes' | 'anio';

export interface FiltroActivo {
    nombre: string;
    // Cada parte por separado — el padre decide cómo combinarlas
    dia:  string;   // '01'–'31' o ''
    mes:  string;   // '01'–'12' o ''
    anio: string;   // '2025' o ''
    modoFecha: ModoFecha;
}

interface BuscadorEventosProps {
    onBuscar: (filtro: FiltroActivo) => void;
    onLimpiar: () => void;
    hayFiltroActivo: boolean;
}

const MESES = [
    { value: '01', label: 'Enero' },   { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },   { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },   { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' }, { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

const anioActual = new Date().getFullYear();
const ANIOS = Array.from({ length: 10 }, (_, i) => anioActual - 2 + i);

const selectStyle: React.CSSProperties = {
    padding: '9px 10px', borderRadius: '7px',
    border: '1px solid #2a2a2a', background: '#0f0f0f',
    color: '#fff', fontSize: '0.85rem', outline: 'none', cursor: 'pointer',
};

export default function BuscadorEventos({ onBuscar, onLimpiar, hayFiltroActivo }: BuscadorEventosProps) {
    const [nombre, setNombre] = useState('');
    const [modoFecha, setModoFecha] = useState<ModoFecha>('mes');
    const [dia,  setDia]  = useState('');
    const [mes,  setMes]  = useState('');
    const [anio, setAnio] = useState('');

    const handleBuscar = () => {
        onBuscar({ nombre, dia, mes, anio, modoFecha });
    };

    const handleLimpiar = () => {
        setNombre(''); setDia(''); setMes(''); setAnio('');
        setModoFecha('mes');
        onLimpiar();
    };

    const handleModoChange = (nuevo: ModoFecha) => {
        setModoFecha(nuevo); setDia(''); setMes(''); setAnio('');
    };

    const diasDelMes = (anio && mes) ? new Date(Number(anio), Number(mes), 0).getDate() : 31;

    // Muestra un resumen de qué se está filtrando
    const resumenFiltro = (() => {
        const partes = [];
        if (modoFecha === 'dia' && dia) partes.push(`día ${dia}`);
        if ((modoFecha === 'dia' || modoFecha === 'mes') && mes)
            partes.push(MESES.find(m => m.value === mes)?.label || mes);
        if (anio) partes.push(anio);
        return partes.length ? partes.join(' de ') : null;
    })();

    return (
        <div style={{
            display: 'flex', gap: '10px', marginBottom: '20px',
            flexWrap: 'wrap', alignItems: 'center',
            background: '#111', padding: '14px 16px',
            borderRadius: '10px', border: '1px solid #1e1e1e'
        }}>
            {/* Nombre */}
            <input
                type="text"
                placeholder="🔍 Buscar por nombre..."
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleBuscar(); }}
                style={{
                    padding: '9px 13px', borderRadius: '7px',
                    border: '1px solid #2a2a2a', background: '#0f0f0f',
                    color: '#fff', fontSize: '0.9rem', outline: 'none',
                    minWidth: '200px', flex: 2
                }}
            />

            {/* Selector modo */}
            <div style={{ display: 'flex', borderRadius: '7px', overflow: 'hidden', border: '1px solid #2a2a2a', flexShrink: 0 }}>
                {(['dia', 'mes', 'anio'] as ModoFecha[]).map(modo => (
                    <button key={modo} onClick={() => handleModoChange(modo)} style={{
                        padding: '9px 13px',
                        background: modoFecha === modo ? '#ccff00' : '#0f0f0f',
                        color: modoFecha === modo ? '#000' : '#888',
                        border: 'none', fontWeight: modoFecha === modo ? '700' : '400',
                        fontSize: '0.78rem', cursor: 'pointer',
                        textTransform: 'uppercase', letterSpacing: '0.03em',
                        transition: 'all 0.15s ease'
                    }}>
                        {modo === 'dia' ? 'Día' : modo === 'mes' ? 'Mes' : 'Año'}
                    </button>
                ))}
            </div>

            {/* Selects de fecha */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                {modoFecha === 'dia' && (
                    <select value={dia} onChange={e => setDia(e.target.value)} style={selectStyle}>
                        <option value="">Día</option>
                        {Array.from({ length: diasDelMes }, (_, i) => {
                            const v = String(i + 1).padStart(2, '0');
                            return <option key={v} value={v}>{i + 1}</option>;
                        })}
                    </select>
                )}
                {(modoFecha === 'dia' || modoFecha === 'mes') && (
                    <select value={mes} onChange={e => setMes(e.target.value)} style={selectStyle}>
                        <option value="">Mes</option>
                        {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                )}
                <select value={anio} onChange={e => setAnio(e.target.value)} style={selectStyle}>
                    <option value="">Año</option>
                    {ANIOS.map(a => <option key={a} value={String(a)}>{a}</option>)}
                </select>
            </div>

            {/* Hint de qué se va a buscar */}
            {resumenFiltro && !hayFiltroActivo && (
                <span style={{ fontSize: '0.78rem', color: '#666', flexBasis: '100%', marginTop: '-6px' }}>
                    Buscará eventos de: <strong style={{ color: '#888' }}>{resumenFiltro}</strong>
                </span>
            )}

            {/* Buscar */}
            <button onClick={handleBuscar} style={{
                padding: '9px 20px', borderRadius: '7px', border: 'none',
                background: '#ccff00', color: '#000', fontWeight: '700',
                fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0
            }}>
                Buscar
            </button>

            {/* Limpiar */}
            {hayFiltroActivo && (
                <button onClick={handleLimpiar} style={{
                    padding: '9px 14px', borderRadius: '7px',
                    border: '1px solid #333', background: 'transparent',
                    color: '#a8a8a8', fontSize: '0.85rem', cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0
                }}>
                    ✕ Limpiar
                </button>
            )}
        </div>
    );
}