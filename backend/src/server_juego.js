// // Importar dependencias
// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const path = require('path');

// // Crear servidor Express
// const app = express();
// const server = http.createServer(app);

// // Crear instancia de Socket.IO vinculada al servidor
// const io = new Server(server, {
//   cors: {
//     origin: "*", // o especifica tu URL, por ejemplo "http://localhost:3000"
//     methods: ["GET", "POST"]
//   }
// });

// // ✅ Servir archivos estáticos desde la carpeta "public"
// app.use(express.static(path.join(__dirname, '../../frontend')));

// // ✅ Ruta raíz (index.html dentro de public)
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, '../../frontend/index.html'));
// });


// // Lista de jugadores
// const listaJugadores = [];

// // Escuchar conexiones
// io.on('connection', (socket) => {
//   console.log('👤 User connected:', socket.id);

//   socket.on('Iniciar', (data) => {
//     console.log('🎮 Player joined:', data);
    
//     const existe = listaJugadores.find(p => p.nickname === data.nickname);
//     if (!existe) {
//       listaJugadores.push({
//         nickname: data.nickname,
//         character: data.character,
//         socketId: socket.id,
//         x: 0,
//         y: 0,
//         z: 0
//       });
//     }

//     io.emit('Iniciar', data);

//     listaJugadores.forEach(player => {
//       socket.emit('Iniciar', {
//         nickname: player.nickname,
//         character: player.character
//       });
//     });
//   });

//   socket.on('Posicion', (posicion, nickname) => {
//     const player = listaJugadores.find(p => p.nickname === nickname);
//     if (player) {
//       player.x = posicion.x;
//       player.y = posicion.y;
//       player.z = posicion.z;

//       socket.broadcast.emit('Posicion', posicion, nickname);
//     }
//   });

//   socket.on('disconnect', () => {
//     console.log('👋 User disconnected:', socket.id);
//     const index = listaJugadores.findIndex(p => p.socketId === socket.id);
//     if (index !== -1) {
//       console.log('🗑️ Removing player:', listaJugadores[index].nickname);
//       listaJugadores.splice(index, 1);
//     }
//   });
// });

// // Iniciar servidor
// const PORT = 3000;
// server.listen(PORT, () => {
//   console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
// });
