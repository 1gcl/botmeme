const ffmpeg = require("fluent-ffmpeg");
const { AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const os = require("os");
const axios = require("axios");
const { deleteFile, downloadFile } = require("../../utils/download");

module.exports = {
    name: 'juntar',
    description: 'Anexa 1 vídeo e 1 áudio. Substitui o áudio original do vídeo pelo novo',
    async execute(message, args) {
        const attachments = Array.from(message.attachments.values());
        const video = attachments.find(a => a.contentType?.startsWith('video/'));
        const audio = attachments.find(a => a.contentType?.includes('audio') || a.name?.endsWith('.mp3') || a.name?.endsWith('.ogg'));

        if (!video || !audio) {
            return message.reply("❌ Você precisa enviar **1 vídeo** e **1 áudio** na mesma mensagem.").catch(() => {});
        }

        const msg = await message.reply("⏳ Juntando vídeo e áudio...").catch(() => {});
        if (!msg) return;

        const id = Date.now();
        const videoExt = video.name.split('.').pop();
        const audioExt = audio.name.split('.').pop();

        const videoPath = path.join(os.tmpdir(), `vid_${id}.${videoExt}`);
        const audioPath = path.join(os.tmpdir(), `aud_${id}.${audioExt}`);
        const outputPath = path.join(os.tmpdir(), `juntar_${id}.mp4`);

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
                downloadFile(video.url, videoPath),
                downloadFile(audio.url, audioPath)
            ]);

            ffmpeg(videoPath)
                .input(audioPath)
                .outputOptions(['-c:v copy', '-c:a aac', '-map 0:v:0', '-map 1:a:0', '-shortest'])
                .output(outputPath)
                .on('end', async () => {
                    const anexo = new AttachmentBuilder(outputPath, { name: 'juntar_rift.mp4' });
                    await msg.delete().catch(() => {});
                    await message.reply({ files: [anexo], failIfNotExists: false }).catch(() => {});
                    deleteFile(videoPath);
                    deleteFile(audioPath);
                    deleteFile(outputPath);
                })
                .on('error', async (err) => {
                    console.error("Erro ao juntar:", err.message);
                    await msg.edit("❌ Erro ao processar. Verifique os formatos dos arquivos.").catch(() => {});
                    deleteFile(videoPath);
                    deleteFile(audioPath);
                    deleteFile(outputPath);
                })
                .run();

        } catch (error) {
            console.error("Erro:", error.message);
            await msg.edit("❌ Erro ao baixar os arquivos.").catch(() => {});
            deleteFile(videoPath);
            deleteFile(audioPath);
            deleteFile(outputPath);
        }
    }
};
