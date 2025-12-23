/*const http = require("node:http")
const fs = require("node:fs")
const ditto = require("./ditto.js")

const processRequest = (req, res) => {
   const { method, url } = req
   switch(method) {
       case "GET":
           switch(url) {
               case "/":
                    res.setHeader("Content-Type", "text/plain; Charset=utf-8")
                    return res.end("Bienvenido a mi página de inicio!!")
                case "/foto.jpg":
                    return fs.readFile("foto.jpg", (err, data) => {
                        if(err) {
                            res.setHeader("Content-Type", "text/plain; Charset=utf-8")
                            res.statusCode = 500
                            return res.end("<h1>Error al leer la imagen</h1>")
                        } else {
                            res.setHeader("Content-Type", "image/jpg")
                            return res.end(data)
                        }
                    })
                case "/pokemon/ditto":
                    res.setHeader("Content-Type", "text/plain; Charset=utf-8")
                    return res.end(JSON.stringify(ditto))
                default:
                    res.setHeader("Content-Type", "text/plain; Charset=utf-8")
                    res.statusCode = 404
                    return res.end("Ruta GET no encontrada")
            }
        case "POST":
        switch(url) {
            case "/pokemon/create": {
                let body = ""
                req.on("data", chunk => {
                    body += chunk.toString()
                })
                req.on("end", () => {
                    const data = JSON.parse(body)
                    res.writeHead(201, { "Content-Type": "application/json; charset=utf-8" })
                    data.timestamp = Date.now()
                    res.end(JSON.stringify(data))
                })
                return
            }
            default:
                res.statusCode = 404
                return res.end("Ruta POST no encontrada")
        }
        default:
            res.statusCode = 405
            return res.end("Método no soportado")
    }
}

const server = http.createServer(processRequest)

server.listen(3000, () => {
    console.log("Server is listening on http://localhost:3000")
})*/