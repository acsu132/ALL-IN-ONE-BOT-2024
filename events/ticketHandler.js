const { ticketsCollection } = require('../mongodb');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, ChannelType } = require('discord.js');
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
        //console.error('Error loading config from MongoDB:', err);
    }
}

setInterval(loadConfig, 5000);

module.exports = (client) => {
    client.on('ready', async () => {
        await loadConfig();
        monitorConfigChanges(client);
    });

    client.on('interactionCreate', async (interaction) => {
        if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_type') {
            handleSelectMenu(interaction, client);
        } else if (interaction.isButton() && interaction.customId.startsWith('close_ticket_')) {
            handleCloseButton(interaction, client);
        }
    });
};

async function monitorConfigChanges(client) {
    let previousConfig = JSON.parse(JSON.stringify(config));

    setInterval(async () => {
        await loadConfig();
        if (JSON.stringify(config) !== JSON.stringify(previousConfig)) {
            for (const guildId of Object.keys(config.tickets)) {
                const settings = config.tickets[guildId];
                const previousSettings = previousConfig.tickets[guildId];

                if (settings && settings.status && settings.ticketChannelId && (!previousSettings || settings.ticketChannelId !== previousSettings.ticketChannelId)) {
                    const guild = client.guilds.cache.get(guildId);
                    if (!guild) continue;

                    const ticketChannel = guild.channels.cache.get(settings.ticketChannelId);
                    if (!ticketChannel) continue;

          
                    const embed = new EmbedBuilder()
                        .setAuthor({
                            name: "Welcome to Ticket Support",
                            iconURL: ticketIcons.mainIcon,
                            url: "https://discord.gg/xQF9f9yUEM"
                        })
                        .setDescription('- Escolha uma opção no menu para criar um ticket.\n\n' +
                            '**Regras nos tickets:**\n' +
                            '- Tickets vazios não são permitidos.\n' +
                            '- Por favor, seja paciente, você receberá uma resposta o mais rápido possível.')
                        .setFooter({ text: 'Estamos aqui para ajudar!', iconURL: ticketIcons.modIcon })
                        .setColor('#00FF00')
                        .setTimestamp();
                    .setImage('https://media.discordapp.net/attachments/1284876311516680282/1331623009370378372/125_Sem_Titulo_20250122105359.png?ex=67924a11&is=6790f891&hm=f51bed7a396f2abc18e645b0efe5080e3dd3db92be469c997ae079dc75f9f0a4&=&width=743&height=397')

                    const menu = new StringSelectMenuBuilder()
                        .setCustomId('select_ticket_type')
                        .setPlaceholder('Choose ticket type')
                        .addOptions([
                            { label: '🆘 Suporte', value: 'support' },
                            { label: '📂 Sugestão', value: 'suggestion' },
                            { label: '💜 Feedback', value: 'feedback' },
                            { label: '⚠️ Denunciar', value: 'report' }
                        ]);

                    const row = new ActionRowBuilder().addComponents(menu);

                    await ticketChannel.send({
                        embeds: [embed],
                        components: [row]
                    });

                    previousConfig = JSON.parse(JSON.stringify(config));
                }
            }
        }
    }, 5000);
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
            name: "Ticket de suporte",
            iconURL: ticketIcons.modIcon,
            url: "https://discord.gg/xQF9f9yUEM"
        })
        .setDescription(`Olá ${user}, Bem-vindo ao nosso suporte!\n- Por favor descreva o seu problema! \n- Você receberá uma resposta logo logo.\n- Sinta-se livre para abrir outro ticket se este for fechado.`)
        .setFooter({ text: 'Sua satisfação é nossa prioridade.', iconURL: ticketIcons.heartIcon })
        .setColor('#00FF00')
        .setTimestamp();

    const closeButton = new ButtonBuilder()
        .setCustomId(`close_ticket_${ticketId}`)
        .setLabel('Fechar Ticket')
        .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder().addComponents(closeButton);

    await ticketChannel.send({ content: `${user}`, embeds: [ticketEmbed], components: [actionRow] });

    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setAuthor({ 
            name: "Ticket Criado!", 
            iconURL: ticketIcons.correctIcon,
            url: "https://discord.gg/xQF9f9yUEM"
        })
        .setDescription(`- Seu ticket de ${ticketType} foi criado.`)
        .addFields(
            { name: 'Ticket Channel', value: `${ticketChannel.url}` },
            { name: 'Instructions', value: 'Por favor descreva seu problema.' }
        )
        .setTimestamp()
        .setFooter({ text: 'Obrigado por nos contatar!', iconURL: ticketIcons.modIcon });

    await user.send({ content: `Seu ticket de ${ticketType} foi criado`, embeds: [embed] });

    interaction.followUp({ content: 'Ticket criado!', ephemeral: true });
}

async function handleCloseButton(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const ticketId = interaction.customId.replace('close_ticket_', '');
    const { guild, user } = interaction;
    if (!guild || !user) return;

    const ticket = await ticketsCollection.findOne({ id: ticketId });
    if (!ticket) {
        return interaction.followUp({ content: 'Ticket não encontrado, por favor, reporte ao administrador.', ephemeral: true });
    }

    const ticketChannel = guild.channels.cache.get(ticket.channelId);
    if (ticketChannel) {
        setTimeout(async () => {
            await ticketChannel.delete().catch(console.error);
        }, 5000);
    }

    await ticketsCollection.deleteOne({ id: ticketId });

    const ticketUser = await client.users.fetch(ticket.userId);
    if (ticketUser) {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setAuthor({ 
                name: "Ticket fechado!", 
                iconURL: ticketIcons.correctrIcon,
                url: "https://discord.gg/xQF9f9yUEM"
            })
            .setDescription(`- Seu ticket foi fechado.`)
            .setTimestamp()
            .setFooter({ text: 'Obrigado por nos contatar!', iconURL: ticketIcons.modIcon });

        await ticketUser.send({ content: `Seu ticket foi fechado.`, embeds: [embed] });
    }

    interaction.followUp({ content: 'Ticket fechado e usuário notificado.', ephemeral: true });
}
