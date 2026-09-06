import crypto from "crypto"

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789"

export function generateCode(length = 6) : string {
    const bytes = crypto.randomBytes(length)

    let code = ""

    for(let i=0; i<length; i++) {
        code += CHARACTERS[bytes[i] % CHARACTERS.length];
    }

    return code
}