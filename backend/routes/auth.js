const express = require('express');
const { verifyGoogleToken } = require('../auth/googleAuth');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Configurar Supabase
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_ANON_KEY
);

// Ruta para autenticación Google
router.post('/google', async (req, res) => {
	try {
		const { token } = req.body;

		if (!token) {
			return res.status(400).json({ error: 'Token requerido' });
		}

		// Verificar token con Google
		const googleUser = await verifyGoogleToken(token);

		// Buscar usuario por email en Supabase
		const { data: existingUser, error: userError } = await supabase
			.from('users')
			.select('*')
			.eq('email', googleUser.email)
			.single();

		let user = existingUser;

		if (!user) {
			// Crear nuevo usuario en Supabase
			const nickname = googleUser.name.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();

			const { data: newUser, error: insertError } = await supabase
				.from('users')
				.insert([
					{
						nickname: nickname,
						email: googleUser.email,
						password: 'google_oauth', // Password especial para usuarios Google
						best_score: 0,
						play_time: 0,
						total_wins: 0,
						total_deaths: 0,
						joined_date: new Date().toISOString()
					}
				])
				.select()
				.single();

			if (insertError) {
				throw new Error('Error creando usuario: ' + insertError.message);
			}

			user = newUser;
		}

		res.json({
			success: true,
			user: {
				id: user.id,
				nickname: user.nickname,
				email: user.email,
				best_score: user.best_score,
				play_time: user.play_time,
				total_wins: user.total_wins,
				total_deaths: user.total_deaths,
				joined_date: user.joined_date
			}
		});

	} catch (error) {
		console.error('Error en autenticación Google:', error);
		res.status(401).json({
			success: false,
			error: error.message || 'Autenticación fallida'
		});
	}
});

module.exports = router;
