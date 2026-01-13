import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../services/eventos";
import "../styles/register.css";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    nombre_y_apellido: "",
    email: "",
    contrasenia: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const usuario = await register(formData);
      console.log("Usuario registrado:", usuario);

      // después de registrar, redirigir al login
      navigate("/login");
    } catch (err: any) {
      console.error("Error en registro:", err);
      setError(
        err.response?.data?.detail || "No se pudo registrar el usuario"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <h2>Registro de Usuario</h2>
      <form onSubmit={handleSubmit}>
        {error && <p className="error">{error}</p>}

        <input
          type="text"
          name="nombre_y_apellido"
          placeholder="Nombre y Apellido"
          value={formData.nombre_y_apellido}
          onChange={handleChange}
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Correo electrónico"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <input
          type="password"
          name="contrasenia"
          placeholder="Contraseña"
          value={formData.contrasenia}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Registrando..." : "Registrarse"}
        </button>
      </form>
    </div>
  );
}
