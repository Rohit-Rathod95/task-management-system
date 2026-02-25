const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";

/**
 * Get validated key and IV from environment variables
 */
const getKeyAndIV = () => {
    const key = process.env.AES_KEY;
    const iv = process.env.AES_IV;

    if (!key || !iv) {
        throw new Error("AES_KEY and AES_IV must be set in environment variables");
    }

    if (Buffer.byteLength(key, "utf8") !== 32) {
        throw new Error("AES_KEY must be exactly 32 bytes");
    }

    if (Buffer.byteLength(iv, "utf8") !== 16) {
        throw new Error("AES_IV must be exactly 16 bytes");
    }

    return { key: Buffer.from(key, "utf8"), iv: Buffer.from(iv, "utf8") };
};

/**
 * Encrypt plaintext using AES-256-CBC
 * @param {string} text - Plaintext to encrypt
 * @returns {string} Encrypted text in hex format
 */
const encrypt = (text) => {
    if (!text) return null;

    const { key, iv } = getKeyAndIV();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return encrypted;
};

/**
 * Decrypt ciphertext using AES-256-CBC
 * @param {string} encryptedText - Hex-encoded ciphertext
 * @returns {string} Decrypted plaintext
 */
const decrypt = (encryptedText) => {
    if (!encryptedText) return null;

    try {
        const { key, iv } = getKeyAndIV();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

        let decrypted = decipher.update(encryptedText, "hex", "utf8");
        decrypted += decipher.final("utf8");

        return decrypted;
    } catch {
        throw new Error("Failed to decrypt data");
    }
};

module.exports = { encrypt, decrypt };
