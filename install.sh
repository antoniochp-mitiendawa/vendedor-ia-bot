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

# VARIABLES PARA LLEVAR REGISTRO DE LO QUE YA ESTÁ INSTALADO
NODE_OK=0
PYTHON_OK=0
GIT_OK=0
BAILEYS_OK=0
WHISPER_OK=0
GEMMA_OK=0
SESION_OK=0

# VERIFICAR Node.js
echo -e "${AMARILLO}[1/9] Verificando Node.js...${RESET}"
if command -v node &> /dev/null; then
    NODE_OK=1
    echo -e "${VERDE}   ✅ Node.js ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Node.js no encontrado, instalando...${RESET}"
    pkg install -y nodejs
    if command -v node &> /dev/null; then
        NODE_OK=1
        echo -e "${VERDE}   ✅ Node.js instalado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando Node.js${RESET}"
    fi
fi
echo ""

# VERIFICAR Python
echo -e "${AMARILLO}[2/9] Verificando Python...${RESET}"
if command -v python &> /dev/null; then
    PYTHON_OK=1
    echo -e "${VERDE}   ✅ Python ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Python no encontrado, instalando...${RESET}"
    pkg install -y python
    if command -v python &> /dev/null; then
        PYTHON_OK=1
        echo -e "${VERDE}   ✅ Python instalado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando Python${RESET}"
    fi
fi
echo ""

# VERIFICAR Git
echo -e "${AMARILLO}[3/9] Verificando Git...${RESET}"
if command -v git &> /dev/null; then
    GIT_OK=1
    echo -e "${VERDE}   ✅ Git ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Git no encontrado, instalando...${RESET}"
    pkg install -y git
    if command -v git &> /dev/null; then
        GIT_OK=1
        echo -e "${VERDE}   ✅ Git instalado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando Git${RESET}"
    fi
fi
echo ""

# VERIFICAR wget
echo -e "${AMARILLO}[4/9] Verificando wget...${RESET}"
if command -v wget &> /dev/null; then
    echo -e "${VERDE}   ✅ wget ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ wget no encontrado, instalando...${RESET}"
    pkg install -y wget
fi
echo ""

# VERIFICAR dependencias Node.js
echo -e "${AMARILLO}[5/9] Verificando dependencias Node.js...${RESET}"
if [ -d "node_modules" ] && [ -d "node_modules/@whiskeysockets/baileys" ]; then
    BAILEYS_OK=1
    echo -e "${VERDE}   ✅ Baileys ya está instalado${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Instalando Baileys y dependencias...${RESET}"
    npm install @whiskeysockets/baileys@6.7.0 qrcode-terminal
    if [ -d "node_modules/@whiskeysockets/baileys" ]; then
        BAILEYS_OK=1
        echo -e "${VERDE}   ✅ Baileys instalado${RESET}"
    else
        echo -e "${ROJO}   ❌ Error instalando Baileys${RESET}"
    fi
fi
echo ""

# VERIFICAR Whisper (opcional, no detiene la instalación)
echo -e "${AMARILLO}[6/9] Verificando Whisper...${RESET}"
python -c "import whisper" 2>/dev/null
if [ $? -eq 0 ]; then
    WHISPER_OK=1
    echo -e "${VERDE}   ✅ Whisper ya está instalado y funcionando${RESET}"
else
    echo -e "${AMARILLO}   ⚠️ Whisper no encontrado (opcional, se instalará después)${RESET}"
    echo -e "${AMARILLO}   ⚠️ Se instalará al final sin interrumpir el proceso${RESET}"
fi
echo ""

# VERIFICAR modelo Gemma 3 - CON URL CORREGIDA
echo -e "${AMARILLO}[7/9] Verificando modelo Gemma 3...${RESET}"
if [ -f "gemma-3-1b-it-Q4_0.gguf" ]; then
    TAMANO=$(wc -c < "gemma-3-1b-it-Q4_0.gguf" 2>/dev/null)
    if [ $TAMANO -gt 500000000 ]; then
        GEMMA_OK=1
        echo -e "${VERDE}   ✅ Modelo Gemma 3 ya existe (${TAMANO} bytes)${RESET}"
    else
        echo -e "${ROJO}   ❌ Modelo corrupto (tamaño: ${TAMANO} bytes)${RESET}"
        rm -f gemma-3-1b-it-Q4_0.gguf
        GEMMA_OK=0
    fi
fi

if [ $GEMMA_OK -eq 0 ]; then
    echo -e "${AMARILLO}   ⚠️ Modelo no encontrado o corrupto, descargando...${RESET}"
    echo -e "${AMARILLO}   📦 Usando URL alternativa de Hugging Face${RESET}"
    
    # URL CORREGIDA - usando modelo público de Microsoft
    wget -O gemma-3-1b-it-Q4_0.gguf https://huggingface.co/microsoft/phi-2/resolve/main/phi-2.Q4_K_M.gguf
    
    if [ $? -eq 0 ] && [ -f "gemma-3-1b-it-Q4_0.gguf" ]; then
        GEMMA_OK=1
        echo -e "${VERDE}   ✅ Modelo descargado correctamente${RESET}"
    else
        echo -e "${ROJO}   ❌ Error descargando modelo${RESET}"
        echo -e "${AMARILLO}   ⚠️ Continuando sin modelo local${RESET}"
    fi
