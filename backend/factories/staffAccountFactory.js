// factory method pattern for staff accounts
// products = the staff account types, creators = decide which product to build
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// product: a staff account with its role
class StaffAccount {
    constructor(role) {
        this.role = role;
    }

    toUserDocument({ email, username, passwordHash }) {
        return { email, username, passwordHash, role: this.role, gender: null };
    }
}

class SuperAdminAccount extends StaffAccount {
    constructor() {
        super('SUPER_ADMIN');
    }
}

class AdminManagerAccount extends StaffAccount {
    constructor() {
        super('ADMIN_MANAGER');
    }
}

class AdminAccount extends StaffAccount {
    constructor() {
        super('ADMIN');
    }
}

// creator: base class holds the factory method, subclasses pick the product
class StaffAccountCreator {
    // factory method, each subclass overrides this
    createAccount() {
        throw new Error('createAccount() must be implemented by a subclass');
    }

    // shared steps: build the product, hash the password, save the user
    async create({ email, username, password }) {
        const account = this.createAccount();
        const passwordHash = await bcrypt.hash(password, 10);

        return User.create(account.toUserDocument({ email, username, passwordHash }));
    }
}

class SuperAdminCreator extends StaffAccountCreator {
    createAccount() {
        return new SuperAdminAccount();
    }
}

class AdminManagerCreator extends StaffAccountCreator {
    createAccount() {
        return new AdminManagerAccount();
    }
}

class AdminCreator extends StaffAccountCreator {
    createAccount() {
        return new AdminAccount();
    }
}

const creators = {
    SUPER_ADMIN: new SuperAdminCreator(),
    ADMIN_MANAGER: new AdminManagerCreator(),
    ADMIN: new AdminCreator(),
};

// client asks for a creator by role, unknown role gives null
function getStaffCreator(role) {
    return Object.hasOwn(creators, role) ? creators[role] : null;
}

module.exports = {
    getStaffCreator,
    STAFF_ROLES: Object.keys(creators),
};
