const Discord = require('discord.js');
const axios = require('axios');

module.exports = {
  name: 'device',
  description: 'Busca especificações de um dispositivo no GSMArena.',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, especifique o nome do dispositivo para a busca.');
    }

    const deviceName = args.join(' ');

    try {
      const url = `https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(deviceName)}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!response.data || !response.data.includes('section-body')) {
        return message.reply(`Nenhum dispositivo encontrado com o nome **${deviceName}**.`);
      }

      const match = response.data.match(/<h3.*?>(.*?)<\/h3>/);
      const title = match ? match[1] : 'Título não encontrado';

      const embed = new Discord.EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`Resultados para: ${deviceName}`)
        .setDescription(`Dispositivo encontrado: **${title}**\n[Veja mais detalhes](${url})`)
        .setFooter({ text: 'Dados obtidos do site GSMArena', iconURL: 'https://www.gsmarena.com/favicon.ico' });

      return message.reply({ embeds: [embed] });
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'], 10) || 60;
        console.log(`Bloqueado pelo servidor. Tentando novamente em ${retryAfter} segundos.`);
        return message.reply('O servidor bloqueou requisições temporariamente. Por favor, tente novamente mais tarde.');
      }

      console.error('Erro ao buscar dispositivo:', error);
      return message.reply('Houve um erro ao buscar as especificações. Tente novamente mais tarde.');
    }
  },
};
