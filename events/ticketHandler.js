const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { ticketsCollection } = require('../mongodb');
const cmdIcons = require('../UI/icons/commandicons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setticketchannel')
        .setDescription('Set the ticket system configuration for a server')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addStringOption(option =>
            option.setName('serverid')
                .setDescription('The ID of the server')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('channelid')
                .setDescription('The ID of the ticket panel channel')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('adminroleid')
                .setDescription('The ID of the admin role for tickets')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('status')
                .setDescription('Enable or disable the ticket system')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setDescription('You do not have permission to use this command.');
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const serverId = interaction.options.getString('serverid');
        const channelId = interaction.options.getString('channelid');
        const adminRoleId = interaction.options.getString('adminroleid');
        const status = interaction.options.getBoolean('status');
        const guild = interaction.guild;

        if (serverId !== guild.id) {
            return interaction.reply({ content: 'The server ID provided does not match this server.', ephemeral: true });
        }

        await ticketsCollection.updateOne(
            { serverId },
            {
                $set: {
                    serverId,
                    ticketChannelId: channelId,
                    adminRoleId,
                    status,
                    ownerId: guild.ownerId
                }
            },
            { upsert: true }
        );

        const ticketEmbed = new EmbedBuilder()
            .setTitle('🎟️ Sistema de Tickets')
            .setDescription('Selecione uma opção abaixo para abrir um ticket:')
            .setColor('#5865F2');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('ticket_select')
            .setPlaceholder('Escolha uma categoria de ticket')
            .addOptions([
                { label: 'Sugestão', value: 'suggestion', description: 'Envie uma sugestão para o servidor' },
                { label: 'Suporte', value: 'support', description: 'Abra um ticket para suporte' },
                { label: 'Denunciar', value: 'report', description: 'Reporte um usuário ou problema' },
                { label: 'Feedback', value: 'feedback', description: 'Dê um feedback sobre o servidor' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const ticketChannel = await guild.channels.fetch(channelId);
        if (ticketChannel) {
            await ticketChannel.send({ embeds: [ticketEmbed], components: [row] });
        }

        interaction.reply({
            content: `Ticket system updated successfully!\n- **Panel Channel:** <#${channelId}>\n- **Admin Role:** <@&${adminRoleId}>\n- **Status:** ${status ? 'Enabled' : 'Disabled'}`,
            ephemeral: true
        });
    }
};
