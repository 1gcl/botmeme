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

    // ==========================================
    // COMANDOS TIKTOK (?ttkv para Vídeo | ?ttka para Áudio)
    // ==========================================
    if (command === "ttkv" || command === "ttka") {
        const url = args[0];
        
        if (!url || !url.includes("tiktok.com")) {
            return message.reply("❌ Envie um link válido! Ex: `?ttkv https://vm.tiktok.com/...`");
        }

        const msgCarregando = await message.reply("⏳ Extraindo o conteúdo do TikTok...");

        try {
            // Faz a requisição para a API gratuita do TikWM
            const req = await axios.get(`https://www.tikwm.com/api/?url=${url}`);
            const data = req.data.data;

            if (!data) {
                await msgCarregando.delete().catch(() => {});
                return message.reply("❌ Vídeo não encontrado. Ele pode ter sido apagado ou estar privado.");
            }

            // Verifica qual comando foi usado para decidir o que baixar
            const isAudio = command === "ttka";
            const fileUrl = isAudio ? data.music : data.play;
            const ext = isAudio ? "mp3" : "mp4";
            const msgTexto = isAudio ? "🎵 Áudio extraído com sucesso:" : "🎬 Vídeo sem marca d'água:";

            // Envia o arquivo diretamente da URL da API para o Discord
            const anexo = new AttachmentBuilder(fileUrl, { name: `tiktok_rift.${ext}` });

            await msgCarregando.delete().catch(() => {});
            return message.reply({ content: msgTexto, files: [anexo] });

        } catch (error) {
            console.error(error);
            await msgCarregando.delete().catch(() => {});
            return message.reply("❌ Ocorreu um erro ao baixar. O servidor do TikTok pode estar instável.");
        }
    }

    // ==========================================
    // COMANDO SALVAR ÁUDIO POR LINK (?linkaudio)
    // ==========================================
    if (command === "linkaudio") {
        const link = args[0];

        // Validação básica do link
        if (!link || !link.includes("discord.com/channels/")) {
            return message.reply("❌ Forneça um link de mensagem válido do Discord. Ex: `?linkaudio https://discord.com/channels/...`");
        }

        const msgCarregando = await message.reply("⏳ Buscando a mensagem no servidor...");

        try {
            // Extrai os IDs do link (Servidor, Canal, Mensagem)
            const linkParts = link.split("/");
            const messageId = linkParts.pop(); 
            const channelId = linkParts.pop();

            // Busca o canal no servidor
            const canal = message.guild.channels.cache.get(channelId);
            if (!canal) {
                return msgCarregando.edit("❌ Não consegui encontrar o canal dessa mensagem (verifique se tenho acesso a ele).");
            }

            // Busca a mensagem específica pelo ID
            const msgAlvo = await canal.messages.fetch(messageId);
            if (!msgAlvo) {
                return msgCarregando.edit("❌ Não encontrei a mensagem. Ela pode ter sido apagada.");
            }

            // Verifica se há um anexo de áudio na mensagem
            const anexo = msgAlvo.attachments.first();
            if (!anexo || !anexo.contentType?.includes("audio")) {
                return msgCarregando.edit("❌ A mensagem informada não contém um arquivo de áudio anexado.");
            }

            await msgCarregando.edit("⏳ Áudio encontrado! Baixando e convertendo para MP3...");
            
            // Caminhos temporários para o processo de conversão
            const inputPath = path.join(__dirname, `linkaudio_in_${message.author.id}_${Date.now()}.ogg`);
            const outputPath = path.join(__dirname, `linkaudio_out_${message.author.id}_${Date.now()}.mp3`);

            // Passo 1: Baixa o arquivo original (geralmente .ogg)
            const response = await axios({ url: anexo.url, responseType: 'stream' });
            const writer = fs.createWriteStream(inputPath);
            response.data.pipe(writer);

            await new Promise((resolve, reject) => { 
                writer.on('finish', resolve); 
                writer.on('error', reject); 
            });

            // Passo 2: Usa o FFmpeg para converter para MP3
            ffmpeg(inputPath)
                .output(outputPath)
                .on('end', async () => {
                    await msgCarregando.delete().catch(() => {});
                    await message.reply({ content: "🎵 Áudio convertido e pronto para download:", files: [outputPath] });
                    
                    // Limpeza
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                })
                .on('error', async (err) => {
                    console.error("Erro no FFmpeg ao converter áudio por link:", err);
                    await msgCarregando.delete().catch(() => {});
                    message.reply("❌ Ocorreu um erro ao tentar converter o áudio.");
                    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                })
                .run();
                
        } catch (error) {
            console.error("Erro ao processar o link do Discord:", error);
            await msgCarregando.delete().catch(() => {});
            message.reply("❌ Erro ao buscar a mensagem. Verifique se o link está correto e se tenho permissão para ler o histórico daquele canal.");
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
