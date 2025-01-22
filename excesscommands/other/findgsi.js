const Discord = require('discord.js');
const axios = require('axios'); // Para buscar dados da web
const lang = require('../../events/loadLanguage');

module.exports = {
  name: 'findgsi',
  description: 'Encontra GSIs para o dispositivo especificado no repositório do Phhusson.',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, especifique o nome do dispositivo para a busca.');
    }

    const device = args.join(' ').toLowerCase();
    const url = 'https://github.com/phhusson/treble_experimentations/wiki/Generic-System-Image-%28GSI%29-list';

    try {
      // Fazendo requisição para a página
      const response = await axios.get(url);
      const pageContent = response.data;

      // Verifica se há o dispositivo na página
      const regex = new RegExp(device, 'i');
      const match = pageContent.match(regex);

      if (match) {
        const embed = new Discord.EmbedBuilder()
          .setTitle('Resultado da Busca por GSI')
          .setDescription(`GSIs encontrados para o dispositivo **${device}**.\n\n[Veja na Wiki](${url})`)
          .setColor('#00ff00');
        return message.reply({ embeds: [embed] });
      } else {
        return message.reply(`Nenhum GSI encontrado para o dispositivo **${device}**. Confira na [Wiki](${url}).`);
      }
    } catch (error) {
      console.error(error);
      return message.reply('Houve um erro ao buscar os GSIs. Tente novamente mais tarde.');
    }
  }
};
