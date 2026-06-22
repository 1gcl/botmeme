const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");

/**
 * Baixa um arquivo de uma URL para a pasta temp
 * @param {string} url - URL do arquivo
 * @param {string} ext - Extensão do arquivo (ex: 'mp4', 'mp3')
 * @returns {string} - Caminho completo do arquivo
 */
async function downloadFile(url, ext = 'tmp') {
    const id = Date.now();
    const filePath = path.join(os.tmpdir(), `rift_${id}.${ext}`);
    
    const response = await axios({ url, responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
    });
}

/**
 * Deleta um arquivo com segurança
 * @param {string} filePath - Caminho do arquivo
 */
function deleteFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error(`Erro ao deletar ${filePath}:`, err);
    }
}

module.exports = { downloadFile, deleteFile };
