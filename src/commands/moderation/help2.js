const { EmbedBuilder } = require("discord.js");

module.exports = {
    name: 'help2',
    description: 'Mostra todos os comandos disponíveis',
    async execute(message, args) {
        const commands = [
            { name: '?meme1', desc: 'Adiciona texto Impact em vídeo/GIF' },
            { name: '?meme2', desc: 'Sobrepõe imagem em vídeo' },
            { name: '?ttkv', desc: 'Baixa vídeo do TikTok' },
            { name: '?ttka', desc: 'Baixa áudio do TikTok' },
            { name: '?linkaudio', desc: 'Extrai áudio de mensagem' },
            { name: '?ig', desc: 'Baixa vídeo do Instagram Reels' },
            { name: '?yt', desc: 'Baixa vídeo do YouTube' },
            { name: '?juntar', desc: 'Substitui áudio de vídeo' },
            { name: '?cortar', desc: 'Corta vídeo (ex: ?cortar 00:10 00:15)' },
            { name: '?removeraudio', desc: 'Remove áudio de vídeo' }
        ];

        const embed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setTitle('📹 RIFT Video Bot - Comandos')
            .setDescription('Use `? + comando` para executar')
            .addFields(
                { 
                    name: '🎬 Edição de Vídeo', 
                    value: commands.slice(0, 5).map(cmd => `**${cmd.name}** - ${cmd.desc}`).join('\n')
                },
                { 
                    name: '🌐 Redes Sociais', 
                    value: commands.slice(5, 7).map(cmd => `**${cmd.name}** - ${cmd.desc}`).join('\n')
                },
                { 
                    name: '⚙️ Processamento', 
                    value: commands.slice(7).map(cmd => `**${cmd.name}** - ${cmd.desc}`).join('\n')
                }
            )
            .setFooter({ text: 'Anexe seus arquivos junto com o comando' })
            .setTimestamp();

        message.reply({ embeds: [embed], failIfNotExists: false }).catch(() => {});
    }
};
