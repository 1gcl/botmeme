const ffmpeg = require("fluent-ffmpeg");
const { AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const { deleteFile } = require("../../utils/download");

module.exports = {
    name: 'gif',
    description: 'Converte vídeo em GIF de alta qualidade',
    async execute(message, args) {
        const attachment = message.attachments.find(a => a.contentType?.startsWith('video/'));
        
        if (!attachment) {
            return message.reply("❌ Anexe um vídeo (MP4/WEBM/MOV)!").catch(() => {});
        }

        const msg = await message.reply("⏳ Convertendo para GIF (isso pode levar um tempo)...").catch(() => {});
        if (!msg) return;

        const id = Date.now();
        const ext = attachment.name.split('.').pop() || 'mp4';
        const inputPath = path.join(os.tmpdir(), `gif_in_${id}.${ext}`);
        const outputPath = path.join(os.tmpdir(), `gif_out_${id}.gif`);

        try {
            // Download do vídeo
            const response = await axios({ url: attachment.url, responseType: 'stream' });
            const writer = fs.createWriteStream(inputPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Converter para GIF com filtro de paleta avançado
            ffmpeg(inputPath)
                .videoFilters('fps=15,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse')
                .outputOptions(['-loop 0'])
                .output(outputPath)
                .on('end', async () => {
                    const anexo = new AttachmentBuilder(outputPath, { name: `gif_rift_${id}.gif` });
                    await msg.delete().catch(() => {});
                    await message.reply({ files: [anexo], failIfNotExists: false }).catch(() => {});
                    deleteFile(inputPath);
                    deleteFile(outputPath);
                })
                .on('error', async (err) => {
                    console.error("Erro FFmpeg:", err.message);
                    await msg.edit("❌ Erro ao converter para GIF. Vídeo pode ser muito grande ou em formato incompatível.").catch(() => {});
                    deleteFile(inputPath);
                    deleteFile(outputPath);
                })
                .run();

        } catch (error) {
            console.error("Erro:", error.message);
            await msg.edit("❌ Erro ao baixar o vídeo.").catch(() => {});
            deleteFile(inputPath);
            deleteFile(outputPath);
        }
    }
};
