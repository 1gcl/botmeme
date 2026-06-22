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
            return message.reply("❌ Link inválido! Use: `?ig https://instagram.com/reel/...`").catch(() => {});
        }

        const msg = await message.reply("⏳ Extraindo do Instagram...").catch(() => {});
        if (!msg) return;

        const id = Date.now();
        const filePath = path.join(os.tmpdir(), `ig_${id}.mp4`);

        try {
            // Requisição para Cobalt API
            const cobaltResponse = await axios.post(
                "https://co.wuk.sh/api/json",
                { url: url },
                {
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    },
                    timeout: 15000
                }
            );

            if (!cobaltResponse.data?.url) {
                await msg.edit("❌ Não foi possível extrair o vídeo. Link pode estar inválido, privado ou a API está indisponível.").catch(() => {});
                return;
            }

            const videoUrl = cobaltResponse.data.url;

            // Download físico do vídeo para a pasta temp
            const downloadResponse = await axios({
                url: videoUrl,
                method: 'GET',
                responseType: 'stream',
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
                timeout: 30000
            });

            const writer = fs.createWriteStream(filePath);
            downloadResponse.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Verificar se o arquivo foi realmente criado e tem tamanho
            if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
                await msg.edit("❌ O vídeo foi baixado mas o arquivo está vazio. Tente novamente.").catch(() => {});
                deleteFile(filePath);
                return;
            }

            // Enviar como anexo
            const anexo = new AttachmentBuilder(filePath, { name: `instagram_${id}.mp4` });
            await msg.delete().catch(() => {});
            await message.reply({ files: [anexo], failIfNotExists: false }).catch(() => {});

        } catch (error) {
            console.error("Erro ao extrair Instagram:", error.message);
            await msg.delete().catch(() => {});
            return message.channel.send("❌ Erro ao baixar vídeo do Instagram. Tente novamente mais tarde.").catch(() => {});
        } finally {
            deleteFile(filePath);
        }
    }
};
