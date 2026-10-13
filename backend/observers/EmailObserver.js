const { sendReviewEmail } = require('../utils/sendMail');

class EmailObserver {
    async update(result) {
        await sendReviewEmail(result);
    }
}

module.exports = EmailObserver;
