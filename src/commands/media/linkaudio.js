const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const { deleteFile } = require("../../utils/download");

module.exports = {
    name: 'linkaudio',
    description: 'Extrai áudio de uma mensagem',
    async execute(message, args, client) {
        const msgCarregando = await message.reply("⏳ Buscando áudio...").catch(() => {});
        if (!msgCarregando) return;

        let msgAlvo;

        if (message.reference) {
            msgAlvo = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        } else if (args[0]?.includes("discord.com/channels/")) {
            const linkParts = args[0].split("/");
            const msgId = linkParts.pop();
            const chanId = linkParts.pop();
            const canal = await client.channels.fetch(chanId).catch(() => null);
            if (canal) msgAlvo = await canal.messages.fetch(msgId).catch(() => null);
        }

        if (!msgAlvo) {
            return msgCarregando.edit("❌ Não encontrei a mensagem. Responda a uma mensagem de áudio ou envie o link.").catch(() => {});
        }

        const verificarAudio = (a) => a.contentType?.includes("audio") || a.name?.endsWith(".ogg") || a.name?.endsWith(".mp3");

        let anexo = msgAlvo.attachments.find(verificarAudio);

        if (!anexo && msgAlvo.messageSnapshots) {
            for (const snapshot of msgAlvo.messageSnapshots.values()) {
                anexo = snapshot.message?.attachments?.find(verificarAudio);
                if (anexo) break;
            }
        }

        if (!anexo) {
            return msgCarregando.edit("❌ A mensagem não contém áudio.").catch(() => {});
        }

        await msgCarregando.edit("⏳ Baixando e convertendo...").catch(() => {});
        const inputPath = path.join(os.tmpdir(), `in_${Date.now()}.ogg`);
        const outputPath = path.join(os.tmpdir(), `out_${Date.now()}.mp3`);

        try {
            const response = await axios({ url: anexo.url, responseType: 'stream' });
            const writer = fs.createWriteStream(inputPath);
            response.data.pipe(writer);
            await new Promise((resolve) => writer.on('finish', resolve));

            ffmpeg(inputPath).output(outputPath)
                .on('end', async () => {
                    await msgCarregando.delete().catch(() => {});
                    await message.reply({ files: [outputPath], failIfNotExists: false }).catch(() => {});
                    deleteFile(inputPath);
                    deleteFile(outputPath);
                })
                .on('error', () => {
                    msgCarregando.edit("❌ Erro na conversão.").catch(() => {});
                    deleteFile(inputPath);
                    deleteFile(outputPath);
                })
                .run();
        } catch (error) {
            console.error("Erro:", error.message);
            await msgCarregando.edit("❌ Erro ao baixar o áudio.").catch(() => {});
            deleteFile(inputPath);
            deleteFile(outputPath);
        }
    }
};
