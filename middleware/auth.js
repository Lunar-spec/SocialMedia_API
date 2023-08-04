import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

const verifyToken = (req, res, next) => {

    let token = req.headers.authorization;

    if (!token || !token.startsWith('Bearer ')) {
        return res.status(403).send('A token is required for authentication');
    }

    try {
        token = token.split('Bearer ')[1];
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.user = decoded;
        next(); 
    } catch (err) {
        return res.status(401).send('Invalid Token');
    }
};

export default verifyToken;
