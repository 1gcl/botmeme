const { exec } = require("child_process");
const { promisify } = require("util");
const { AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const { deleteFile } = require("../../utils/download");

const execAsync = promisify(exec);

// URLs de áudio WASTED (com fallbacks)
const WASTED_AUDIO_URLS = [
    "https://www.soundjay.com/misc/wasted-gta-v-sound.mp3",
    "https://sounds.zediva.com/media/sounds/video-game-sound-effects/gta-wasted-sound.mp3",
    "data:audio/mpeg;base64,SUQzBAAAAAAAI1NUUkUAAAAOAAAARGlzY28gRXJhAAA="
];

/**
 * Tenta baixar áudio de múltiplas fontes
 */
async function downloadWastedAudio(filePath) {
    for (const url of WASTED_AUDIO_URLS) {
        try {
            console.log(`Tentando baixar áudio de: ${url}`);
            const response = await axios({
                url: url,
                method: 'GET',
                responseType: 'stream',
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                },
                timeout: 15000,
                maxRedirects: 5
            });

            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });

            // Verificar se baixou algo
            if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1000) {
                console.log(`✅ Áudio baixado com sucesso de: ${url}`);
                return true;
            }
        } catch (err) {
            console.log(`❌ Falha ao baixar de ${url}:`, err.message);
            deleteFile(filePath);
        }
    }
    return false;
}

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
            const videoResponse = await axios({ 
                url: attachment.url, 
                responseType: 'stream', 
                timeout: 30000,
                maxRedirects: 5
            });
            const videoWriter = fs.createWriteStream(inputVideoPath);
            videoResponse.data.pipe(videoWriter);

            await new Promise((resolve, reject) => {
                videoWriter.on('finish', resolve);
                videoWriter.on('error', reject);
            });

            // Validar vídeo
            if (!fs.existsSync(inputVideoPath) || fs.statSync(inputVideoPath).size === 0) {
                await msg.edit("❌ Erro ao baixar o vídeo.").catch(() => {});
                return;
            }

            // Download do áudio do efeito WASTED (com fallbacks)
            const audioDownloaded = await downloadWastedAudio(audioEffectPath);
            
            if (!audioDownloaded || !fs.existsSync(audioEffectPath) || fs.statSync(audioEffectPath).size === 0) {
                await msg.edit("❌ Erro ao baixar o áudio do efeito. Tente novamente mais tarde.").catch(() => {});
                return;
            }

            // Montar comando FFmpeg com filter_complex
            // Vídeo: preto e branco (hue=s=0) + WASTED em vermelho no centro
            // Áudio: mixar áudio original + áudio do efeito (amix=inputs=2:duration=first)
            const filterVideo = "hue=s=0,drawtext=text='WASTED':fontcolor=red:fontsize=h/5:x=(w-text_w)/2:y=(h-text_h)/2";
            const filterAudio = "[0:a][1:a]amix=inputs=2:duration=first[aout]";

            const ffmpegCommand = `ffmpeg -y -i "${inputVideoPath}" -i "${audioEffectPath}" -filter_complex "[0:v]${filterVideo}[vout];${filterAudio}" -map "[vout]" -map "[aout]" -c:v libx264 -preset ultrafast -threads 2 -c:a aac "${outputPath}"`;

            console.log("Executando FFmpeg...");
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
            console.error("Erro ao aplicar efeito WASTED:", error.message);
            await msg.edit("❌ Erro ao processar o vídeo. Verifique o console para mais detalhes.").catch(() => {});
        } finally {
            deleteFile(inputVideoPath);
            deleteFile(audioEffectPath);
            deleteFile(outputPath);
        }
    }
};
