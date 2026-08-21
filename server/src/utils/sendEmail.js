const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Define email options
  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || 'MessageMe App'}" <${process.env.EMAIL_FROM || 'noreply@messageme.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html, // Optional HTML version
  };

  // Send email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
