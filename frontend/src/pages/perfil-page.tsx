import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/perfil.css'; 

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
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Modos de edición
    const [isEditing, setIsEditing] = useState(false); 
    const [isChangingPass, setIsChangingPass] = useState(false); 
    
    // ESTADO NUEVO: Modal de eliminar cuenta
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // ESTADOS NUEVOS: Ver contraseñas
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);

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
            
            // Actualizar LocalStorage
            const datosParaGuardar = {
                ...usuarioActualizado,
                nombre: usuarioActualizado.nombre_y_apellido 
            };
            localStorage.setItem('user', JSON.stringify(datosParaGuardar));
            localStorage.setItem('usuario', JSON.stringify(datosParaGuardar));
            
            setSuccessMsg("¡Datos actualizados!");
            setTimeout(() => setSuccessMsg(null), 3000);
            // Recarga suave u opcional
            // window.location.reload(); 

        } catch (err: any) {
            console.error("Error al guardar datos:", err);
            const mensaje = err.response?.data?.detail || "Error al conectar con el servidor";
            setError(mensaje);
            setTimeout(() => setError(null), 4000);
        }
    };

    // 3. GUARDAR CONTRASEÑA
    const handleSavePassword = async () => {
        setSuccessMsg(null);
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

            setSuccessMsg("¡Contraseña actualizada correctamente!");
            setPassForm({ password_actual: '', password_nueva: '' });
            setShowCurrentPass(false);
            setShowNewPass(false);
            
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

    // 4. ELIMINAR CUENTA (NUEVO)
    const handleDeleteAccount = async () => {
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${apiUrl}/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Limpiar todo y salir
            localStorage.clear();
            navigate('/login');
            window.location.reload();
        } catch (err: any) {
            console.error("Error al eliminar cuenta:", err);
            setError("No se pudo eliminar la cuenta. Intenta nuevamente.");
            setShowDeleteConfirm(false);
        }
    };

    if (loading) return <div className="loading-screen">CARGANDO...</div>;

    return (
        <div className="perfil-container">
            
            <div className="section-header-perfil">
                <h2 className="section-title">Mi Perfil</h2>
            </div>

            <div className="perfil-card">
                {/* --- MENSAJES --- */}
                {error && <div className="msg-box msg-error">{error}</div>}
                {successMsg && <div className="msg-box msg-success">{successMsg}</div>}

                <div className="form-content">
                    
                    {/* --- MODO: CAMBIAR CONTRASEÑA --- */}
                    {isChangingPass ? (
                        <>
                            <h3 className="form-subtitle">Seguridad</h3>
                            
                            <div className="form-group">
                                <label className="form-label">CONTRASEÑA ACTUAL</label>
                                <div className="password-wrapper">
                                    <input 
                                        type={showCurrentPass ? "text" : "password"} 
                                        value={passForm.password_actual}
                                        onChange={(e) => setPassForm({...passForm, password_actual: e.target.value})}
                                        className="form-input"
                                    />
                                    <button type="button" className="eye-btn" onClick={() => setShowCurrentPass(!showCurrentPass)}>
                                        {showCurrentPass ? '🚫' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">NUEVA CONTRASEÑA</label>
                                <div className="password-wrapper">
                                    <input 
                                        type={showNewPass ? "text" : "password"} 
                                        value={passForm.password_nueva}
                                        onChange={(e) => setPassForm({...passForm, password_nueva: e.target.value})}
                                        className="form-input"
                                    />
                                    <button type="button" className="eye-btn" onClick={() => setShowNewPass(!showNewPass)}>
                                        {showNewPass ? '🚫' : '👁️'}
                                    </button>
                                </div>
                            </div>

                            <div className="actions-row">
                                <button onClick={() => { setIsChangingPass(false); setPassForm({password_actual: '', password_nueva: ''}); setError(null); }} className="btn btn-outline-red">CANCELAR</button>
                                <button onClick={handleSavePassword} className="btn btn-neon flex-grow">ACTUALIZAR CLAVE</button>
                            </div>
                        </>
                    ) : (
                        /* --- MODO: VER / EDITAR DATOS --- */
                        <>
                            {/* EMAIL */}
                            <div className="form-group">
                                <label className="form-label">EMAIL</label>
                                {isEditing ? (
                                    <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="form-input" />
                                ) : (
                                    <div className="form-input read-only">{perfil?.email}</div>
                                )}
                            </div>

                            {/* NOMBRE Y APELLIDO */}
                            <div className="form-group">
                                <label className="form-label">NOMBRE Y APELLIDO</label>
                                {isEditing ? (
                                    <input type="text" value={editForm.nombre_y_apellido} onChange={(e) => setEditForm({...editForm, nombre_y_apellido: e.target.value})} className="form-input" />
                                ) : (
                                    <div className="form-input read-only">{perfil?.nombre_y_apellido}</div>
                                )}
                            </div>

                            {/* TELEFONO */}
                            <div className="form-group">
                                <label className="form-label">TELÉFONO</label>
                                {isEditing ? (
                                    <input type="text" value={editForm.telefono} onChange={(e) => setEditForm({...editForm, telefono: e.target.value})} className="form-input" />
                                ) : (
                                    <div className="form-input read-only">{perfil?.telefono || <span className="no-data">Sin datos</span>}</div>
                                )}
                            </div>

                            {/* DIRECCIÓN */}
                            <div className="form-group">
                                <label className="form-label">DIRECCIÓN</label>
                                {isEditing ? (
                                    <input type="text" value={editForm.direccion} onChange={(e) => setEditForm({...editForm, direccion: e.target.value})} className="form-input" />
                                ) : (
                                    <div className="form-input read-only">{perfil?.direccion || <span className="no-data">Sin datos</span>}</div>
                                )}
                            </div>

                            {/* BOTONES PRINCIPALES */}
                            <div className="actions-column">
                                {!isEditing ? (
                                    <>
                                        <div className="actions-row">
                                            <button onClick={() => { setIsEditing(true); setError(null); }} className="btn btn-neon flex-grow">EDITAR DATOS</button>
                                            <button onClick={() => { setIsChangingPass(true); setError(null); }} className="btn btn-outline-neon flex-grow">CAMBIAR CONTRASEÑA</button>
                                        </div>
                                        <button onClick={() => navigate('/')} className="btn btn-outline-gray full-width">VOLVER AL INICIO</button>
                                        
                                        {/* BOTÓN DE ELIMINAR */}
                                        <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-text-red">⚠️ ELIMINAR CUENTA</button>
                                    </>
                                ) : (
                                    <div className="actions-row">
                                        <button onClick={() => { setIsEditing(false); setError(null); }} className="btn btn-outline-red flex-grow">CANCELAR</button>
                                        <button onClick={handleSaveDatos} className="btn btn-neon flex-grow">GUARDAR CAMBIOS</button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* --- MODAL CONFIRMACIÓN ELIMINAR --- */}
            {showDeleteConfirm && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="danger-text">¿Estás seguro?</h3>
                        <p>Esta acción eliminará tu cuenta y tus datos <b>permanentemente</b>.</p>
                        <div className="actions-row">
                            <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-outline-gray">CANCELAR</button>
                            <button onClick={handleDeleteAccount} className="btn btn-solid-red">SÍ, ELIMINAR</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}