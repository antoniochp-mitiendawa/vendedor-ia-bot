#!/bin/bash

# Colores para mejor visibilidad
VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
ROJO='\033[0;31m'
AZUL='\033[0;34m'
RESET='\033[0m'

clear
echo -e "${AZUL}====================================${RESET}"
echo -e "${VERDE}🍳 VENDEDOR IA - INSTALACIÓN${RESET}"
echo -e "${AZUL}====================================${RESET}"
echo ""

# Verificar si ya existe configuración
if [ -f "config.json" ]; then
    echo -e "${AMARILLO}📋 Configuración existente detectada${RESET}"
    echo -e "   Usando números guardados"
    echo ""
    sleep 2
else
    echo -e "${AMARILLO}📱 CONFIGURACIÓN INICIAL${RESET}"
    echo ""
    echo "Ingresa el número del DUEÑO (el que dará instrucciones):"
    echo "Ejemplo: 5215512345678"
    read -p "➤ " NUMERO_DUENO
    echo ""
    echo "Ingresa el número del BOT (el que contestará a clientes):"
    echo "Ejemplo: 5215512345679"
    read -p "➤ " NUMERO_BOT
    echo ""
    
    # Guardar configuración
    echo "{\"dueno\":\"$NUMERO_DUENO\",\"bot\":\"$NUMERO_BOT\",\"familiares\":{},\"menu\":{\"desayunos\":[],\"comida\":[]}}" > config.json
    echo -e "${VERDE}✅ Configuración guardada${RESET}"
    echo ""
    sleep 2
fi

# PASO 1: Actualizar Termux
echo -e "${AMARILLO}[1/7] Actualizando Termux...${RESET}"
echo "   ⏳ Puede tomar 1-2 minutos..."
pkg update -y && pkg upgrade -y
if [ $? -eq 0 ]; then
    echo -e "${VERDE}   ✅ Termux actualizado${RESET}"
else
    echo -e "${ROJO}   ❌ Error actualizando Termux${RESET}"
    exit 1
fi
echo ""

# PASO 2: Instalar herramientas básicas
echo -e "${AMARILLO}[2/7] Instalando herramientas necesarias...${RESET}"
pkg install -y nodejs python git wget
if [ $? -eq 0 ]; then
    echo -e "${VERDE}   ✅ Herramientas instaladas${RESET}"
else
    echo -e "${ROJO}   ❌ Error instalando herramientas${RESET}"
    exit 1
fi
echo ""

# PASO 3: Verificar dependencias de Node.js
echo -e "${AMARILLO}[3/7] Verificando dependencias de Node.js...${RESET}"

# Verificar si node_modules existe
if [ -d "node_modules" ]; then
    echo -e "${VERDE}   ✅ node_modules ya existe${RESET}"
    
    # Verificar si Baileys está instalado
    if [ -d "node_modules/@whiskeysockets/baileys" ]; then
        echo -e "${VERDE}   ✅ Baileys ya está instalado${RESET}"
    else
        echo -e "${AMARILLO}   ⚠️ Baileys no encontrado, instalando...${RESET}"
        npm install @whiskeysockets/baileys@6.7.0
    fi
    
    # Verificar qrcode-terminal
    if [ -d "node_modules/qrcode-terminal" ]; then
        echo -e "${VERDE}   ✅ qrcode-terminal ya está instalado${RESET}"
    else
        echo -e "${AMARILLO}   ⚠️ qrcode-terminal no encontrado, instalando...${RESET}"
        npm install qrcode-terminal
    fi
    
    # Verificar @xenova/transformers
    if [ -d "node_modules/@xenova/transformers" ]; then
        echo -e "${VERDE}   ✅ transformers ya está instalado${RESET}"
    else
        echo -e "${AMARILLO}   ⚠️ transformers no encontrado, instalando...${RESET}"
        npm install @xenova/transformers
    fi
else
    echo -e "${AMARILLO}   ⚠️ node_modules no existe, instalando todo...${RESET}"
    npm install @whiskeysockets/baileys@6.7.0 qrcode-terminal @xenova/transformers
fi
echo ""

# PASO 4: Verificar Whisper
echo -e "${AMARILLO}[4/7] Verificando Whisper...${RESET}"

