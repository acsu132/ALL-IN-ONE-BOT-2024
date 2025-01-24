const Discord = require('discord.js');
const axios = require('axios');
const { JSDOM } = require('jsdom');

let isRequestActive = false; // Variável para limitar a uma requisição por comando

module.exports = {
  name: 'device',
  description: 'Busca especificações de um dispositivo no GSMArena.',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, especifique o nome do dispositivo para a busca.');
    }

    if (isRequestActive) {
      return message.reply('Uma requisição já está em andamento. Por favor, tente novamente em instantes.');
    }

    isRequestActive = true; // Marca a requisição como ativa
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
        const firstResult = results[0];
        const name = firstResult.querySelector('strong span').textContent.trim();
        const link = `https://www.gsmarena.com/${firstResult.href}`;
        const img = firstResult.querySelector('img').src;

        // Fazendo uma requisição detalhada para obter mais informações
        const detailsResponse = await axios.get(link, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        });

        const detailsDom = new JSDOM(detailsResponse.data);
        const specs = detailsDom.window.document.querySelectorAll('.specs-cp dt, .specs-cp dd');

        const specsText = [...specs]
          .map((elem, index) => {
            if (index % 2 === 0) {
              return `**${elem.textContent.trim()}**: `; // Título
            } else {
              return `${elem.textContent.trim()}\n`; // Valor
            }
          })
          .join('');

        const embed = new Discord.EmbedBuilder()
          .setColor('#3498db')
          .setTitle(name)
          .setURL(link)
          .setThumbnail(img)
          .setDescription(specsText.length > 4096 ? specsText.slice(0, 4093) + '...' : specsText)
          .setFooter({ text: 'Dados obtidos do site GSMArena', iconURL: 'https://www.gsmarena.com/favicon.ico' });

        return message.reply({ embeds: [embed] });
      } else {
        return message.reply(`Nenhum dispositivo encontrado com o nome **${device}**.`);
      }
    } catch (error) {
      console.error('Erro ao buscar dispositivo:', error);
      return message.reply('Houve um erro ao buscar as especificações. Tente novamente mais tarde.');
    } finally {
      isRequestActive = false; // Libera para novas requisições
    }
  },
};
