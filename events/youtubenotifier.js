const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();
const { setInterval } = require('timers');

// Lista dos ids dos canais, ponha todos os canais que quiser aqui, para achar o ID você pode usar algum "Youtube channel id finder", basta por o id entre as 'aspas' e termin
const CHANNEL_IDS = [
    'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    'UCJZv4d5rbIKd4QHMPkcABCw',
];

// ID do canal onde as notificações vão
const DISCORD_CHANNEL_ID = '1317627872814432286';

// 
const sentVideos = new Set();

module.exports = {
    init: (client) => {
        client.on('ready', async () => {
            console.log('Módulo de notificações do YouTube inicializado.');

            // Intervalo pro bot não mandar a cada 1s
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
                    key: process.env.YOUTUBE_API_KEY, // Coloca a chave da api no env, não põe no repositório pelo amor de deus
                },
            });

            const videos = response.data.items;

            for (const video of videos) {
                const videoId = video.id.videoId;

                if (sentVideos.has(videoId)) {
                    console.log(`Vídeo já enviado: ${videoId}`);
                    continue;
                }

                const embed = criarEmbedNotificacao(video);
                await discordChannel.send({ embeds: [embed] });

                sentVideos.add(videoId);
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
        .setImage(thumbnails.high.url) // Usa a capa do vídeo como imagem principal
        .setAuthor({ name: channelTitle, iconURL: thumbnails.default.url }) // Usa a foto do canal como ícone do autor
        .setFooter({ text: 'Novo vídeo do youtube!' })
        .addFields(
            { name: 'Publicado em', value: new Date(publishedAt).toLocaleString(), inline: true },
            { name: 'Canal', value: channelTitle, inline: true }
        );
}
