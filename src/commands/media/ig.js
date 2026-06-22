const { AttachmentBuilder } = require("discord.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { deleteFile } = require("../../utils/download");

module.exports = {
    name: 'ig',
    description: 'Baixa vídeo do Instagram Reels',
    async execute(message, args) {
        const url = args[0];
        if (!url || !url.includes("instagram.com")) {
            return message.reply("❌ Link inválido! Use um link do Instagram.").catch(() => {});
        }

        const msg = await message.reply("⏳ Extraindo do Instagram...").catch(() => {});
        if (!msg) return;

        try {
            // Usando API Cobalt.tools para extrair vídeos do Instagram
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
                return msg.edit("❌ Não foi possível extrair o vídeo. Link pode estar inválido ou privado.").catch(() => {});
            }

            const fileUrl = response.data.url;
            const fileName = `instagram_rift_${Date.now()}.mp4`;
            
            // Download do vídeo
            const res = await axios({ url: fileUrl, responseType: 'stream' });
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
            console.error("Erro ao extrair Instagram:", error.message);
            await msg.delete().catch(() => {});
            return message.channel.send("❌ Erro ao baixar vídeo do Instagram. Tente novamente mais tarde.").catch(() => {});
        }
    }
};
