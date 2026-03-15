#!/bin/bash

echo "===================================="
echo "🍳 VENDEDOR IA - INSTALACIÓN AUTOMÁTICA"
echo "===================================="
echo "Esto tomará 5-10 minutos. No cierres Termux."
echo ""

# 1. Actualizar Termux
echo "[1/8] Actualizando Termux..."
pkg update -y && pkg upgrade -y

# 2. Instalar herramientas básicas
echo "[2/8] Instalando Node.js, Python y herramientas..."
pkg install -y nodejs python git ffmpeg wget

# 3. Limpiar caché de npm
echo "[3/8] Limpiando caché de npm..."
npm cache clean --force

# 4. Instalar dependencias de Node.js
echo "[4/8] Instalando Baileys y librerías..."
npm install -g npm@latest
npm install @whiskeysockets/baileys@6.7.0 qrcode-terminal @xenova/transformers --force

# 5. Verificar instalación de Baileys
echo "[5/8] Verificando instalación..."
if [ -d "node_modules/@whiskeysockets/baileys" ]; then
    echo "✅ Baileys instalado correctamente"
else
    echo "⚠️ Reintentando instalación de Baileys..."
    npm install @whiskeysockets/baileys@6.7.0 --force
fi

# 6. Instalar Whisper
echo "[6/8] Instalando Whisper..."
pip install openai-whisper

# 7. Descargar Gemma 3
echo "[7/8] Descargando inteligencia artificial Gemma 3..."
wget -O gemma-3-1b-it-Q4_0.gguf https://huggingface.co/google/gemma-3-1b-it-quantized/resolve/main/gemma-3-1b-it-Q4_0.gguf

# 8. PEDIR LOS DOS NÚMEROS
clear
echo "===================================="
echo "📱 CONFIGURACIÓN DE NÚMEROS"
echo "===================================="
echo ""
echo "Vamos a necesitar DOS números diferentes:"
echo ""
echo "1️⃣  Número del DUEÑO (el que dará instrucciones al bot)"
echo "   Ejemplo: 5215512345678"
echo ""
read -p "➤ Número del DUEÑO: " NUMERO_DUENO
echo ""
echo "2️⃣  Número del BOT (el que va a contestar a los clientes)"
echo "   Ejemplo: 5215512345679"
echo ""
read -p "➤ Número del BOT: " NUMERO_BOT
echo ""

# 9. Guardar configuración
echo "[8/8] Guardando configuración..."
echo '{"dueno":"'$NUMERO_DUENO'","bot":"'$NUMERO_BOT'","familiares":{},"menu":{"desayunos":[],"comida":[]}}' > config.json

# 10. Mensaje final
clear
echo "===================================="
echo "✅ INSTALACIÓN COMPLETADA"
echo "===================================="
echo ""
echo "AHORA SE GENERARÁ EL CÓDIGO DE EMPAREJAMIENTO"
echo "PARA EL NÚMERO DEL BOT: $NUMERO_BOT"
echo ""

# 11. INICIAR BOT Y GENERAR CÓDIGO
echo "Iniciando bot..."
sleep 2

node -e "
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');

async function iniciar() {
  try {
    const config = JSON.parse(fs.readFileSync('./config.json'));
    const numeroBot = config.bot;
    const numeroDueno = config.dueno;
    
    console.log('====================================');
    console.log('📱 CÓDIGO DE EMPAREJAMIENTO');
    console.log('====================================');
    console.log('');
    console.log('Número del BOT: ' + numeroBot);
    console.log('');
    
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['Termux', 'Chrome', '20.0'],
      syncFullHistory: false
    });
    
    // SOLICITAR CÓDIGO DE EMPAREJAMIENTO
    if (!sock.authState.creds.registered) {
      console.log('🔄 Generando código de emparejamiento...');
      console.log('');
      
      const pairingCode = await sock.requestPairingCode(numeroBot);
      const codigoFormateado = pairingCode.match(/.{1,4}/g)?.join('-') || pairingCode;
      
      console.log('⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡');
      console.log('⚡                                      ⚡');
      console.log('⚡   CÓDIGO: ' + codigoFormateado + '   ⚡');
      console.log('⚡                                      ⚡');
      console.log('⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡');
      console.log('');
      console.log('====================================');
      console.log('INSTRUCCIONES:');
      console.log('====================================');
      console.log('1. Abre WhatsApp en tu teléfono');
      console.log('2. Ve a Ajustes > Dispositivos vinculados');
      console.log('3. Toca \"Vincular con número de teléfono\"');
      console.log('4. Cuando te pida el código, ESCRIBE: ' + pairingCode);
      console.log('');
      console.log('⚠️  NO CIERRES ESTA VENTANA');
      console.log('⚠️  El bot está esperando que vincules...');
      console.log('====================================');
    }
    
    // Esperar conexión exitosa
    sock.ev.on('connection.update', (update) => {
      const { connection } = update;
      
      if (connection === 'open') {
        console.log('');
        console.log('====================================');
        console.log('✅ BOT CONECTADO EXITOSAMENTE');
        console.log('====================================');
        console.log('');
        console.log('Dueño: ' + numeroDueno);
        console.log('Bot: ' + numeroBot);
        console.log('');
        console.log('Ya puedes enviar mensajes de voz al bot');
        console.log('desde tu número para darle instrucciones.');
        console.log('====================================');
      }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
  } catch (error) {
    console.log('Error de conexión. Reintentando en 10 segundos...');
    setTimeout(iniciar, 10000);
  }
}

iniciar();
"
