const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gsi')
    .setDescription('Exibe uma lista de GSIs disponíveis.'),

  async execute(interaction) {
    const wikiUrl = 'https://github.com/phhusson/treble_experimentations/wiki/Generic-System-Image-(GSI)-list';

    try {
      // Faz a requisição para obter o HTML da página da wiki
      const response = await axios.get(wikiUrl);
      const html = response.data;

      // Usa o cheerio para processar o HTML
      const $ = cheerio.load(html);
      const devices = [];

      // Procura por dispositivos na página (ajuste o seletor conforme a estrutura da página)
      $('ul li a').each((index, element) => {
        const deviceName = $(element).text().trim();
        const deviceLink = $(element).attr('href');

        if (deviceName && deviceLink) {
          devices.push({ name: deviceName, link: `https://github.com${deviceLink}` });
        }
      });

      if (devices.length === 0) {
        return interaction.reply({ content: 'Nenhum dispositivo encontrado.', ephemeral: true });
      }

      // Criando a lista de seleção (GSI)
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select-gsi')
        .setPlaceholder('Selecione um dispositivo')
        .addOptions(
          devices.map(device => ({
            label: device.name,
            value: device.link,
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      // Envia o embed com a lista de seleção
      await interaction.reply({
        content: 'Selecione um dispositivo da lista abaixo:',
        components: [row],
        ephemeral: true,
      });

      // Coletor para lidar com as seleções
      const collector = interaction.channel.createMessageComponentCollector({
        componentType: 'SELECT_MENU',
        time: 60000, // 60 segundos
      });

      collector.on('collect', async i => {
        if (i.customId === 'select-gsi') {
          const selectedLink = i.values[0];

          // Embed com o link para o dispositivo selecionado
          const embed = new EmbedBuilder()
            .setTitle('Informações do Dispositivo')
            .setDescription(`Clique [aqui](${selectedLink}) para acessar as informações completas do dispositivo.`)
            .setColor('#0099ff');

          await i.reply({ embeds: [embed], ephemeral: true });
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          interaction.followUp({ content: 'Tempo esgotado para seleção.', ephemeral: true });
        }
      });
    } catch (error) {
      console.error('Erro ao executar o comando:', error);
      interaction.reply({ content: 'Ocorreu um erro ao processar sua solicitação.', ephemeral: true });
    }
  },
};

      
