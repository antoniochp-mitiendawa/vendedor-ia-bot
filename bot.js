const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');

// Cargar configuración
let config = { dueno: "", bot: "" };
try {
    config = JSON.parse(fs.readFileSync('./config.json'));
} catch (e) {
    console.log('❌ Error: No se encontró config.json');
    process.exit(1);
}

const numeroDueno = config.dueno + '@s.whatsapp.net';
const numeroBot = config.bot;
let codigoMostrado = false;

function log(mensaje) {
    const fecha = new Date().toLocaleTimeString();
    console.log(`[${fecha}] ${mensaje}`);
}

async function iniciarBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Termux', 'Chrome', '20.0'],
            syncFullHistory: false
        });

        // Si no hay sesión, generar código
        if (!sock.authState.creds.registered && !codigoMostrado) {
            console.log('\n====================================');
            console.log('📱 CONFIGURACIÓN INICIAL');
            console.log('====================================\n');
            log(`Generando código para: ${numeroBot}`);
            
            setTimeout(async () => {
                try {
                    const codigo = await sock.requestPairingCode(numeroBot);
                    const codigoFormateado = codigo.match(/.{1,4}/g)?.join('-') || codigo;
                    
                    codigoMostrado = true;
                    
                    console.log('\n====================================');
                    console.log('🔐 CÓDIGO: ' + codigoFormateado);
                    console.log('====================================');
                    console.log('1. Abre WhatsApp > Ajustes > Dispositivos vinculados');
                    console.log('2. Toca "Vincular con número de teléfono"');
                    console.log('3. Ingresa el código: ' + codigoFormateado);
                    console.log('====================================\n');
                    
                } catch (error) {
                    log('Error: ' + error.message);
                    setTimeout(iniciarBot, 5000);
                }
            }, 2000);
        }

        // Eventos de conexión
        sock.ev.on('connection.update', (update) => {
            const { connection } = update;
            
            if (connection === 'open') {
                console.log('\n✅ BOT CONECTADO');
                console.log('Dueño: ' + config.dueno);
                console.log('Bot: ' + numeroBot + '\n');
            }
            
            if (connection === 'close') {
                log('Conexión cerrada. Reconectando...');
                setTimeout(iniciarBot, 5000);
            }
        });

        // Guardar credenciales
        sock.ev.on('creds.update', saveCreds);

        // Escuchar mensajes
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const numero = msg.key.remoteJid;
            if (numero.includes('@g.us')) return;

            const texto = msg.message.conversation || '';
            const numeroLimpio = numero.split('@')[0];

            // Si es el dueño
            if (numeroLimpio === config.dueno) {
                log('Dueño: ' + texto);
                await sock.sendMessage(numero, { text: '✅ Recibido' });
            }
            // Si es cliente
            else {
                log('Cliente ' + numeroLimpio + ': ' + texto);
                if (texto.toLowerCase().includes('hola')) {
                    await sock.sendMessage(numero, { 
                        text: '¡Hola! 🌞 Soy el asistente.\n\nDesayunos: Huevos, chilaquiles\nIncluyen: fruta, jugo, café\n¿Qué se le antoja?'
                    });
                }
            }
        });

    } catch (error) {
        log('Error: ' + error.message);
        setTimeout(iniciarBot, 5000);
    }
}

process.on('SIGINT', () => {
    console.log('\n👋 Cerrando...');
    process.exit(0);
});

console.log('\n🤖 VENDEDOR IA\n');
iniciarBot();
