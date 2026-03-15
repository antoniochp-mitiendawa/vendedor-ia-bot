const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// Cargar configuración
const config = JSON.parse(fs.readFileSync('./config.json'));
const numeroDueno = config.dueno + '@s.whatsapp.net';
const numeroBot = config.bot;

// Variables globales
let sock = null;

// Función para guardar log
function log(mensaje) {
    const fecha = new Date().toLocaleString();
    console.log(`[${fecha}] ${mensaje}`);
}

// Función para iniciar el bot
async function iniciarBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info');
        
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Termux', 'Chrome', '20.0'],
            syncFullHistory: false
        });

        // Verificar si ya está registrado
        if (!sock.authState.creds.registered) {
            console.log('\n====================================');
            console.log('📱 PRIMERA CONFIGURACIÓN DEL BOT');
            console.log('====================================\n');
            
            console.log(`🔄 Solicitando código para el número: ${numeroBot}\n`);
            
            // Esperar un momento y solicitar código
            setTimeout(async () => {
                try {
                    const codigo = await sock.requestPairingCode(numeroBot);
                    
                    // Formatear código (cada 4 dígitos)
                    const codigoFormateado = codigo.match(/.{1,4}/g)?.join('-') || codigo;
                    
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
                    console.log('4. ESCRIBE EL CÓDIGO DE ARRIBA');
                    console.log('');
                    console.log('⚠️  NO CIERRES ESTA VENTANA');
                    console.log('⚠️  El bot está esperando que vincules...');
                    console.log('====================================\n');
                    
                } catch (error) {
                    console.log('\n❌ Error al generar código:', error.message);
                    console.log('Reiniciando en 10 segundos...\n');
                    setTimeout(iniciarBot, 10000);
                }
            }, 2000);
        }

        // Manejar eventos de conexión
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'open') {
                console.log('\n====================================');
                console.log('✅ BOT CONECTADO EXITOSAMENTE');
                console.log('====================================\n');
                console.log('Dueño configurado: ' + config.dueno);
                console.log('Bot conectado con: ' + numeroBot);
                console.log('\nYa puedes enviar mensajes de voz desde tu número');
                console.log('para darle instrucciones al bot.\n');
            }
            
            if (connection === 'close') {
                console.log('\n❌ Conexión cerrada. Reconectando en 5 segundos...\n');
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
            const texto = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || '';

            // Si es el dueño, procesar instrucción
            if (numero === numeroDueno) {
                console.log('📝 Instrucción del dueño:', texto);
                await sock.sendMessage(numero, { 
                    text: '✅ Instrucción recibida. Pronto podrás dar instrucciones por voz.' 
                });
                return;
            }

            // Si es cliente, responder con menú básico
            if (texto.toLowerCase().includes('hola') || 
                texto.toLowerCase().includes('menu') ||
                texto.toLowerCase().includes('desayuno')) {
                
                await sock.sendMessage(numero, { 
                    text: '¡Buenos días! 🌞 Soy el asistente de Comidas Doña Rosa.\n\n' +
                          'Hoy tenemos:\n' +
                          '🍳 *Desayunos*: Huevos divorciados, chilaquiles\n' +
                          '☕ *Incluyen*: Fruta, jugo y café\n\n' +
                          '¿Qué se le antoja? 😋'
                });
            }
        });

    } catch (error) {
        console.log('❌ Error fatal:', error.message);
        console.log('Reiniciando en 10 segundos...');
        setTimeout(iniciarBot, 10000);
    }
}

// Manejar cierre del programa
process.on('SIGINT', () => {
    console.log('\n\n👋 Cerrando bot...');
    process.exit(0);
});

// Iniciar el bot
console.log('\n====================================');
console.log('🤖 BOT VENDEDOR IA INICIANDO');
console.log('====================================\n');

iniciarBot();
