const { exec } = require("child_process");
const { promisify } = require("util");
const { AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");

const execAsync = promisify(exec);

const WASTED_AUDIO_PATH = path.join(process.cwd(), 'wasted.mp3');
// Define o caminho da fonte de forma absoluta para o FFmpeg no Linux
const FONT_PATH = path.join(process.cwd(), 'impact.ttf').replace(/\\/g, '/');

module.exports = {
    name: 'wasted',
    description: 'Aplica efeito GTA V (preto e branco + WASTED + som)',
    async execute(message, args) {
        const attachment = message.attachments.find(a => a.contentType?.startsWith('video/'));
        
        if (!attachment) {
            return message.reply("❌ Anexe um vídeo!").catch(() => {});
        }

        if (!fs.existsSync(WASTED_AUDIO_PATH)) {
            return message.reply("❌ Arquivo 'wasted.mp3' não encontrado na raiz.").catch(() => {});
        }

        const msg = await message.reply("💀 Aplicando efeito WASTED...").catch(() => {});

        const id = Date.now();
        const inputVideoPath = path.join(os.tmpdir(), `wasted_vid_${id}.mp4`);
        const cleanAudioPath = path.join(os.tmpdir(), `clean_wasted_${id}.mp3`);
        const outputPath = path.join(os.tmpdir(), `wasted_out_${id}.mp4`);

        try {
            // 1. Download do vídeo
            const videoResponse = await axios({ url: attachment.url, responseType: 'stream' });
            const videoWriter = fs.createWriteStream(inputVideoPath);
            videoResponse.data.pipe(videoWriter);
            await new Promise((resolve, reject) => { videoWriter.on('finish', resolve); videoWriter.on('error', reject); });

            // 2. Limpar o áudio (prepara o mp3)
            await execAsync(`ffmpeg -y -i "${WASTED_AUDIO_PATH}" -map 0:a -c:a libmp3lame -q:a 2 "${cleanAudioPath}"`);

            // 3. Comando FFmpeg otimizado
            // -crf 28 e -maxrate 2M controlam o tamanho do arquivo (evita erro 413)
            // fontfile usa a fonte impact.ttf que está na sua raiz
            // borderw=2 e bordercolor=black criam a borda grossa (peso visual)
            const filterVideo = `hue=s=0,drawtext=fontfile='${FONT_PATH}':text='WASTED':fontcolor=red:borderw=3:bordercolor=white:fontsize=h/5:x=(w-text_w)/2:y=(h-text_h)/2`;
            const ffmpegCommand = `ffmpeg -y -i "${inputVideoPath}" -i "${cleanAudioPath}" -filter_complex "[0:v]${filterVideo}[vout];[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0[aout]" -map "[vout]" -map "[aout]" -c:v libx264 -preset ultrafast -crf 28 -maxrate 2M -bufsize 4M -c:a aac -b:a 128k "${outputPath}"`;

            await execAsync(ffmpegCommand);

            // 4. Envio
            const anexo = new AttachmentBuilder(outputPath, { name: `wasted_${id}.mp4` });
            await message.reply({ files: [anexo], failIfNotExists: false });
            if (msg) await msg.delete().catch(() => {});

        } catch (error) {
            console.error("Erro no WASTED:", error);
            await msg.edit("❌ Erro ao processar o vídeo (tente um vídeo mais curto ou outro formato).").catch(() => {});
        } finally {
            if (fs.existsSync(inputVideoPath)) fs.unlinkSync(inputVideoPath);
            if (fs.existsSync(cleanAudioPath)) fs.unlinkSync(cleanAudioPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
};
