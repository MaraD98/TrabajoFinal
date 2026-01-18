import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/inicio.css';

interface UserProfile {
    id_usuario?: number;
    email: string;
    nombre_y_apellido: string;
    id_rol?: number;
    telefono?: string;
    direccion?: string;
    enlace_redes?: string;
}

export default function PerfilPage() {
    const [perfil, setPerfil] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // ESTADO NUEVO: Para mostrar mensajes de éxito bonitos
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Modos de edición
    const [isEditing, setIsEditing] = useState(false); 
    const [isChangingPass, setIsChangingPass] = useState(false); 

    // Formularios
    const [editForm, setEditForm] = useState({
        nombre_y_apellido: '',
        email: '',
        telefono: '',
        direccion: '',
        enlace_redes: ''
    });

    const [passForm, setPassForm] = useState({
        password_actual: '',
        password_nueva: ''
    });

    const navigate = useNavigate();
    const apiUrl = import.meta.env.VITE_API_URL;

    // 1. CARGAR DATOS
    useEffect(() => {
        const fetchPerfil = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }

            try {
                const response = await axios.get(`${apiUrl}/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setPerfil(response.data);
                setEditForm({
                    nombre_y_apellido: response.data.nombre_y_apellido || '',
                    email: response.data.email || '',
                    telefono: response.data.telefono || '',
                    direccion: response.data.direccion || '',
                    enlace_redes: response.data.enlace_redes || ''
                });
            } catch (err) {
                console.error(err);
                setError('No se pudo cargar el perfil.');
            } finally {
                setLoading(false);
            }
        };
        fetchPerfil();
    }, [navigate, apiUrl]);

    // 2. GUARDAR DATOS PERSONALES
    const handleSaveDatos = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await axios.put(`${apiUrl}/me`, editForm, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const usuarioActualizado = response.data;
            setPerfil(usuarioActualizado);
            setIsEditing(false);
            
            // Actualizar Header
            const datosParaGuardar = {
                ...usuarioActualizado,
                nombre: usuarioActualizado.nombre_y_apellido 
            };
            localStorage.setItem('user', JSON.stringify(datosParaGuardar));
            localStorage.setItem('usuario', JSON.stringify(datosParaGuardar));
            
            window.location.reload(); 

        } catch (err: any) {
            console.error("Error al guardar datos:", err);
            const mensaje = err.response?.data?.detail || "Error al conectar con el servidor";
            setError(mensaje); // Usamos el mensaje de error en pantalla
            setTimeout(() => setError(null), 4000);
        }
    };

    // 3. GUARDAR CONTRASEÑA (CON MENSAJE LINDO)
    const handleSavePassword = async () => {
        setSuccessMsg(null); // Limpiamos mensajes anteriores
        setError(null);

        if (!passForm.password_actual || !passForm.password_nueva) {
            setError("Por favor completa ambos campos.");
            return;
        }

        const token = localStorage.getItem('token');
        try {
            await axios.post(`${apiUrl}/me/password`, passForm, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            // MENSAJE DE ÉXITO INTEGRADO
            setSuccessMsg("¡Contraseña actualizada correctamente!");
            setPassForm({ password_actual: '', password_nueva: '' }); 
            
            // Opcional: Cerrar el formulario después de 2 segundos
            setTimeout(() => {
                setSuccessMsg(null);
                setIsChangingPass(false);
            }, 2000);

        } catch (err: any) {
            console.error("Error al cambiar password:", err);
            const mensaje = err.response?.data?.detail || "Error al cambiar la contraseña.";
            setError(mensaje);
        }
    };

    if (loading) return <div style={{ color: '#ccff00', background: '#0d0d0d', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>CARGANDO...</div>;

    return (
        <div className="inicio-container" style={{ minHeight: '100vh', paddingTop: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <div className="section-header">
                <h2 className="section-title">Mi Perfil</h2>
            </div>

            <div style={{ 
                width: '100%',
                maxWidth: '500px', 
                background: '#1a1a1a', 
                padding: '40px', 
                borderRadius: '12px', 
                border: '1px solid #333',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
            }}>
                {/* --- MENSAJES DE ERROR O ÉXITO GLOBALES --- */}
                {error && (
                    <div style={{ padding: '10px', background: 'rgba(255, 68, 68, 0.1)', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', textAlign: 'center', marginBottom: '20px' }}>
                        {error}
                    </div>
                )}
                
                {successMsg && (
                    <div style={{ padding: '10px', background: 'rgba(204, 255, 0, 0.1)', border: '1px solid #ccff00', color: '#ccff00', borderRadius: '4px', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
                        {successMsg}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* --- MODO: CAMBIAR CONTRASEÑA --- */}
                    {isChangingPass ? (
                        <>
                            <h3 style={{color: 'white', textAlign: 'center', margin: 0}}>Seguridad</h3>
                            <div className="form-group">
                                <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>CONTRASEÑA ACTUAL</label>
                                <input 
                                    type="password" 
                                    value={passForm.password_actual}
                                    onChange={(e) => setPassForm({...passForm, password_actual: e.target.value})}
                                    style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>NUEVA CONTRASEÑA</label>
                                <input 
                                    type="password" 
                                    value={passForm.password_nueva}
                                    onChange={(e) => setPassForm({...passForm, password_nueva: e.target.value})}
                                    style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                />
                            </div>

                            <div style={{ borderTop: '1px solid #333', marginTop: '20px', paddingTop: '20px', display: 'flex', gap: '15px' }}>
                                <button onClick={() => { setIsChangingPass(false); setPassForm({password_actual: '', password_nueva: ''}); setError(null); }} style={{ padding: '12px 20px', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}>CANCELAR</button>
                                <button onClick={handleSavePassword} style={{ padding: '12px 20px', background: '#ccff00', border: 'none', color: '#000', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>ACTUALIZAR CLAVE</button>
                            </div>
                        </>
                    ) : (
                        /* --- MODO: VER / EDITAR DATOS --- */
                        <>
                            {/* EMAIL */}
                            <div className="form-group">
                                <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>EMAIL</label>
                                {isEditing ? (
                                    <input 
                                        type="email" 
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                        style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                    />
                                ) : (
                                    <div style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', color: '#888', border: '1px solid #333' }}>
                                        {perfil?.email}
                                    </div>
                                )}
                            </div>

                            {/* NOMBRE Y APELLIDO */}
                            <div className="form-group">
                                <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>NOMBRE Y APELLIDO</label>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={editForm.nombre_y_apellido}
                                        onChange={(e) => setEditForm({...editForm, nombre_y_apellido: e.target.value})}
                                        style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                    />
                                ) : (
                                    <div style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', color: '#fff', border: '1px solid #444' }}>
                                        {perfil?.nombre_y_apellido}
                                    </div>
                                )}
                            </div>

                            {/* TELEFONO */}
                            <div className="form-group">
                                <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>TELÉFONO</label>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={editForm.telefono}
                                        onChange={(e) => setEditForm({...editForm, telefono: e.target.value})}
                                        style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                    />
                                ) : (
                                    <div style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', color: '#fff', border: '1px solid #444' }}>
                                        {perfil?.telefono || <span style={{color: '#666', fontStyle: 'italic'}}>Sin datos</span>}
                                    </div>
                                )}
                            </div>

                            {/* DIRECCIÓN */}
                            <div className="form-group">
                                <label style={{ color: '#ccff00', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '5px', display: 'block' }}>DIRECCIÓN</label>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={editForm.direccion}
                                        onChange={(e) => setEditForm({...editForm, direccion: e.target.value})}
                                        style={{ width: '100%', padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', borderRadius: '6px' }}
                                    />
                                ) : (
                                    <div style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', color: '#fff', border: '1px solid #444' }}>
                                        {perfil?.direccion || <span style={{color: '#666', fontStyle: 'italic'}}>Sin datos</span>}
                                    </div>
                                )}
                            </div>

                            {/* BOTONES PRINCIPALES */}
                            <div style={{ borderTop: '1px solid #333', marginTop: '20px', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {!isEditing ? (
                                    <>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button onClick={() => { setIsEditing(true); setError(null); }} style={{ padding: '12px', background: '#ccff00', border: 'none', color: '#000', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>
                                                EDITAR DATOS
                                            </button>
                                            <button onClick={() => { setIsChangingPass(true); setError(null); }} style={{ padding: '12px', background: '#333', border: '1px solid #ccff00', color: 'white', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>
                                                CAMBIAR CONTRASEÑA
                                            </button>
                                        </div>
                                        <button onClick={() => navigate('/')} style={{ padding: '12px', background: 'transparent', border: '1px solid #666', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', width: '100%' }}>
                                            VOLVER AL INICIO
                                        </button>
                                    </>
                                ) : (
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <button onClick={() => { setIsEditing(false); setError(null); }} style={{ padding: '12px', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>
                                            CANCELAR
                                        </button>
                                        <button onClick={handleSaveDatos} style={{ padding: '12px', background: '#ccff00', border: 'none', color: '#000', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold', flex: 1 }}>
                                            GUARDAR CAMBIOS
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}