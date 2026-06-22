const {
    Client,
    GatewayIntentBits
} = require("discord.js");

const http = require('http');
const { loadEvents } = require('./src/handlers/eventHandler');

// ==========================================
// SERVIDOR HTTP (Discloud - Manter bot online)
// ==========================================
http.createServer((req, res) => {
    res.write("🎥 RIFT Video Bot online!");
    res.end();
}).listen(process.env.PORT || 3000);

// ==========================================
// INICIALIZAÇÃO DO CLIENT DISCORD
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;

// ==========================================
// CARREGADOR DE EVENTOS
// ==========================================
loadEvents(client);

// ==========================================
// LOGIN
// ==========================================
client.login(TOKEN);

console.log("🚀 Bot iniciando...");


