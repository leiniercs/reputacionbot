// Produccion: 1342202179:AAHUaRsyypamrLOojbz7w3m3TjY7gdjpD1g
// Desarrollo: 1250980023:AAEQdEYzdC2VEVeff6GWwCDieFm6YzK2CoU
const botToken = '1342202179:AAHUaRsyypamrLOojbz7w3m3TjY7gdjpD1g';
const Telegraf = require('telegraf');
const bot = new Telegraf(botToken);
//const fs = require('fs');
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
	}
];


async function mostrarAyuda (contexto) {
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

async function procesarRetroalimentacion (contexto) {
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
		}
	} catch (_e) {}

	await comun.guardarVariablesSesion(contexto);
}

bot.start(inicio.accion);

for (let comando of comandos) {
	bot.command(comando.comando, comando.accion);
}

bot.on('passport_data', ctc.procesarInformacionPasaporteTelegram);
bot.on('callback_query', procesarRetroalimentacion);
bot.on('new_chat_members', grupos.procesarNuevoMiembro);
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
