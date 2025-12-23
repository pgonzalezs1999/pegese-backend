const zod = require("zod")

const userSchema = zod.object({
    username: zod.string({
        required_error: "Username required"
    }).min(6),
    password: zod.string({
        required_error: "Password required"
    }).min(6)
})

const userRegisterSchema = userSchema.extend({
    username: zod.string({
        required_error: "Username required"
    }).min(6),
    password: zod.string({
        required_error: "Password required"
    }).min(6)
})

function validateUser(data) {
    return userSchema.safeParse(data)
}

function validatePartialUser(data) {
    return userSchema.partial().safeParse(data)
}

function validateUserRegister(data) {
    return userRegisterSchema.safeParse(data)
}

function excludeSensibleInformationFromUser(user) {
    const { password, created_at, updated_at, deleted_at, ...publicUser } = user
    return publicUser
}

module.exports = {
    validateUser,
    validatePartialUser,
    validateUserRegister,
    excludeSensibleInformationFromUser
}