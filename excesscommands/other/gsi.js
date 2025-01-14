const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gsi')
    .setDescription('Exibe uma lista de GSIs disponíveis.'),

  async execute(interaction) {
    const githubToken = process.env.GITHUB_TOKEN;
    const repoUrl = 'https://api.github.com/repos/phhusson/treble_experimentations/wiki/Generic-System-Image-(GSI)-list';

    try {
      // Faz a requisição para obter os dados do repositório
      const response = await axios.get(repoUrl, {
        headers: { Authorization: `token ${githubToken}` },
      });

      const data = response.data;
      const devices = Object.keys(data); // Lista de dispositivos (chaves do JSON)

      if (devices.length === 0) {
        return interaction.reply({ content: 'Nenhum dispositivo encontrado.', ephemeral: true });
      }

      // Criando a lista de seleção (GSI)
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('select-gsi')
        .setPlaceholder('Selecione um dispositivo')
        .addOptions(
          devices.map(device => ({
            label: device,
            value: device,
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
          const selectedDevice = i.values[0];
          const deviceInfo = data[selectedDevice]; // Informações do dispositivo

          // Embed com as informações do dispositivo selecionado
          const embed = new EmbedBuilder()
            .setTitle(`Informações do Dispositivo: ${selectedDevice}`)
            .setDescription(deviceInfo)
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
