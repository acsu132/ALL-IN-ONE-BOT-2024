const Discord = require('discord.js');
const axios = require('axios'); // Para buscar dados da web
const { JSDOM } = require('jsdom'); // Para manipular o HTML das páginas

module.exports = {
  name: 'device',
  description: 'Busca especificações de um dispositivo no GSMArena.',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, especifique o nome do dispositivo para a busca.');
    }

    const device = args.join(' ').toLowerCase();
    const url = `https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(device)}`;

    try {
      // Fazendo requisição para a página de resultados do GSMArena
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      const dom = new JSDOM(response.data);
      const results = [...dom.window.document.querySelectorAll('.makers ul li a')];

      if (results.length > 0) {
        const embeds = results.slice(0, 5).map(result => {
          const name = result.querySelector('strong span').textContent.trim();
          const link = `https://www.gsmarena.com/${result.href}`;
          const img = result.querySelector('img').src;

          return new Discord.EmbedBuilder()
            .setTitle(name)
            .setURL(link)
            .setThumbnail(img)
            .setColor('#3498db')
            .setDescription(`[Clique aqui para ver mais detalhes](${link})`);
        });

        return message.reply({ embeds });
      } else {
        return message.reply(`Nenhum dispositivo encontrado com o nome **${device}**.`);
      }
    } catch (error) {
      console.error('Erro ao buscar dispositivo:', error);
      return message.reply('Houve um erro ao buscar as especificações. Tente novamente mais tarde.');
    }
  },
};
