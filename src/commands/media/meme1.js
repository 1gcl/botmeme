const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { deleteFile } = require("../../utils/download");

module.exports = {
    name: 'meme1',
    description: 'Adiciona texto Impact em vídeo ou GIF',
    async execute(message, args) {
        const attachment = message.attachments.first();
        if (!attachment) {
            return message.reply("❌ Anexe um vídeo ou GIF!").catch(() => {});
        }

        const text = args.join(" ");
        if (!text) {
            return message.reply("❌ Forneça o texto do meme!").catch(() => {});
        }

        const isGif = attachment.contentType === "image/gif";
        const isVideo = attachment.contentType?.startsWith("video/");

        if (!isGif && !isVideo) {
            return message.reply("⚠️ Este bot lida apenas com vídeos e GIFs.").catch(() => {});
        }

        const msgCarregando = await message.reply("🎥 Processando...").catch(() => {});
        if (!msgCarregando) return;

        const ext = isGif ? "gif" : "mp4";
        const inputPath = path.join(os.tmpdir(), `in_${message.author.id}_${Date.now()}.${ext}`);
        const outputPath = path.join(os.tmpdir(), `out_${message.author.id}_${Date.now()}.${ext}`);

        try {
            const response = await axios({ url: attachment.url, responseType: 'stream' });
            const writer = fs.createWriteStream(inputPath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            const fontPath = path.join(__dirname, '../../impact.ttf').replace(/\\/g, '/');

            let cmd = ffmpeg(inputPath).videoFilters([
                { filter: 'pad', options: 'iw:ih+100:0:100:white' },
                { filter: 'drawtext', options: { fontfile: fontPath, text: text, fontsize: 40, fontcolor: 'black', x: '(w-text_w)/2', y: '(100-text_h)/2' } }
            ]);

            if (isGif) {
                cmd.outputOptions(['-loop 0']);
            } else {
                cmd.outputOptions(['-threads 2', '-preset ultrafast']);
            }

            cmd.output(outputPath)
                .on('end', async () => {
                    await msgCarregando.delete().catch(() => {});
                    await message.reply({ files: [outputPath], failIfNotExists: false }).catch(() => {});
                    deleteFile(inputPath);
                    deleteFile(outputPath);
                })
                .on('error', async (err) => {
                    console.error("Erro FFmpeg:", err.message);
                    await msgCarregando.delete().catch(() => {});
                    message.channel.send("❌ Erro ao processar o vídeo.").catch(() => {});
                })
                .run();
        } catch (error) {
            console.error("Erro:", error.message);
            await msgCarregando.delete().catch(() => {});
            deleteFile(inputPath);
            deleteFile(outputPath);
        }
    }
};
