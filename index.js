const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    AttachmentBuilder,
    EmbedBuilder
} = require("discord.js");

const http = require('http');
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Servidor HTTP para manter o bot online na Discloud
http.createServer((req, res) => {
    res.write("O bot de videos do RIFT esta online!");
    res.end();
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.TOKEN;
const PREFIX = "?";

client.once("clientReady", () => {
    console.log(`${client.user.tag} (VÍDEOS) online no RIFT!`);
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    // ==========================================
    // COMANDO ?meme1 (Vídeos e GIFs com fonte Impact)
    // ==========================================
    if (command === "meme1") {
        const attachment = message.attachments.first();
        if (!attachment) return message.reply("❌ Anexe um vídeo ou GIF!");
        
        const text = args.join(" ");
        if (!text) return message.reply("❌ Forneça o texto do meme!");

        const isGif = attachment.contentType === "image/gif";
        const isVideo = attachment.contentType.startsWith("video/");
        
        if (!isGif && !isVideo) return message.reply("⚠️ Este bot lida apenas com vídeos e GIFs.");

        const msgCarregando = await message.reply("🎥 Processando...");

        const ext = isGif ? "gif" : "mp4";
        const inputPath = path.join(__dirname, `in_${message.author.id}_${Date.now()}.${ext}`);
        const outputPath = path.join(__dirname, `out_${message.author.id}_${Date.now()}.${ext}`);

        try {
            const response = await axios({ url: attachment.url, responseType: 'stream' });
            const writer = fs.createWriteStream(inputPath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

            const fontPath = path.join(__dirname, 'impact.ttf').replace(/\\/g, '/');

            let cmd = ffmpeg(inputPath).videoFilters([
                { filter: 'pad', options: 'iw:ih+100:0:100:white' },
                { filter: 'drawtext', options: { fontfile: fontPath, text: text, fontsize: 40, fontcolor: 'black', x: '(w-text_w)/2', y: '(100-text_h)/2' } }
            ]);

            if (isGif) cmd.outputOptions(['-loop 0']); 
            else cmd.outputOptions(['-threads 1', '-preset ultrafast']); 

            cmd.output(outputPath)
                .on('end', async () => {
                    await msgCarregando.delete().catch(() => {});
                    await message.reply({ files: [outputPath] });
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                })
                .on('error', async (err) => {
                    console.error("Erro FFmpeg:", err);
                    await msgCarregando.delete().catch(() => {});
                    message.reply("❌ Erro ao processar.");
                })
                .run();
        } catch (error) {
            console.error("Erro:", error);
            await msgCarregando.delete().catch(() => {});
        }
    }

    // ==========================================
    // COMANDO TIKTOK (?ttkv ou ?ttka)
    // ==========================================
    if (command === "ttkv" || command === "ttka") {
        const url = args[0];
        if (!url || !url.includes("tiktok.com")) return message.reply("❌ Link inválido!");

        const msg = await message.reply("⏳ Extraindo...");
        try {
            const req = await axios.get(`https://www.tikwm.com/api/?url=${url}`);
            const data = req.data.data;
            if (!data) return msg.edit("❌ Vídeo não encontrado.");

            const isAudio = command === "ttka";
            const fileUrl = isAudio ? data.music : data.play;
            const ext = isAudio ? "mp3" : "mp4";
            
            const anexo = new AttachmentBuilder(fileUrl, { name: `tiktok_rift.${ext}` });
            await msg.delete().catch(() => {});
            return message.reply({ files: [anexo] });
        } catch (error) {
            await msg.delete().catch(() => {});
            return message.reply("❌ Erro ao baixar.");
        }
    }

    // ==========================================
    // COMANDO ?linkaudio (Funciona com Link OU Respondendo uma mensagem)
    // ==========================================
    if (command === "linkaudio") {
        const msgCarregando = await message.reply("⏳ Buscando áudio...");
        let msgAlvo;

        // Se marcou (respondeu) uma mensagem, usa ela
        if (message.reference) {
            msgAlvo = await message.channel.messages.fetch(message.reference.messageId);
        } 
        // Se mandou um link, usa o link
        else if (args[0] && args[0].includes("discord.com/channels/")) {
            const linkParts = args[0].split("/");
            const msgId = linkParts.pop(); 
            const chanId = linkParts.pop();
            const canal = await client.channels.fetch(chanId).catch(() => null);
            if (canal) msgAlvo = await canal.messages.fetch(msgId).catch(() => null);
        }

        if (!msgAlvo) return msgCarregando.edit("❌ Não encontrei a mensagem. Responda a uma mensagem de áudio ou envie o link.");

        const verificarAudio = (a) => a.contentType?.includes("audio") || a.name?.endsWith(".ogg") || a.name?.endsWith(".mp3");
        let anexo = msgAlvo.attachments.find(verificarAudio);
        
        if (!anexo && msgAlvo.messageSnapshots) {
            for (const snapshot of msgAlvo.messageSnapshots.values()) {
                anexo = snapshot.message.attachments.find(verificarAudio);
                if (anexo) break;
            }
        }

        if (!anexo) return msgCarregando.edit("❌ A mensagem não contém áudio.");

        await msgCarregando.edit("⏳ Baixando e convertendo...");
        const inputPath = path.join(__dirname, `in_${Date.now()}.ogg`);
        const outputPath = path.join(__dirname, `out_${Date.now()}.mp3`);

        const response = await axios({ url: anexo.url, responseType: 'stream' });
        const writer = fs.createWriteStream(inputPath);
        response.data.pipe(writer);
        await new Promise((resolve) => writer.on('finish', resolve));

        ffmpeg(inputPath).output(outputPath)
            .on('end', async () => {
                await msgCarregando.delete();
                await message.reply({ files: [outputPath] });
                fs.unlinkSync(inputPath);
                fs.unlinkSync(outputPath);
            })
            .run();
    }
});

client.login(TOKEN);
