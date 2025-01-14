const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();
const { setInterval } = require('timers');

// Lista de IDs dos canais do YouTube
const CHANNEL_IDS = [
    'UC_bXJnsgwOqEPA_-6N6faKw', // Exemplo de ID de canal, // Adicione outros IDs aqui
];

// ID do canal do Discord onde as notificações serão enviadas
const DISCORD_CHANNEL_ID = '1309897299278696618';

module.exports = {
    init: (client) => {
        client.on('ready', async () => {
            console.log('Módulo de notificações do YouTube inicializado.');

            // Intervalo para verificar atualizações a cada 10 minutos
            setInterval(() => verificarAtualizacoes(client), 10 * 60 * 1000);
        });
    },
};

async function verificarAtualizacoes(client) {
    const discordChannel = client.channels.cache.get(DISCORD_CHANNEL_ID);

    if (!discordChannel) {
        console.error('Canal do Discord não encontrado!');
        return;
    }

    for (const channelId of CHANNEL_IDS) {
        try {
            const response = await axios.get(`https://www.googleapis.com/youtube/v3/search`, {
                params: {
                    part: 'snippet',
                    channelId: channelId,
                    order: 'date',
                    maxResults: 1,
                    type: 'video',
                    key: process.env.YOUTUBE_API_KEY, // Carregando a chave da API do arquivo .env
                },
            });

            const videos = response.data.items;

            for (const video of videos) {
                const embed = criarEmbedNotificacao(video);
                await discordChannel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error(`Erro ao buscar atualizações para o canal ${channelId}:`, error.message);
        }
    }
}

function criarEmbedNotificacao(video) {
    const { title, description, thumbnails, channelTitle, publishedAt } = video.snippet;

    return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(title)
        .setURL(`https://www.youtube.com/watch?v=${video.id.videoId}`)
        .setDescription(description || 'Sem descrição disponível.')
        .setThumbnail(thumbnails.high.url)
        .setAuthor({ name: channelTitle, iconURL: thumbnails.default.url })
        .setFooter({ text: 'Nova atualização do YouTube!' })
        .addFields(
            { name: 'Publicado em', value: new Date(publishedAt).toLocaleString(), inline: true },
            { name: 'Canal', value: channelTitle, inline: true }
        );
}
