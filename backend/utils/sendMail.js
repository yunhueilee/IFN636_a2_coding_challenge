// send the review result to the learner
// if SMTP is not set, just print it so we can still demo locally
async function sendReviewEmail({ to, challengeTitle, attemptNumber, decision, feedback }) {
    const subject = 'Review result: ' + (challengeTitle || 'your challenge');
    const resultText = decision === 'PASS' ? 'PASS' : 'REVISION REQUIRED';
    const text =
        'Your attempt ' +
        attemptNumber +
        ' for ' +
        (challengeTitle || 'the challenge') +
        ' was reviewed.\n\nResult: ' +
        resultText +
        '\n\nFeedback:\n' +
        feedback;

    if (!process.env.SMTP_HOST) {
        console.log('Review email (not sent, no SMTP_HOST):', to);
        console.log(subject);
        console.log(text);
        return;
    }

    let nodemailer
    try {
        nodemailer = require('nodemailer');
    } catch (error) {
        console.log('Review email (not sent, nodemailer missing):', to);
        console.log(subject);
        console.log(text);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
            ? {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASS,
              }
            : undefined,
    });

    await transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@ccp.local',
        to,
        subject,
        text,
    });
}

module.exports = {
    sendReviewEmail,
};
