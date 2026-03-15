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
let esperandoCodigo = false;

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
            keepAliveIntervalMs: 30000
        });

        // Manejar eventos de conexión PRIMERO
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                // Ignorar QR, solo usamos pairing code
                return;
            }
            
            if (connection === 'open') {
                console.log('\n====================================');
                console.log('✅ BOT CONECTADO EXITOSAMENTE');
                console.log('====================================\n');
                log('Dueño configurado: ' + config.dueno);
                log('Bot conectado: ' + numeroBot);
                console.log('\n📝 Bot listo para recibir instrucciones\n');
                esperandoCodigo = false;
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output.statusCode : 500;
                
                if (statusCode === DisconnectReason.loggedOut) {
                    log('🚫 Sesión cerrada. Se necesita nuevo código.');
                    try {
                        fs.rmSync('auth_info', { recursive: true, force: true });
                    } catch (e) {}
                    codigoGenerado = false;
                    esperandoCodigo = false;
                    setTimeout(iniciarBot, 3000);
                } else {
                    log('❌ Conexión perdida. Reconectando en 3 segundos...');
                    setTimeout(iniciarBot, 3000);
                }
            }
        });

        // Guardar credenciales
        sock.ev.on('creds.update', saveCreds);

        // Si no hay credenciales y no estamos esperando código
        if (!sock.authState.creds.registered && !codigoGenerado && !esperandoCodigo) {
            console.log('\n====================================');
            console.log('📱 CONFIGURACIÓN INICIAL DEL BOT');
            console.log('====================================\n');
            
            log(`Preparando código para: ${numeroBot}`);
            esperandoCodigo = true;
            
            // Esperar 2 segundos y generar código
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
                    console.log('1. Abre WhatsApp en tu teléfono AHORA');
                    console.log('2. Ve a Ajustes > Dispositivos vinculados');
                    console.log('3. Toca "Vincular con número de teléfono"');
                    console.log('4. ESCRIBE: ' + codigoFormateado);
                    console.log('');
                    console.log('⏳ El bot ESPERARÁ 60 segundos a que vincules');
                    console.log('⚠️  NO CIERRES ESTA VENTANA');
                    console.log('====================================\n');
                    
                    log('Código generado: ' + codigoFormateado);
                    
                    // ESPERAR 60 SEGUNDOS antes de reintentar
                    setTimeout(() => {
                        if (!sock.authState.creds.registered) {
                            log('⏰ Tiempo de espera agotado. Reintentando...');
                            codigoGenerado = false;
                            esperandoCodigo = false;
                        }
                    }, 60000);
                    
                } catch (error) {
                    log('❌ Error generando código: ' + error.message);
                    log('Reintentando en 5 segundos...');
                    esperandoCodigo = false;
                    setTimeout(iniciarBot, 5000);
                }
            }, 2000);
        }

        // Escuchar mensajes (igual que antes)
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message || msg.key.fromMe || msg.key.remoteJid === 'status@broadcast') return;

            const numero = msg.key.remoteJid;
            if (numero.includes('@g.us')) return;

            const texto = msg.message.conversation || '';
            const numeroLimpio = numero.split('@')[0];

            // Verificar familiares
            if (config.familiares && config.familiares[numeroLimpio]) {
                const palabrasClave = ['menu', 'desayuno', 'comida', 'que hay', 'precios'];
                const contienePalabraClave = palabrasClave.some(p => texto.toLowerCase().includes(p));
                if (!contienePalabraClave) return;
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
                const delay = Math.floor(Math.random() * 4000) + 1000;
                setTimeout(async () => {
                    let respuesta = '';
                    if (texto.toLowerCase().includes('hola') || texto.toLowerCase().includes('buenos')) {
                        respuesta = '¡Buenos días! 🌞 Soy el asistente.\n\n' +
                                  '🍳 *Desayunos:* Huevos divorciados 🌶️, Chilaquiles 🫑\n' +
                                  '☕ *Incluyen:* fruta, jugo y café\n\n' +
                                  '¿Qué se le antoja? 😋';
                    } else {
                        respuesta = '¿En qué puedo ayudarte? Puedes preguntar por el menú.';
                    }
                    await sock.sendMessage(numero, { text: respuesta });
                }, delay);
            }
        });

    } catch (error) {
        log('❌ Error fatal: ' + error.message);
        setTimeout(iniciarBot, 5000);
    }
}

process.on('SIGINT', () => {
    console.log('\n\n👋 Cerrando bot...');
    if (sock) sock.end();
    process.exit(0);
});

console.log('\n🤖 VENDEDOR IA PARA WHATSAPP');
console.log('====================================');
iniciarBot();
