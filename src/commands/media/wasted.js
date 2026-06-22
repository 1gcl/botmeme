const { exec } = require("child_process");
const { promisify } = require("util");
const { AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { deleteFile } = require("../../utils/download");

const execAsync = promisify(exec);

// Caminho local do áudio WASTED (arquivo armazenado no bot)
const WASTED_AUDIO_PATH = path.join(__dirname, '../../..', 'wasted.mp3');

module.exports = {
    name: 'wasted',
    description: 'Aplica efeito GTA V (preto e branco + WASTED + som)',
    async execute(message, args) {
        const attachment = message.attachments.find(a => a.contentType?.startsWith('video/'));
        
        if (!attachment) {
            return message.reply("❌ Anexe um vídeo!").catch(() => {});
        }

        // Verificar se o arquivo de áudio existe
        if (!fs.existsSync(WASTED_AUDIO_PATH)) {
            return message.reply("❌ Arquivo de áudio WASTED não encontrado no servidor. Contate o administrador.").catch(() => {});
        }

        const msg = await message.reply("💀 Aplicando efeito WASTED...").catch(() => {});
        if (!msg) return;

        const id = Date.now();
        const ext = attachment.name.split('.').pop() || 'mp4';
        const inputVideoPath = path.join(os.tmpdir(), `wasted_vid_${id}.${ext}`);
        const outputPath = path.join(os.tmpdir(), `wasted_out_${id}.mp4`);

        try {
            // Download do vídeo do usuário
            const axios = require("axios");
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

            // Comando FFmpeg robusto com filtros melhorados
            // -vn no arquivo de áudio garante que o FFmpeg reconheça só como áudio
            // aformat prepara o áudio para mixagem
            // amix com duration=first mantém o tamanho do vídeo original
            const filterVideo = "hue=s=0,drawtext=text='WASTED':fontcolor=red:fontsize=h/5:x=(w-text_w)/2:y=(h-text_h)/2";
            const filterAudio = "[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a1];[0:a][a1]amix=inputs=2:duration=first";

            const ffmpegCommand = `ffmpeg -y -i "${inputVideoPath}" -i "${WASTED_AUDIO_PATH}" -filter_complex "[0:v]${filterVideo}[vout];${filterAudio}[aout]" -map "[vout]" -map "[aout]" -c:v libx264 -preset ultrafast -threads 2 -c:a aac -q:a 5 "${outputPath}"`;

            console.log("Executando FFmpeg com áudio local...");
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
            await msg.edit("❌ Erro ao processar o vídeo: " + error.message.slice(0, 50)).catch(() => {});
        } finally {
            deleteFile(inputVideoPath);
            deleteFile(outputPath);
        }
    }
};
