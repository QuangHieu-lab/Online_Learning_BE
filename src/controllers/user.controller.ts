import { Response } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcrypt';

// Get all users (Admin only)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        _count: {
          select: {
            coursesAsInstructor: true,
            enrollments: true,
            quizAttempts: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const usersWithRoles = users.map(user => ({
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      roles: user.userRoles.map(ur => ur.role.roleName),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      _count: user._count,
    }));

    res.json(usersWithRoles);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user by ID
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);

    if (isNaN(userIdInt)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const user = await prisma.user.findUnique({
      where: { userId: userIdInt },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        coursesAsInstructor: {
          select: {
            courseId: true,
            title: true,
            description: true,
            createdAt: true,
          },
        },
        enrollments: {
          include: {
            course: {
              select: {
                courseId: true,
                title: true,
                description: true,
              },
            },
          },
        },
        _count: {
          select: {
            coursesAsInstructor: true,
            enrollments: true,
            quizAttempts: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      roles: user.userRoles.map(ur => ur.role.roleName),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      coursesAsInstructor: user.coursesAsInstructor,
      enrollments: user.enrollments,
      _count: user._count,
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user (Admin only)
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    const { name, email, roles, password } = req.body;

    if (isNaN(userIdInt)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const updateData: any = {};
    if (name) updateData.fullName = name;
    if (email) updateData.email = email;
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Handle roles update
    if (roles && Array.isArray(roles)) {
      // Delete existing roles
      await prisma.userRole.deleteMany({
        where: { userId: userIdInt },
      });

      // Get role IDs
      const roleRecords = await prisma.role.findMany({
        where: { roleName: { in: roles } },
      });

      // Create new user roles
      updateData.userRoles = {
        create: roleRecords.map(role => ({
          roleId: role.roleId,
        })),
      };
    }

    const user = await prisma.user.update({
      where: { userId: userIdInt },
      data: updateData,
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    res.json({
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      roles: user.userRoles.map(ur => ur.role.roleName),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user (Admin only)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdInt = parseInt(userId);
    const currentUserId = req.userId!;

    if (isNaN(userIdInt)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent self-deletion
    if (userIdInt === currentUserId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { userId: userIdInt },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user (Admin only)
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, roles } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Default to student role if not provided
    const userRoles = roles && Array.isArray(roles) ? roles : ['student'];

    // Get role IDs
    const roleRecords = await prisma.role.findMany({
      where: { roleName: { in: userRoles } },
    });

    if (roleRecords.length === 0) {
      return res.status(400).json({ error: 'Invalid roles provided' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName: name,
        userRoles: {
          create: roleRecords.map(role => ({
            roleId: role.roleId,
          })),
        },
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    res.status(201).json({
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      roles: user.userRoles.map(ur => ur.role.roleName),
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};
