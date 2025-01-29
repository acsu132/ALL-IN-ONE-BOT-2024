const { ticketsCollection } = require('../mongodb');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ticketIcons = require('../UI/icons/ticketicons');

let config = {};

async function loadConfig() {
    try {
        const tickets = await ticketsCollection.find({}).toArray();
        config.tickets = tickets.reduce((acc, ticket) => {
            acc[ticket.serverId] = {
                ticketChannelId: ticket.ticketChannelId,
                adminRoleId: ticket.adminRoleId,
                status: ticket.status
            };
            return acc;
        }, {});
    } catch (err) {
        console.error('Erro ao carregar configuração:', err);
    }
}

setInterval(loadConfig, 5000);

module.exports = (client) => {
    client.on('ready', async () => {
        await loadConfig();
    });

    client.on('interactionCreate', async (interaction) => {
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_type') {
            handleSelectMenu(interaction);
        } else if (interaction.isButton()) {
            if (interaction.customId.startsWith('close_ticket_')) {
                handleCloseTicket(interaction);
            } else if (interaction.customId.startsWith('reopen_ticket_')) {
                handleReopenTicket(interaction);
            } else if (interaction.customId.startsWith('delete_ticket_')) {
                handleDeleteTicket(interaction);
            } else if (interaction.customId.startsWith('transcribe_ticket_')) {
                handleTranscribeTicket(interaction);
            }
        }
    });
};

async function handleSelectMenu(interaction) {
    const selectedType = interaction.values[0];
    const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            }
        ]
    });

    await ticketsCollection.insertOne({ id: ticketChannel.id, userId: interaction.user.id, channelId: ticketChannel.id });
    interaction.reply({ content: `Ticket criado: ${ticketChannel}`, ephemeral: true });
}

async function handleCloseTicket(interaction) {
    const ticketId = interaction.customId.replace('close_ticket_', '');
    const ticket = await ticketsCollection.findOne({ id: ticketId });
    if (!ticket) return interaction.reply({ content: 'Ticket não encontrado.', ephemeral: true });

    const ticketChannel = interaction.guild.channels.cache.get(ticket.channelId);
    if (ticketChannel) {
        await ticketChannel.permissionOverwrites.edit(ticket.userId, { ViewChannel: false });
    }
    interaction.reply({ content: 'Ticket fechado!', ephemeral: true });
}

async function handleReopenTicket(interaction) {
    const ticketId = interaction.customId.replace('reopen_ticket_', '');
    const ticket = await ticketsCollection.findOne({ id: ticketId });
    if (!ticket) return interaction.reply({ content: 'Ticket não encontrado.', ephemeral: true });

    const ticketChannel = interaction.guild.channels.cache.get(ticket.channelId);
    if (ticketChannel) {
        await ticketChannel.permissionOverwrites.edit(ticket.userId, { ViewChannel: true });
    }
    interaction.reply({ content: 'Ticket reaberto!', ephemeral: true });
}

async function handleDeleteTicket(interaction) {
    const ticketId = interaction.customId.replace('delete_ticket_', '');
    const ticket = await ticketsCollection.findOne({ id: ticketId });
    if (!ticket) return interaction.reply({ content: 'Ticket não encontrado.', ephemeral: true });

    const settings = config.tickets[interaction.guild.id];
    if (!interaction.member.roles.cache.has(settings.adminRoleId)) {
        return interaction.reply({ content: 'Apenas administradores podem excluir tickets.', ephemeral: true });
    }

    const ticketChannel = interaction.guild.channels.cache.get(ticket.channelId);
    if (ticketChannel) await ticketChannel.delete();
    await ticketsCollection.deleteOne({ id: ticketId });
    interaction.reply({ content: 'Ticket excluído permanentemente!', ephemeral: true });
}

async function handleTranscribeTicket(interaction) {
    const ticketId = interaction.customId.replace('transcribe_ticket_', '');
    const ticket = await ticketsCollection.findOne({ id: ticketId });
    if (!ticket) return interaction.reply({ content: 'Ticket não encontrado.', ephemeral: true });

    const settings = config.tickets[interaction.guild.id];
    if (!interaction.member.roles.cache.has(settings.adminRoleId)) {
        return interaction.reply({ content: 'Apenas administradores podem transcrever tickets.', ephemeral: true });
    }

    const ticketChannel = interaction.guild.channels.cache.get(ticket.channelId);
    if (!ticketChannel) return interaction.reply({ content: 'Canal do ticket não encontrado.', ephemeral: true });

    const messages = await ticketChannel.messages.fetch({ limit: 100 });
    const transcript = messages.map(m => `${m.author.tag}: ${m.content}`).reverse().join('\n');

    const filePath = path.join(__dirname, `transcript-${ticketId}.txt`);
    fs.writeFileSync(filePath, transcript);

    interaction.reply({ content: 'Transcrição criada!', files: [filePath], ephemeral: true });
}
