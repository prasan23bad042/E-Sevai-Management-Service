const supabase = require('../config/supabase');
const notificationService = require('./notificationService');

const getAllCenters = async () => {

    const {
        data,
        error
    } = await supabase
        .from('centers')
        .select('*')
        .order('created_at', {
            ascending: false
        });

    if (error) {
        throw error;
    }

    return data;

};

const approveCenter = async (
    centerId
) => {

    const {
        data,
        error
    } = await supabase
        .from('centers')
        .update({
            status: 'approved'
        })
        .eq('id', centerId)
        .select()
        .single();

    if (error) {
        throw error;
    }

    // Trigger Notification to the center owner
    if (data && data.owner_id) {
        try {
            await notificationService.createNotification(data.owner_id, {
                type: 'Center Approved',
                title: 'Center Approved',
                message: `Your E-Sevai Center "${data.name}" (${data.center_code}) has been approved successfully.`,
                category: 'center',
                priority: 'high',
                referenceType: 'center',
                referenceId: centerId
            });
        } catch (err) {
            console.error('Failed to send center approval notification:', err.message);
        }
    }

    return data;

};

module.exports = {
    getAllCenters,
    approveCenter
};