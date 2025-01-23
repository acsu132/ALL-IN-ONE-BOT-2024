const Discord = require('discord.js');
const gsmarena = require('gsmarena-api'); // Biblioteca da API
const { MongoClient } = require('mongodb'); // Biblioteca para o MongoDB
const dotenv = require('dotenv'); // Para gerenciar variáveis de ambiente

dotenv.config(); // Carrega as variáveis do arquivo .env

const mongoClient = new MongoClient(process.env.MONGODB_URI);
let deviceCollection;

(async () => {
  try {
    await mongoClient.connect();
    console.log('Conectado ao MongoDB com sucesso.');
    const db = mongoClient.db('deviceCache');
    deviceCollection = db.collection('devices');

    // Criar índice TTL para expirar os documentos após 24 horas
    await deviceCollection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 86400 });
  } catch (err) {
    console.error('Erro ao conectar ao MongoDB:', err);
  }
})();

module.exports = {
  name: 'device',
  description: 'Busca especificações de um dispositivo no GSMArena.',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, especifique o nome do dispositivo para a busca.');
    }

    const deviceName = args.join(' ').toLowerCase();

    try {
      // Verificar se o dispositivo já está no cache
      const cachedDevice = await deviceCollection.findOne({ name: deviceName });
      if (cachedDevice) {
        return sendEmbed(cachedDevice.details, message, true);
      }

      // Busca dispositivos pelo nome
      const results = await gsmarena.search.search(deviceName);
      if (!results || results.length === 0) {
        return message.reply(`Nenhum dispositivo encontrado com o nome **${deviceName}**.`);
      }

      // Seleciona o primeiro resultado
      const firstDevice = results[0];
      const deviceDetails = await gsmarena.catalog.getDevice(firstDevice.id);

      // Salvar no cache
      await deviceCollection.insertOne({
        name: deviceName,
        details: deviceDetails,
        timestamp: new Date()
      });

      return sendEmbed(deviceDetails, message, false);
    } catch (error) {
      console.error(error);
      return message.reply('Houve um erro ao buscar as especificações. Tente novamente mais tarde.');
    }
  }
};

// Função para enviar embed
function sendEmbed(deviceDetails, message, cached) {
  const truncate = (text, maxLength = 1024) => {
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
  };

  const quickSpecs = deviceDetails.quickSpec
    .map(spec => `${spec.name}: ${spec.value}`)
    .join('\n');

  const detailSpecs = deviceDetails.detailSpec
    .map(category => `${category.category}:\n${category.specifications.map(spec => `- ${spec.name}: ${spec.value}`).join('\n')}`)
    .join('\n\n');

  const embed = new Discord.EmbedBuilder()
    .setTitle(deviceDetails.name)
    .setURL(`https://www.gsmarena.com/${deviceDetails.id}.php`)
    .setColor('#3498db')
    .setThumbnail(deviceDetails.img)
    .addFields(
      { name: 'Especificações Rápidas', value: truncate(quickSpecs) || 'N/A', inline: false },
      { name: 'Detalhes', value: truncate(detailSpecs) || 'N/A', inline: false }
    )
    .setFooter({
      text: cached ? 'Dados obtidos do cache' : 'Dados obtidos via GSMArena API',
      iconURL: 'https://www.gsmarena.com/favicon.ico'
    });

  return message.reply({ embeds: [embed] });
}
