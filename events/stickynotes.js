const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Pasta onde os arquivos JSON estão armazenados
const EMBED_FOLDER = path.join(__dirname, 'embeds');

// Lista de palavras-chave e arquivos JSON correspondentes
const keywordToEmbedMap = {
    "ouvir música": "musica.json",
"baixar música": "musica.json",
    "tela de bloqueio": "tbloqueio.json",
    "filmes": "filmes.json",
    // Adicione mais palavras-chave e arquivos conforme necessário
};

// Cooldowns por usuário
const userCooldowns = {};

module.exports = {
    init: (client) => {
        client.on('messageCreate', async (message) => {
            // Verifica se a mensagem não é do bot
            if (message.author.bot) return;

            const userId = message.author.id;

            // Verifica se o usuário está em cooldown
            if (userCooldowns[userId]) {
                return; // Ignora se o usuário estiver em cooldown
            }

            // Itera pelas palavras-chave para encontrar correspondência
            for (const keyword in keywordToEmbedMap) {
                if (message.content.toLowerCase().includes(keyword.toLowerCase())) {
                    const embedFileName = keywordToEmbedMap[keyword];
                    const embedFilePath = path.join(EMBED_FOLDER, embedFileName);

                    // Verifica se o arquivo JSON existe
                    if (fs.existsSync(embedFilePath)) {
                        try {
                            const embedData = JSON.parse(fs.readFileSync(embedFilePath, 'utf-8'));

                            // Ajusta o JSON para criar um embed válido
                            const embed = new EmbedBuilder()
                                .setTitle(embedData.embeds[0].title || 'Título não fornecido')
                                .setDescription(embedData.embeds[0].description || 'Descrição não fornecida')
                                .setColor(embedData.embeds[0].color || 0xFFFFFF);

                            if (embedData.embeds[0].fields) {
                                embed.addFields(embedData.embeds[0].fields);
                            }

                            // Envia o embed no canal atual
                            await message.channel.send({ embeds: [embed] });

                            // Envia o embed no privado do usuário
                            await message.author.send({ embeds: [embed] });

                            // Adiciona o usuário ao cooldown
                            userCooldowns[userId] = true;

                            // Remove o cooldown após 1 hora
                            setTimeout(() => {
                                delete userCooldowns[userId];
                            }, 60 * 60 * 1000);
                        } catch (error) {
                            console.error(`Erro ao carregar o embed do arquivo ${embedFileName}:`, error);
                            message.channel.send('Desculpe, ocorreu um erro ao processar sua solicitação.');
                        }
                    } else {
                        console.warn(`Arquivo de embed não encontrado: ${embedFilePath}`);
                    }

                    break; // Para de procurar após encontrar a primeira correspondência
                }
            }
        });
    },
};
