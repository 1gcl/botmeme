const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { deleteFile } = require("../../utils/download");

module.exports = {
    name: 'meme1',
    description: 'Adiciona texto TOONISH em vídeo ou GIF',
    async execute(message, args) {
        // 1. Busca vídeo: anexo direto ou resposta a uma mensagem com anexo
        let attachment = message.attachments.first();
        if (!attachment && message.reference) {
            const repliedMessage = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            if (repliedMessage && repliedMessage.attachments.size > 0) {
                attachment = repliedMessage.attachments.first();
            }
        }

        if (!attachment) {
            return message.reply("❌ Anexe um vídeo/GIF ou responda a uma mensagem que contenha um!").catch(() => {});
        }

        const text = args.join(" ");
        if (!text) {
            return message.reply("❌ Forneça o texto do meme!").catch(() => {});
        }

        // 2. Escapa caracteres que quebram o FFmpeg (importante!)
        const textoTratado = text
            .replace(/\\/g, '\\\\')
            .replace(/:/g, '\\:')
            .replace(/,/g, '\\,')
            .replace(/'/g, "\\'");

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

            const fontPath = path.join(process.cwd(), 'TOONISH.ttf').replace(/\\/g, '/');

            let cmd = ffmpeg(inputPath).videoFilters([
                { filter: 'pad', options: 'iw:ih+100:0:100:white' },
                { 
                    filter: 'drawtext', 
                    options: { 
                        fontfile: fontPath, 
                        text: textoTratado, 
                        fontsize: 50,
                        fontcolor: 'black', 
                        borderw: 0,
                        x: '(w-text_w)/2', 
                        y: '(100-text_h)/2' 
                    } 
                }
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
                    
                    // Apaga o comando original do usuário
                    message.delete().catch(() => {});
                    
                    deleteFile(inputPath);
                    deleteFile(outputPath);
                })
                .on('error', async (err) => {
                    console.error("Erro FFmpeg:", err.message);
                    await msgCarregando.delete().catch(() => {});
                    message.channel.send("❌ Erro ao processar o vídeo.").catch(() => {});
                    deleteFile(inputPath);
                    deleteFile(outputPath);
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
