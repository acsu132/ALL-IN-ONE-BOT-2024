const { EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { MongoClient } = require('mongodb');
const { URL } = require('url'); // Módulo para manipulação de URLs

// URI do MongoDB
const MONGO_URI = 'mongodb+srv://nextai:nextbotpass@cluster0.iuzzl.mongodb.net/newsBot?retryWrites=true&w=majority';
const DATABASE_NAME = 'newsBot';
const COLLECTION_NAME = 'sentArticles';

// ID do canal onde as notícias serão enviadas
const CHANNEL_ID = '1309897299278696618';

const TOPICS = ['android', 'ios', 'windows', 'chromebook'];
let ultimoTopico = null; // Variável para rastrear o último tópico enviado

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

function getFavicon(url) {
    try {
        const parsedUrl = new URL(url);
        return `${parsedUrl.origin}/favicon.ico`;
    } catch (error) {
        console.error('Erro ao gerar favicon URL:', error.message);
        return 'https://via.placeholder.com/50'; // URL padrão em caso de falha
    }
}

async function enviarNoticias(client, collection) {
    const canal = client.channels.cache.get(CHANNEL_ID);

    if (!canal) {
        console.error('Canal de notícias não encontrado!');
        return;
    }

    let noticiaEnviada = false;

    // Reordena os tópicos para evitar repetições do último tópico
    const topicosOrdenados = TOPICS.filter(topico => topico !== ultimoTopico).concat(ultimoTopico ? [ultimoTopico] : []);

    for (const topico of topicosOrdenados) {
        const noticias = await buscarNoticias(topico);

        for (const noticia of noticias) {
            const existe = await collection.findOne({ url: noticia.url });
            if (existe) {
                continue; // Ignorar notícias já enviadas
            }

            await collection.insertOne({ url: noticia.url }); // Salva a URL no banco de dados

            const embed = new EmbedBuilder()
                .setColor('#8a22d4')
                .setTitle(noticia.title)
                .setURL(noticia.url)
                .setDescription(noticia.description || 'Sem descrição disponível.')
                .setThumbnail(getFavicon(noticia.url))
                .setImage(noticia.urlToImage || 'https://via.placeholder.com/300')
                .addFields(
                    { name: 'Fonte', value: `[${noticia.source.name}](${noticia.url})`, inline: true },
                    { name: 'Publicado em', value: new Date(noticia.publishedAt).toLocaleString(), inline: true },
                )
                .setFooter({ text: `Notícias sobre ${topico.charAt(0).toUpperCase() + topico.slice(1)}` });

            await canal.send({ embeds: [embed] });
            noticiaEnviada = true;
            ultimoTopico = topico; // Atualiza o último tópico enviado
            break; // Envia apenas uma notícia por vez
        }

        if (noticiaEnviada) {
            break; // Se encontrou e enviou uma notícia, para de procurar
        }
    }

    if (!noticiaEnviada) {
        console.log('Nenhuma nova notícia foi encontrada para tópicos diferentes do último enviado.');
    }

    console.log('News handler ativado');
}
