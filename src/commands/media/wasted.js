const { exec } = require("child_process");
const { promisify } = require("util");
const { AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");

const execAsync = promisify(exec);

// O arquivo está na raiz, então usamos process.cwd() para apontar para a pasta do projeto
const WASTED_AUDIO_PATH = path.join(process.cwd(), 'wasted.mp3');

module.exports = {
    name: 'wasted',
    async execute(message, args) {
        const attachment = message.attachments.find(a => a.contentType?.startsWith('video/'));
        
        if (!attachment) {
            return message.reply("❌ Anexe um vídeo!").catch(() => {});
        }

        if (!fs.existsSync(WASTED_AUDIO_PATH)) {
            return message.reply("❌ Arquivo 'wasted.mp3' não encontrado na raiz do projeto.").catch(() => {});
        }

        const msg = await message.reply("💀 Aplicando efeito WASTED...").catch(() => {});

        const id = Date.now();
        const inputVideoPath = path.join(os.tmpdir(), `wasted_vid_${id}.mp4`);
        const outputPath = path.join(os.tmpdir(), `wasted_out_${id}.mp4`);

        try {
            // Download do vídeo
            const videoResponse = await axios({ url: attachment.url, responseType: 'stream' });
            const videoWriter = fs.createWriteStream(inputVideoPath);
            videoResponse.data.pipe(videoWriter);
            await new Promise((resolve, reject) => { videoWriter.on('finish', resolve); videoWriter.on('error', reject); });

            // Comando FFmpeg - Ajustado para ser mais tolerante com os inputs
            // Usamos -f mp3 para forçar o leitor do áudio e filtro simples
            const ffmpegCommand = `ffmpeg -y -i "${inputVideoPath}" -f mp3 -i "${WASTED_AUDIO_PATH}" -filter_complex "[0:v]hue=s=0,drawtext=text='WASTED':fontcolor=red:fontsize=h/5:x=(w-text_w)/2:y=(h-text_h)/2[vout];[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0[aout]" -map "[vout]" -map "[aout]" -c:v libx264 -preset ultrafast -c:a aac -b:a 128k "${outputPath}"`;

            await execAsync(ffmpegCommand);

            const anexo = new AttachmentBuilder(outputPath, { name: `wasted_${id}.mp4` });
            await message.reply({ files: [anexo], failIfNotExists: false });
            if (msg) await msg.delete().catch(() => {});

        } catch (error) {
            console.error("Erro no WASTED:", error);
            await msg.edit("❌ Erro ao processar o vídeo.").catch(() => {});
        } finally {
            if (fs.existsSync(inputVideoPath)) fs.unlinkSync(inputVideoPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};
