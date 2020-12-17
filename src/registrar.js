const Telegraf = require('telegraf');
const comun = require('./comun');
const { baseDatos } = require('./basedatos');
const notificaciones = require('./notificaciones');

const comando = 'registrar';
const descripcion = 'Registra al usuario en el sistema.';


/**
 * Registra al usuario en el sistema
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function accion (contexto) {
	await comun.inicializarVariablesSesion(contexto);
	await registrar(contexto);
	await comun.guardarVariablesSesion(contexto);
}

/**
 * Registra al usuario en el sistema
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function registrar (contexto) {
	let instruccionSQL = '';

	if (contexto.session.tycAceptadas === false) {
		notificaciones.tyc(contexto);
		return;
	}

	if (contexto.session.poseeUsuario === false) {
		contexto.telegram.sendMessage(contexto.session.usuario.id, `<b>ERROR</b>

Usted no tiene asociado un nombre de usuario. Debe asociar un nombre de usuario para poder registrarse.`, { parse_mode: 'HTML' })
			.then(() => {})
			.catch(() => {})
		;
		return;
	}
	
	if (contexto.session.registrado === true) {
		if (contexto.session.cambioUsuario === false) {
			if (contexto.session.ctc === false || contexto.session.verificado === false) {
				notificaciones.ausenciaVerificacion(contexto);
			} else {
				notificaciones.registroExistente(contexto);
			} 
			return;
		} else {
			notificaciones.registroCambioUsuario(contexto);
			instruccionSQL = `
DELETE FROM usuarios
WHERE (
	id = $1
)
			`;
			await baseDatos.query(instruccionSQL, [ contexto.session.usuario.id ]);
		}
	}
	
	instruccionSQL = `
INSERT INTO usuarios (
    id,
	usuario,
	nombre,
	tyc_aceptadas
) VALUES (
	$1,
	$2,
	$3,
	true
)
RETURNING id::integer
	`;

	baseDatos.query(instruccionSQL, [
			contexto.session.usuario.id,
			contexto.session.usuario.username,
			contexto.session.usuario.first_name
		])
		.then((resultados) => {
			if (resultados.rowCount === 0) {
				contexto.telegram.sendMessage(contexto.session.usuario.id, 'Ocurrió un error al ejecutar el proceso de registro. Inténtelo más tarde.')
					.then(() => {})
					.catch(() => {})
	
				;
			} else {
				contexto.session.registrado = true;
				contexto.session.cambioUsuario = false;
				contexto.session.verificado = false;
				contexto.telegram.sendMessage(contexto.session.usuario.id, `<b>Registro exitoso!</b>

Felicitaciones! Usted se ha registrado en el sistema de forma satisfactoria.

<b>Datos registrados:</b>
  - ID: ${contexto.session.usuario.id}
  - Usuario: @${contexto.session.usuario.username}
  - Nombre: ${contexto.session.usuario.first_name}`, { parse_mode: 'HTML' })
					.then(() => {
						notificaciones.ausenciaVerificacion(contexto);
					})
					.catch(() => {})
				;
			}
		})
		.catch(() => {})
	;
}

module.exports = {
	comando,
	descripcion,
	accion,
	registrar
};
