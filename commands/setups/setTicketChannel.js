const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { ticketsCollection } = require('../../mongodb');
const cmdIcons = require('../../UI/icons/commandicons');

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
        .addStringOption(option =>
            option.setName('categoryid')
                .setDescription('The ID of the category where tickets will be created')
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
        const categoryId = interaction.options.getString('categoryid');
        const status = interaction.options.getBoolean('status');
        const guild = interaction.guild;

        if (serverId !== guild.id) {
            return interaction.reply({ content: 'The server ID provided does not match this server.', ephemeral: true });
        }

        const categoryChannel = guild.channels.cache.get(categoryId);
        if (!categoryChannel || categoryChannel.type !== 'GUILD_CATEGORY') {
            return interaction.reply({ content: 'Invalid category ID. Please provide a valid category ID.', ephemeral: true });
        }

        await ticketsCollection.updateOne(
            { serverId },
            {
                $set: {
                    serverId,
                    ticketChannelId: channelId,
                    adminRoleId,
                    categoryId,
                    status,
                    ownerId: guild.ownerId
                }
            },
            { upsert: true }
        );

        interaction.reply({
            content: `Ticket system updated successfully!\n- **Panel Channel:** <#${channelId}>\n- **Admin Role:** <@&${adminRoleId}>\n- **Category:** <#${categoryId}>\n- **Status:** ${status ? 'Enabled' : 'Disabled'}`,
            ephemeral: true
        });
    }
};
