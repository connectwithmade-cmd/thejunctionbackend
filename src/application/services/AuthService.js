import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../config/config.js';
import emailService from './EmailService.js';
import { OAuth2Client } from 'google-auth-library';


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async signUp({ name, userName, email, password }) {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User email already exists');
    }
    const existingUserName = await this.userRepository.findByUserName(userName);
    if (existingUserName) {
      throw new Error('Username already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const verificationToken = Math.floor(10000 + Math.random() * 90000).toString();

    const user = { name, email, userName, password: hashedPassword, verificationToken };
    const savedUser = await this.userRepository.save(user);
    await emailService.sendVerificationEmail(savedUser, verificationToken);
    return { message: 'Verification email sent. Please check your email.' };
  }

  async sendVerificationEmail({ email }) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
        throw new Error('User does not exist');
    }

    const verificationToken = Math.floor(10000 + Math.random() * 90000).toString();
    user.verificationToken = verificationToken;
    await this.userRepository.update(user);

    await emailService.sendVerificationEmail(user, verificationToken);
    return { message: 'Verification email sent successfully.' };
}

  async verifyEmail(email, code) {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }
      if (user.isVerified) {
        throw new Error('User is already verified');
      }
      if (user.verificationToken !== code) {
        throw new Error('Invalid verification code');
      }
      user.isVerified = true;
      user.verificationToken = null;
      await this.userRepository.update(user);
      return { message: 'Email verified successfully!' };
    } catch (err) {
      throw new Error(err.message || 'Verification failed');
    }
  }

  async signIn({ email, userName, password }) {
    let user = null;
    const userByEmail = await this.userRepository.findByEmail(email);
    if(userByEmail){
      user = userByEmail;
    }
    else {
      user = await this.userRepository.findByUserName(userName);
    }
    if (!user) {
      throw new Error('Invalid credentials');
    }
    if (user.isDeleted) {
      throw new Error('Account marked as Deleted.');
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const accessToken = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '60m' });
    const refreshToken = jwt.sign({ userId: user.id }, config.refreshTokenSecret, { expiresIn: '7d' });

    return { accessToken, refreshToken, userId: user.id, isProfileSetup: user.isProfileSetup, isEmailVerified: user.isVerified};
  }

async refreshAccessToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, config.refreshTokenSecret);
    const accessToken = jwt.sign(
      { userId: decoded.userId },
      config.jwtSecret,
      { expiresIn: '60m' }
    );
    return { accessToken };
  } catch (err) {
    throw new Error('Invalid refresh token');
  }
}


  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await this.userRepository.update(user);
  }

  async sendForgotPasswordOTP(email) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationToken = otp;
    user.resetOtpExpiry = otpExpiry;
    await this.userRepository.update(user);
    await emailService.sendForgotPasswordEmail(email, otp);
  }

  async verifyOtp(email, otp) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.verificationToken !== otp || user.resetOtpExpiry < new Date()) {
      throw new Error('Invalid or expired OTP');
    }
    return true;
  }

  async resetPasswordWithOtp(email, newPassword) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    if (!user.verificationToken || user.resetOtpExpiry < new Date()) {
      throw new Error('OTP verification required');
    }

    const hashedPassword = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    user.password = hashedPassword;
    user.verificationToken = null;
    user.resetOtpExpiry = null;
    await this.userRepository.update(user);
    return { message: 'Password reset successful' };
  }

  async markAccountAsDeleted(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.isDeleted = true;
    await this.userRepository.update(user);
  }


  async  handleGoogleMobileLogin(idToken) {
  if (!idToken) {
    throw new Error('Missing ID token');
  }

  // Verify token with Google
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const googleId = payload.sub;
  const email = payload.email;
  const name = payload.name;

  // Check if user exists by Google ID or email
  let user = await this.userRepository.findByGoogleId(googleId);
  if (!user) {
    user = await this.userRepository.findByEmail(email);
  }

  // Create new user if none found
  if (!user) {
    const verificationToken = Math.floor(10000 + Math.random() * 90000).toString();
    const userData = { googleId, password: null, name, email, verificationToken };
    user = await this.userRepository.save(userData);
    await emailService.sendVerificationEmail(user, verificationToken);
  }

  // Sign JWT tokens
  const accessToken = jwt.sign(
    { userId: user._id },
    config.jwtSecret,
    { expiresIn: '60m' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    config.refreshTokenSecret,
    { expiresIn: '7d' }
  );

  // Optionally save refreshToken in DB here if needed

  return { accessToken, refreshToken, user };
}


}

export default AuthService;
