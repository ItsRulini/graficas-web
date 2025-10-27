// Cliente API para conectar con el backend
const API_URL = 'http://localhost:3000/api';

class APIClient {
	constructor() {
		this.baseURL = API_URL;
		this.session = this.loadSession();
	}

	// ==================== HELPERS ====================

	loadSession() {
		const sessionStr = localStorage.getItem('session');
		return sessionStr ? JSON.parse(sessionStr) : null;
	}

	saveSession(session) {
		localStorage.setItem('session', JSON.stringify(session));
		this.session = session;
	}

	clearSession() {
		localStorage.removeItem('session');
		this.session = null;
	}

	async request(endpoint, options = {}) {
		const url = `${this.baseURL}${endpoint}`;
		const config = {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			}
		};

		try {
			const response = await fetch(url, config);
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Error en la petición');
			}

			return data;
		} catch (error) {
			console.error('API Error:', error);
			throw error;
		}
	}

	// ==================== TEST METHODS ====================

	async healthCheck() {
		try {
			return await this.request('/health');
		} catch (error) {
			console.error('Health check failed:', error);
			return { status: 'ERROR' };
		}
	}

	async testConnection() {
		try {
			return await this.request('/test');
		} catch (error) {
			console.error('Test failed:', error);
			throw error;
		}
	}

	async checkDatabase() {
		try {
			return await this.request('/db-status');
		} catch (error) {
			console.error('Database check failed:', error);
			throw error;
		}
	}
}

// Crear instancia global
const api = new APIClient();

// Exportar para uso en módulos
export default api;
