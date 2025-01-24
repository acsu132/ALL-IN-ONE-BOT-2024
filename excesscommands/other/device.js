const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('device')
        .setDescription('Busca informações de um dispositivo no GSMArena.')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('Nome do dispositivo a ser buscado')
                .setRequired(true)
        ),

    async execute(interaction) {
        const deviceName = interaction.options.getString('nome');

        // Defere a resposta para lidar com atrasos
        await interaction.deferReply();

        const url = `https://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=${encodeURIComponent(deviceName)}`;

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                },
            });

            // Verifica se a resposta contém o conteúdo esperado
            if (!response.data || !response.data.includes('section-body')) {
                return interaction.editReply('Nenhum dispositivo encontrado. Por favor, tente novamente com outro nome.');
            }

            // Busca simples no HTML (regex ou outro método para extrair detalhes)
            const match = response.data.match(/<h3.*?>(.*?)<\/h3>/);
            const title = match ? match[1] : 'Título não encontrado';

            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`Resultados para: ${deviceName}`)
                .setDescription(`Dispositivo encontrado: **${title}**\n[Veja mais detalhes](${url})`)
                .setFooter({ text: 'Dados obtidos do site GSMArena', iconURL: 'https://www.gsmarena.com/favicon.ico' });

            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            if (error.response && error.response.status === 429) {
                const retryAfter = parseInt(error.response.headers['retry-after'], 10) || 60;
                console.log(`Bloqueado pelo servidor. Tentando novamente em ${retryAfter} segundos.`);
                return interaction.editReply('O servidor bloqueou requisições temporariamente. Por favor, tente novamente mais tarde.');
            }

            console.error('Erro ao buscar dispositivo:', error);
            return interaction.editReply('Houve um erro ao buscar as especificações. Tente novamente mais tarde.');
        }
    },
};
