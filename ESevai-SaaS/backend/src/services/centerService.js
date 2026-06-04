const supabase = require('../config/supabase');

const createCenter = async (
    userId,
    centerData
) => {

    const {
        name,
        address,
        district,
        state,
        pincode
    } = centerData;

    const {
        count,
        error: countError
    } = await supabase
        .from('centers')
        .select('*', {
            count: 'exact',
            head: true
        });

    if (countError) {
        throw countError;
    }

    const centerCode =
        'CTR' +
        String(count + 1)
            .padStart(4, '0');

    const {
        data: center,
        error: centerError
    } = await supabase
        .from('centers')
        .insert({
            center_code: centerCode,
            name,
            address,
            district,
            state,
            pincode,
            owner_id: userId
        })
        .select()
        .single();

    if (centerError) {
        throw centerError;
    }

    const {
        error: staffError
    } = await supabase
        .from('center_staff')
        .insert({
            center_id: center.id,
            user_id: userId,
            role: 'manager'
        });

    if (staffError) {
        throw staffError;
    }

    return center;

};

const getMyCenter = async (
    userId
) => {

    const {
        data,
        error
    } = await supabase
        .from('centers')
        .select('*')
        .eq('owner_id', userId);

    if (error) {
        throw error;
    }

    return data;

};

module.exports = {
    createCenter,
    getMyCenter
};