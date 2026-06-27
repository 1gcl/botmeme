const { AttachmentBuilder } = require("discord.js");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { deleteFile } = require("../../utils/download");

module.exports = {
    name: 'capa',
    description: 'Adiciona uma imagem como capa de um vídeo',
    async execute(message, args) {
        let attachments = Array.from(message.attachments.values());
        if (message.reference) {
            const reply = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            if (reply) attachments = [...attachments, ...Array.from(reply.attachments.values())];
        }

        const img = attachments.find(a => a.contentType?.startsWith('image/'));
        const vid = attachments.find(a => a.contentType?.startsWith('video/'));

        if (!img || !vid) return message.reply("❌ Envie ou responda com **1 imagem e 1 vídeo**.");

        const aviso = await message.reply("🎥 Aplicando capa...");
        const id = Date.now();
        const imgPath = path.join(os.tmpdir(), `capa_${id}.png`);
        const vidPath = path.join(os.tmpdir(), `vid_${id}.mp4`);
        const outPath = path.join(os.tmpdir(), `out_${id}.mp4`);

        try {
            await Promise.all([
                axios({ url: img.url, responseType: 'stream' }).then(r => r.data.pipe(fs.createWriteStream(imgPath))),
                axios({ url: vid.url, responseType: 'stream' }).then(r => r.data.pipe(fs.createWriteStream(vidPath)))
            ]);

            ffmpeg(vidPath)
                .input(imgPath)
                .complexFilter(['[1:v]scale=iw:ih[img]', '[0:v][img]overlay=0:0'])
                .outputOptions(['-preset ultrafast', '-c:a copy'])
                .save(outPath)
                .on('end', async () => {
                    await message.reply({ files: [new AttachmentBuilder(outPath, { name: 'capa_rift.mp4' })] });
                    message.delete().catch(() => {});
                    aviso.delete().catch(() => {});
                    deleteFile(imgPath); deleteFile(vidPath); deleteFile(outPath);
                });
        } catch (e) {
            aviso.edit("❌ Erro ao aplicar capa.");
            deleteFile(imgPath); deleteFile(vidPath);
        }
    }
};
