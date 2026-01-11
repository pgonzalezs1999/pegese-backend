const express = require("express")
const crypto = require("node:crypto")

const { supabase } = require("./supabase/supabase")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt");
const { PORT, JWT_SECRET, NODE_ENV } = require("./config")

const {
    validateUser,
    validateUserRegister,
    validateUserUpdate,
    excludeSensibleInformationFromUser
} = require("./schemas/users")
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
    } catch(e) {
        res.status(500).json({ message: "Internal server error" })
    }
})


app.post("/users/register", async (req, res) => {
    const result = validateUserRegister(req.body)
    if(!result.success) {
        return res.status(422).json({ message: "Bad request" })
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
            return res.status(400).json({ message: "Internal server error" })
        }
        await login(username, password, res)
    } catch(e) {
        res.status(500).json({ message: "Internal server error" })
    }
})

app.post("/users/login/jwt", async(req, res) => {
    if(!req.session.user) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    const { refresh_token } = req.body
    if(!refresh_token) {
        return res.status(400).json({ message: "Bad request" })
    }
    try {
        const { data: userData, error } = await supabase
            .from("Users")
            .select("refresh_token")
            .eq("username", req.session.user.username)
            .single()
        if(error || !userData) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        if(userData.refresh_token !== refresh_token) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        return res.status(200).json({
            message: "Success"
        })
    } catch(e) {
        return res.status(500).json({ message: "Internal server error" })
    }
})

app.post("/users/login", async (req, res) => {
    const result = validateUser(req.body)
    if(!result.success) {
        return res.status(422).json({ message: "Bad request" })
    }
    try {
        await login(req.body.username, req.body.password, res)
    } catch(e) {
        res.status(500).json({ message: e.message })
    }
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
        return res.status(500).json({ message: "Internal server error" })
    }
})

app.post("/users/get-self-info", async (req, res) => {
    if(!req.session) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    try {
        const { data: userData, error } = await supabase
            .from("Users")
            .select("*")
            .eq("username", req.session.user.username)
            .single()
        if(!userData) {
            return res.status(401).json({ message: "Invalid credentials" })
        }
        const publicUserData = excludeSensibleInformationFromUser(userData)
        return res.status(200).json({ user: publicUserData })
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
            return res.status(500).json({ message: "Internal server error" })
        }
        return res.status(200).json({
            message: "Success",
            real_name: data.real_name
        })
    } catch(e) {
        res.status(500).json({ message: "Internal server error" })
    }
})

app.post("/users/check-username-availability", async(req, res) => {
    const { username } = req.body
    if(!username) {
        return res.status(400).json({ message: "Bad request" })
    }
    try {
        const { data, error } = await supabase
            .from("Users")
            .select("username")
            .eq("username", username)
            .is("deleted_at", null)
            .maybeSingle()
        if(error) {
            return res.status(500).json({ message: "Internal server error" })
        }
        return res.status(200).json({
            message: data === null
        })
    } catch(e) {
        console.log(e)
        return res.status(500).json({ message: "Internal server error" })
    }
})

app.post("/users/logout", async(req, res) => {
    if(!req.session.user) {
        return res.status(400).json({ message: "Bad request" })
    }
    try {
        const { error } = await supabase
            .from("Users")
            .update({ refresh_token: null })
            .eq("username", req.session.user.username)
        if(error) {
            return res.status(500).json({ message: "Internal server error" })
        }
        return res.status(200).json({
            message: "Success"
        })
    } catch(e) {
        console.log(e)
        return res.status(500).json({ message: "Internal server error" })
    }
})

app.post("/users/update", async (req, res) => {
    if(!req.session.user) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    const validationResult = validateUserUpdate(req.body)
    if(!validationResult.success) {
        return res.status(422).json({ message: "Bad request"})
    }
    const { username,
        real_name,
        real_surname,
        phone_prefix,
        phone_number
    } = req.body

    const hasAnyField =
        username ||
        real_name ||
        real_surname ||
        phone_prefix ||
        phone_number

    if(!hasAnyField) {
        return res.status(400).json({ message: "Bad request" })
    }
    const phonePrefixProvided = phone_prefix !== undefined
    const phoneNumberProvided = phone_number !== undefined
    if(phonePrefixProvided !== phoneNumberProvided) {
        return res.status(400).json({
            message: "Bad request"
        })
    }
    try {
        const updates = {}
        if(username) {
            const { data: existingUser, error: usernameError } = await supabase
                .from("Users")
                .select("id")
                .eq("username", username)
                .maybeSingle()
            if(usernameError) {
                return res.status(500).json({ message: error.message })
            }
            if(existingUser) {
                return res.status(409).json({ message: "Username already taken" })
            }
            updates.username = username
        }
        if(real_name !== undefined) {
            updates.real_name = real_name
        }
        if(real_surname !== undefined) {
            updates.real_surname = real_surname
        }
        if(phonePrefixProvided && phoneNumberProvided) {
            updates.phone_prefix = phone_prefix
            updates.phone_number = phone_number
        }
        const { data, error } = await supabase
            .from("Users")
            .update(updates)
            .eq("id", req.session.user.id)
            .select()
            .single()
        if(error) {
            return res.status(500).json({ message: error.message})
        }
        return res.status(200).json({
            message: "Success",
        })
    } catch (e) {
        return res.status(500).json({ message: e.message })
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

async function login(username, password, res) {
    const { data: userData, error } = await supabase
        .from("Users")
        .select("*")
        .eq("username", username)
        .single()
    if(error) {
        return res.status(401).json({ message: "Unauthorized" })
    }
    if(!userData) {
        return res.status(401).json({ message: "Invalid credentials" })
    }
    const isValid = bcrypt.compareSync(password, userData.password)
    if(!isValid) {
        return res.status(401).json({ message: "Invalid credentials" })
    }
    const accessToken = jwt.sign(
        { id: userData.id, username: userData.username },
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
}

module.exports.handler = serverless(app);