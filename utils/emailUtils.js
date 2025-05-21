const nodemailer = require('nodemailer');
const { emailTemplates } = require('./emailTemplates');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter connection
transporter.verify(function (error, success) {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to take our messages');
  }
});

/**
 * Send an email using the specified template
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} template - Template name from emailTemplates
 * @param {Object} data - Data to be used in the template
 * @returns {Promise} - Promise that resolves when email is sent
 */
const sendEmail = async (to, subject, template, data) => {
  try {
    // Get the template function
    const templateFn = emailTemplates[template];
    if (!templateFn) {
      throw new Error(`Email template '${template}' not found`);
    }

    // Generate HTML content from template
    const html = templateFn(data);

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Your Store'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });

    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = {
  sendEmail
}; 