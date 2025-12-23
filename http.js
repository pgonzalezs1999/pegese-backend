const http = require("node:http")
const fs = require("node:fs")

const processRequest = (req, res) => {
    console.log("Request received: ", req.url)
    res.setHeader("Content-Type", "text/plain; Charset=utf-8")
    res.setHeader("Charset", "utf-8")
    if(req.url === "/") {
        res.end("Bienvenido a mi página de inicio!!")
    } else if(req.url === "/foto.jpg") {
        fs.readFile("foto.jpg", (err, data) => {
            if(err) {
                res.statusCode = 500
                res.end("<h1>Error al leer la imagen</h1>")
            } else {
                res.setHeader("Content-Type", "image/jpg")
                res.end(data)
            }
        })
    } else {
        res.statusCode = 404
        res.end("Error!!")
    }
}

const server = http.createServer(processRequest)

server.listen(3000, () => {
    console.log("Server is listening on http://localhost:3000")
})