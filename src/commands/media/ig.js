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
        let url = args[0];
        if (!url || !url.includes("instagram.com")) {
            return message.reply("❌ Link inválido! Use: `?ig https://instagram.com/reel/...`").catch(() => {});
        }

        // Remover parâmetros de query (tudo após o ?)
        url = url.split('?')[0].trim();

        const msg = await message.reply("⏳ Extraindo do Instagram...").catch(() => {});
        if (!msg) return;

        const id = Date.now();
        const filePath = path.join(os.tmpdir(), `ig_${id}.mp4`);

        try {
            let videoUrl = null;

            // Tentativa 1: SnapInsta API (alternativa gratuita e confiável)
            try {
                console.log("Tentativa 1: SnapInsta API");
                const snapResponse = await axios.get(
                    `https://snap-instagram.p.rapidapi.com/api/v1/social?url=${encodeURIComponent(url)}`,
                    {
                        headers: {
                            "X-RapidAPI-Key": process.env.RAPIDAPI_KEY || "demo",
                            "X-RapidAPI-Host": "snap-instagram.p.rapidapi.com",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                        },
                        timeout: 10000
                    }
                );

                if (snapResponse.data?.data?.video) {
                    videoUrl = snapResponse.data.data.video;
                    console.log("✅ SnapInsta funcionou");
                }
            } catch (err1) {
                console.log("❌ SnapInsta falhou:", err1.response?.status || err1.message);
            }

            // Tentativa 2: API Cobalt com referer do Instagram
            if (!videoUrl) {
                try {
                    console.log("Tentativa 2: Cobalt API com referer");
                    const cobaltResponse = await axios.post(
                        "https://api.cobalt.tools/api/json",
                        { url: url },
                        {
                            headers: {
                                "Accept": "application/json",
                                "Content-Type": "application/json",
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                                "referer": "https://www.instagram.com/"
                            },
                            timeout: 10000
                        }
                    );

                    if (cobaltResponse.data?.url) {
                        videoUrl = cobaltResponse.data.url;
                        console.log("✅ Cobalt funcionou");
                    }
                } catch (err2) {
                    console.log("❌ Cobalt falhou:", err2.response?.status || err2.message);
                }
            }

            // Tentativa 3: instavideo.tube API
            if (!videoUrl) {
                try {
                    console.log("Tentativa 3: instavideo.tube API");
                    const instaResponse = await axios.post(
                        "https://instavideo.tube/api/",
                        { url: url },
                        {
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                            },
                            timeout: 10000
                        }
                    );

                    if (instaResponse.data?.url) {
                        videoUrl = instaResponse.data.url;
                        console.log("✅ instavideo.tube funcionou");
                    }
                } catch (err3) {
                    console.log("❌ instavideo.tube falhou:", err3.message);
                }
            }

            if (!videoUrl) {
                await msg.edit("❌ Não foi possível extrair o vídeo. O link pode estar inválido, privado ou as APIs estão indisponíveis. Tente novamente mais tarde.").catch(() => {});
                return;
            }

            // Download físico do vídeo para a pasta temp usando stream
            const downloadResponse = await axios({
                url: videoUrl,
                method: 'GET',
                responseType: 'stream',
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "referer": "https://www.instagram.com/"
                },
                timeout: 30000,
                maxRedirects: 5
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
