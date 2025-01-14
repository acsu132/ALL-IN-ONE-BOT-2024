const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { setInterval } = require('timers');

// Lista de IDs dos canais do YouTube
const CHANNEL_IDS = [
    'UC_x5XG1OV2P6uZZ5FSM9Ttw', // Exemplo de ID de canal
];

// ID do canal do Discord onde as notificações serão enviadas
const DISCORD_CHANNEL_ID = '1317627872814432286';

// Configurações do MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = 'youtubeNotifications';
const COLLECTION_NAME = 'sentVideos';

module.exports = {
    init: (client) => {
        client.on('ready', async () => {
            console.log('Módulo de notificações do YouTube inicializado.');

            // Conecta ao MongoDB e cria a coleção se necessário
            const mongoClient = new MongoClient(MONGO_URI);
            await mongoClient.connect();
            const db = mongoClient.db(DATABASE_NAME);
            const collection = db.collection(COLLECTION_NAME);

            // Certifica-se de que o índice para IDs de vídeo é único
            await collection.createIndex({ videoId: 1 }, { unique: true });

            // Intervalo para verificar atualizações a cada 1 minuto
            setInterval(() => verificarAtualizacoes(client, collection), 1 * 60 * 1000);
        });
    },
};

async function verificarAtualizacoes(client, collection) {
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
                const videoId = video.id.videoId;

                // Verifica se o vídeo já foi enviado usando o MongoDB
                const exists = await collection.findOne({ videoId });
                if (exists) {
                    console.log(`Vídeo já enviado: ${videoId}`);
                    continue;
                }

                const embed = criarEmbedNotificacao(video);
                await discordChannel.send({ embeds: [embed] });

                // Armazena o vídeo no banco de dados
                await collection.insertOne({ videoId, sentAt: new Date() });
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
        .setFooter({ text: 'Nova atualização do YouTube!' })
        .addFields(
            { name: 'Publicado em', value: new Date(publishedAt).toLocaleString(), inline: true },
            { name: 'Canal', value: channelTitle, inline: true }
        );
}
