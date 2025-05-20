const nodemailer = require('nodemailer');
const { 
    getEmailTemplate, 
    contactFormTemplate, 
    contactConfirmationTemplate, 
    newsletterConfirmationTemplate 
} = require('./emailTemplates');

const sendEmail = async (to, subject, template, data) => {
    try {
        // Log environment variables (without exposing the full password)
        console.log('Email Configuration Check:');
        console.log('EMAIL_USER:', process.env.EMAIL_USER);
        console.log('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 'Not set');
        console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
        
        console.log('Attempting to send email to:', to);
        console.log('Email template:', template);
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            throw new Error('Email configuration is missing. Please check your .env file');
        }

        // Create email transporter with Gmail configuration
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false // Only use this in development
            }
        });

        // Verify transporter configuration
        console.log('Verifying SMTP connection...');
        await transporter.verify();
        console.log('SMTP connection verified successfully');

        let html;
        switch (template) {
            case 'contactForm':
                html = contactFormTemplate(data);
                break;
            case 'contactConfirmation':
                html = contactConfirmationTemplate(data);
                break;
            case 'newsletterConfirmation':
                html = newsletterConfirmationTemplate(data);
                break;
            default:
                html = getEmailTemplate(template, data);
        }

        if (!html) {
            throw new Error(`No email template found for template: ${template}`);
        }

        // Send email
        console.log('Sending email...');
        const mailOptions = {
            from: `"Your Store Name" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return true;
    } catch (error) {
        console.error('Detailed error sending email:', {
            error: error.message,
            stack: error.stack,
            emailConfig: {
                service: 'gmail',
                user: process.env.EMAIL_USER ? 'Set' : 'Not Set',
                pass: process.env.EMAIL_PASS ? 'Set' : 'Not Set',
                frontendUrl: process.env.FRONTEND_URL ? 'Set' : 'Not Set'
            }
        });
        throw error;
    }
};

module.exports = { sendEmail }; 