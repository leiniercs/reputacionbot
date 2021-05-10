// MTProto API: 149.154.167.50:443 / 2426526 / ab46594b9caf8d1f10ac93f349788a86
// Produccion: 1342202179:AAHUaRsyypamrLOojbz7w3m3TjY7gdjpD1g
// Desarrollo: 1250980023:AAEQdEYzdC2VEVeff6GWwCDieFm6YzK2CoU
const botToken = '1342202179:AAHUaRsyypamrLOojbz7w3m3TjY7gdjpD1g';
const { Telegraf } = require('telegraf');
const bot = new Telegraf(botToken);
//const fs = require('fs');
const { Operaciones, Usuario } = require('./usuario');
const api = require('./api');
const comun = require('./comun');
const inicio = require('./inicio');
const tyc = require('./tyc');
const registrar = require('./registrar');
const ctc = require('./ctc');
const evaluaciones = require('./evaluaciones');
const informes = require('./informes');
const grupos = require('./grupos');
const monitorizacion = require('./monitorizacion');
const listaNegra = require('./listanegra');
const comandos = [
	{
		comando: 'ayuda',
		descripcion: 'Muestra este mensaje de ayuda.',
		accion: mostrarAyuda
	},
	{
		comando: tyc.comando,
		descripcion: tyc.descripcion,
		accion: tyc.accion
	},
	{
		comando: registrar.comando,
		descripcion: registrar.descripcion,
		accion: registrar.accion
	},
	{
		comando: ctc.comando,
		descripcion: ctc.descripcion,
		accion: ctc.accion
	},
	{
		comando: evaluaciones.comandos.positiva.comando,
		descripcion: evaluaciones.comandos.positiva.descripcion,
		accion: evaluaciones.accion
	},
	{
		comando: evaluaciones.comandos.negativa.comando,
		descripcion: evaluaciones.comandos.negativa.descripcion,
		accion: evaluaciones.accion
	},
	{
		comando: informes.comando,
		descripcion: informes.descripcion,
		accion: informes.accion
	},
	{
		comando: monitorizacion.comando,
		descripcion: monitorizacion.descripcion,
		accion: monitorizacion.accion
	},
	{
		comando: grupos.comando,
		descripcion: grupos.descripcion,
		accion: grupos.accion
	},
	{
		comando: listaNegra.comandos.administradores.comando,
		descripcion: listaNegra.comandos.administradores.descripcion,
		accion: listaNegra.accion
	},
	{
		comando: listaNegra.comandos.admAgregar.comando,
		descripcion: listaNegra.comandos.admAgregar.descripcion,
		accion: listaNegra.accion
	},
	{
		comando: listaNegra.comandos.admEliminar.comando,
		descripcion: listaNegra.comandos.admEliminar.descripcion,
		accion: listaNegra.accion
	},
	{
		comando: listaNegra.comandos.agregar.comando,
		descripcion: listaNegra.comandos.agregar.descripcion,
		accion: listaNegra.accion
	},
	{
		comando: listaNegra.comandos.eliminar.comando,
		descripcion: listaNegra.comandos.eliminar.descripcion,
		accion: listaNegra.accion
	},
	{
		comando: listaNegra.comandos.buscar.comando,
		descripcion: listaNegra.comandos.buscar.descripcion,
		accion: listaNegra.accion
	}
];


async function mostrarAyuda(contexto) {
	let mensaje = '';
	let masComandos = false;

	for (let comando of comandos) {
		if (masComandos === true) {
			mensaje += '\n\n';
		}
		mensaje += `<b>Comando:</b> /${comando.comando}
<b>Descripción:</b> ${comando.descripcion}`;
		masComandos = true;
	}

	bot.telegram.sendMessage(contexto.update.message.from.id, mensaje, { parse_mode: 'HTML' })
		.then(() => {})
		.catch((e) => {console.debug(e);})
	;
}

async function procesarRetroalimentacion(contexto) {
	const datos = JSON.parse(contexto.update.callback_query.data);

	await comun.inicializarVariablesSesion(contexto);

	try {
		switch (datos._origen)
		{
			case comun.Origenes.TerminosYCondiciones:
				switch (datos.accion) {
					case 1:
						tyc.mostrar(contexto);
						contexto.answerCbQuery('')
							.then(() => {})
							.catch(() => {})
						;
						break;
					case 2:
					case 3:
						tyc.aceptarRechazar(contexto);
						break;
				}
				break;
			case comun.Origenes.Identidad:
				await ctc.aprobarRechazar(contexto);
				break;
			case comun.Origenes.ListaNegra:
				switch (datos.accion) {
					case 1:
						if (contexto.update.callback_query.from.id === datos.u) {
							await listaNegra.administracionOtorgar(contexto, datos);
						} else {
							contexto.answerCbQuery('ERROR! Usted no está autorizado a realizar esta operación.')
								.then(() => {})
								.catch(() => {})
							;
						}
						break;
				}
				break;
		}
	} catch (_e) {}

	await comun.guardarVariablesSesion(contexto);
}

bot.use(async (contexto, siguiente) => {
	try {
		if (contexto.update.message !== undefined) {
			//await monitorizacion.registrarCambios(contexto);
			const usuariosSancionados = await Usuario.comprobarCambioUsuario(contexto, true);
			for (let i = 0; i < usuariosSancionados.length; i++) {
				const idUsuarioSancionado = usuariosSancionados[i];

				setTimeout(() => {
					const usuario = new Usuario(idUsuarioSancionado);
					const nombres = `${usuario.identidad.primerNombre} ${usuario.identidad.segundoNombre}`;

					contexto.telegram.sendMessage(contexto.update.message.chat.id, `<b>Cambio de identidad detectado!</b>

Se ha detectado el usuario <a href="tg://user?id=${usuario.id}">${nombres.trim()} (${usuario.id})</a> tiene su identidad verificada y, aún así, ha cambiado su nombre de usuario, por lo que ha incurrido en una falta que es sancionada con la invalidación de su verificación y todas sus evaluaciones positivas.

Si el usuario ${nombres.trim()} desea volver a utilizar los servicios del <b>Bot de la Reputación</b> entonces debe volver a verificar su identidad.`, { parse_mode: 'HTML', reply_to_message_id: contexto.update.message.message_id })
						.then(() => {})
						.catch(() => {})
					;
				}, 1000 * i);
			}
		}
	} catch (_e) {}

	return siguiente();
});

bot.start(inicio.accion);

for (let comando of comandos) {
	bot.command(comando.comando, comando.accion);
}

bot.on('passport_data', ctc.procesarInformacionPasaporteTelegram);
bot.on('callback_query', procesarRetroalimentacion);
bot.on('new_chat_members', grupos.procesarNuevoMiembro);
bot.on('left_chat_member', grupos.procesarPartidaMiembro);
bot.on('message', grupos.procesarNuevoMensaje);

api.iniciar();

bot.launch();
/*
bot.launch({
	webhook: {
		domain: 'https://reputacionbot.ccari.net/sNluMMhxLf3HV3AVUMvoyS2kzizLT6eczIPGfCD8x18',
		hookPath: '/sNluMMhxLf3HV3AVUMvoyS2kzizLT6eczIPGfCD8x18',
		port: 8001,
		host: '127.0.0.1'
	}
});
*/
