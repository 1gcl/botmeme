const { AttachmentBuilder } = require("discord.js");
const axios = require("axios");
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { deleteFile } = require("../../utils/download");

const execAsync = promisify(exec);

module.exports = {
    name: 'meme2',
    description: 'Sobrepõe uma imagem em um vídeo',
    async execute(message, args) {
        const attachments = Array.from(message.attachments.values());
        const imagem = attachments.find(a => a.contentType?.startsWith('image/'));
        const video = attachments.find(a => a.contentType?.startsWith('video/'));

        if (!imagem || !video) {
            return message.reply("❌ Você precisa enviar **1 imagem** (PNG/JPG/WEBP) e **1 vídeo** (MP4/MOV/WEBM) anexados na mesma mensagem.").catch(() => {});
        }

        const aviso = await message.reply("⏳ **Processando vídeo...** Isso pode levar alguns segundos dependendo do tamanho.").catch(() => {});
        if (!aviso) return;

        const id = Date.now();
        const imgExt = imagem.name.split('.').pop();
        const vidExt = video.name.split('.').pop();

        const tempImgPath = path.join(os.tmpdir(), `img_${id}.${imgExt}`);
        const tempVidPath = path.join(os.tmpdir(), `vid_${id}.${vidExt}`);
        const outputPath = path.join(os.tmpdir(), `out_${id}.mp4`);

        try {
            const downloadFile = async (url, dest) => {
                const res = await axios({ url, responseType: 'stream' });
                const writer = fs.createWriteStream(dest);
                res.data.pipe(writer);
                return new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            };

            await Promise.all([
                downloadFile(imagem.url, tempImgPath),
                downloadFile(video.url, tempVidPath)
            ]);

            const filtro = '[1:v]scale=iw*0.90:-1[logo];[0:v][logo]overlay=W-w-20:H-h-20';
            const ffmpegCommand = `ffmpeg -y -i "${tempVidPath}" -i "${tempImgPath}" -filter_complex "${filtro}" -preset ultrafast -threads 2 -c:v libx264 -c:a copy "${outputPath}"`;

            await execAsync(ffmpegCommand);

            const videoFinal = new AttachmentBuilder(outputPath, { name: 'meme2_rift.mp4' });

            await aviso.edit({
                content: '✅ **Vídeo gerado com sucesso!**',
                files: [videoFinal]
            }).catch(async () => {
                await message.channel.send({ content: '✅ **Vídeo gerado com sucesso!**', files: [videoFinal] }).catch(() => {});
            });

        } catch (error) {
            console.error('Erro no processamento do meme2:', error.message);
            await aviso.edit('❌ **Erro ao processar o vídeo.** O formato pode ser incompatível ou o arquivo é grande demais.').catch(() => {});
        } finally {
            deleteFile(tempImgPath);
            deleteFile(tempVidPath);
            deleteFile(outputPath);
        }
    }
};
