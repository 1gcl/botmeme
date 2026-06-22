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

        try {
            // Tentativa 1: Cobalt.tools com headers corretos
            let videoUrl;
            try {
                const cobaltResponse = await axios.post(
                    "https://api.cobalt.tools/api/json",
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

                if (cobaltResponse.data?.url) {
                    videoUrl = cobaltResponse.data.url;
                }
            } catch (cobaltErr) {
                console.log("Cobalt falhou, tentando API alternativa...");
            }

            // Tentativa 2: API Alternativa (getme.dev)
            if (!videoUrl) {
                try {
                    const altResponse = await axios.get(
                        `https://yt-api.p.rapidapi.com/dl?url=${encodeURIComponent(url)}`,
                        {
                            headers: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                                "Accept": "application/json"
                            },
                            timeout: 15000
                        }
                    );

                    if (altResponse.data?.url) {
                        videoUrl = altResponse.data.url;
                    }
                } catch (altErr) {
                    console.log("API alternativa também falhou");
                }
            }

            // Tentativa 3: Usar o link diretamente do Instagram (último recurso)
            if (!videoUrl) {
                videoUrl = url;
            }

            if (!videoUrl) {
                return msg.edit("❌ Não foi possível extrair o vídeo. Tente novamente mais tarde.").catch(() => {});
            }

            const id = Date.now();
            const filePath = path.join(os.tmpdir(), `ig_${id}.mp4`);

            // Download do vídeo
            const response = await axios({
                url: videoUrl,
                method: 'GET',
                responseType: 'stream',
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
                timeout: 30000
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const anexo = new AttachmentBuilder(filePath, { name: `instagram_rift_${id}.mp4` });
            await msg.delete().catch(() => {});
            await message.reply({ files: [anexo], failIfNotExists: false }).catch(() => {});
            deleteFile(filePath);

        } catch (error) {
            console.error("Erro ao extrair Instagram:", error.message);
            await msg.delete().catch(() => {});
            return message.channel.send("❌ Erro ao baixar vídeo do Instagram. Link pode estar inválido ou privado.").catch(() => {});
        }
    }
};
