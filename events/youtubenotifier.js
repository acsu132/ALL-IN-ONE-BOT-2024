const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { setInterval } = require('timers');

// All the channel id's should be here with an , at the end, you can add how many you want but the first time it will send 3 of them
const CHANNEL_IDS = [
    'UC_bXJnsgwOqEPA_-6N6faKw',
'UC7zbUfFoMAMGHIRUE8gjVnw',
'UC9_zUso3liGdwEnVyHm90sw',
];

// Put the channel id here (for the videos), yes the bot will send the videos here
const DISCORD_CHANNEL_ID = '1317627872814432286';

// Creates a mongodb storage
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = 'youtubeNotifications';
const COLLECTION_NAME = 'sentVideos';

module.exports = {
    init: (client) => {
        client.on('ready', async () => {
            console.log('Módulo de notificações do YouTube inicializado.');

            const mongoClient = new MongoClient(MONGO_URI);
            await mongoClient.connect();
            const db = mongoClient.db(DATABASE_NAME);
            const collection = db.collection(COLLECTION_NAME);

            await collection.createIndex({ videoId: 1 }, { unique: true });

            // This is the interval for the bot check if there are new videos for the channel(s), default is 1 minute
            setInterval(() => verificarAtualizacoes(client, collection), 5 * 60 * 1000);
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
                    key: process.env.YOUTUBE_API_KEY, //put your youtube api key on env with this variable
                },
            });

            const videos = response.data.items;

            for (const video of videos) {
                const videoId = video.id.videoId;

                // That checks iv the video was already been sent
                const exists = await collection.findOne({ videoId });
                if (exists) {
                    console.log(`Vídeo já enviado: ${videoId}`);
                    continue;
                }

                const embed = criarEmbedNotificacao(video);
                await discordChannel.send({ embeds: [embed] });

                
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
        .setImage(thumbnails.high.url) 
        .setAuthor({ name: channelTitle, iconURL: thumbnails.default.url }) 
        .setFooter({ text: 'Nova atualização do YouTube!' })
        .addFields(
            { name: 'Publicado em', value: new Date(publishedAt).toLocaleString(), inline: true },
            { name: 'Canal', value: channelTitle, inline: true }
        );
}


// ███╗░░░███╗░█████╗░██████╗░██╗░░░██╗██╗░░░░░███████╗  ██████╗░██╗░░░██╗
// ████╗░████║██╔══██╗██╔══██╗██║░░░██║██║░░░░░██╔════╝  ██╔══██╗╚██╗░██╔╝
// ██╔████╔██║██║░░██║██║░░██║██║░░░██║██║░░░░░█████╗░░  ██████╦╝░╚████╔╝░
// ██║╚██╔╝██║██║░░██║██║░░██║██║░░░██║██║░░░░░██╔══╝░░  ██╔══██╗░░╚██╔╝░░
// ██║░╚═╝░██║╚█████╔╝██████╔╝╚██████╔╝███████╗███████╗  ██████╦╝░░░██║░░░
// ╚═╝░░░░░╚═╝░╚════╝░╚═════╝░░╚═════╝░╚══════╝╚══════╝  ╚═════╝░░░░╚═╝░░░

// ░█████╗░██████╗░██████╗░██╗███████╗██╗░░░░░
// ██╔══██╗██╔══██╗██╔══██╗██║██╔════╝██║░░░░░
// ███████║██║░░██║██████╔╝██║█████╗░░██║░░░░░
// ██╔══██║██║░░██║██╔══██╗██║██╔══╝░░██║░░░░░
// ██║░░██║██████╔╝██║░░██║██║███████╗███████╗
// ╚═╝░░╚═╝╚═════╝░╚═╝░░╚═╝╚═╝╚══════╝╚══════╝
