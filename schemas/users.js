const zod = require("zod")

const usernameSchema = zod
    .string({ required_error: "Username required" })
    .min(6)
    .max(20)

const passwordSchema = zod
    .string({ required_error: "Password required" })
    .min(6)

const nameSchema = zod
    .string()
    .regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/, "Only letters allowed")

const phonePrefixSchema = zod
    .string()
    .regex(/^\d{1,3}$/, "Phone prefix must have 1 to 3 digits")

const phoneNumberSchema = zod
    .string()
    .regex(/^\d{6,10}$/, "Phone number must have 6 to 10 digits")

const userSchema = zod.object({
    username: usernameSchema,
    password: passwordSchema
})

const userRegisterSchema = zod.object({
    username: usernameSchema,
    password: passwordSchema
})

const userUpdateSchema = zod.object({
    username: usernameSchema.optional(),
    real_name: nameSchema.optional(),
    real_surname: nameSchema.optional(),
    phone_prefix: phonePrefixSchema.optional(),
    phone_number: phoneNumberSchema.optional()
}).refine(
    data =>
        (data.phone_prefix && data.phone_number) ||
        (!data.phone_prefix && !data.phone_number),
    {
        message: "phone_prefix and phone_number must be provided together",
        path: ["phone_prefix"]
    }
)

function validateUser(data) {
    return userSchema.safeParse(data)
}

function validateUserRegister(data) {
    return userRegisterSchema.safeParse(data)
}

function validateUserUpdate(data) {
    return userUpdateSchema.safeParse(data)
}

function excludeSensibleInformationFromUser(user) {
    const { id, password, refresh_token,
        created_at, updated_at, deleted_at,
        ...publicUser } = user
    return publicUser
}

module.exports = {
    validateUser,
    validateUserRegister,
    validateUserUpdate,
    excludeSensibleInformationFromUser
}