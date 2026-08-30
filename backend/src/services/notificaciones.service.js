const nodemailer = require('nodemailer');

/**
 * Notificaciones del formulario de contacto.
 *
 * Todo esto es "mejor esfuerzo": si el correo o el WhatsApp fallan,
 * NO debe tumbar la petición del visitante. El mensaje ya se guardó
 * en la base de datos (contacto.controller.js) antes de llegar aquí;
 * esto es solo un aviso adicional.
 *
 * Variables de entorno necesarias:
 *
 *  Correo (Gmail vía nodemailer):
 *    CONTACTO_EMAIL_USER      -> cuenta de Gmail que ENVÍA el correo
 *    CONTACTO_EMAIL_APP_PASS  -> "contraseña de aplicación" de esa
 *                                cuenta (no la contraseña normal;
 *                                se genera en myaccount.google.com/apppasswords)
 *    CONTACTO_EMAIL_DESTINO   -> a quién le llega el aviso
 *                                (ej: gadielzuniga8@gmail.com)
 *
 *  WhatsApp (vía CallMeBot, gratuito para pruebas):
 *    CONTACTO_WHATSAPP_NUMERO  -> número destino, con código de país,
 *                                 sin '+' ni espacios (ej: 51971825787)
 *    CONTACTO_WHATSAPP_APIKEY  -> se obtiene una sola vez activando el
 *                                 bot (ver instrucciones más abajo)
 */

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.CONTACTO_EMAIL_USER || !process.env.CONTACTO_EMAIL_APP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.CONTACTO_EMAIL_USER,
      pass: process.env.CONTACTO_EMAIL_APP_PASS,
    },
  });

  return transporter;
}

async function enviarCorreoNuevoContacto(contacto) {
  const destino = process.env.CONTACTO_EMAIL_DESTINO;
  const t = getTransporter();

  if (!t || !destino) {
    console.warn(
      '[notificaciones] Correo no enviado: falta CONTACTO_EMAIL_USER, CONTACTO_EMAIL_APP_PASS o CONTACTO_EMAIL_DESTINO en el .env'
    );
    return { enviado: false, motivo: 'faltan credenciales de correo' };
  }

  try {
    await t.sendMail({
      from: `"Sitio web SEDIR" <${process.env.CONTACTO_EMAIL_USER}>`,
      to: destino,
      subject: `Nuevo mensaje de contacto: ${contacto.asunto || 'Sin asunto'}`,
      text:
        `Nuevo mensaje desde el formulario de contacto del sitio web:\n\n` +
        `Nombre: ${contacto.nombre}\n` +
        `Correo: ${contacto.correo}\n` +
        `Teléfono: ${contacto.telefono || '(no indicado)'}\n` +
        `Asunto: ${contacto.asunto || '(no indicado)'}\n\n` +
        `Mensaje:\n${contacto.mensaje}\n`,
      html:
        `<h2>Nuevo mensaje de contacto</h2>` +
        `<p><b>Nombre:</b> ${contacto.nombre}</p>` +
        `<p><b>Correo:</b> ${contacto.correo}</p>` +
        `<p><b>Teléfono:</b> ${contacto.telefono || '(no indicado)'}</p>` +
        `<p><b>Asunto:</b> ${contacto.asunto || '(no indicado)'}</p>` +
        `<p><b>Mensaje:</b><br>${String(contacto.mensaje).replace(/\n/g, '<br>')}</p>`,
    });

    return { enviado: true };
  } catch (error) {
    console.error('[notificaciones] Error enviando correo:', error.message);
    return { enviado: false, motivo: error.message };
  }
}

async function enviarWhatsappNuevoContacto(contacto) {
  const numero = process.env.CONTACTO_WHATSAPP_NUMERO;
  const apikey = process.env.CONTACTO_WHATSAPP_APIKEY;

  if (!numero || !apikey) {
    console.warn(
      '[notificaciones] WhatsApp no enviado: falta CONTACTO_WHATSAPP_NUMERO o CONTACTO_WHATSAPP_APIKEY en el .env'
    );
    return { enviado: false, motivo: 'faltan credenciales de WhatsApp' };
  }

  const texto =
    `Nuevo contacto SEDIR web:\n` +
    `${contacto.nombre} (${contacto.correo})\n` +
    `${contacto.telefono ? 'Tel: ' + contacto.telefono + '\n' : ''}` +
    `Asunto: ${contacto.asunto || '(sin asunto)'}\n` +
    `"${contacto.mensaje.slice(0, 200)}"`;

  const url =
    `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(numero)}` +
    `&text=${encodeURIComponent(texto)}` +
    `&apikey=${encodeURIComponent(apikey)}`;

  try {
    const respuesta = await fetch(url);
    const cuerpo = await respuesta.text();

    if (!respuesta.ok) {
      console.error('[notificaciones] CallMeBot respondió con error:', cuerpo);
      return { enviado: false, motivo: cuerpo };
    }

    return { enviado: true };
  } catch (error) {
    console.error('[notificaciones] Error enviando WhatsApp:', error.message);
    return { enviado: false, motivo: error.message };
  }
}

// Dispara ambos avisos en paralelo, sin que uno bloquee al otro,
// y sin que ninguno de los dos rompa la respuesta al visitante.
async function notificarNuevoContacto(contacto) {
  const [correo, whatsapp] = await Promise.all([
    enviarCorreoNuevoContacto(contacto),
    enviarWhatsappNuevoContacto(contacto),
  ]);

  return { correo, whatsapp };
}

module.exports = {
  notificarNuevoContacto,
};