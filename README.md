# 🎮 CHAOS GAME - Proyecto Full Stack

## 📁 Estructura del Proyecto

```
chaos-game/
├── frontend/              # Código del cliente (HTML/CSS/JS)
│   ├── public/
│   ├── resources/
│   ├── index.html
│   ├── SCENE.html
│   └── LOG.HTML
├── backend/               # Servidor Node.js
│   ├── src/
│   │   └── server.js
│   ├── package.json
│   └── .env
├── .gitignore
└── README.md
```

## 🚀 Instalación

### Prerrequisitos
- Node.js >= 18.0.0
- npm o yarn
- Cuenta en Supabase
- Git

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/chaos-game.git
cd chaos-game
```

### 2️⃣ Configurar el Backend

```bash
cd backend
npm install
```

### 3️⃣ Configurar Variables de Entorno

Crea un archivo `.env` en la carpeta `backend/`:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:

```env
PORT=3000
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
FRONTEND_URL=http://localhost:5173
```

### 4️⃣ Configurar Supabase

Crea las siguientes tablas en tu proyecto de Supabase:

#### Tabla: `users`
```sql
create table users (
  id uuid references auth.users primary key,
  email text unique not null,
  username text unique not null,
  profile_image text,
  best_score integer default 0,
  total_wins integer default 0,
  total_deaths integer default 0,
  play_time integer default 0,
  created_at timestamp with time zone default now()
);

-- Habilitar RLS
alter table users enable row level security;

-- Políticas de seguridad
create policy "Users can view their own profile" 
  on users for select 
  using (auth.uid() = id);

create policy "Users can update their own profile" 
  on users for update 
  using (auth.uid() = id);
```

#### Tabla: `game_history`
```sql
create table game_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  score integer default 0,
  difficulty text default 'medium',
  play_time integer default 0,
  won boolean default false,
  created_at timestamp with time zone default now()
);

-- Habilitar RLS
alter table game_history enable row level security;

-- Políticas
create policy "Users can view their own history" 
  on game_history for select 
  using (auth.uid() = user_id);

create policy "Users can insert their own games" 
  on game_history for insert 
  with check (auth.uid() = user_id);
```

### 5️⃣ Iniciar el Servidor

```bash
# Modo desarrollo (con hot reload)
npm run dev

# Modo producción
npm start
```

El servidor estará corriendo en: `http://localhost:3000`

### 6️⃣ Configurar el Frontend

El frontend necesita hacer peticiones a tu API. Actualiza tus archivos JS:

```javascript
// Ejemplo: En tu archivo de login
const API_URL = 'http://localhost:3000/api';

async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  return await response.json();
}
```

## 📡 API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |

### Usuarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/users/:userId` | Obtener perfil de usuario |
| PUT | `/api/users/:userId` | Actualizar perfil |

### Juego

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/game/stats` | Guardar estadísticas |
| GET | `/api/game/history/:userId` | Obtener historial |
| GET | `/api/game/leaderboard` | Obtener tabla de líderes |

## 🌐 Deployment

### Backend en Render

1. Crea una cuenta en [render.com](https://render.com)
2. Conecta tu repositorio de GitHub
3. Crea un nuevo Web Service:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Configura las variables de entorno en el dashboard

### Frontend en Vercel

1. Crea una cuenta en [vercel.com](https://vercel.com)
2. Importa tu repositorio
3. Configura:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Other
4. Actualiza `API_URL` en tu frontend con la URL de Render

## 🔧 Scripts Disponibles

```bash
# Backend
npm run dev      # Desarrollo con hot reload
npm start        # Producción
npm test         # Tests (pendiente)

# Frontend
# Sirve los archivos con cualquier servidor estático
npx serve frontend
```

## 👥 Equipo

- Raúl Alejandro García Gámez (2049564)
- Alberto Jesús Alvarado Garza (1847862)
- Danna Paola Hernández Rodríguez (2076454)

## 📝 Licencia

MIT

---

**¿Problemas?** Abre un issue en GitHub o contacta al equipo.