const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'help2',
    description: 'Mostra todos os comandos disponíveis',
    async execute(message, args) {
        
        const edicao = [
            { name: '?meme1', desc: 'Adiciona texto Impact em vídeo/GIF' },
            { name: '?meme2', desc: 'Sobrepõe imagem em vídeo' },
            { name: '?capa', desc: 'Adiciona capa esticada (3s) ao vídeo' },
            { name: '?gif', desc: 'Converte vídeo em GIF alta qualidade' },
            { name: '?wasted', desc: 'Efeito GTA V (preto e branco + som)' }
        ];

        const redes = [
            { name: '?ttkv', desc: 'Baixa vídeo do TikTok' },
            { name: '?ttka', desc: 'Baixa áudio do TikTok' },
            { name: '?linkaudio', desc: 'Extrai áudio de mensagem' },
            { name: '?ig', desc: 'Baixa vídeo do Instagram Reels' },
            { name: '?yt', desc: 'Baixa vídeo do YouTube' }
        ];

        const processamento = [
            { name: '?juntar', desc: 'Substitui áudio de vídeo' },
            { name: '?mix', desc: 'Mixa áudio original com áudio novo' },
            { name: '?cortar', desc: 'Corta vídeo (ex: ?cortar 00:10 00:15)' },
            { name: '?removeraudio', desc: 'Remove áudio de vídeo' }
        ];

        const moderacao = [
            { name: '?preso', desc: 'Manda o usuário mencionado para a cadeia' },
            { name: '?adv', desc: 'Mensagem de aviso (apaga em 1 hora)' },
            { name: '?admadv', desc: 'Status da ADM atualizado em tempo real' }
        ];

        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('📹 RIFT Bot - Comandos')
            .setDescription('Use `? + comando` para executar')
            .addFields(
                { 
                    name: '🎬 Edição de Vídeo', 
                    value: edicao.map(cmd => `**${cmd.name}** - ${cmd.desc}`).join('\n')
                },
                { 
                    name: '🌐 Redes Sociais', 
                    value: redes.map(cmd => `**${cmd.name}** - ${cmd.desc}`).join('\n')
                },
                { 
                    name: '⚙️ Processamento Avançado', 
                    value: processamento.map(cmd => `**${cmd.name}** - ${cmd.desc}`).join('\n')
                },
                { 
                    name: '🛡️ Moderação & Diversão', 
                    value: moderacao.map(cmd => `**${cmd.name}** - ${cmd.desc}`).join('\n')
                }
            )
            .setFooter({ text: 'Anexe seus arquivos junto com o comando' })
            .setTimestamp();

        message.reply({ embeds: [embed], failIfNotExists: false }).catch(() => {});
    }
};