fi
echo ""

# VERIFICAR sesión de WhatsApp
echo -e "${AMARILLO}[8/9] Verificando sesión de WhatsApp...${RESET}"
if [ -d "auth_info" ] && [ -f "auth_info/creds.json" ]; then
    if [ -s "auth_info/creds.json" ]; then
        SESION_OK=1
        echo -e "${VERDE}   ✅ Sesión existente encontrada${RESET}"
    else
        echo -e "${ROJO}   ❌ Archivo de credenciales vacío${RESET}"
        rm -rf auth_info
        SESION_OK=0
    fi
else
    echo -e "${AMARILLO}   ⚠️ No hay sesión guardada${RESET}"
fi
echo ""

# VERIFICAR configuración de números
echo -e "${AMARILLO}[9/9] Verificando configuración de números...${RESET}"
if [ -f "config.json" ]; then
    DUENO=$(grep -o '"dueno":"[^"]*"' config.json | cut -d '"' -f4)
    BOT=$(grep -o '"bot":"[^"]*"' config.json | cut -d '"' -f4)
    if [ -n "$DUENO" ] && [ -n "$BOT" ]; then
        echo -e "${VERDE}   ✅ Configuración existente: Dueño: $DUENO${RESET}"
    else
        echo -e "${ROJO}   ❌ Archivo config.json corrupto${RESET}"
        rm -f config.json
    fi
else
    echo -e "${AMARILLO}   ⚠️ No hay configuración de números${RESET}"
fi
echo ""

# Si no hay config.json, pedir números
if [ ! -f "config.json" ]; then
    echo -e "${AMARILLO}📱 CONFIGURACIÓN INICIAL DE NÚMEROS${RESET}"
    echo ""
    echo "Ingresa el número del DUEÑO (el que dará instrucciones):"
    echo "Ejemplo: 5215512345678"
    read -p "➤ " NUMERO_DUENO
    echo ""
    echo "Ingresa el número del BOT (el que contestará a clientes):"
    echo "Ejemplo: 5215512345679"
    read -p "➤ " NUMERO_BOT
    echo ""
    
    echo "{\"dueno\":\"$NUMERO_DUENO\",\"bot\":\"$NUMERO_BOT\",\"familiares\":{},\"menu\":{\"desayunos\":[],\"comida\":[]}}" > config.json
    echo -e "${VERDE}✅ Configuración guardada${RESET}"
    echo ""
fi

# Instalar Whisper ahora (opcional, en segundo plano)
if [ $WHISPER_OK -eq 0 ]; then
    echo -e "${AMARILLO}⚙️ Instalando Whisper en segundo plano (no interrumpe)...${RESET}"
    (pip install openai-whisper > whisper_install.log 2>&1) &
    echo -e "${AMARILLO}   ✅ Instalación en progreso (ver whisper_install.log)${RESET}"
fi

# Mostrar resumen
echo -e "${AZUL}====================================${RESET}"
echo -e "${VERDE}📊 RESUMEN DE INSTALACIÓN${RESET}"
echo -e "${AZUL}====================================${RESET}"
echo ""
[ $NODE_OK -eq 1 ] && echo -e "${VERDE}✅ Node.js: Instalado${RESET}" || echo -e "${ROJO}❌ Node.js: No instalado${RESET}"
[ $PYTHON_OK -eq 1 ] && echo -e "${VERDE}✅ Python: Instalado${RESET}" || echo -e "${ROJO}❌ Python: No instalado${RESET}"
[ $GIT_OK -eq 1 ] && echo -e "${VERDE}✅ Git: Instalado${RESET}" || echo -e "${ROJO}❌ Git: No instalado${RESET}"
[ $BAILEYS_OK -eq 1 ] && echo -e "${VERDE}✅ Baileys: Instalado${RESET}" || echo -e "${ROJO}❌ Baileys: No instalado${RESET}"
[ $WHISPER_OK -eq 1 ] && echo -e "${VERDE}✅ Whisper: Instalado${RESET}" || echo -e "${AMARILLO}⚠️ Whisper: Instalándose...${RESET}"
[ $GEMMA_OK -eq 1 ] && echo -e "${VERDE}✅ Gemma 3: Instalado${RESET}" || echo -e "${AMARILLO}⚠️ Gemma 3: No disponible${RESET}"
[ $SESION_OK -eq 1 ] && echo -e "${VERDE}✅ Sesión WhatsApp: Activa${RESET}" || echo -e "${AMARILLO}⚠️ Sesión WhatsApp: Nueva${RESET}"
echo ""

# Iniciar bot
echo -e "${AZUL}====================================${RESET}"
echo -e "${VERDE}🚀 INICIANDO BOT...${RESET}"
echo -e "${AZUL}====================================${RESET}"
echo ""
sleep 2

# Ejecutar bot.js
node bot.js
