const supabase = require('../config/supabase');

const registerUser = async (
    fullName,
    email,
    password
) => {

    const { data, error } =
        await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });

    if (error) {
        throw error;
    }

    return data.user;
};

module.exports = {
    registerUser
};