import { JwtPayload } from "jsonwebtoken";

export interface AuthToken extends JwtPayload {
	userId: number;
	sessionId: string;
}
