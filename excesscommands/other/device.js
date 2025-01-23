const Discord = require('discord.js');
const gsmarena = require('gsmarena-api'); // Biblioteca da API

module.exports = {
  name: 'device',
  description: 'Busca especificações de um dispositivo no GSMArena.',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, especifique o nome do dispositivo para a busca.');
    }

    const deviceName = args.join(' ');

    try {
      // Busca as especificações do dispositivo na API GSMArena
      const device = await gsmarena.search(deviceName);
      if (!device || device.length === 0) {
        return message.reply(`Nenhum dispositivo encontrado com o nome **${deviceName}**.`);
      }

      // Seleciona o primeiro resultado
      const deviceDetails = device[0];
      const embed = new Discord.EmbedBuilder()
        .setTitle(deviceDetails.title)
        .setURL(deviceDetails.url)
        .setColor('#3498db')
        .setThumbnail(deviceDetails.image)
        .addFields(
          { name: 'Lançamento', value: deviceDetails.release || 'N/A', inline: true },
          { name: 'Sistema Operacional', value: deviceDetails.os || 'N/A', inline: true },
          { name: 'Tela', value: deviceDetails.display || 'N/A', inline: false },
          { name: 'Processador', value: deviceDetails.chipset || 'N/A', inline: false },
          { name: 'Memória', value: deviceDetails.memory || 'N/A', inline: false },
          { name: 'Bateria', value: deviceDetails.battery || 'N/A', inline: false }
        )
        .setFooter({ text: 'Dados obtidos via GSMArena API', iconURL: 'https://www.gsmarena.com/favicon.ico' });

      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return message.reply('Houve um erro ao buscar as especificações. Tente novamente mais tarde.');
    }
  }
};
