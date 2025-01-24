const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

module.exports = {
  name: 'device',
  description: 'Busca especificações de um dispositivo no GSMArena.',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, especifique o nome do dispositivo para a busca.');
    }

    const deviceName = args.join(' ');

    try {
      // Faz a requisição diretamente ao GSMArena
      const response = await axios.get(`https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(deviceName)}`);

      if (!response.data || !response.data.includes('section-body')) {
        return message.reply(`Nenhum dispositivo encontrado com o nome **${deviceName}**.`);
      }

      // Simulação simples para extrair detalhes básicos do dispositivo
      const match = response.data.match(/<h3.*?>(.*?)<\/h3>/);
      const title = match ? match[1] : 'Título não encontrado';

      const embed = {
        color: 0x3498db,
        title: `Resultados para: ${deviceName}`,
        description: `Dispositivo encontrado: **${title}**\n[Veja mais detalhes](https://www.gsmarena.com/search.php3?sQuickSearch=yes&sName=${encodeURIComponent(deviceName)})`,
        footer: {
          text: 'Dados obtidos do site GSMArena',
        },
      };

      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Erro ao buscar dispositivo:', error);
      return message.reply('Houve um erro ao buscar as especificações. Tente novamente mais tarde.');
    }
  },
};
