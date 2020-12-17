const Telegraf = require('telegraf');
const comun = require('./comun');
const notificaciones = require('./notificaciones');

const comando = 'start';
const descripcion = 'Inicia el bot';


/**
 * Visualiza los Términos y Condiciones para su lectura, entendimiento y aprobación
 * @this {Telegraf} Objeto de referencia a 'Telegraf'
 * @param {Telegraf} contexto Referencia al objeto de la sesion
 */
async function accion (contexto) {
	await comun.inicializarVariablesSesion(contexto);
	bienvenida(contexto);
	await comun.guardarVariablesSesion(contexto);
}

/**
 * Inicia el bot
 * @this {Telegraf} Objeto de referencia a 'Telegraf'
 * @param {Telegraf} contexto Objeto de referencia a 'Telegraf'
 */
function bienvenida (contexto)  {
	const mensaje = `<b>Bienvenido(a), ${contexto.session.usuario.first_name}</b>.

Soy un ente de arbitraje de reputación, con el que podrás obtener información de reputación, otorgar y recibir evaluaciones acompañadas de testimonios, para, así, demostrar cuán confiable eres.

<b>¿Cuál es mi utilidad?</b>
En el mundo en el que vivimos necesitamos confiar en los demás para realizar determinadas tareas o delegar la ejecución de determinadas acciones.

Le ofrezco a todas las personas un espacio en donde pueden manifestar dicha confiabilidad a través de un sistema de reputación basado en evaluaciones.

<b>¿Cómo utilizar el sistema de reputación?</b>
Tan fácil y simple como contar hasta tres. Comienza por registrarte, luego completa el proceso de Conoce a Tu Cliente, y por útimo, otorga y recibe evaluaciones acompañadas de un breve testimonio escrito.`;

	contexto.telegram.sendMessage(contexto.session.usuario.id, mensaje, { parse_mode: 'HTML' })
		.then(() => {
			if (contexto.session.tycAceptadas !== true) {
				notificaciones.tyc(contexto);
			} else {
				if (contexto.session.registrado === true) {
					if (contexto.session.ctc === false || contexto.session.verificado === false) {
						notificaciones.ausenciaVerificacion(contexto);
					} else {
						notificaciones.registroExistente(contexto);
					} 
				} else {
					notificaciones.ausenciaRegistro(contexto);
				}
			}		
		})
		.catch(() => {})
	;
}

module.exports = {
    comando,
    descripcion,
	accion
};