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
      // Busca dispositivos pelo nome
      const results = await gsmarena.search.search(deviceName);
      if (!results || results.length === 0) {
        return message.reply(`Nenhum dispositivo encontrado com o nome **${deviceName}**.`);
      }

      // Seleciona o primeiro resultado
      const firstDevice = results[0];
      const deviceDetails = await gsmarena.catalog.getDevice(firstDevice.id);

      // Função para truncar texto longo
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
        .setURL(`https://www.gsmarena.com/${firstDevice.id}.php`)
        .setColor('#3498db')
        .setThumbnail(deviceDetails.img)
        .addFields(
          { name: 'Especificações Rápidas', value: truncate(quickSpecs) || 'N/A', inline: false },
          { name: 'Detalhes', value: truncate(detailSpecs) || 'N/A', inline: false }
        )
        .setFooter({ text: 'Dados obtidos via GSMArena API', iconURL: 'https://www.gsmarena.com/favicon.ico' });

      return message.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      return message.reply('Houve um erro ao buscar as especificações. Tente novamente mais tarde.');
    }
  }
};
