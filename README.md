# 🎮 CHAOS GAME - Proyecto Full Stack

## 📊 Arquitectura del Proyecto

Este proyecto usa una arquitectura de **microservicios separados**:
```
┌──────────────────────────────────────────────────────────┐
│                    USUARIO (Navegador)                    │
└────────────────────┬─────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐          ┌──────────────┐
│   VERCEL     │          │   RENDER     │
│  (Frontend)  │◄────────►│  (Backend)   │
│              │   CORS   │              │
│ - HTML/CSS/JS│          │ - Node.js    │
│ - Estáticos  │          │ - Express    │
│              │          │ - API REST   │
└──────────────┘          └──────┬───────┘
                                 │
                                 ▼
                         ┌──────────────┐
                         │   SUPABASE   │
                         │ (PostgreSQL) │
                         └──────────────┘
```

### 🔍 Flujo de una petición:

1. Usuario abre `https://graficas-web-blush.vercel.app`
2. Vercel sirve `index.html` + `api.js`
3. `api.js` hace `fetch()` a `https://gcweb-backend.onrender.com/api/...`
4. Render procesa la petición y consulta Supabase
5. Render responde JSON al navegador
6. El navegador actualiza la UI

---

## 📁 Estructura del Proyecto
```
graficas-web/
├── frontend/              # Desplegado en Vercel
│   ├── public/
│   │   └── js/
│   │       └── api.js    # Cliente que conecta con Render
│   ├── resources/
│   ├── index.html
│   ├── SCENE.html
│   └── LOG.HTML
│
├── backend/               # Desplegado en Render
│   ├── src/
│   │   └── server.js     # API Express
│   ├── package.json
│   └── .env              # Solo para desarrollo local
│
├── vercel.json           # Configuración de Vercel
├── render.yaml           # Configuración de Render
├── .gitignore
└── README.md
```

---

## 🚀 Instalación Local

### Prerrequisitos
- Node.js >= 18.0.0
- npm
- Cuenta en Supabase
- Git

### 1️⃣ Clonar el repositorio
```bash
git clone https://github.com/ItsRulini/graficas-web.git
cd graficas-web
```

### 2️⃣ Configurar el Backend
```bash
cd backend
npm install
```

### 3️⃣ Configurar Variables de Entorno

Crea `backend/.env`:
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Credenciales de Supabase
SUPABASE_URL=PROYECTO_EN_SUPABASE
SUPABASE_ANON_KEY=ANON_KEY
```

### 4️⃣ Configurar Base de Datos en Supabase

Ejecuta el script `modelo_fisico.sql` en el SQL Editor de Supabase.

### 5️⃣ Iniciar el Servidor Local
```bash
# En la carpeta backend/
npm run dev
```

El servidor local sirve AMBOS: frontend + backend en `http://localhost:3000`

---

## 🌐 Despliegue en Producción

### Backend en Render

1. Crea una cuenta en [render.com](https://render.com)
2. Conecta tu repositorio de GitHub
3. Crea un nuevo Web Service:
   - **Name**: `gcweb-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Configura variables de entorno:
```
   NODE_ENV=production
   SUPABASE_URL=https://...
   SUPABASE_ANON_KEY=...
   FRONTEND_URL=https://tu-proyecto.vercel.app
```

### Frontend en Vercel

1. Crea una cuenta en [vercel.com](https://vercel.com)
2. Importa tu repositorio
3. Configura:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Other
4. Actualiza `frontend/public/js/api.js`:
```javascript
   const API_URL = 'https://gcweb-backend.onrender.com/api';
```

---

## 📡 API Endpoints

### Health & Status
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Health check del servidor |
| GET | `/api/test` | Test de conexión |
| GET | `/api/db-status` | Estado de la base de datos |

### Autenticación (Próximamente)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión |

---

## 🔒 Variables de Entorno

### Desarrollo (.env local)
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=PROYECTO_SUPABASE
SUPABASE_ANON_KEY=ANON_KEY
```

### Producción (Render Dashboard)
```env
PORT=10000                # Asignado por Render
NODE_ENV=production
FRONTEND_URL=https://graficas-web-blush.vercel.app
SUPABASE_URL=PROYECTO_SUPABASE
SUPABASE_ANON_KEY=ANON_KEY
```

**Nota:** NUNCA subas el archivo `.env` a GitHub (está en `.gitignore`)

---

## 🧪 Testing
```bash
# Test local
curl http://localhost:3000/api/health

# Test producción
curl https://gcweb-backend.onrender.com/api/health
```

---

## 👥 Equipo

- Raúl Alejandro García Gámez (2049564)
- Alberto Jesús Alvarado Garza (1847862)
- Danna Paola Hernández Rodríguez (2076454)

---

## 📝 Notas Importantes

### ¿Por qué están separados frontend y backend?

- **Escalabilidad**: Puedes escalar cada uno independientemente
- **Seguridad**: El backend no expone archivos sensibles
- **Performance**: CDN de Vercel para frontend, Node.js en Render para lógica
- **Costos**: Ambos tienen planes gratuitos generosos

### ¿Por qué CORS?

El navegador bloquea peticiones entre diferentes dominios por seguridad. CORS le dice: "Este dominio (Vercel) PUEDE hacer peticiones a este otro (Render)".

---

## 📚 Recursos

- [Express.js Docs](https://expressjs.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)

---

**🎮 ¡Listo para jugar!**