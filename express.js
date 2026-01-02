const express = require("express")
const crypto = require("node:crypto")

const { supabase } = require("./supabase/supabase")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt");
const { PORT, JWT_SECRET, NODE_ENV } = require("./config")

const { validateUser, validateUserRegister, excludeSensibleInformationFromUser } = require("./schemas/users")
const serverless = require("serverless-http");

const app = express()
app.disable("x-powered-by")
app.disable("etag")

app.use(express.json())
app.use((req, res, next) => {
    const authHeader = req.headers.authorization
    const access_token = authHeader && authHeader.split(" ")[1]
    req.session = { user: null }
    if(access_token) {
        try {
            const data = jwt.verify(access_token, JWT_SECRET)
            req.session.user = data
        } catch { }
    }
    next()
})

app.get("/", (req, res) => {
    res.status(200).send("<h1>Bienvenido a mi página de inicio!!</h1>")
})

app.get("/users", async (req, res) => {
    try {
        const { data: users, error } = await supabase.from("Users").select("*")
        const sanitizedUsers = users.map(u => excludeSensibleInformationFromUser(u))
        if(error) {
            return res.status(500).json({ error: error.message })
        }
        return res.status(200).json(sanitizedUsers) 
    } catch(err) {
        res.status(500).json({ error: "Internal server error" })
    }
})


app.post("/users/register", async (req, res) => {
    const result = validateUserRegister(req.body)
    if(!result.success) {
        return res.status(422).json({ error: JSON.parse(result.error.message) })
    }
    const id = crypto.randomUUID()
    const { username, password } = req.body
    const hashedPassword = bcrypt.hashSync(password, 10)
    try {
        const { error } = await supabase
            .from("Users")
            .insert([{ id, username, password: hashedPassword }])
        if(error) {
            if(error.code === "23505") { // 23505 = "Unique Violation" de PostgreSQL
                return res.status(409).json({ message: "Username already taken" })
            }
            return res.status(400).json({ error: error.message })
        }
        return res.status(201).json({
            message: "Success"
        })
    } catch(e) {
        res.status(500).json({ error: "Internal server error" })
    }
})

app.post("/users/login", async (req, res) => {
    const result = validateUser(req.body)
    if(!result.success) {
        return res.status(422).json({ error: JSON.parse(result.error.message) })
    }
    const { data: userData, error } = await supabase
        .from("Users")
        .select("*")
        .eq("username", req.body.username)
        .single()
    if(error || !userData) {
        return res.status(401).json({ message: "Invalid credentials" })
    }
    const isValid = bcrypt.compareSync(req.body.password, userData.password)
    if(!isValid) {
        return res.status(401).json({ message: "Invalid credentials" })
    }
    const accessToken = jwt.sign(
        { username: userData.username },
        JWT_SECRET,
        { expiresIn: "15m" }
    )
    const refreshToken = crypto.randomBytes(64).toString("hex")
    await supabase
        .from("Users")
        .update({ refresh_token: refreshToken })
        .eq("id", userData.id)
    return res.status(200).json({
        message: "Success",
        access_token: accessToken,
        refresh_token: refreshToken
    })
})

app.post("/users/refresh-token", async (req, res) => {
    const refreshTokenFromHeader = req.headers["x-refresh-token"]
    if(!refreshTokenFromHeader) {
        return res.status(400).json({ message: "Bad request" })
    }
    try {
        const { data: userData, error } = await supabase
            .from("Users")
            .select("*")
            .eq("refresh_token", refreshTokenFromHeader)
            .single()
        if(error || !userData) {
            return res.status(403).json({ message: "Forbidden" })
        }
        const newAccessToken = jwt.sign(
            { username: userData.username },
            JWT_SECRET,
            { expiresIn: "15m" }
        )
        return res.status(200).json({
            access_token: newAccessToken
        })
    } catch {
        return res.status(500).json({ error: "Internal server error" })
    }
})

app.post("/users/get-self-info", async (req, res) => {
    if(!req.session) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    try {
        const { data: userData, error } = await supabase
            .from("Users")
            .select("username, real_name")
            .eq("username", req.session.user.username)
            .single()
        if(!userData) {
            return res.status(401).json({ message: "Invalid credentials" })
        }
        return res.status(200).json({
            username: req.session.user.username,
            real_name: userData.real_name
        })
    } catch(e) {
        return res.status(500).json({ message: "Internal server error" })
    }
})

app.patch("/users/update-real-name", async (req, res) => {
    if(!req.session.user) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    const { real_name } = req.body
    if(!real_name) {
        return res.status(400).json({ message: "Bad request" })
    }
    try {
        const { data, error } = await supabase
            .from("Users")
            .update({ real_name: real_name })
            .eq("username", req.session.user.username)
            .select()
            .single()
        if(error) {
            return res.status(500).json({ error: error.message })
        }
        return res.status(200).json({
            message: "Success",
            real_name: data.real_name
        })
    } catch(e) {
        res.status(500).json({ error: "Internal server error" })
    }
})

app.post("/users/check-username-availability", async(req, res) => {
    const { username } = req.body
    if(!username) {
        return res.status(400).json({ error: "Bad request" })
    }
    try {
        const { data, error } = await supabase
            .from("Users")
            .select("username")
            .eq("username", username)
            .is("deleted_at", null)
            .maybeSingle()
        if(error) {
            return res.status(500).json({ error: error.message })
        }
        return res.status(200).json({
            message: data === null
        })
    } catch(e) {
        console.log(e)
        return res.status(500).json({ error: "Internal server error" })
    }
})

app.use((req, res) => {
    res.status(404).send("Ruta no encontrada")
})

if(NODE_ENV === "local") {
    app.listen(PORT, () => {
        console.log(`Server is listening on http://localhost:${PORT}`)
    })
}

module.exports.handler = serverless(app);