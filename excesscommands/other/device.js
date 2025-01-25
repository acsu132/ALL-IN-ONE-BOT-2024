const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const puppeteer = require('puppeteer');

module.exports = {
  name: 'device',
  description: 'Busca especificações de um dispositivo no GSMArena.',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, especifique o nome do dispositivo para a busca.');
    }

    const deviceName = args.join(' ').toLowerCase();

    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      // Navega para a página de resultados do GSMArena
      const searchUrl = `https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(deviceName)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded' });

      // Extrai os resultados da busca
      const results = await page.evaluate(() => {
        const devices = [];
        const elements = document.querySelectorAll('.makers ul li a');

        elements.forEach(element => {
          devices.push({
            name: element.querySelector('strong span').textContent.trim(),
            link: element.href,
            img: element.querySelector('img').src,
          });
        });

        return devices;
      });

      if (results.length === 0) {
        await browser.close();
        return message.reply(`Nenhum dispositivo encontrado com o nome **${deviceName}**.`);
      }

      if (results.length === 1) {
        // Apenas um dispositivo encontrado, busca detalhes
        const deviceDetails = await fetchDeviceDetails(results[0].link, page);
        await browser.close();
        return sendEmbed(deviceDetails, message);
      }

      // Vários dispositivos encontrados, cria menu de seleção
      const options = results.map((device, index) => ({
        label: device.name,
        value: String(index),
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
        const selectedIndex = parseInt(interaction.values[0], 10);
        const deviceDetails = await fetchDeviceDetails(results[selectedIndex].link, page);
        await sendEmbed(deviceDetails, message);
      });

      collector.on('end', async collected => {
        if (collected.size === 0) {
          await replyMessage.edit({ content: 'Tempo esgotado para selecionar um dispositivo.', components: [] });
        }
        await browser.close();
      });
    } catch (error) {
      console.error(error);
      return message.reply('Houve um erro ao buscar as especificações. Tente novamente mais tarde.');
    }
  },
};

// Função para buscar detalhes do dispositivo
async function fetchDeviceDetails(link, page) {
  await page.goto(link, { waitUntil: 'domcontentloaded' });

  const details = await page.evaluate(() => {
    const quickSpecElements = document.querySelectorAll('.specs-cp dt, .specs-cp dd');
    const quickSpecs = [];

    for (let i = 0; i < quickSpecElements.length; i += 2) {
      quickSpecs.push({
        name: quickSpecElements[i].textContent.trim(),
        value: quickSpecElements[i + 1].textContent.trim(),
      });
    }

    return {
      name: document.querySelector('.specs-phone-name-title')?.textContent.trim() || 'Dispositivo',
      img: document.querySelector('.specs-photo-main img')?.src || '',
      quickSpecs,
    };
  });

  return details;
}

// Função para enviar embed
async function sendEmbed(deviceDetails, message) {
  const truncate = (text, maxLength = 1024) => {
    return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
  };

  const quickSpecs = deviceDetails.quickSpecs
    .slice(0, 5) // Mostra apenas 5 especificações rápidas
    .map(spec => `${spec.name}: ${spec.value}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setTitle(deviceDetails.name)
    .setURL(deviceDetails.link)
    .setColor('#3498db')
    .setThumbnail(deviceDetails.img)
    .addFields(
      { name: 'Especificações Rápidas', value: truncate(quickSpecs) || 'N/A', inline: false }
    )
    .setFooter({
      text: 'Dados obtidos via GSMArena',
      iconURL: 'https://www.gsmarena.com/favicon.ico',
    });

  await message.reply({ embeds: [embed] });
}
