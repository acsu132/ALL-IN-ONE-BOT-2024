const { EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');
const { dynamicCard } = require("songcard");
const fs = require('fs');
const path = require('path');
const musicIcons = require('../UI/icons/musicicons');
const { Riffy } = require('riffy');

module.exports = (client) => {
    if (config.excessCommands.lavalink) {
        const nodes = [
            {
                host: config.lavalink.lavalink.host,
                password: config.lavalink.lavalink.password,
                port: config.lavalink.lavalink.port,
                secure: config.lavalink.lavalink.secure
            }
        ];

        client.riffy = new Riffy(client, nodes, {
            send: (payload) => {
                const guild = client.guilds.cache.get(payload.d.guild_id);
                if (guild) guild.shard.send(payload);
            },
            defaultSearchPlatform: "ytmsearch",
            restVersion: "v4",
        });

        client.riffy.on('nodeConnect', (node) => {
            console.log(`\x1b[34m[ LAVALINK CONNECTION ]\x1b[0m Node connected: \x1b[32m${node.name}\x1b[0m`);
        });

        client.riffy.on('nodeError', (node, error) => {
            console.error(`\x1b[31m[ LAVALINK ]\x1b[0m Node \x1b[32m${node.name}\x1b[0m had an error: \x1b[33m${error.message}\x1b[0m`);
        });

        client.riffy.on('trackStart', async (player, track) => {
            const channel = client.channels.cache.get(player.textChannel);
            
            try {
                // Disable previous message's buttons if exists
                if (player.currentMessageId) {
                    const oldMessage = await channel.messages.fetch(player.currentMessageId);
                    if (oldMessage) {
                        const disabledComponents = oldMessage.components.map(row => {
                            return new ActionRowBuilder().addComponents(
                                row.components.map(button => ButtonBuilder.from(button).setDisabled(true))
                            );
                        });
                        await oldMessage.edit({ components: disabledComponents });
                    }
                }

                // Creating song card with songcard package
               const { createCanvas, loadImage } = require('canvas');

async function createTransparentCard(track) {
    const canvas = createCanvas(900, 500); // Ajuste do tamanho do card
    const ctx = canvas.getContext('2d');

    // Fundo transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar a miniatura com bordas arredondadas
    const thumbnail = await loadImage(track.info.thumbnail);
    const thumbnailX = 20;
    const thumbnailY = 50;
    const thumbnailWidth = 180;
    const thumbnailHeight = 180;
    const borderRadius = 20;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(thumbnailX + borderRadius, thumbnailY);
    ctx.lineTo(thumbnailX + thumbnailWidth - borderRadius, thumbnailY);
    ctx.quadraticCurveTo(thumbnailX + thumbnailWidth, thumbnailY, thumbnailX + thumbnailWidth, thumbnailY + borderRadius);
    ctx.lineTo(thumbnailX + thumbnailWidth, thumbnailY + thumbnailHeight - borderRadius);
    ctx.quadraticCurveTo(thumbnailX + thumbnailWidth, thumbnailY + thumbnailHeight, thumbnailX + thumbnailWidth - borderRadius, thumbnailY + thumbnailHeight);
    ctx.lineTo(thumbnailX + borderRadius, thumbnailY + thumbnailHeight);
    ctx.quadraticCurveTo(thumbnailX, thumbnailY + thumbnailHeight, thumbnailX, thumbnailY + thumbnailHeight - borderRadius);
    ctx.lineTo(thumbnailX, thumbnailY + borderRadius);
    ctx.quadraticCurveTo(thumbnailX, thumbnailY, thumbnailX + borderRadius, thumbnailY);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(thumbnail, thumbnailX, thumbnailY, thumbnailWidth, thumbnailHeight);
    ctx.restore();

    // Título da música
    ctx.font = 'bold 40px "AfacadFlux-Regular"';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(track.info.title, 220, 100); // Reposicionado

    // Artista da música
    ctx.font = '30px "AfacadFlux-Regular"';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`by ${track.info.author}`, 220, 150); // Reposicionado

    // Solicitante
    ctx.font = '25px "AfacadFlux-Regular"';
    ctx.fillStyle = '#AAAAAA';
    ctx.fillText(`Requested by ${track.info.requester || "@All In One"}`, 220, 200); // Reposicionado

    return canvas.toBuffer(); // Retorna a imagem como buffer
}


// Usar a função para criar o card
const cardBuffer = await createTransparentCard(track);

// Cria o attachment com o buffer
const attachment = new AttachmentBuilder(cardBuffer, {
    name: 'songcard.png',
});



                const cardAttachment = new AttachmentBuilder(cardBuffer, {
    name: 'songcard.png',
});


                // Sending an embed with the song details and card image
                const embed = new EmbedBuilder()
                    .setAuthor({ name: "Now Streaming", iconURL: musicIcons.playerIcon, url: "https://discord.gg" })
                    .setDescription(`- Song name: **${track.info.title}**\n- Author: **${track.info.author}**`)
                    .setImage('attachment://songcard.png')
                    .setFooter({ text: 'Solta o som DJ!', iconURL: musicIcons.footerIcon })
                    .setColor('#8400ff');

                const buttonsRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('volume_up').setEmoji('🔊').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('volume_down').setEmoji('🔉').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('pause').setEmoji('⏸️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('resume').setEmoji('▶️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary)
                );

                const buttonsRow2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('clear_queue').setEmoji('🗑️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('show_queue').setEmoji('📜').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('shuffle').setEmoji('🔀').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('loop').setEmoji('🔁').setStyle(ButtonStyle.Secondary)
                );

                const message = await channel.send({
                    embeds: [embed],
                    files: [attachment],
                    components: [buttonsRow, buttonsRow2]
                });

                player.currentMessageId = message.id;
                
            } catch (error) {
                console.error('Error creating or sending song card:', error);
            }
        });

        client.riffy.on('queueEnd', (player) => {
            const channel = client.channels.cache.get(player.textChannel);
            const embed = new EmbedBuilder()
                .setAuthor({
                    name: "Queue is Empty",
                    iconURL: musicIcons.alertIcon,
                    url: "https://discord.gg"
                })
                .setDescription('**Leaving voice channel!**')
                .setFooter({ text: 'Solta o som DJ!', iconURL: musicIcons.footerIcon })
                .setColor('#8400ff');
            channel.send({ embeds: [embed] });
            player.destroy();
        });

        client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton()) return;

            const player = client.riffy.players.get(interaction.guildId);
            if (!player) return interaction.reply({ content: 'Nem há música tocando!', ephemeral: true });

            // Handle button interactions
            switch (interaction.customId) {
                case 'volume_up':
                    player.setVolume(Math.min(player.volume + 10, 100));
                    interaction.reply({ content: 'Aumentado!', ephemeral: true });
                    break;

                case 'volume_down':
                    player.setVolume(Math.max(player.volume - 10, 0));
                    interaction.reply({ content: 'Volume diminuido!', ephemeral: true });
                    break;

                case 'pause':
                    player.pause(true);
                    interaction.reply({ content: 'Player pausado.', ephemeral: true });
                    break;

                case 'resume':
                    player.pause(false);
                    interaction.reply({ content: 'Player resumido.', ephemeral: true });
                    break;

                case 'skip':
                    player.stop(); 
                    interaction.reply({ content: 'Música pulada :P.', ephemeral: true });
                    break;

                case 'stop':
                    player.destroy(); 
                    interaction.reply({ content: 'Parei a música e desconectei do canal de voz.', ephemeral: true });
                    break;

                case 'clear_queue':
                    player.queue.clear();
                    interaction.reply({ content: 'Comi a fila, estava deliciosa.', ephemeral: true });
                    break;

                case 'show_queue':
                    if (!player || !player.queue.length) {
                        return interaction.reply({ content: 'A fila está vazia.', ephemeral: true });
                    }
                    const queueEmbed = new EmbedBuilder()
                        .setTitle('Aqui estão as músicas da fila:')
                        .setColor('#00FF00')
                        .setDescription(
                            player.queue.map((track, index) => `${index + 1}. **${track.info.title}**`).join('\n')
                        );
                    await interaction.reply({ embeds: [queueEmbed], ephemeral: true });
                    break;

                case 'shuffle':
                    if (player.queue.size > 0) {
                        player.queue.shuffle();
                        interaction.reply({ content: 'Eu misturei a fila!', ephemeral: true });
                    } else {
                        interaction.reply({ content: 'Está tão vazio aqui...', ephemeral: true });
                    }
                    break;

                case 'loop':
                    let loopMode = player.loop || 'none';
                    if (loopMode === 'none') {
                        player.setLoop('track'); 
                        loopMode = 'track';
                    } else if (loopMode === 'track') {
                        player.setLoop('queue'); 
                        loopMode = 'queue';
                    } else {
                        player.setLoop('none'); 
                        loopMode = 'none';
                    }
                    interaction.reply({ content: `Loop mode set to: **${loopMode}**.`, ephemeral: true });
                    break;
            }
        });

        client.on('raw', d => client.riffy.updateVoiceState(d));

        client.once('ready', () => {
            console.log('\x1b[35m[ MUSIC 2 ]\x1b[0m', '\x1b[32mLavalink Music System Active ✅\x1b[0m');
            client.riffy.init(client.user.id);
        });
    } else {
        console.log('\x1b[31m[ MUSIC 2 ]\x1b[0m', '\x1b[31mLavalink Music System Disabled ❌\x1b[0m');
    }
};
