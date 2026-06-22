const { exec } = require("child_process");
const { promisify } = require("util");
const { AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const { deleteFile } = require("../../utils/download");

const execAsync = promisify(exec);

// URL do som do efeito WASTED do GTA V
const WASTED_AUDIO_URL = "https://www.myinstants.com/media/sounds/wasted-gta-v.mp3";

module.exports = {
    name: 'wasted',
    description: 'Aplica efeito GTA V (preto e branco + WASTED + som)',
    async execute(message, args) {
        const attachment = message.attachments.find(a => a.contentType?.startsWith('video/'));
        
        if (!attachment) {
            return message.reply("❌ Anexe um vídeo!").catch(() => {});
        }

        const msg = await message.reply("💀 Aplicando efeito WASTED...").catch(() => {});
        if (!msg) return;

        const id = Date.now();
        const ext = attachment.name.split('.').pop() || 'mp4';
        const inputVideoPath = path.join(os.tmpdir(), `wasted_vid_${id}.${ext}`);
        const audioEffectPath = path.join(os.tmpdir(), `wasted_aud_${id}.mp3`);
        const outputPath = path.join(os.tmpdir(), `wasted_out_${id}.mp4`);

        try {
            // Download do vídeo do usuário
            const videoResponse = await axios({ url: attachment.url, responseType: 'stream' });
            const videoWriter = fs.createWriteStream(inputVideoPath);
            videoResponse.data.pipe(videoWriter);

            await new Promise((resolve, reject) => {
                videoWriter.on('finish', resolve);
                videoWriter.on('error', reject);
            });

            // Download do áudio do efeito WASTED
            const audioResponse = await axios({ url: WASTED_AUDIO_URL, responseType: 'stream', timeout: 15000 });
            const audioWriter = fs.createWriteStream(audioEffectPath);
            audioResponse.data.pipe(audioWriter);

            await new Promise((resolve, reject) => {
                audioWriter.on('finish', resolve);
                audioWriter.on('error', reject);
            });

            // Montar comando FFmpeg com filter_complex
            // Vídeo: preto e branco (hue=s=0) + WASTED em vermelho no centro
            // Áudio: mixar áudio original + áudio do efeito (amix=inputs=2:duration=first)
            const filterVideo = "hue=s=0,drawtext=text='WASTED':fontcolor=red:fontsize=h/5:x=(w-text_w)/2:y=(h-text_h)/2";
            const filterAudio = "[0:a][1:a]amix=inputs=2:duration=first[aout]";

            const ffmpegCommand = `ffmpeg -y -i "${inputVideoPath}" -i "${audioEffectPath}" -filter_complex "[0:v]${filterVideo}[vout];${filterAudio}" -map "[vout]" -map "[aout]" -c:v libx264 -preset ultrafast -threads 2 -c:a aac "${outputPath}"`;

            const { stderr } = await execAsync(ffmpegCommand);
            if (stderr) console.log("FFmpeg output:", stderr);

            // Verificar se o arquivo foi criado
            if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
                await msg.edit("❌ Erro ao processar o vídeo (arquivo vazio).").catch(() => {});
                return;
            }

            const anexo = new AttachmentBuilder(outputPath, { name: `wasted_${id}.mp4` });
            await msg.delete().catch(() => {});
            await message.reply({ files: [anexo], failIfNotExists: false }).catch(() => {});

        } catch (error) {
            console.error("Erro ao aplicar efeito WASTED:", error.stderr || error.message);
            await msg.edit("❌ Erro ao processar o vídeo.").catch(() => {});
        } finally {
            deleteFile(inputVideoPath);
            deleteFile(audioEffectPath);
            deleteFile(outputPath);
        }
    }
};
