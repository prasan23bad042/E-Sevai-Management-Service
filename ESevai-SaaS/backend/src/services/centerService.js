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

    // Count existing centers

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

    // Create Center

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

    // Add owner as manager

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

module.exports = {
    createCenter
};