# Verificar si whisper está instalado en Python
pip show openai-whisper > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${VERDE}   ✅ Whisper ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Whisper no encontrado, instalando...${RESET}"
    pip install openai-whisper
    if [ $? -eq 0 ]; then
        echo -e "${VERDE}   ✅ Whisper instalado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando Whisper${RESET}"
        echo -e "${AMARILLO}   ⚠️ Continuando sin Whisper (funciones de voz no disponibles)${RESET}"
    fi
fi
echo ""

# PASO 5: Verificar Gemma 3
echo -e "${AMARILLO}[5/7] Verificando IA Gemma 3...${RESET}"

if [ -f "gemma-3-1b-it-Q4_0.gguf" ]; then
    # Verificar que el archivo no esté corrupto (tamaño mínimo)
    TAMANO=$(wc -c < "gemma-3-1b-it-Q4_0.gguf")
    if [ $TAMANO -gt 500000000 ]; then
        echo -e "${VERDE}   ✅ Modelo Gemma 3 ya existe (${TAMANO} bytes)${RESET}"
    else
        echo -e "${ROJO}   ❌ Modelo corrupto (tamaño: ${TAMANO} bytes), descargando de nuevo...${RESET}"
        rm -f gemma-3-1b-it-Q4_0.gguf
        echo "   ⏳ Descargando modelo (529MB)..."
        wget -O gemma-3-1b-it-Q4_0.gguf --show-progress -q https://huggingface.co/google/gemma-3-1b-it-quantized/resolve/main/gemma-3-1b-it-Q4_0.gguf
        if [ $? -eq 0 ]; then
            echo -e "${VERDE}   ✅ Modelo descargado${RESET}"
        else
            echo -e "${ROJO}   ❌ Error descargando modelo${RESET}"
        fi
    fi
else
    echo -e "${AMARILLO}   ⚠️ Modelo no encontrado, descargando (529MB)...${RESET}"
    wget -O gemma-3-1b-it-Q4_0.gguf --show-progress -q https://huggingface.co/google/gemma-3-1b-it-quantized/resolve/main/gemma-3-1b-it-Q4_0.gguf
    if [ $? -eq 0 ]; then
        echo -e "${VERDE}   ✅ Modelo descargado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error descargando modelo${RESET}"
    fi
fi
echo ""

# PASO 6: Verificar sesión de WhatsApp
echo -e "${AMARILLO}[6/7] Verificando sesión de WhatsApp...${RESET}"

if [ -d "auth_info" ] && [ -f "auth_info/creds.json" ]; then
    echo -e "${VERDE}   ✅ Sesión existente encontrada${RESET}"
    
    # Verificar que el archivo creds.json no esté corrupto
    if [ -s "auth_info/creds.json" ]; then
        echo -e "${VERDE}   ✅ Archivo de credenciales válido${RESET}"
    else
        echo -e "${ROJO}   ❌ Archivo de credenciales corrupto${RESET}"
        echo -e "${AMARILLO}   ⚠️ Eliminando sesión corrupta...${RESET}"
        rm -rf auth_info
    fi
else
    echo -e "${AMARILLO}   ⚠️ No hay sesión guardada (se generará código nuevo)${RESET}"
fi
echo ""

# PASO 7: Verificar que todo esté listo
echo -e "${AMARILLO}[7/7] Verificación final...${RESET}"

TODO_OK=true

# Verificar Node.js
node --version > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${ROJO}   ❌ Node.js no está funcionando${RESET}"
    TODO_OK=false
fi

# Verificar Python
python --version > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${ROJO}   ❌ Python no está funcionando${RESET}"
    TODO_OK=false
fi

# Verificar Baileys
if [ ! -d "node_modules/@whiskeysockets/baileys" ]; then
    echo -e "${ROJO}   ❌ Baileys no está instalado${RESET}"
    TODO_OK=false
fi

if [ "$TODO_OK" = true ]; then
    echo -e "${VERDE}   ✅ Todo listo para iniciar${RESET}"
else
    echo -e "${ROJO}   ❌ Hay problemas que resolver${RESET}"
    echo -e "${AMARILLO}   ⚠️ Revisa los errores arriba${RESET}"
fi
echo ""

# Iniciar bot
echo -e "${AZUL}====================================${RESET}"
echo -e "${VERDE}🚀 INICIANDO BOT...${RESET}"
echo -e "${AZUL}====================================${RESET}"
echo ""
sleep 2

# Ejecutar bot.js
node bot.js
