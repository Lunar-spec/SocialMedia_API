import express from 'express'
import bcrypt from 'bcrypt'
import User from '../mongoDB/models/User.js'
import jwt from 'jsonwebtoken'
import * as dotenv from "dotenv";
import authMiddleware from '../middleware/auth.js';

dotenv.config();
const router = express.Router()

async function generateUserId() {
    try {
        // Fetch the latest user from the database to get the last user_id
        const latestUser = await User.findOne({}, {}, { sort: { user_id: -1 } });

        // If no user exists, set the initial user_id as 1
        let user_id = 1;

        // If there are users, increment the last user_id by 1 to get the next user_id
        if (latestUser) {
            user_id = latestUser.user_id + 1;
        }

        return user_id;
    } catch (error) {
        throw new Error('Error generating user_id');
    }
}

router.post('/register', async (req, res) => {
    try {
        const { name, email_id, password, user_name, gender, mobile } = req.body;

        if (!name || !email_id || !password || !user_name || !gender || !mobile) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email_id)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate password format
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ error: 'Invalid password format. Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one digit, and one special character' });
        }

        // Validate mobile number format
        const mobileRegex = /^\+\d{1,3}-\d{10}$/;
        if (mobile && !mobileRegex.test(mobile)) {
            return res.status(400).json({ error: 'Invalid mobile number format. Use +CountryCode-MobileNumber' });
        }
        // Check if the email_id is unique
        const existingEmail = await User.findOne({ email_id });
        if (existingEmail) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Check if the user_name is unique
        const existingUserName = await User.findOne({ user_name });
        if (existingUserName) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const user_id = await generateUserId();
        // console.log(user_id)
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            user_id,
            email_id,
            password: hashedPassword,
            user_name,
            gender,
            mobile,
        });

        // Generate a JWT token for the registered user
        const token = jwt.sign(
            {
                user_id: newUser.user_id,
                email_id: newUser.email_id,
                user_name: newUser.user_name,
            },
            process.env.SECRET_KEY,
            {
                expiresIn: '2h', // Token will expire in 2 hours
            }
        );

        // Respond with the newly created user details and the JWT token
        res.status(201).json({ newUser, token });
    } catch (error) {
        res.status(500).json({ error: 'Error creating new user' });
    }
});

// Route for user login
router.post('/login', async (req, res) => {
    try {
        const { email_id, password } = req.body;

        // Find the user based on email_id
        const user = await User.findOne({ email_id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Validate the password provided by the user
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate a JWT token for the logged-in user
        const token = jwt.sign(
            {
                user_id: user.user_id,
                email: user.email_id,
                username: user.user_name,
            },
            process.env.SECRET_KEY,
            {
                expiresIn: '2h', // Token will expire in 2 hours
            }
        );

        // Respond with the user details and the JWT token
        res.status(200).json({
            _id: user._id,
            name: user.name,
            user_id: user.user_id,
            email_id: user.email_id,
            user_name: user.user_name,
            gender: user.gender,
            mobile: user.mobile,
            token,
        });
    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }
});

router.get('/profile', authMiddleware, async (req, res) => {
    // The authentication middleware will verify the JWT token and populate req.user
    try {
        // Fetch user profile details from the database based on user_id in req.user
        const userProfile = await User.findOne({ user_id: req.user.user_id });

        if (!userProfile) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        // Respond with the user profile details
        res.status(200).json(userProfile);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching user profile' });
    }
});


router.post('/follow/:user_id', authMiddleware, async (req, res) => {
    try {
        const { user_id } = req.params;
        const loggedInUserId = req.user.user_id;

        // Check if the logged-in user is already following the user
        const loggedInUser = await User.findOne({ user_id: loggedInUserId });
        if (loggedInUser.following.includes(user_id)) {
            return res.status(400).json({ error: 'You are already following this user' });
        }

        // Update the logged-in user's following list
        loggedInUser.following.push(user_id);
        await loggedInUser.save();

        // Update the other user's followers list
        const otherUser = await User.findOne({ user_id });
        otherUser.followers.push(loggedInUserId);
        await otherUser.save();

        res.status(200).json({ message: 'Successfully followed the user' });
    } catch (error) {
        res.status(500).json({ error: 'Error following user' });
    }
});

// Route for user unfollow action
router.post('/unfollow/:user_id', authMiddleware, async (req, res) => {
    try {
        const { user_id } = req.params;
        const loggedInUserId = req.user.user_id;

        // Check if the logged-in user is already following the user
        const loggedInUser = await User.findOne({ user_id: loggedInUserId });
        if (!loggedInUser.following.includes(user_id)) {
            return res.status(400).json({ error: 'You are not following this user' });
        }

        // Update the logged-in user's following list
        loggedInUser.following = loggedInUser.following.filter((id) => id !== user_id);
        await loggedInUser.save();

        // Update the other user's followers list
        const otherUser = await User.findOne({ user_id });
        otherUser.followers = otherUser.followers.filter((id) => id !== loggedInUserId);
        await otherUser.save();

        res.status(200).json({ message: 'Successfully unfollowed the user' });
    } catch (error) {
        res.status(500).json({ error: 'Error unfollowing user' });
    }
});

// Route to update user profile details
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { name, user_name, gender, mobile, bio, profileImage, coverImage } = req.body;

        // Fetch the user profile based on user_id in the JWT token
        const userProfile = await User.findOne({ user_id: req.user.user_id });

        if (!userProfile) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        // Update the user profile fields
        userProfile.name = name;
        userProfile.user_name = user_name;
        userProfile.gender = gender;
        userProfile.mobile = mobile;
        userProfile.bio = bio;
        userProfile.profileImage = profileImage;
        userProfile.coverImage = coverImage;

        // Save the updated user profile to the database
        await userProfile.save();

        // Respond with the updated user profile
        res.status(200).json(userProfile);
    } catch (error) {
        res.status(500).json({ error: 'Error updating user profile' });
    }
});

// Route to get user's followers
router.get('/followers/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Fetch the user from the database based on userId
        const user = await User.findOne({ user_id: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch the followers of the user from the database
        const followers = await User.find({ user_id: { $in: user.followers } });

        // Respond with the followers
        res.status(200).json(followers);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching followers' });
    }
});

// Route to get user's following
router.get('/following/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Fetch the user from the database based on userId
        const user = await User.findOne({ user_id: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Fetch the users that the user is following from the database
        const following = await User.find({ user_id: { $in: user.following } });

        // Respond with the following users
        res.status(200).json(following);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching following users' });
    }
});

export default router;