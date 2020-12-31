const { baseDatos } = require('./basedatos');
const http = require('http');
const helmet = require('helmet');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const Errores = {
	SinError: 0x00,
	SolicitudMalFormada: 0x01,
	ErrorInterno: 0x02
};


/**
 * Obtiene información de carácter público de un usuario
 * @param {Request} sol Solicitud
 * @param {Response} res Respuesta
 */
async function obtenerInformacionUsuario (sol, res) {
	let instruccionSQL = '';
	let resultadosSQL = {};
	let resultados = {
		_exito: true,
		verificado: true
	};
	let idUsuario = 0;

	try {
		if (sol.params.id !== undefined) {
			idUsuario = parseInt(sol.params.id);
		} else {
			return res.status(400).json({ _exito: false, codigo: Errores.SolicitudMalFormada });
		}

		instruccionSQL = `
SELECT
	id::integer
FROM usuarios
WHERE (
	id = $1 AND
	verificado = true
)
		`;
		resultadosSQL = await baseDatos.query(instruccionSQL, [ idUsuario ]);
		if (resultadosSQL.rowCount === 0) {
			resultados.verificado = false;
		}
		
		return res.status(200).json(resultados);
	} catch (_e) {
		return res.status(500).json({ _exito: false, codigo: Errores.ErrorInterno });
	}
}


/**
 * Configura las rutas de acceso a las funciones
 */
function configurarRutas() {
	app.get('/api/usuario/:id',
		cors({
			origin: true,
			methods: 'GET'
		}),
		[
			obtenerInformacionUsuario
		]
	);

}

/**
 * Inicia el servidor API REST
 */
function iniciar() {
	app.use(helmet());
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));

	configurarRutas();

	app.use(function (sol, res) {
		return res.status(400).json({ _exito: false, codigo: Errores.SolicitudMalFormada });
	});

	http.createServer(app).listen(8002, '127.0.0.1');
}

module.exports = {
	iniciar
};
