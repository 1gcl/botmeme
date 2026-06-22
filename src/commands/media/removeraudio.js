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
    name: 'removeraudio',
    description: 'Remove a trilha de áudio de um vídeo deixando-o mudo',
    async execute(message, args) {
        const attachment = message.attachments.find(a => a.contentType?.startsWith('video/'));
        if (!attachment) {
            return message.reply("❌ Anexe um vídeo!").catch(() => {});
        }

        const msg = await message.reply("🔇 Removendo áudio do vídeo...").catch(() => {});
        if (!msg) return;

        const id = Date.now();
        const ext = attachment.name.split('.').pop();
        const inputPath = path.join(os.tmpdir(), `audio_in_${id}.${ext}`);
        const outputPath = path.join(os.tmpdir(), `audio_out_${id}.mp4`);

        try {
            const res = await axios({ url: attachment.url, responseType: 'stream' });
            const writer = fs.createWriteStream(inputPath);
            res.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // FFmpeg: -an (remove audio)
            const ffmpegCommand = `ffmpeg -y -i "${inputPath}" -c:v copy -an "${outputPath}"`;
            const { stderr } = await execAsync(ffmpegCommand);

            if (stderr) console.log("FFmpeg output:", stderr);

            const anexo = new AttachmentBuilder(outputPath, { name: 'removeraudio_rift.mp4' });
            await msg.delete().catch(() => {});
            await message.reply({ files: [anexo], failIfNotExists: false }).catch(() => {});

        } catch (error) {
            console.error("Erro ao remover áudio:", error.stderr || error.message);
            await msg.edit("❌ Erro ao processar o vídeo.").catch(() => {});
        } finally {
            deleteFile(inputPath);
            deleteFile(outputPath);
        }
    }
};
