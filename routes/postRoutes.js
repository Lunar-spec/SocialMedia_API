import express from 'express';
import Post from '../mongoDB/models/Post.js ';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Route to upload a new post
router.post('/upload', authMiddleware, async (req, res) => {
    try {
        const { text, images, videos, isPublic } = req.body;

        // Create a new post
        const newPost = new Post({
            text,
            images,
            videos,
            isPublic,
        });

        // Save the post to the database
        const savedPost = await newPost.save();

        // Respond with the newly created post
        res.status(201).json(savedPost);
    } catch (error) {
        res.status(500).json({ error: 'Error uploading post' });
    }
});

// Route to like a post
router.post('/like/:postId', authMiddleware, async (req, res) => {
    try {
        const postId = req.params.postId;

        // Fetch the post from the database based on postId
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if the user has already liked the post
        if (post.likes.includes(req.user    .user_id)) {
            return res.status(400).json({ error: 'You have already liked this post' });
        }

        // Add the user's id to the post's likes array
        post.likes.push(req.user.user_id);

        // Save the updated post to the database
        await post.save();

        // Respond with a success message or the updated post
        res.status(200).json({ message: 'Post liked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error liking post' });
    }
});

router.post('/unlike/:postId', authMiddleware, async (req, res) => {
    try {
        const postId = req.params.postId;
        const loggedInUserId = req.user.user_id;

        // Find the post based on postId
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if the user has liked the post
        if (!post.likes.includes(loggedInUserId)) {
            return res.status(400).json({ error: 'You have not liked this post' });
        }

        // Remove the user's ID from the likes array
        post.likes = post.likes.filter((userId) => userId !== loggedInUserId);
        await post.save();

        res.status(200).json({ message: 'Post unliked successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error unliking post' });
    }
});

// Route to delete a post
router.delete('/del/:postId', authMiddleware, async (req, res) => {
    try {
        const postId = req.params.postId;

        // Fetch the post from the database based on postId
        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if the logged-in user is the author of the post
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'You are not authorized to delete this post' });
        }

        // Mark the post as deleted
        post.deleted = true;

        // Save the updated post to the database
        await post.save();

        // Respond with a success message or the deleted post
        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting post' });
    }
});


// Route to fetch users who liked a post
router.get('/liked-users/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;

        // Fetch the post from the database based on postId
        const post = await Post.findById(postId).populate('likes', '_id name');

        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Respond with the users who liked the post
        res.status(200).json(post.likes);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching liked users' });
    }
});

// Route to explore public posts
router.get('/explore', async (req, res) => {
    try {
        // Fetch public posts from the database
        const publicPosts = await Post.find({ isPublic: true });

        // Respond with the public posts
        res.status(200).json(publicPosts);
    } catch (error) {
        res.status(500).json({ error: 'Error exploring posts' });
    }
});

export default router;