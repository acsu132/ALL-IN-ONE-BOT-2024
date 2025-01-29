const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { ticketsCollection } = require('../../mongodb');
const cmdIcons = require('../../UI/icons/commandicons');
const ticketHandler = require('../../handlers/ticketHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setticketchannel')
        .setDescription('Set the ticket channel for a server')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
        .addStringOption(option =>
            option.setName('serverid')
                .setDescription('The ID of the server')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('channelid')
                .setDescription('The ID of the ticket channel')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('adminroleid')
                .setDescription('The ID of the admin role for tickets')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('status')
                .setDescription('The status of the ticket channel')
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
            return interaction.reply({ content: 'The server ID provided does not match the server ID of this server.', ephemeral: true });
        }

        if (!serverId || !channelId || !adminRoleId || status === null) {
            return interaction.reply({ content: 'Invalid input. Please provide valid server ID, channel ID, admin role ID, and status.', ephemeral: true });
        }

        const serverOwnerId = interaction.guild.ownerId;

        await ticketsCollection.updateOne(
            { serverId },
            {
                $set: {
                    serverId,
                    ticketChannelId: channelId,
                    adminRoleId,
                    status,
                    ownerId: serverOwnerId
                }
            },
            { upsert: true }
        );

        interaction.reply({ content: `Ticket channel updated successfully for server ID ${serverId}.`, ephemeral: true });

        if (status) {
            ticketHandler.sendTicketPanel(guild, channelId);
        }
    }
};
