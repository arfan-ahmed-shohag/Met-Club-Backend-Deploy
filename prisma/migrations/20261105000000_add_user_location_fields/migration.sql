-- Store the complete registration location without changing existing users.
ALTER TABLE "User"
ADD COLUMN "division" TEXT,
ADD COLUMN "thana" TEXT;
