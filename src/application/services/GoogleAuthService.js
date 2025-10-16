import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import UserRepositoryImpl from '../../infrastructure/repositories/UserRepositoryImpl.js';
import config from '../../config/config.js';

const userRepository = new UserRepositoryImpl();

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: config.googleClientId,
  clientSecret: config.googleClientSecret,
  callbackURL: '/api/auth/google/callback',
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user
    let user = await userRepository.findByGoogleId(profile.id);
    if (!user) {
      user = await userRepository.save({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        password: null,
      });
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

// JWT Strategy
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.jwtSecret,
},
async (jwtPayload, done) => {
  try {
    const user = await userRepository.findById(jwtPayload.userId);
    if (user) {
      return done(null, user);
    } else {
      return done(null, false); // User not found
    }
  } catch (error) {
    return done(error, false);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userRepository.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
