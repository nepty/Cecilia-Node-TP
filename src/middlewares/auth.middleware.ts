import { MiddlewareFn } from 'type-graphql';
import { verify } from 'jsonwebtoken';
import { Response, Request } from 'express';
import { environment } from '../config/environment';

export interface IContext {
    req: Request,
    res: Response,
    payload: { userId: string }
};

export const isAuth: MiddlewareFn<IContext> = ({ context }, next) => {
    try {
        const bearerToken = context.req.headers["authorization"];
        if (!bearerToken) {
            console.log("USUARIO NO AUTORIZADO!")
            throw new Error('Usuario sin login, no puede entrar!');
        };
        const jwt = bearerToken.split(" ")[1];
        const payload = verify(jwt, environment.JWT_SECRET);
        context.payload = payload as any;
    } catch (error) {
        throw error;
    }

    return next();

}