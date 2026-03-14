#!/bin/bash

echo "===================================="
echo "🍳 INSTALADOR DEL VENDEDOR IA - COMIDA MEXICANA"
echo "===================================="
echo ""
echo "Este programa va a instalar todo lo necesario:"
echo "  - Node.js y Baileys (para conectar WhatsApp)"
echo "  - Whisper (para entender tu voz)"
echo "  - Gemma 3 (la inteligencia artificial)"
echo ""
echo "SOLO VAS A TENER QUE RESPONDER 1 PREGUNTA"
echo ""

sleep 3

echo "¿Listo para empezar? (Enter para continuar)"
read

echo ""
echo "📦 PASO 1 DE 7: Actualizando Termux..."
pkg update -y && pkg upgrade -y

echo ""
echo "📦 PASO 2 DE 7: Instalando herramientas básicas..."
pkg install -y nodejs python git ffmpeg wget

echo ""
echo "📦 PASO 3 DE 7: Instalando dependencias de Node.js..."
npm install @whiskeysockets/baileys qrcode-terminal @xenova/transformers

echo ""
echo "📦 PASO 4 DE 7: Instalando Whisper (para entender tu voz)..."
pip install openai-whisper

echo ""
echo "📦 PASO 5 DE 7: Descargando la inteligencia artificial (Gemma 3)..."
wget https://huggingface.co/google/gemma-3-1b-it-quantized/resolve/main/gemma-3-1b-it-Q4_0.gguf

echo ""
echo "===================================="
echo "📱 CONFIGURACIÓN INICIAL"
echo "===================================="
echo ""
echo "Ahora necesito saber: ¿CUÁL ES TU NÚMERO DE WHATSAPP?"
echo "(El que va a dar instrucciones al bot)"
echo ""
echo "Ejemplo: 5215512345678 (52 es México, 1 es LADA, 55 es número)"
echo "Escribe tu número y presiona Enter:"
read NUMERO_DUENO

echo ""
echo "Guardando tu número..."
cat > config.json << EOF
{
  "dueno": "$NUMERO_DUENO",
  "familiares": {},
  "menu": {
    "desayunos": [],
    "comida": []
  }
}
EOF

echo ""
echo "===================================="
echo "🎉 ¡INSTALACIÓN COMPLETADA!"
echo "===================================="
echo ""
echo "Ahora viene la parte más importante:"
echo ""
echo "1. Ejecuta este comando para iniciar el bot:"
echo "   node bot.js"
echo ""
echo "2. El bot te va a mostrar un CÓDIGO de 8 dígitos"
echo ""
echo "3. Abre WhatsApp > Ajustes > Dispositivos vinculados"
echo "   > 'Vincular con número de teléfono'"
echo ""
echo "4. Escribe el código que apareció en Termux"
echo ""
echo "5. ¡LISTO! El bot ya está conectado"
echo ""
echo "A partir de ahora puedes darle instrucciones por voz"
echo "desde tu número: $NUMERO_DUENO"
