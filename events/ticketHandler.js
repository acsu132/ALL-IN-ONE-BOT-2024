const { ticketsCollection } = require('../mongodb');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionsBitField, ChannelType } = require('discord.js');
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
        console.error('Error loading config from MongoDB:', err);
    }
}

setInterval(loadConfig, 5000);

module.exports = (client) => {
    client.on('ready', async () => {
        await loadConfig();
        for (const guildId of Object.keys(config.tickets)) {
            await checkAndSendPanel(client, guildId);
        }
    });

    client.on('interactionCreate', async (interaction) => {
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_type') {
            handleSelectMenu(interaction, client);
        } else if (interaction.isButton() && interaction.customId.startsWith('close_ticket_')) {
            handleCloseButton(interaction, client);
        } else if (interaction.isButton() && interaction.customId.startsWith('delete_ticket_')) {
            handleDeleteButton(interaction, client);
        }
    });

    client.on('messageDelete', async (message) => {
        const ticketData = await ticketsCollection.findOne({ ticketChannelId: message.channel.id });

        if (ticketData && message.author.id === client.user.id) {
            await ticketsCollection.updateOne(
                { serverId: ticketData.serverId },
                { $set: { status: false } }
            );
        }
    });
};

async function checkAndSendPanel(client, guildId) {
    const ticketData = await ticketsCollection.findOne({ serverId: guildId });

    if (!ticketData || !ticketData.status) return;

    const channel = await client.channels.fetch(ticketData.ticketChannelId).catch(() => null);
    if (!channel) return;

    const messages = await channel.messages.fetch({ limit: 10 }).catch(() => []);
    const existingPanel = messages.find(msg => msg.author.id === client.user.id);

    if (!existingPanel) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎫 Sistema de Tickets')
            .setDescription('Clique no botão abaixo para abrir um ticket.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('📩 Criar Ticket')
                .setStyle(ButtonStyle.Primary)
        );

        await channel.send({ embeds: [embed], components: [row] });
    }
}

async function handleSelectMenu(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const { guild, user, values } = interaction;
    if (!guild || !user) return;

    const guildId = guild.id;
    const userId = user.id;
    const ticketType = values[0];
    const settings = config.tickets[guildId];
    if (!settings) return;

    const ticketExists = await ticketsCollection.findOne({ guildId, userId });
    if (ticketExists) {
        return interaction.followUp({ content: 'Você já tem um ticket aberto.', ephemeral: true });
    }

    const ticketChannel = await guild.channels.create({
        name: `${user.username}-${ticketType}-ticket`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
            {
                id: guild.roles.everyone,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: userId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
            },
            {
                id: settings.adminRoleId,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
            }
        ]
    });

    const ticketId = `${guildId}-${ticketChannel.id}`;
    await ticketsCollection.insertOne({ id: ticketId, channelId: ticketChannel.id, guildId, userId, type: ticketType });

    const ticketEmbed = new EmbedBuilder()
        .setAuthor({
            name: "Ticket de Suporte",
            iconURL: ticketIcons.modIcon
        })
        .setDescription(`Olá ${user}, descreva o seu problema para que possamos ajudar.`)
        .setColor('#00FF00')
        .setTimestamp();

    const closeButton = new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketId}`)
        .setLabel('Fechar Ticket')
        .setStyle(ButtonStyle.Danger);

    const deleteButton = new ButtonBuilder()
        .setCustomId(`delete_ticket_${ticketId}`)
        .setLabel('Excluir Ticket (Admin)')
        .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder().addComponents(closeButton, deleteButton);

    await ticketChannel.send({ content: `${user}`, embeds: [ticketEmbed], components: [actionRow] });

    interaction.followUp({ content: 'Ticket criado com sucesso!', ephemeral: true });
}

async function handleCloseButton(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const ticketId = interaction.customId.replace('close_ticket_', '');
    const { guild } = interaction;

    const ticket = await ticketsCollection.findOne({ id: ticketId });
    if (!ticket) {
        return interaction.followUp({ content: 'Ticket não encontrado.', ephemeral: true });
    }

    const ticketChannel = guild.channels.cache.get(ticket.channelId);
    if (ticketChannel) {
        await ticketChannel.permissionOverwrites.edit(ticket.userId, {
            ViewChannel: false
        });

        interaction.followUp({ content: 'Ticket fechado com sucesso.', ephemeral: true });
    }
}

async function handleDeleteButton(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const ticketId = interaction.customId.replace('delete_ticket_', '');
    const { guild, member } = interaction;

    const ticket = await ticketsCollection.findOne({ id: ticketId });
    if (!ticket) {
        return interaction.followUp({ content: 'Ticket não encontrado.', ephemeral: true });
    }

    const settings = config.tickets[guild.id];
    if (!settings || !member.roles.cache.has(settings.adminRoleId)) {
        return interaction.followUp({ content: 'Você não tem permissão para excluir este ticket.', ephemeral: true });
    }

    const ticketChannel = guild.channels.cache.get(ticket.channelId);
    if (ticketChannel) {
        const messages = await ticketChannel.messages.fetch();
        const transcript = messages.map(m => `${m.author.tag}: ${m.content}`).join('\n');
        const transcriptPath = path.join(__dirname, `${ticketChannel.name}-transcript.txt`);

        fs.writeFileSync(transcriptPath, transcript);

        const adminUser = await client.users.fetch(settings.adminRoleId);
        if (adminUser) {
            await adminUser.send({
                content: 'Transcrição do ticket encerrado.',
                files: [transcriptPath]
            });
        }

        await ticketChannel.delete();
        await ticketsCollection.deleteOne({ id: ticketId });

        interaction.followUp({ content: 'Ticket excluído e transcrição enviada.', ephemeral: true });
    }
}
