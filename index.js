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

// Resgata o Token das variáveis de ambiente
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
                .on('start', (commandLine) => {
                    console.log('Executando FFmpeg: ' + commandLine);
                })
                .on('stderr', (stderrLine) => {
                    console.log('Log FFmpeg: ' + stderrLine);
                })
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
});

// Verificação de Token antes do login
if (!TOKEN) {
    console.error("ERRO: Variável TOKEN não definida no painel da Discloud!");
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error("Erro ao realizar login no Discord:", err);
});
