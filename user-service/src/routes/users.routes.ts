import { Router } from "express";
import { me } from "../controllers/users.controllers.ts";
import { authenticate } from "../middleware/authenticate.ts";

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.get("/me", me);