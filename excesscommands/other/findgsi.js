const Discord = require('discord.js');
const axios = require('axios'); // Para buscar dados da web
const { JSDOM } = require('jsdom'); // Para manipular o HTML das páginas

module.exports = {
  name: 'findgsi',
  description: 'Encontra GSIs para o dispositivo especificado nas páginas do repositório.',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, especifique o nome do dispositivo para a busca.');
    }

    const device = args.join(' ').toLowerCase();
    const url = 'https://github.com/phhusson/treble_experimentations/wiki/Generic-System-Image-%28GSI%29-list';

    try {
      // Fazendo requisição para obter a lista de páginas
      const response = await axios.get(url);
      const dom = new JSDOM(response.data);
      const links = [...dom.window.document.querySelectorAll('.wiki-pages-box .wiki-page-link')];

      // Filtrando os links que contêm o nome do dispositivo
      const matchingLinks = links.filter(link =>
        link.textContent.toLowerCase().includes(device)
      );

      if (matchingLinks.length > 0) {
        const embed = new Discord.EmbedBuilder()
          .setTitle(`Resultados para "${device}"`)
          .setColor('#00ff00')
          .setDescription(
            matchingLinks
              .map(link => `[${link.textContent.trim()}](https://github.com${link.href})`)
              .join('\n')
          );

        return message.reply({ embeds: [embed] });
      } else {
        return message.reply(`Nenhuma página encontrada para o dispositivo **${device}**.`);
      }
    } catch (error) {
      console.error(error);
      return message.reply('Houve um erro ao buscar as páginas. Tente novamente mais tarde.');
    }
  }
};
