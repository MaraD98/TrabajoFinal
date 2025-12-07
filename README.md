Proyecto Fullstack: React + TypeScript (Frontend) / FastAPI + SQL Server (Backend)

Este documento describe los pasos iniciales para configurar el entorno de desarrollo en Windows.

📦 Requisitos previos

Python 3.11+ instalado en Windows
Node.js 18+ instalado
Git instalado y configurado
SQL Server instalado localmente o accesible en red

⚙️ Instalación de dependencias

Backend (FastAPI + SQL Server)
Ejecutar en la raíz del proyecto:
pip install fastapi uvicorn[standard] sqlalchemy pyodbc python-dotenv


🚀 Ejecución

Backend
uvicorn main:app --reload --port 8000

Frontend
npm run dev

📂 Estructura inicial del proyecto

project-root/
│   README.md
│   requirements.txt
│   .gitignore
│   docker-compose.yml        # opcional si usan contenedores
│
├── backend/
│   ├── main.py               # punto de entrada FastAPI
│   ├── .env                  # variables de entorno
│   ├── app/
│   │   ├── __init__.py
│   │   ├── api/              # rutas/endpoints
│   │   │   ├── __init__.py
│   │   │   ├── users.py
│   │   │   └── items.py
│   │   ├── core/             # configuración central
│   │   │   ├── config.py     # carga de variables .env
│   │   │   └── security.py   # autenticación/autorización
│   │   ├── db/               # conexión y modelos DB
│   │   │   ├── __init__.py
│   │   │   ├── base.py       # metadata y engine SQLAlchemy
│   │   │   ├── models/       # tablas ORM
│   │   │   │   └── user.py
│   │   │   └── crud/         # operaciones CRUD
│   │   │       └── user.py
│   │   ├── schemas/          # Pydantic (validación)
│   │   │   └── user.py
│   │   ├── services/         # lógica de negocio
│   │   │   └── email.py
│   │   └── tests/            # pruebas unitarias
│   │       └── test_users.py
│   └── scripts/              # migraciones, utilidades
│       └── init_db.py
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── public/               # assets estáticos
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx          # punto de entrada React
│       ├── App.tsx
│       ├── assets/           # imágenes, íconos
│       ├── components/       # componentes reutilizables
│       │   └── Navbar.tsx
│       ├── pages/            # vistas principales
│       │   ├── Home.tsx
│       │   └── Login.tsx
│       ├── hooks/            # custom hooks
│       ├── services/         # llamadas API (axios)
│       │   └── api.ts
│       ├── context/          # contextos globales
│       ├── styles/           # CSS/SCSS modules
│       └── tests/            # pruebas frontend
│           └── App.test.tsx
│
└── docs/                     # documentación institucional
    ├── arquitectura.md
    └── decisiones.md



📂 Estructura y descripción de carpetas
Backend (FastAPI + SQL Server)

- backend/app/api/ → Endpoints de la API. Aquí se definen las rutas de FastAPI que exponen los servicios (ejemplo: users.py, items.py).
- backend/app/core/ → Configuración central del proyecto. Incluye carga de variables de entorno, seguridad, middlewares y parámetros globales.
- backend/app/db/
- models/ → Definición de tablas y entidades con SQLAlchemy.
- crud/ → Funciones CRUD (Create, Read, Update, Delete) que interactúan con la base de datos.
- base.py → Configuración del motor de conexión y metadata.
- backend/app/schemas/ → Esquemas de validación con Pydantic. Aquí se definen las entidades que se reciben/envían en la API (ejemplo: UserCreate, UserRead).
- backend/app/services/ → Lógica de negocio independiente de la API. Ejemplo: envío de correos, cálculos, integraciones externas.
- backend/app/tests/ → Pruebas unitarias y de integración para asegurar reproducibilidad y calidad del código.
-backend/scripts/ → Scripts auxiliares (ejemplo: inicialización de base de datos, migraciones).

Frontend (React + TypeScript)
- frontend/public/ → Archivos estáticos accesibles directamente (favicon, imágenes públicas).
- frontend/src/assets/ → Recursos gráficos internos (íconos, imágenes).
- frontend/src/components/ → Componentes reutilizables de la UI (ejemplo: Navbar, Button).
- frontend/src/pages/ → Vistas principales de la aplicación (ejemplo: Home, Login).
- frontend/src/services/ → Llamadas a la API usando Axios. Centraliza la comunicación con el backend.
- frontend/src/context/ → Contextos globales de React para manejar estado compartido (ejemplo: usuario autenticado).
- frontend/src/hooks/ → Custom hooks para lógica reutilizable (ejemplo: useAuth, useFetch).
- frontend/src/styles/ → Archivos CSS/SCSS globales o modulares para estilos.
- frontend/src/tests/ → Pruebas unitarias y de componentes (ejemplo: App.test.tsx).

Documentación
- docs/ → Documentos institucionales.
- arquitectura.md → Explicación de la arquitectura del sistema.
- decisiones.md → Registro de decisiones técnicas y funcionales tomadas por el equipo.