const { loadCommands, executeCommand } = require("../handlers/commandHandler");

const PREFIX = "?";
const CANAL_LIMPEZA_ID = "1519825671893811331";

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message, client) {
        if (message.author.bot) return;

        // ==========================================
        // SISTEMA DE AUTO-LIMPEZA DE GIFS/IMAGENS (5 MINUTOS)
        // ==========================================
        if (message.channel.id === CANAL_LIMPEZA_ID) {
            const temAnexo = message.attachments.size > 0;
            const temLink = message.content.includes("http");

            if (temAnexo || temLink) {
                setTimeout(() => {
                    message.delete().catch(() => {});
                }, 5 * 60 * 1000);
            }
        }
        // ==========================================

        if (!message.content.startsWith(PREFIX)) return;

        const args = message.content.slice(PREFIX.length).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();

        if (!command) return;

        // Carregar comandos e executar
        const commands = loadCommands(client);
        await executeCommand(message, command, args, client, commands);
    }
};
