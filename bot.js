const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');

async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // Leer número del dueño
    const config = require('./config.json');
    const numeroDueno = config.dueno + "@s.whatsapp.net";

    // Escuchar mensajes
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const numero = msg.key.remoteJid;
        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text;

        // Si es el dueño, guardamos instrucción (después implementamos voz)
        if (numero === numeroDueno) {
            console.log("Instrucción del dueño:", texto);
            await sock.sendMessage(numero, { text: "✅ Instrucción recibida jefe" });
            return;
        }

        // Si es cliente, responder automáticamente
        if (texto?.toLowerCase().includes('hola')) {
            await sock.sendMessage(numero, { text: "¡Buenos días! 🌞 Soy el asistente de Comidas Doña Rosa. ¿Qué se le antoja hoy?" });
        }
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            iniciarBot();
        } else if (connection === 'open') {
            console.log('✅ Bot conectado a WhatsApp');
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

iniciarBot();
