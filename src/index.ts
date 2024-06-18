import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client'
import { authMiddleware } from './middleware/auth'
import { rateLimit } from "./middleware/ratelimit"
import { register, login } from "./controllers/authController"
import { createPokemon, getPokemons, updatePokemon, deletePokemon } from "./controllers/ pokemonController"

const app = new Hono()
const prisma = new PrismaClient()

// Middleware for parsing JSON
app.use('*', async (c, next) => {
  c.req.parsedBody = await c.req.json()
  await next()
})

app.use('*', rateLimit(100, 60 * 1000)) // 100 requests per minute

// Auth routes
app.post('/register', register)
app.post('/login', login)

// Pokemon routes
app.post('/pokemons', authMiddleware, createPokemon)
app.get('/pokemons', authMiddleware, getPokemons)
app.put('/pokemons/:id', authMiddleware, updatePokemon)
app.delete('/pokemons/:id', authMiddleware, deletePokemon)

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
