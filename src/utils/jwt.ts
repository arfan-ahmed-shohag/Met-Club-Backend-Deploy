import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import type { StringValue } from "ms";

export const jwtGenerator = ({
  userInfo,
  createSecretKey,
  expiresIn,
}: {
  userInfo: { email: string; role: string };
  createSecretKey: Secret;
  expiresIn: StringValue;
}) => {
  const token = jwt.sign(
    { email: userInfo.email, role: userInfo.role },
    createSecretKey,
    { expiresIn },
  );
  return token;
};

export const jwtVerifier = ({
  token,
  secretKey,
}: {
  token: string;
  secretKey: Secret;
}) => {
  const decoded = jwt.verify(token, secretKey) as JwtPayload;
  return decoded;
};
