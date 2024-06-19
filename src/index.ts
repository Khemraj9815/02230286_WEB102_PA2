import { Hono } from 'hono'
import { PrismaClient, Prisma } from '@prisma/client'
import { serve } from "@hono/node-server";
// import { jwt } from '@hono/middleware/jwt';
import * as jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { HTTPException } from 'hono/http-exception';


import { decode, sign, verify } from 'hono/jwt'
// import { authMiddleware } from './middleware/auth'
// import { rateLimit } from "./middleware/ratelimit"
// import { register, login } from "./controllers/authController"

const app = new Hono()
const prisma = new PrismaClient()

// default landing
app.get("/", (c) => {
  return c.text("Hello khem!");
});

const port = 3000;
console.log(`Server is running on port ${port}`);


// signup endpoint
app.post('/signup', async (c) => {
  try {
    const { email, password, user_name } = await c.req.json();

    // check if email exist
    const existingUser = await prisma.userinfo.findUnique({ where: { email } });
    if (existingUser) {
      return c.json({ error: "Email already registered" }, 400);
    }

    // hash the passdwd
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // creating new
    const newUser = await prisma.userinfo.create({
      data: {
        email,
        hashedpwd: hashedPassword,
        user_name,
      },
    });

    return c.json(newUser, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_secret';

// login endpoints 
app.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    // check for the user
    const user = await prisma.userinfo.findUnique({
      where: { email },
      select: { id: true, hashedpwd: true },
    });

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    // comparing the hashed passdwd
    const passwordMatch = await bcrypt.compare(password, user.hashedpwd);
    if (!passwordMatch) {
      throw new HTTPException(401, { message: "Invalid credentials" });
    }

    // generate jwt token and pass to the user
    const payload = {
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60, 
    };
    const token = jwt.sign(payload, JWT_SECRET);

    // login success message
    return c.json({ message: "Login successful", token });
  } catch (error) {
    console.error(error);
    throw new HTTPException(401, { message: "Invalid credentials" });
  }
});

app.post("/pokemon", async (c) => {
  try {
    const body = await c.req.json();

    const pokemon = await prisma.caught.create({
      data: {
        pokemon_name: body.pokemon_name,
        pokemon_type: body.pokemon_type,
        weight: body.weight,
      },
    });

    console.log(pokemon);
    return c.json({ message: `${pokemon.pokemon_name} created successfully` });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        console.log(
          "There is a unique constraint violation, a new pokemon cannot be created with this pokemon name"
        );
        return c.json({ message: "Pokemon already exists" });
      }
    }
    console.error(e);
    return c.json({ message: "An error occurred" }, 500);
  }
});

// retrieve all the pokemon
app.get('/pokemon', async (c) => {
  try {
    const allPokemon = await prisma.caught.findMany();
    return c.json(allPokemon);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// get specific pokemon using id
app.get('/pokemon/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const pokemon = await prisma.caught.findUnique({
      where: { pokemon_id: parseInt(id) },
    });

    if (!pokemon) {
      return c.json({ error: "Pokemon not found" }, 404);
    }

    return c.json(pokemon);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// update pokemon using their id
app.put('/pokemon/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const { pokemon_name, pokemon_type, weight, image, userpass } = await c.req.json();

    const updatedPokemon = await prisma.caught.update({
      where: { pokemon_id: parseInt(id) },
      data: {
        pokemon_name,
        pokemon_type,
        weight
      },
    });

    return c.json(updatedPokemon);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// delete pokemon using id
app.delete('/pokemon/:id', async (c) => {
  try {
    const { id } = c.req.param();

    await prisma.caught.delete({
      where: { pokemon_id: parseInt(id) },
    });

    return c.json({ message: "Pokemon deleted successfully" });
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

serve({
  fetch: app.fetch,
  port,
}); 
