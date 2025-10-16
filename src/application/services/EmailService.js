import nodemailer from 'nodemailer';
import config from '../../config/config.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPassword,
      },
    });
  }

  async sendVerificationEmail(user, token) {
    this.transporter.verify(function (error, success) {
        if (error) {
          console.log(error);
        } else {
          console.log('Server is ready to take our messages');
        }
      });

    console.log("useruseruser", user , token)
      
    // const verificationUrl = `${config.baseUrl}/api/auth/verify-email?token=${token}`;
    const verificationUrl = token;
    const mailOptions = {
      from: config.smtpUser,
      to: user.email,
      subject: 'Email Verification',
      text: `Please enter the following Verification Code: ${verificationUrl}`,
    };

    try {
        await this.transporter.sendMail(mailOptions);
        console.log('Verification email sent');
      } catch (error) {
        console.error('Error sending email:', error.message);
      }
  }

  async sendForgotPasswordEmail(email, otp) {
    this.transporter.verify(function (error, success) {
      if (error) {
        console.log(error);
      } else {
        console.log('Server is ready to take our messages');
      }
    });


    const mailOptions = {
      from: config.smtpUser,
      to: email,
      subject: 'Your Password Reset OTP',
      text: `Please use the following OTP: ` + otp,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent');
    } catch (error) {
      console.error('Error sending email:', error.message);
    }
  }
}

export default new EmailService();
