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
    name: 'wasted',
    description: 'Aplica efeito GTA V (preto e branco + WASTED)',
    async execute(message, args) {
        const attachment = message.attachments.find(a => a.contentType?.startsWith('video/'));
        
        if (!attachment) {
            return message.reply("❌ Anexe um vídeo!").catch(() => {});
        }

        const msg = await message.reply("💀 Aplicando efeito WASTED...").catch(() => {});
        if (!msg) return;

        const id = Date.now();
        const ext = attachment.name.split('.').pop() || 'mp4';
        const inputPath = path.join(os.tmpdir(), `wasted_in_${id}.${ext}`);
        const outputPath = path.join(os.tmpdir(), `wasted_out_${id}.mp4`);

        try {
            // Download do vídeo
            const response = await axios({ url: attachment.url, responseType: 'stream' });
            const writer = fs.createWriteStream(inputPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Aplicar efeito: preto e branco + WASTED em vermelho
            // hue=s=0 = desaturar (preto e branco)
            // drawtext = desenhar "WASTED" em vermelho, grande, no centro
            const filterComplex = 'hue=s=0,drawtext=text=\'WASTED\':fontcolor=red:fontsize=h/4:x=(w-text_w)/2:y=(h-text_h)/2:fontfile=Arial';
            
            // Versão alternativa sem fontfile (usa fonte padrão do sistema)
            const filterSimple = 'hue=s=0,drawtext=text=\'WASTED\':fontcolor=red:fontsize=h/4:x=(w-text_w)/2:y=(h-text_h)/2';

            const ffmpegCommand = `ffmpeg -y -i "${inputPath}" -vf "${filterSimple}" -c:v libx264 -preset ultrafast -threads 2 -c:a copy "${outputPath}"`;

            const { stderr } = await execAsync(ffmpegCommand);
            if (stderr) console.log("FFmpeg output:", stderr);

            const anexo = new AttachmentBuilder(outputPath, { name: `wasted_${id}.mp4` });
            await msg.delete().catch(() => {});
            await message.reply({ files: [anexo], failIfNotExists: false }).catch(() => {});

        } catch (error) {
            console.error("Erro ao aplicar efeito WASTED:", error.stderr || error.message);
            await msg.edit("❌ Erro ao processar o vídeo.").catch(() => {});
        } finally {
            deleteFile(inputPath);
            deleteFile(outputPath);
        }
    }
};
