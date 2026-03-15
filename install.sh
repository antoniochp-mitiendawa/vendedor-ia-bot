#!/bin/bash

# Colores para la interfaz
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
ROJO='\033[0;31m'
AZUL='\033[0;34m'
RESET='\033[0m'

clear
echo -e "${AZUL}====================================${RESET}"
echo -e "${VERDE}🍳 VENDEDOR IA - INSTALACIÓN AUTOMÁTICA${RESET}"
echo -e "${AZUL}====================================${RESET}"

# Función para verificar e instalar paquetes de sistema
check_pkg() {
    if command -v $1 &> /dev/null; then
        echo -e "${VERDE}✅ $1 ya está instalado.${RESET}"
    else
        echo -e "${AMARILLO}⚠️ Instalando $1...${RESET}"
        pkg install -y $2 [cite: 67, 70, 72]
    fi
}

# 1. Requisitos de Sistema
check_pkg "node" "nodejs"
check_pkg "python" "python"
check_pkg "git" "git"
check_pkg "wget" "wget"
check_pkg "ffmpeg" "ffmpeg"

# 2. Herramientas de compilación para Termux
echo -e "${AMARILLO}Preparando entorno de compilación...${RESET}"
pkg install -y build-essential binutils

# 3. Dependencias de Node.js (Baileys)
echo -e "${AMARILLO}Verificando librerías de WhatsApp...${RESET}"
if [ ! -d "node_modules/@whiskeysockets/baileys" ]; then [cite: 74]
    npm install @whiskeysockets/baileys@6.7.0 @hapi/boom qrcode-terminal pino [cite: 74]
else
    echo -e "${VERDE}✅ Librerías de WhatsApp listas.${RESET}"
fi

# 4. Inteligencia Artificial (Whisper y Gemma)
echo -e "${AMARILLO}Configurando Inteligencia Artificial...${RESET}"
python -c "import whisper" 2>/dev/null
if [ $? -ne 0 ]; then
    pip install openai-whisper [cite: 76]
fi

MODEL_FILE="gemma-3-1b-it-Q4_0.gguf"
if [ ! -f "$MODEL_FILE" ] || [ $(wc -c < "$MODEL_FILE") -lt 500000000 ]; then [cite: 78, 79]
    echo -e "${AMARILLO}Descargando cerebro de la IA (Gemma 3)...${RESET}"
    wget -O $MODEL_FILE https://huggingface.co/google/gemma-3-1b-it-quantized/resolve/main/gemma-3-1b-it-Q4_0.gguf [cite: 81]
else
    echo -e "${VERDE}✅ Cerebro de la IA listo.${RESET}"
fi

# 5. Configuración de Números (Solo si no existe)
if [ ! -f "config.json" ]; then [cite: 86]
    echo -e "${AMARILLO}\n📱 CONFIGURACIÓN INICIAL${RESET}"
    read -p "Número del DUEÑO (ej: 5215512345678): " NUM_D
    read -p "Número del BOT (ej: 5215512345679): " NUM_B
    echo "{\"dueno\":\"$NUM_D\",\"bot\":\"$NUM_B\",\"familiares\":{},\"menu\":{\"desayunos\":[],\"comida\":[]}}" > config.json [cite: 87]
fi

echo -e "${VERDE}\n🚀 INICIANDO EL BOT...${RESET}"
node bot.js
