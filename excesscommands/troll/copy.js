const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'copy',
    description: 'Cria um webhook que repete tudo o que o usuário mencionado falar por 30 segundos.',
    async execute(message, args) {
        // IDs dos cargos necessários
        const requiredRoles = ['1284871020087476266', '1311633633697861703']; // Substitua pelos IDs dos cargos necessários

        // Verificar se o autor da mensagem tem os dois cargos
        const member = message.member;
        if (!requiredRoles.every(role => member.roles.cache.has(role))) {
            return message.reply('Você não tem os cargos necessários para usar este comando.');
        }

        // Verificar se o usuário foi mencionado
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) {
            return message.reply('Por favor, mencione um usuário para copiar.');
        }

        try {
            // Criar o webhook no canal atual
            const webhook = await message.channel.createWebhook({
                name: mentionedUser.displayName || mentionedUser.username,
                avatar: mentionedUser.displayAvatarURL({ dynamic: true }),
            });

            await message.reply(`Webhook criado como ${mentionedUser.username}! Ele será deletado em 30 segundos.`);

            // Criar um coletor para capturar mensagens do usuário mencionado
            const filter = (msg) => msg.author.id === mentionedUser.id;
            const collector = message.channel.createMessageCollector({ filter, time: 30000 });

            collector.on('collect', async (msg) => {
                try {
                    // Reenviar a mensagem usando o webhook
                    await webhook.send({
                        content: msg.content,
                        username: msg.author.username,
                        avatarURL: msg.author.displayAvatarURL({ dynamic: true }),
                    });
                } catch (error) {
                    console.error('Erro ao enviar mensagem pelo webhook:', error);
                }
            });

            collector.on('end', async () => {
                // Deletar o webhook após o tempo terminar
                try {
                    await webhook.delete();
                    console.log('Webhook removido após 30 segundos.');
                } catch (error) {
                    console.error('Erro ao deletar o webhook:', error);
                }
            });

        } catch (error) {
            console.error('Erro ao criar o webhook:', error);
            message.reply('Ocorreu um erro ao criar o webhook. Verifique minhas permissões.');
        }
    },
};