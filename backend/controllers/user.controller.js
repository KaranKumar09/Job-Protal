import {User} from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


export const register = async (req, res) => {
    try{
        const {fullname, email, phoneNumber, password, role} = req.body;
        if(!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(404).json({
                message: "All fields are required",
                success: false,
            });
        }
        const user = await User.findOne({email});
        if(user) {
            return res.status(400).json({
                message: "Email already exists",
                success: false,
            });
        }
        //convert password to hash
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            fullname,
            email,
            phoneNumber,
            password: hashedPassword,
            role
        });

        await newUser.save();
        return res.status(200).json({
            message: `Account created successfully for ${fullname}`,
            scusess: true,
        });
    }catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Server Error regisering user",
            success: false,
        });
    }
};

export const login = async (req, res) => {
    try{
        const {email, password,role} = req.body;
        if(!email || !password || !role) {
            return res.status(404).json({
                message: "All fields are required",
                success: false,
            });
        }
        let user = await User.findOne({email});
        if(!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch) {
            return res.status(404).json({
                message: "Invalid email or password",
                success: false,
            });
        }
        if(user.role !== role) {
            return res.status(403).json({
                message: "You do not have necessary role to access this resource",
                success: false,
            });
        }
        //generate token
        const tokenData = {
            userId: user._id,
        };
        const token = await jwt.sign(tokenData, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });
        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile,
        };
        return res.status(200).cookie("token",token, {
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            httpOnly: true,
            sameSite: "Strict",
        }).json({
            message: `Welcome back ${user.fullname}`,
            user,
            success: true,
        });

    }catch(error) {
        console.error(error);
        res.status(500).json({
            message: "Server Error logging in user",
            success: false,
        });
    }

};

export const logout  = async (req, res) => {
    try{
        return res.status(200).cookie("token","", { maxAge: 0 }).json({
            message: "Logged out successfully",
            success: true,
        });
    }catch(error){
        console.error(error);
        res.status(500).json({
            message: "Server Error logging out user",
            success: false,
        });
    }
};


export const updateProfile = async (req, res) => {
    try {
        const {fullname, email, phoneNumber, bio, skills} = req.body;
        const file = req.file; //middleware should set req.file
        
        // No required field validation - allow partial updates
        
        //cloudinary upload
        let skillsArray;
        if(skills){
            skillsArray = skills.split(",");
        }
        const userId = req.id; //middleware should set req.id
        let user = await User.findById(userId);
        if(!user) {
            return res.status(404).json({
                message: "User not found",
                success: false,
            });
        }
        //update database profile
        if(fullname) {
            user.fullname = fullname;
        }
        if(email) {
            user.email = email;
        }
        if(phoneNumber) {
            user.phoneNumber = phoneNumber;
        }
        if(bio){
            user.profile.bio = bio;
        }
        if(skills){
            user.profile.skills = skillsArray;
        }
        await user.save();
        user = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile,
        };
        return res.status(200).json({
            message: "Profile updated successfully",
            user,
            success: true,
        });
    }catch(error){
        console.error(error);
        res.status(500).json({
            message: "Server Error updating profile",
            success: false,
        });
    }
}