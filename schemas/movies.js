const zod = require("zod")

const movieSchema = zod.object({
    title: zod.string({
        invalid_type_error: "El título debe ser una cadena de texto",
        required_error: "El título es obligatorio"
    }).min(1),
    year: zod.number().int().min(1850).max(new Date().getFullYear()),
    director: zod.string().min(1),
    duration: zod.number().int().min(1),
    poster: zod.string().url({
        message: "El poster debe ser una URL",
    }),
    genre: zod.array(
        zod.enum(["Action", "Crime", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi", "Documentary", "Thriller", "Animation", "Adventure"]),
        {
            required_error: "El género es obligatorio",
            invalid_type_error: "Género inválido"
        }
    ).min(1),
    rate: zod.number().min(0).max(10).default(0)
})

function validateMovie(data) {
    return movieSchema.safeParse(data)
}

function validatePartialMovie(data) {
    return movieSchema.partial().safeParse(data)
}

module.exports = {
    validateMovie,
    validatePartialMovie
}