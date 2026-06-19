const {
    registerUser,
    loginUser
} = require('../services/authService');
const supabase = require('../config/supabase');

const register = async (
    req,
    res
) => {

    try {

        const {
            fullName,
            email,
            password
        } = req.body;

        const user =
            await registerUser(
                fullName,
                email,
                password
            );

        res.status(201).json({
            success: true,
            message:
                'Center owner created successfully',
            user
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const login = async (
    req,
    res
) => {

    try {

        const {
            email,
            password
        } = req.body;

        const result =
            await loginUser(
                email,
                password
            );

        const userId = result.user.id;

        // Fetch name and role from database
        const { data: dbUser } = await supabase
            .from('users')
            .select('role, full_name')
            .eq('id', userId)
            .single();

        // Fetch center_id/tenant_id
        let centerId = null;
        if (dbUser) {
            if (dbUser.role === 'center_owner') {
                const { data: center } = await supabase
                    .from('centers')
                    .select('id')
                    .eq('owner_id', userId)
                    .limit(1)
                    .maybeSingle();
                centerId = center?.id || null;
            } else if (dbUser.role === 'manager' || dbUser.role === 'staff') {
                const { data: staff } = await supabase
                    .from('center_staff')
                    .select('center_id')
                    .eq('user_id', userId)
                    .eq('is_active', true)
                    .limit(1)
                    .maybeSingle();
                centerId = staff?.center_id || null;
            }
        }

        res.json({
            success: true,
            data: {
                token: result.session.access_token,
                user: {
                    id: userId,
                    email: result.user.email,
                    role: dbUser?.role || result.role || 'staff',
                    name: dbUser?.full_name || 'Staff User',
                    tenant_id: centerId
                }
            }
        });

    } catch (error) {

        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

const getCurrentUser = async (
    req,
    res
) => {

    try {

        const userId = req.user.id;

        // Fetch details from users table
        const { data: dbUser, error: dbUserError } = await supabase
            .from('users')
            .select('role, full_name')
            .eq('id', userId)
            .single();

        if (dbUserError || !dbUser) {
            return res.status(404).json({
                success: false,
                message: 'User profile not found in database users table'
            });
        }

        // Fetch center_id/tenant_id
        let centerId = null;
        if (dbUser.role === 'center_owner') {
            const { data: center } = await supabase
                .from('centers')
                .select('id')
                .eq('owner_id', userId)
                .limit(1)
                .maybeSingle();
            centerId = center?.id || null;
        } else if (dbUser.role === 'manager' || dbUser.role === 'staff') {
            const { data: staff } = await supabase
                .from('center_staff')
                .select('center_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle();
            centerId = staff?.center_id || null;
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: userId,
                    email: req.user.email,
                    role: dbUser.role,
                    name: dbUser.full_name,
                    tenant_id: centerId
                }
            }
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};

module.exports = {
    register,
    login,
    getCurrentUser
};