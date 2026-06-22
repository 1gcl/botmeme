const fs = require("fs");
const path = require("path");

/**
 * Carrega todos os comandos das pastas src/commands
 * @param {Client} client - Cliente Discord
 * @returns {Map} - Mapa de comandos
 */
function loadCommands(client) {
    const commands = new Map();
    const commandsPath = path.join(__dirname, '..', 'commands');

    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (!fs.statSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);

            if (command.name) {
                commands.set(command.name.toLowerCase(), command);
            }
        }
    }

    return commands;
}

/**
 * Executa um comando
 * @param {Message} message - Mensagem Discord
 * @param {string} commandName - Nome do comando
 * @param {Array} args - Argumentos
 * @param {Client} client - Cliente Discord
 * @param {Map} commands - Mapa de comandos
 */
async function executeCommand(message, commandName, args, client, commands) {
    const command = commands.get(commandName.toLowerCase());

    if (!command) {
        return;
    }

    try {
        await command.execute(message, args, client);
    } catch (error) {
        console.error(`Erro ao executar comando ${commandName}:`, error);
        message.reply("❌ Erro ao executar o comando!").catch(() => {});
    }
}

module.exports = { loadCommands, executeCommand };
