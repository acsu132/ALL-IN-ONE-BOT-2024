const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const HttpsProxyAgent = require('https-proxy-agent');

module.exports = {
  name: 'device',
  description: 'Busca especificações de um dispositivo no GSMArena.',

  async execute(message, args) {
    if (args.length === 0) {
      return message.reply('Por favor, especifique o nome do dispositivo para a busca.');
    }

    const deviceName = args.join(' ').toLowerCase();
    const searchUrl = `https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(deviceName)}`;

    // Lista de proxies da imagem
    const proxies = [
      'http://67.43.228.251:7365',
      'http://91.92.155.207:3128',
      'http://62.84.245.79:80',
      'http://8.210.17.35:80',
      'http://217.182.210.152:80',
      'http://219.65.73.81:80',
      'http://63.143.57.115:80',
      'http://44.218.183.55:80',
      'http://3.136.29.104:80',
      'http://3.71.239.218:3128',
      'http://3.127.62.252:80',
    ];

    // Função para escolher um proxy aleatório
    const getRandomProxy = () => {
      const randomIndex = Math.floor(Math.random() * proxies.length);
      const proxyUrl = proxies[randomIndex];
      const [protocol, rest] = proxyUrl.split('://');

      // Verificar se há autenticação no proxy
      if (rest.includes('@')) {
        const [auth, host] = rest.split('@');
        const [username, password] = auth.split(':');
        const [hostname, port] = host.split(':');

        return {
          protocol,
          hostname,
          port: parseInt(port, 10),
          auth: { username, password },
        };
      } else {
        const [hostname, port] = rest.split(':');
        return {
          protocol,
          hostname,
          port: parseInt(port, 10),
        };
      }
    };

    try {
      // Escolher proxy para a requisição
      const proxy = getRandomProxy();
      const httpsAgent = new HttpsProxyAgent(proxy);

      // Fazer requisição usando o proxy
      const response = await axios.get(searchUrl, { httpsAgent });
      const $ = cheerio.load(response.data);

      // Extraindo os resultados da busca
      const results = [];
      $('.makers ul li a').each((i, element) => {
        results.push({
          name: $(element).find('strong span').text().trim(),
          link: `https://www.gsmarena.com/${$(element).attr('href')}`,
          img: $(element).find('img').attr('src'),
        });
      });

      if (results.length === 0) {
        return message.reply(`Nenhum dispositivo encontrado com o nome **${deviceName}**.`);
      }

      if (results.length === 1) {
        // Apenas um dispositivo encontrado, busca detalhes
        const deviceDetails = await fetchDeviceDetails(results[0].link, httpsAgent);
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
        const deviceDetails = await fetchDeviceDetails(results[selectedIndex].link, httpsAgent);
        await sendEmbed(deviceDetails, message);
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

// Função para buscar detalhes do dispositivo
async function fetchDeviceDetails(link, httpsAgent) {
  const response = await axios.get(link, { httpsAgent });
  const $ = cheerio.load(response.data);

  const quickSpecs = [];
  $('.specs-cp dt, .specs-cp dd').each((i, element) => {
    if (i % 2 === 0) {
      quickSpecs.push({ name: $(element).text().trim() });
    } else {
      quickSpecs[quickSpecs.length - 1].value = $(element).text().trim();
    }
  });

  return {
    name: $('.specs-phone-name-title').text().trim() || 'Dispositivo',
    img: $('.specs-photo-main img').attr('src') || '',
    quickSpecs,
    link,
  };
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
