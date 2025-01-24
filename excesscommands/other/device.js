const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const gsmarena = require('gsmarena-api');

module.exports = {
  name: 'device',
  description: 'Busca especificações de um dispositivo no GSMArena.',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, especifique o nome do dispositivo para a busca.');
    }

    const deviceName = args.join(' ').toLowerCase();

    try {
      // Busca dispositivos pelo nome
      const results = await gsmarena.search.search(deviceName);
      if (!results || results.length === 0) {
        return message.reply(`Nenhum dispositivo encontrado com o nome **${deviceName}**.`);
      }

      if (results.length === 1) {
        // Apenas um dispositivo encontrado, envia detalhes direto
        const deviceDetails = await gsmarena.catalog.getDevice(results[0].id);
        return sendEmbed(deviceDetails, message);
      }

      // Vários dispositivos encontrados, cria menu de seleção
      const options = results.map(device => ({
        label: device.name,
        value: device.id,
        description: 'Clique para ver mais detalhes',
      }));

      const menu = new StringSelectMenuBuilder()
        .setCustomId('select_device')
        .setPlaceholder('Selecione um dispositivo')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(menu);

      const replyMessage = await message.reply({ content: 'Vários dispositivos encontrados:', components: [row] });

      const filter = interaction => interaction.customId === 'select_device' && interaction.user.id === message.author.id;
      const collector = replyMessage.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async interaction => {
        await interaction.deferUpdate();
        const selectedDeviceId = interaction.values[0];

        try {
          const deviceDetails = await gsmarena.catalog.getDevice(selectedDeviceId);
          await sendEmbed(deviceDetails, message);
        } catch (error) {
          console.error('Erro ao buscar detalhes do dispositivo:', error);
          await message.reply('Houve um erro ao buscar os detalhes do dispositivo selecionado.');
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          replyMessage.edit({ content: 'Tempo esgotado para selecionar um dispositivo.', components: [] });
        }
      });
    } catch (error) {
      console.error(error);
      return message.reply('Houve um erro ao buscar as especificações. Tente novamente mais tarde.');
    }
  },
};

// Função para enviar embed
async function sendEmbed(deviceDetails, message) {
  const truncate = (text, maxLength = 1024) => {
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
  };

  const quickSpecs = deviceDetails.quickSpec
    .slice(0, 5) // Mostra apenas 5 especificações rápidas
    .map(spec => `${spec.name}: ${spec.value}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle(deviceDetails.name)
    .setURL(`https://www.gsmarena.com/${deviceDetails.id}.php`)
    .setColor('#3498db')
    .setThumbnail(deviceDetails.img)
    .addFields(
      { name: 'Especificações Rápidas', value: truncate(quickSpecs) || 'N/A', inline: false }
    )
    .setFooter({
      text: 'Dados obtidos via GSMArena API',
      iconURL: 'https://www.gsmarena.com/favicon.ico',
    });

  await message.reply({ embeds: [embed] });
}
