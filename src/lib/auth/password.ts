import bcrypt from "bcryptjs";

export const hashPassword = (plain: string) => bcrypt.hash(plain, 11);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
