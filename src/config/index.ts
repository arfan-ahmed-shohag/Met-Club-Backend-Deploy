import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export const config = {
  node_env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  salt_rounds: process.env.SALT_ROUNDS,
  email: process.env.EMAIL,
  email_password: process.env.EMAIL_PASSWORD,
  email_host: process.env.EMAIL_HOST,
  email_port: process.env.EMAIL_PORT,
  jwt: {
    token_secret: process.env.TOKEN_SECRET,
    token_expires_in: process.env.TOKEN_EXPIRES_IN,
    refresh_token_secret: process.env.REFRESH_TOKEN_SECRET,
    refresh_token_expires_in: process.env.REFRESH_TOKEN_EXPIRES_IN,
    email_verification_token: process.env.EMAIL_VERIFICATION_TOKEN,
    email_verification_token_expires_in:
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN,
  },
};
