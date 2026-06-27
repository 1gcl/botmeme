const { AttachmentBuilder } = require("discord.js");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { deleteFile } = require("../../utils/download");

module.exports = {
    name: 'mix',
    description: 'Mixar áudio em um vídeo',
    async execute(message, args) {
        let attachments = Array.from(message.attachments.values());
        if (message.reference) {
            const reply = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            if (reply) attachments = [...attachments, ...Array.from(reply.attachments.values())];
        }

        const audio = attachments.find(a => a.contentType?.startsWith('audio/'));
        const vid = attachments.find(a => a.contentType?.startsWith('video/'));

        if (!audio || !vid) return message.reply("❌ Envie ou responda com **1 áudio e 1 vídeo**.");

        const aviso = await message.reply("🎵 Mixando áudios...");
        const id = Date.now();
        const audPath = path.join(os.tmpdir(), `aud_${id}.mp3`);
        const vidPath = path.join(os.tmpdir(), `vid_${id}.mp4`);
        const outPath = path.join(os.tmpdir(), `out_${id}.mp4`);

        try {
            await Promise.all([
                axios({ url: audio.url, responseType: 'stream' }).then(r => r.data.pipe(fs.createWriteStream(audPath))),
                axios({ url: vid.url, responseType: 'stream' }).then(r => r.data.pipe(fs.createWriteStream(vidPath)))
            ]);

            ffmpeg(vidPath)
                .input(audPath)
                .outputOptions([
                    '-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first[aout]',
                    '-map 0:v', '-map [aout]',
                    '-c:v copy', '-preset ultrafast'
                ])
                .save(outPath)
                .on('end', async () => {
                    await message.reply({ files: [new AttachmentBuilder(outPath, { name: 'mix_rift.mp4' })] });
                    message.delete().catch(() => {});
                    aviso.delete().catch(() => {});
                    deleteFile(audPath); deleteFile(vidPath); deleteFile(outPath);
                });
        } catch (e) {
            aviso.edit("❌ Erro na mixagem.");
            deleteFile(audPath); deleteFile(vidPath);
        }
    }
};
