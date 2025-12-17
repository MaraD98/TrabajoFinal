-- Tabla de roles
CREATE TABLE Rol (
    id_rol SERIAL PRIMARY KEY,                     -- autoincremental
    nombre_rol VARCHAR(100) NOT NULL UNIQUE        -- Ej: 'Administrador', 'Supervisor', 'Operario', 'Cliente'
);

-- Tabla de usuarios
CREATE TABLE Usuario (
    id_usuario SERIAL PRIMARY KEY,                 -- autoincremental
    nombre VARCHAR(255) NOT NULL,                  -- nombre visible
    email VARCHAR(255) NOT NULL UNIQUE,            -- login principal
    contrasenia VARCHAR(200) NOT NULL,             -- credencial
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- automático
    id_rol INT NOT NULL,                           -- FK al rol
    FOREIGN KEY (id_rol) REFERENCES Rol(id_rol)
);

-- Tabla de contactos
CREATE TABLE Contacto (
    id_contacto SERIAL PRIMARY KEY,                -- autoincremental
    id_usuario INT NOT NULL,                       -- FK al usuario
    telefono VARCHAR(50),                          -- opcional
    direccion VARCHAR(255),                        -- opcional
    enlace_redes VARCHAR(255),                     -- ej: Instagram, LinkedIn
    otro_contacto VARCHAR(255),                    -- ej: WhatsApp alternativo
    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario)
);

-- Carga inicial de roles
INSERT INTO Rol (nombre_rol) VALUES 
('Administrador'),
('Supervisor'),
('Operario'),
('Cliente');

-----------------------------------------------------------------------------------------------------------------------------------------------------------------

