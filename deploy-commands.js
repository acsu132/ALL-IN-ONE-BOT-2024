const { REST, Routes } = require('discord.js');
require('dotenv').config(); // Carrega as variáveis de ambiente do .env
const fs = require('fs');

const clientId = 1212485388434935818; // ID do cliente (bot)
const token = process.env.TOKEN; // Token do bot

if (!clientId || !token) {
    console.error('CLIENT_ID ou TOKEN não configurados no .env!');
    process.exit(1); // Encerra o processo com erro
}

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js')); // Ajuste o caminho conforme sua estrutura

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data) {
        commands.push(command.data.toJSON());
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Registrando (ou atualizando) comandos no Discord...');
        await rest.put(Routes.applicationCommands(clientId), { body: commands });
        console.log('Comandos registrados com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comandos:', error);
    }
})();
