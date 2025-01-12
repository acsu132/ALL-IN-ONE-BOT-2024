const axios = require('axios');
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'lfartag',
    description: 'Busca por um artista no repositório.',
    execute: async (message, args) => {
        const artistQuery = args.join(' ').toLowerCase(); // Converte para minúsculas para busca insensível a maiúsculas/minúsculas
        const owner = 'acsu132'; // Substitua pelo dono do repositório
        const repo = 'ProjectTag'; // Substitua pelo nome do repositório
        const githubToken = process.env.GITHUB_TOKEN;
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/Artists`;

        try {
            // Busca todos os artistas
            const { data: artists } = await axios.get(apiUrl, {
                headers: { Authorization: `token ${githubToken}` },
            });

            if (!Array.isArray(artists)) {
                message.reply('Erro ao acessar a lista de artistas.');
                return;
            }

            // Encontra o artista mais próximo
            const matchingArtist = artists.find(artist =>
                artist.name.toLowerCase().includes(artistQuery)
            );

            if (!matchingArtist) {
                message.reply('Nenhum artista encontrado correspondente à busca.');
                return;
            }

            const artistName = matchingArtist.name; // Nome real do artista
            const artistPath = matchingArtist.path;

            // Busca os álbuns e arquivos do artista
            const { data: artistContents } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${artistPath}`, {
                headers: { Authorization: `token ${githubToken}` },
            });

            // Procura por descrição e miniatura
            const descriptionFile = artistContents.find(file => file.name === 'artistdesc.txt');
            const thumbnailFile = artistContents.find(file => file.name === 'artistpfp.png');

            let description = 'Descrição não disponível.';
            let thumbnailUrl = null;

            if (descriptionFile) {
                const descResponse = await axios.get(descriptionFile.download_url);
                description = descResponse.data;
            }

            if (thumbnailFile) {
                thumbnailUrl = thumbnailFile.download_url;
            }

            // Filtra as pastas de álbuns
            const albumFolders = artistContents.filter(item => item.type === 'dir');

            if (albumFolders.length === 0) {
                message.reply('Nenhum álbum encontrado para este artista.');
                return;
            }

            // Cria uma pasta temporária
            const tempFolder = `./temp/${artistName}`;
            fs.mkdirSync(tempFolder, { recursive: true });

            // Baixa arquivos de cada álbum
            for (const album of albumFolders) {
                const { data: albumContents } = await axios.get(album.url, {
                    headers: { Authorization: `token ${githubToken}` },
                });

                const albumFolder = path.join(tempFolder, album.name);
                fs.mkdirSync(albumFolder, { recursive: true });

                for (const file of albumContents.filter(file => /\.(mp3|wav|m4a|ogg)$/i.test(file.name))) {
                    const fileResponse = await axios.get(file.download_url, { responseType: 'arraybuffer' });
                    const filePath = path.join(albumFolder, file.name);
                    fs.writeFileSync(filePath, fileResponse.data);
                }
            }

            // Cria o arquivo ZIP
            const zip = new AdmZip();
            zip.addLocalFolder(tempFolder);
            const zipPath = `./temp/${artistName}.zip`;
            zip.writeZip(zipPath);

            // Cria o embed com as informações do artista
            const embed = {
                title: `Músicas de ${artistName}`,
                description: description,
                thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
                color: 0x00ff00,
            };

            await message.reply({
                content: `Aqui está o arquivo ZIP com todas as músicas de ${artistName}:`,
                embeds: [embed],
                files: [zipPath],
            });

            // Remove os arquivos temporários
            fs.rmSync(tempFolder, { recursive: true, force: true });
            fs.unlinkSync(zipPath);

        } catch (error) {
            console.error('Erro ao processar o comando:', error.message);
            message.reply('Ocorreu um erro ao processar a solicitação.');
        }
    },
};
