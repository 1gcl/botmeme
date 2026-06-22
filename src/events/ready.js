module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`✅ ${client.user.tag} (VÍDEOS) online no RIFT!`);
    }
};
