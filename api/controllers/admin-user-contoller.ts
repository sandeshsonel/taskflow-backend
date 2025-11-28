import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';

import AdminUserModel from '@models/admin-user-model';
import UserModel from '@models/user-model';
import NotificationModel from '@models/notification-model';

export default {
  async getUsersList(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    try {
      const adminUser = await AdminUserModel.findOne({ adminId: user?.id }).select([
        '-password',
        '-__v',
      ]);
      return res.status(200).json({
        success: true,
        data: adminUser?.users || [],
      });
    } catch (error) {
      next(error);
    }
  },
  async createUser(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    const { firstName, lastName, email, role, password } = req.body;

    try {
      if (user?.email === email) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create user with same email as admin',
        });
      }

      const isAdminUser = await UserModel.findOne({ email });

      if (isAdminUser && isAdminUser.role === 'admin') {
        return res.status(400).json({
          success: false,
          message: 'User already registered as admin',
        });
      }

      const isAlreadyExists = await AdminUserModel.findOne({
        'users.email': email,
      });

      if (isAlreadyExists) {
        return res.status(400).json({
          success: false,
          message: 'User already exists',
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const normalUser = await UserModel.findOne({ email });

      const adminUser = await AdminUserModel.findOneAndUpdate(
        { adminId: user?.id },
        {
          $push: {
            users: {
              firstName,
              lastName,
              email,
              role,
              userId: normalUser?._id ?? null,
              password: hashedPassword,
            },
          },
        },
        { new: true, upsert: true },
      );

      const lastAddedUser = adminUser?.users[adminUser.users.length - 1];

      const notificationData = {
        message: `You’ve been invited to join ${user?.fullName}`,
        actionType: 'invite',
        actionData: {
          adminId: String(user?.id),
          userId: String(lastAddedUser?._id),
        },
      };

      await NotificationModel.findOneAndUpdate(
        { email },
        { $push: { notifications: notificationData } },
        { new: true, upsert: true },
      );

      res.status(201).json({
        success: true,
        message: 'User created successfully',
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Something went wrong' });
    }
  },
  async getUserDetail(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    try {
    } catch (error) {
      next(error);
    }
  },
  async updateUser(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    const adminId = user?.id;
    const { userId } = req.query;

    try {
      const isUserExists = await AdminUserModel.findOne({
        adminId,
        'users._id': userId,
      });
      if (!isUserExists) {
        return res.status(400).json({
          success: false,
          message: 'User not found',
        });
      }
      const updateData: any = { ...req.body };
      if (updateData.password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(updateData.password, salt);
        updateData.password = hashedPassword;
      }
      const updateFields: Record<string, any> = {};
      for (const [key, value] of Object.entries(updateData)) {
        updateFields[`users.$.${key}`] = value;
      }
      await AdminUserModel.findOneAndUpdate(
        { adminId, 'users._id': userId },
        { $set: updateFields },
        { new: true },
      );
      return res.status(200).json({
        success: true,
        message: 'User updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    try {
      const { userId } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }

      await AdminUserModel.findOneAndUpdate(
        { adminId: user?.id },
        { $pull: { users: { _id: userId } } },
      );
      return res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: 'User delete failed' });
      next(error);
    }
  },
};
