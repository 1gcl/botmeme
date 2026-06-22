const { exec } = require("child_process");
const { promisify } = require("util");
const { AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const { deleteFile } = require("../../utils/download");

const execAsync = promisify(exec);

module.exports = {
    name: 'cortar',
    description: 'Recebe tempo de início (00:10) e fim (00:15). Corta vídeo sem re-renderização pesada',
    async execute(message, args) {
        const inicio = args[0];
        const fim = args[1];

        if (!inicio || !fim) {
            return message.reply("❌ Use: `?cortar 00:10 00:15` (Início e Fim)").catch(() => {});
        }

        const attachment = message.attachments.find(a => a.contentType?.startsWith('video/'));
        if (!attachment) {
            return message.reply("❌ Anexe um vídeo!").catch(() => {});
        }

        const msg = await message.reply("⏳ Cortando vídeo (otimizado)...").catch(() => {});
        if (!msg) return;

        const id = Date.now();
        const ext = attachment.name.split('.').pop();
        const inputPath = path.join(os.tmpdir(), `cut_in_${id}.${ext}`);
        const outputPath = path.join(os.tmpdir(), `cut_out_${id}.mp4`);

        try {
            const res = await axios({ url: attachment.url, responseType: 'stream' });
            const writer = fs.createWriteStream(inputPath);
            res.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // FFmpeg: -ss (seek start), -to (end time), -c copy (sem re-renderizar)
            const ffmpegCommand = `ffmpeg -y -ss ${inicio} -to ${fim} -i "${inputPath}" -c copy -shortest "${outputPath}"`;
            const { stderr } = await execAsync(ffmpegCommand);

            if (stderr) console.log("FFmpeg output:", stderr);

            const anexo = new AttachmentBuilder(outputPath, { name: 'cortar_rift.mp4' });
            await msg.delete().catch(() => {});
            await message.reply({ files: [anexo], failIfNotExists: false }).catch(() => {});

        } catch (error) {
            console.error("Erro ao cortar vídeo:", error.stderr || error.message);
            await msg.edit("❌ Erro ao processar. Verifique os tempos (ex: 00:10, 00:15).").catch(() => {});
        } finally {
            deleteFile(inputPath);
            deleteFile(outputPath);
        }
    }
};
