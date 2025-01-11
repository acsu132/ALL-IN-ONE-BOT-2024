const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { MongoClient } = require('mongodb');

// URI do MongoDB
const MONGO_URI = 'mongodb+srv://RTX:GAMING@cluster0.iuzzl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DATABASE_NAME = 'newsBot';
const COLLECTION_NAME = 'sentArticles';

// ID do canal onde as notícias serão enviadas
const CHANNEL_ID = '1309897299278696618';

// Thumbnails específicas por tema
const THUMBNAILS = {
    android: 'URL_THUMBNAIL_ANDROID',
    ios: 'URL_THUMBNAIL_IOS',
    windows: 'URL_THUMBNAIL_WINDOWS',
    chromebook: 'URL_THUMBNAIL_CHROMEBOOK',
};

const TOPICS = ['android', 'ios', 'windows', 'chromebook'];

module.exports = {
    init: (client) => {
        client.on('ready', async () => {
            console.log('Módulo de notícias inicializado.');

            // Conecta ao MongoDB
            const mongoClient = new MongoClient(MONGO_URI);
            await mongoClient.connect();
            const db = mongoClient.db(DATABASE_NAME);
            const collection = db.collection(COLLECTION_NAME);

            // Primeiro envio após 5 segundos
            setTimeout(() => enviarNoticias(client, collection), 5000);

            // Envio regular a cada 1 hora (12 pesquisas por dia)
            setInterval(() => enviarNoticias(client, collection), 3600000);
        });
    },
    enviarNoticias, // Exportando a função
};

async function buscarNoticias(topico) {
    try {
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: topico,
                apiKey: '337b6806debe4df1b083f92f768fe2bf', // Variável de ambiente para a chave da API
                language: 'pt',
            },
        });
        return response.data.articles;
    } catch (error) {
        console.error(`Erro ao buscar notícias sobre ${topico}:`, error.message);
        return [];
    }
}

async function enviarNoticias(client, collection) {
    const topico = TOPICS[Math.floor(Math.random() * TOPICS.length)]; // Escolhe um tema aleatório
    const noticias = await buscarNoticias(topico);
    const canal = client.channels.cache.get(CHANNEL_ID);

    if (!canal) {
        console.error('Canal de notícias não encontrado!');
        return;
    }

    let noticiaEnviada = false;

    for (const noticia of noticias) {
        const existe = await collection.findOne({ url: noticia.url });
        if (existe) {
            continue; // Ignorar notícias já enviadas
        }

        await collection.insertOne({ url: noticia.url }); // Salva a URL no banco de dados

        const embed = new EmbedBuilder()
            .setColor('#1D3557')
            .setTitle(noticia.title)
            .setURL(noticia.url)
            .setDescription(noticia.description || 'Sem descrição disponível.')
            .setThumbnail(THUMBNAILS[topico] || 'https://via.placeholder.com/50')
            .setImage(noticia.urlToImage || 'https://via.placeholder.com/300')
            .addFields(
                { name: 'Fonte', value: `[${noticia.source.name}](${noticia.url})`, inline: true },
                { name: 'Publicado em', value: new Date(noticia.publishedAt).toLocaleString(), inline: true },
            )
            .setFooter({ text: `Notícias sobre ${topico.charAt(0).toUpperCase() + topico.slice(1)}` });

        await canal.send({ embeds: [embed] });
        noticiaEnviada = true;
        break; // Envia apenas uma notícia por vez
    }

    if (!noticiaEnviada) {
        console.log(`Nenhuma nova notícia sobre ${topico} foi encontrada.`);
    }
}
