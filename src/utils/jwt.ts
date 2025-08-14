import jwt from "@elysiajs/jwt"
import Elysia from "elysia"


export const JWT = new Elysia()
.use(jwt({
    name: "jwt",
    secret: "ds;kafj'iasifewmafsjdpfasd",
    exp: "7d"
}))