const { AttachmentBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { deleteFile } = require("../../utils/download");

module.exports = {
    name: 'yt',
    description: 'Baixa vídeo do YouTube Shorts ou vídeo normal',
    async execute(message, args) {
        const url = args[0];
        if (!url || !url.includes("youtube.com") && !url.includes("youtu.be")) {
            return message.reply("❌ Link inválido! Use um link do YouTube.").catch(() => {});
        }

        const msg = await message.reply("⏳ Extraindo do YouTube...").catch(() => {});
        if (!msg) return;

        try {
            // Usando API Cobalt.tools para extrair vídeos do YouTube
            const cobaltUrl = "https://api.cobalt.tools/api/json";
            const response = await axios.post(cobaltUrl, {
                url: url,
                vCodec: "h264",
                vQuality: "max",
                aFormat: "best"
            }, {
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (!response.data || !response.data.url) {
                return msg.edit("❌ Não foi possível extrair o vídeo. Pode ser restrito ou inválido.").catch(() => {});
            }

            const fileUrl = response.data.url;
            const fileName = `youtube_rift_${Date.now()}.mp4`;

            // Download do vídeo
            const res = await axios({ url: fileUrl, responseType: 'stream', timeout: 30000 });
            const filePath = path.join(os.tmpdir(), fileName);
            const writer = fs.createWriteStream(filePath);
            res.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const anexo = new AttachmentBuilder(filePath, { name: fileName });
            await msg.delete().catch(() => {});
            await message.reply({ files: [anexo], failIfNotExists: false }).catch(() => {});
            deleteFile(filePath);

        } catch (error) {
            console.error("Erro ao extrair YouTube:", error.message);
            await msg.delete().catch(() => {});
            return message.channel.send("❌ Erro ao baixar vídeo do YouTube. Tente novamente mais tarde.").catch(() => {});
        }
    }
};
