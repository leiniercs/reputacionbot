const Telegraf = require('telegraf');
const { Pool } = require('pg');
const { baseDatos } = require('./basedatos');

const Origenes = {
	TerminosYCondiciones: 0x01,
	ConoceTuCliente: 0x02,
	Identidad: 0x03
}


/**
 * Inicializa las variables de sesión para el usuario origen
 * @param {Telegraf} contexto Objeto de referencia a 'Telegraf'
 */
async function inicializarVariablesSesion (contexto) {
	contexto.session = {
		usuario: {
			id: 0,
			first_name: ''
		},
		idChat: 0,
		poseeUsuario: false,
		registrado: false,
		cambioUsuario: false,
		tycAceptadas: false,
		ctc: false,
		verificado: false
	};
	let resultadosBaseDatos = {};
	let instruccionSQL = `
SELECT
	variables::text
FROM sesiones
WHERE (
	id = $1
)
	`;
	
	if (contexto.update.message !== undefined) {
		contexto.session.usuario = contexto.update.message.from;
	} else {
		if (contexto.update.edited_message !== undefined) {
			contexto.session.usuario = contexto.update.edited_message.from;
		} else {
			if (contexto.update.callback_query !== undefined) {
				contexto.session.usuario = contexto.update.callback_query.from;
			}
		}
	}

	try {
		resultadosBaseDatos = await baseDatos.query(instruccionSQL, [
			contexto.session.usuario.id
		]);
		if (resultadosBaseDatos.rowCount === 0) {
			instruccionSQL = `
INSERT INTO sesiones (
	id,
	variables
) VALUES (
	$1,
	$2
)
			`;
		
			try {
				await baseDatos.query(instruccionSQL, [ contexto.session.usuario.id, JSON.stringify(contexto.session) ]);
			} catch (_e) {}
		} else {
			contexto.session = JSON.parse(resultadosBaseDatos.rows[0].variables);
		}
	} catch (_e) {}

	if (contexto.update.message !== undefined) {
		contexto.session.usuario = contexto.update.message.from;
		contexto.session.idChat = contexto.update.message.chat.id;
	} else {
		if (contexto.update.edited_message !== undefined) {
			contexto.session.usuario = contexto.update.edited_message.from;
			contexto.session.idChat = contexto.update.edited_message.chat.id;
		} else {
			if (contexto.update.callback_query !== undefined) {
				contexto.session.usuario = contexto.update.callback_query.from;
				contexto.session.idChat = contexto.update.callback_query.message.chat.id;
			}
		}
	}

	contexto.session.poseeUsuario = (contexto.session.usuario.username !== undefined);
	
	instruccionSQL = `
SELECT
	usuario::text,
	tyc_aceptadas::boolean,
	ctc::boolean,
	verificado::boolean
FROM usuarios
WHERE (
	id = $1
)
	`;

	try {
		resultadosBaseDatos = await baseDatos.query(instruccionSQL, [
			contexto.session.usuario.id
		]);
		if (resultadosBaseDatos.rowCount > 0) {
			contexto.session.registrado = true;
			contexto.session.cambioUsuario = (resultadosBaseDatos.rows[0].usuario !== contexto.session.usuario.username );
			contexto.session.tycAceptadas = resultadosBaseDatos.rows[0].tyc_aceptadas;
			contexto.session.ctc = resultadosBaseDatos.rows[0].ctc;
			contexto.session.verificado = resultadosBaseDatos.rows[0].verificado;
		}
	} catch (_e) {}
}

/**
 * Guarda las variables de sesión para el usuario origen
 * @param {Telegraf} contexto Objeto de referencia a 'Telegraf'
 */
async function guardarVariablesSesion (contexto) {
	const instruccionSQL = `
UPDATE sesiones
SET
	variables = $2
WHERE (
	id = $1
)
	`;

	try {
		await baseDatos.query(instruccionSQL, [ contexto.session.usuario.id, JSON.stringify(contexto.session) ]);
	} catch (_e) {}
}

module.exports = {
	Origenes,
	inicializarVariablesSesion,
	guardarVariablesSesion
}