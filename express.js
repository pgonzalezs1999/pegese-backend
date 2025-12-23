const express = require("express")
const crypto = require("node:crypto")

const { supabase } = require("./supabase/supabase")
const jwt = require("jsonwebtoken")
const bcrypt = require('bcrypt');
const { PORT, SALT_ROUNDS, JWT_SECRET } = require("./config")

const movies = require("./movies.json")
const { validateMovie, validatePartialMovie } = require("./schemas/movies")
const { validateUser, validateUserRegister, excludeSensibleInformationFromUser } = require("./schemas/users")

const app = express()
app.disable("x-powered-by")
app.disable("etag")

app.use(express.json())

app.get("/", (req, res) => {
    res.status(200).send("<h1>Bienvenido a mi página de inicio!!</h1>")
})

app.get("/movies", (req, res) => {
    const { genre } = req.query
    if(genre) {
        const filteredMovies = movies.filter
        (movie => movie.genre.some(g => g.toLowerCase() === genre.toLowerCase())
    )
        return res.status(200).json(filteredMovies)
    }
    res.status(200).json(movies)
})

app.get("/movies/:id", (req, res) => {
    const { id } = req.params
    const movie = movies.find(movie => movie.id === id)
    if(movie) return res.json(movie)
    res.status(404).json({ message: "Película no encontrada"})
})

app.post("/movies", (req, res) => {
    const result = validateMovie(req.body)
    if(result.error) {
        return res.status(422).json({ error: JSON.parse(result.error.message) })
    }
    const newMovie = {
        id: crypto.randomUUID(),
        ...result.data
    }
    movies.push(newMovie)
    res.status(201).json(newMovie)
})

app.patch("/movies/:id", (req, res) => {
    const result = validatePartialMovie(req.body)
    if(!result.success) {
        return res.status(422).json({ error: JSON.parse(result.error.message) })
    }
    const { id } = req.params
    const movieIndex = movies.findIndex(movie => movie.id === id)
    const movie = movies[movieIndex]
    if(movieIndex < 0) {
        return res.status(404).json({ message: "Película no encontrada"})
    }
    const updatedMovie = {
        ...movie,
        ...result.data
    }
    movies[movieIndex] = updatedMovie
    return res.json(updatedMovie)
})

app.get("/users", async (req, res) => {
    try {
        const { data: users, error } = await supabase.from('Users').select('*')
        if(error) {
            return res.status(500).json({ error: error.message })
        }
        return res.status(200).json(users) 
    } catch(err) {
        res.status(500).json({ error: "Error interno del servidor" })
    }
})


app.post("/users/register", async (req, res) => {
    const result = validateUserRegister(req.body)
    if(!result.success) {
        return res.status(422).json({ error: JSON.parse(result.error.message) })
    }
    const id = crypto.randomUUID()
    console.log(id)
    const { username, password } = req.body
    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS)
    try {
        const { error } = await supabase
            .from('Users')
            .insert([{ id, username, password: hashedPassword }])
        if(error) {
            if(error.code === "23505") { // 23505 = "Unique Violation" de PostgreSQL
                return res.status(409).json({ message: "Username already taken" })
            }
            return res.status(400).json({ error: error.message })
        }
        return res.status(201).json({
            message: "User registered",
            user: { id, username }
        })
    } catch(e) {
        res.status(500).json({ error: "Internal server error" })
    }
})

app.post("/users/login", async (req, res) => {
    console.log("Recibido un intento de login: ", req.body)
    const result = validateUser(req.body)
    if(!result.success) {
        return res.status(422).json({ error: JSON.parse(result.error.message) })
    }
    const { data: userData, error } = await supabase
        .from('Users')
        .select('*')
        .eq('username', req.body.username)
        .single()
    if (error || !userData) {
        return res.status(401).json({ message: "Invalid credentials" })
    }
    const isValid = bcrypt.compareSync(req.body.password, userData.password)
    if(!isValid) {
        return res.status(401).json({ message: "Invalid credentials" })
    }
    const token = jwt.sign(
        { id: userData.id, username: userData.username },
        JWT_SECRET,
        { expiresIn: '1h' }
    )
    const publicUser = excludeSensibleInformationFromUser(userData)
    return res.status(200).json({
        message: "Login successful",
        token
    })
})

app.post("/users/get-self-info", async (req, res) => {
    console.log("Token recibido: ", req.body.token)
    const token = req.body.token
    if(!token) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    try {
        const data = jwt.verify(token, JWT_SECRET)
        console.log("Token verified: ", data)
        return res.render("protected", data)
    } catch(e) {
        return res.status(401).json({ message: "Unauthorized" })
    }
})

app.use((req, res) => {
    res.status(404).send("Ruta no encontrada")
})

app.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`)
})