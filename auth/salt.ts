import bcrypt from "bcrypt"

export function saltAndHashPassword(password: string) {
    const hashPw = bcrypt.hashSync(password, 12);
    return hashPw
}