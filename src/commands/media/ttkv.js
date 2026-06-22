const { AttachmentBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
    name: 'ttkv',
    description: 'Baixa vídeo do TikTok',
    async execute(message, args) {
        const url = args[0];
        if (!url || !url.includes("tiktok.com")) {
            return message.reply("❌ Link inválido! Use um link do TikTok.").catch(() => {});
        }

        const msg = await message.reply("⏳ Extraindo...").catch(() => {});
        if (!msg) return;

        try {
            const req = await axios.get(`https://www.tikwm.com/api/?url=${url}`);
            const data = req.data.data;

            if (!data) {
                return msg.edit("❌ Vídeo não encontrado.").catch(() => {});
            }

            const fileUrl = data.play;
            const anexo = new AttachmentBuilder(fileUrl, { name: `tiktok_rift.mp4` });
            await msg.delete().catch(() => {});

            return message.reply({ files: [anexo], failIfNotExists: false }).catch(() => {});
        } catch (error) {
            console.error("Erro ao baixar TikTok:", error.message);
            await msg.delete().catch(() => {});
            return message.channel.send("❌ Erro ao baixar.").catch(() => {});
        }
    }
};
