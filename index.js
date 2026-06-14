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
const Jimp = require("jimp"); // Necessário para o comando ?vasco

// Servidor HTTP para manter o bot online na Discloud
http.createServer((req, res) => {
    res.write("O bot do RIFT esta online!");
    res.end();
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Resgata o Token das variáveis de ambiente
const TOKEN = process.env.TOKEN;
const PREFIX = "?";

client.once("clientReady", () => {
    console.log(`${client.user.tag} online no RIFT!`);
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

        // Define a extensão dinamicamente baseada no tipo de arquivo
        const ext = isGif ? "gif" : "mp4";
        const inputPath = path.join(__dirname, `in_${message.author.id}_${Date.now()}.${ext}`);
        const outputPath = path.join(__dirname, `out_${message.author.id}_${Date.now()}.${ext}`);

        try {
            // Faz o download do anexo
            const response = await axios({ url: attachment.url, responseType: 'stream' });
            const writer = fs.createWriteStream(inputPath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

            // Caminho seguro para a fonte funcionar na Discloud
            const fontPath = path.join(__dirname, 'impact.ttf').replace(/\\/g, '/');

            // Inicia o comando FFmpeg com os filtros visuais
            let cmd = ffmpeg(inputPath).videoFilters([
                { filter: 'pad', options: 'iw:ih+100:0:100:white' },
                { 
                    filter: 'drawtext', 
                    options: { 
                        fontfile: fontPath, 
                        text: text, 
                        fontsize: 40, 
                        fontcolor: 'black', 
                        x: '(w-text_w)/2', 
                        y: '(100-text_h)/2' 
                    } 
                }
            ]);

            // Aplica as opções corretas dependendo se é GIF ou Vídeo
            if (isGif) {
                cmd.outputOptions(['-loop 0']); 
            } else {
                cmd.outputOptions(['-threads 1', '-preset ultrafast']); 
            }

            cmd.output(outputPath)
                .on('end', async () => {
                    await msgCarregando.delete().catch(() => {});
                    await message.reply({ files: [outputPath] });
                    // Limpeza dos ficheiros temporários
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                })
                .on('error', async (err) => {
                    console.error("Erro FFmpeg:", err);
                    await msgCarregando.delete().catch(() => {});
                    message.reply("❌ Erro ao processar o arquivo. Verifique o console da Discloud.");
                    // Limpeza em caso de erro
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                })
                .run();
        } catch (error) {
            console.error("Erro no download:", error);
            await msgCarregando.delete().catch(() => {});
            message.reply("❌ Erro ao transferir o arquivo.");
        }
    }

    // ==========================================
    // COMANDO ?vasco @usuario
    // ==========================================
    if (command === "vasco") {
        const alvo = message.mentions.members.first() || message.member;
        const msgCarregando = await message.reply("⏳ Convocando para o Gigante...");

        try {
            // Link direto e testado
            const urlMolde = "https://i.ibb.co/Gvx0k1Q/e6d27591dce73a109da64fde92e019bb.jpg";
            const avatarUrl = alvo.user.displayAvatarURL({ extension: "png", size: 512 });

            const [molde, avatar] = await Promise.all([
                Jimp.read(urlMolde),
                Jimp.read(avatarUrl)
            ]);

            // Redimensiona o avatar para caber no rosto
            avatar.resize(250, 250); 

            // Cola o avatar nas coordenadas exatas (x=115, y=215)
            molde.composite(avatar, 115, 215);

            const buffer = await molde.getBufferAsync(Jimp.MIME_JPEG);
            const attachment = new AttachmentBuilder(buffer, { name: `vasco-${alvo.user.username}.jpg` });

            await msgCarregando.delete().catch(() => {});
            return message.reply({ content: `💢 **${alvo.user.username}** foi convocado!`, files: [attachment] });

        } catch (error) {
            console.error("Erro no Jimp:", error);
            await msgCarregando.delete().catch(() => {});
            return message.reply("❌ Erro ao processar a imagem.");
        }
    }
});

// Verificação de Token antes do login para evitar crashes silenciosos
if (!TOKEN) {
    console.error("ERRO: Variável TOKEN não definida no painel da Discloud!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("Erro ao realizar login no Discord:", err);
});
