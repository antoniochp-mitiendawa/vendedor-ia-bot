const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

// Cargar configuración
let config = { dueno: "", bot: "", familiares: {}, menu: { desayunos: [], comida: [] } };
try {
    config = JSON.parse(fs.readFileSync('./config.json'));
    console.log(`📱 Configuración cargada:`);
    console.log(`   Dueño: ${config.dueno}`);
    console.log(`   Bot: ${config.bot}`);
} catch (error) {
    console.log('❌ Error: No se pudo cargar config.json');
    process.exit(1);
}

const numeroDueno = config.dueno + '@s.whatsapp.net';
const numeroBot = config.bot;

let sock = null;
let codigoGenerado = false;
let reconectando = false;

// Variables para Vosk
let voskDisponible = false;
let voskModel = null;

// Intentar cargar Vosk
try {
    const vosk = require('vosk');
    const MODEL_PATH = './vosk-model-small-es-0.42';
    
    if (fs.existsSync(MODEL_PATH)) {
        vosk.setLogLevel(-1);
        voskModel = new vosk.Model(MODEL_PATH);
        voskDisponible = true;
        console.log('🎤 Vosk: Modelo de voz cargado correctamente');
    }
} catch (error) {
    console.log('🎤 Vosk: No disponible');
}

function log(mensaje) {
    const fecha = new Date().toLocaleTimeString();
    console.log(`[${fecha}] ${mensaje}`);
}

function formatearCodigo(codigo) {
    if (!codigo) return '';
    return codigo.match(/.{1,4}/g)?.join('-') || codigo;
}

async function iniciarBot() {
    try {
        log('Iniciando conexión con WhatsApp...');
        
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Termux', 'Chrome', '20.0'],
            syncFullHistory: false,
            markOnlineOnConnect: true,
            keepAliveIntervalMs: 60000
        });

        if (!sock.authState.creds.registered && !codigoGenerado && !reconectando) {
            console.log('\n====================================');
            console.log('📱 CONFIGURACIÓN INICIAL DEL BOT');
            console.log('====================================\n');
            
            log(`Preparando código para: ${numeroBot}`);
            
            setTimeout(async () => {
                try {
                    log('Solicitando código de emparejamiento...');
                    const codigo = await sock.requestPairingCode(numeroBot);
                    const codigoFormateado = formatearCodigo(codigo);
                    
                    codigoGenerado = true;
                    
                    console.log('\n====================================');
                    console.log('🔐 CÓDIGO DE EMPAREJAMIENTO');
                    console.log('====================================');
                    console.log('');
                    console.log('⚡⚡⚡ ' + codigoFormateado + ' ⚡⚡⚡');
                    console.log('');
                    console.log('====================================');
                    console.log('INSTRUCCIONES:');
                    console.log('====================================');
                    console.log('1. Abre WhatsApp en tu teléfono');
                    console.log('2. Ve a Ajustes > Dispositivos vinculados');
                    console.log('3. Toca "Vincular con número de teléfono"');
                    console.log('4. ESCRIBE EL CÓDIGO: ' + codigoFormateado);
                    console.log('');
                    console.log('⏳ El bot está esperando que vincules...');
                    console.log('⚠️  NO CIERRES ESTA VENTANA');
                    console.log('====================================\n');
                    
                } catch (error) {
                    log('❌ Error generando código: ' + error.message);
                    setTimeout(iniciarBot, 5000);
                }
            }, 2000);
        }

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                reconectando = false;
                console.log('\n====================================');
                console.log('✅ BOT CONECTADO EXITOSAMENTE');
                console.log('====================================\n');
                log('Dueño: ' + config.dueno);
                log('Bot: ' + numeroBot);
                if (voskDisponible) console.log('🎤 Vosk: ACTIVADO');
                console.log('');
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output.statusCode : 500;
                if (statusCode !== DisconnectReason.loggedOut) {
                    reconectando = true;
                    log('❌ Conexión perdida. Reconectando...');
                    setTimeout(iniciarBot, 5000);
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            
            if (!msg.message || msg.key.fromMe) return;
            
            const numero = msg.key.remoteJid;
            if (numero.includes('@g.us')) return;
            
            const texto = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || '';
            const numeroLimpio = numero.split('@')[0];
            
            // Familiares
            if (config.familiares && config.familiares[numeroLimpio]) {
                const palabrasClave = ['menu', 'desayuno', 'comida'];
                if (!palabrasClave.some(p => texto.toLowerCase().includes(p))) {
                    return;
                }
            }
            
            // Dueño
            if (numeroLimpio === config.dueno) {
                log('📝 Dueño: ' + texto);
                await sock.sendPresenceUpdate('composing', numero);
                setTimeout(async () => {
                    await sock.sendMessage(numero, { text: '✅ Recibido' });
                }, 2000);
            }
            // Cliente
            else {
                log('💬 Cliente: ' + texto);
                await sock.sendPresenceUpdate('composing', numero);
                
                setTimeout(async () => {
                    let respuesta = '';
                    if (texto.toLowerCase().includes('hola')) {
                        respuesta = '¡Buenos días! 🌞 Soy el asistente.\n\n' +
                                  '🍳 *Desayunos:* Huevos divorciados 🌶️, Chilaquiles 🫑\n' +
                                  '☕ *Incluyen:* fruta, jugo y café\n\n' +
                                  '¿Qué se le antoja? 😋';
                    } else {
                        respuesta = '¿En qué puedo ayudarte?';
                    }
                    await sock.sendMessage(numero, { text: respuesta });
                }, 2000);
            }
        });

    } catch (error) {
        log('❌ Error: ' + error.message);
        setTimeout(iniciarBot, 5000);
    }
}

process.on('SIGINT', () => {
    console.log('\n👋 Cerrando...');
    process.exit(0);
});

console.log('\n🤖 VENDEDOR IA\n');
iniciarBot();
