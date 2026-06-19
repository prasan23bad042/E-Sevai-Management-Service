const supabase = require('../config/supabase');

const registerUser = async (
    fullName,
    email,
    password
) => {

    const {
        data,
        error
    } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error) {
        throw error;
    }

    const user = data.user;

    await new Promise(resolve =>
        setTimeout(resolve, 1000)
    );

    const {
        data: roleData,
        error: roleError
    } = await supabase
        .from('roles')
        .select('id')
        .eq('role_name', 'center_owner')
        .single();

    if (roleError) {
        throw roleError;
    }

    const {
        error: userRoleError
    } = await supabase
        .from('user_roles')
        .insert({
            user_id: user.id,
            role_id: roleData.id
        });

    if (userRoleError) {
        throw userRoleError;
    }

    return user;
};

const loginUser = async (
    email,
    password
) => {

    const {
        data,
        error
    } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        throw error;
    }

    const userId = data.user.id;

    const {
        data: roleRows,
        error: roleError
    } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

    if (roleError) {
        throw roleError;
    }

    return {
        user: data.user,
        session: data.session,
        roles: roleRows
    };
};

module.exports = {
    registerUser,
    loginUser
};