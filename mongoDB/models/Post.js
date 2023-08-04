import mongoose from 'mongoose';

const { Schema } = mongoose;

const postSchema = new Schema(
    {
        text: {
            type: String,
            required: true,
        },
        images: [
            {
                type: String,
            },
        ],
        videos: [
            {
                type: String,
            },
        ],
        isPublic: {
            type: Boolean,
            default: true,
        },
        likes: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        deleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Post = mongoose.model('Post', postSchema);

export default Post;
