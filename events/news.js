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
    android: 'https://media.discordapp.net/attachments/1284876311516680282/1327784334186254336/image.png?ex=67845306&is=67830186&hm=47894ac9c5bf7a6d9c6593d6c709e20fa9fff8f936902c00d6fc2d557e74b014&=&width=398&height=398',
    ios: 'https://media.discordapp.net/attachments/1284876311516680282/1327783786779250708/image.png?ex=67845283&is=67830103&hm=e68d14e9eb577f15a1315c46f9b1aad6c7454805eb7a3ccaf34cace54ac13a49&=&width=324&height=398',
    windows: 'https://media.discordapp.net/attachments/1284876311516680282/1327782854251511939/image.png?ex=678451a5&is=67830025&hm=d89263e7ff2f5d9e0a982f5fcd89d22cf1aa8a019c22d4d2d7e11c1e6b1adc0f&=&width=398&height=398',
    chromebook: 'https://media.discordapp.net/attachments/1284876311516680282/1327783278689914952/image.png?ex=6784520a&is=6783008a&hm=f1257fa500a255ee31023bace0ad194b5773d56895600ca236407539ebf3c486&=&width=398&height=398',
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
    const canal = client.channels.cache.get(CHANNEL_ID);

    if (!canal) {
        console.error('Canal de notícias não encontrado!');
        return;
    }

    let noticiaEnviada = false;

    for (const topico of TOPICS) {
        const noticias = await buscarNoticias(topico);

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

        if (noticiaEnviada) {
            break; // Se encontrou e enviou uma notícia, para de procurar
        }
    }

    if (!noticiaEnviada) {
        console.log('Nenhuma nova notícia foi encontrada para nenhum tópico.');
        await canal.send('Nenhuma notícia nova encontrada para os tópicos disponíveis.');
    }
}
