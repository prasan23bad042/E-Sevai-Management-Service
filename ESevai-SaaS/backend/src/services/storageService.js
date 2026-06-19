const supabase = require('../config/supabase');

/**
 * Uploads a file buffer to a specific Supabase storage bucket.
 * @param {string} bucketName - Name of the bucket (e.g. 'application-documents')
 * @param {string} storagePath - Destination path inside the bucket
 * @param {Buffer} fileBuffer - The file data buffer
 * @param {string} mimeType - The file's MIME type
 * @returns {Promise<Object>} - Supabase upload response
 */
const uploadFile = async (bucketName, storagePath, fileBuffer, mimeType) => {
    const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, fileBuffer, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: true
        });

    if (error) {
        throw error;
    }
    return data;
};

/**
 * Generates a time-limited signed URL for download from a private storage bucket.
 * @param {string} bucketName - Name of the bucket
 * @param {string} storagePath - Path inside the bucket
 * @param {number} expirySeconds - URL expiration time in seconds (default: 300)
 * @returns {Promise<string>} - The signed download URL
 */
const generateSignedUrl = async (bucketName, storagePath, expirySeconds = 300) => {
    const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(storagePath, expirySeconds);

    if (error || !data) {
        throw error || new Error('Failed to generate signed URL for storage path');
    }
    return data.signedUrl;
};

module.exports = {
    uploadFile,
    generateSignedUrl
};
